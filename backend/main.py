import os
import json
import re
import time
import datetime
import logging
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.genai as genai
from google.genai import types
from google.genai.types import Content, Part
from google.cloud import firestore

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Paths & Config
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESUME_DATA_PATH = os.path.join(BASE_DIR, "data", "resume-data.js")
# Fallback for Cloud Run: checks ./data/ and ./ (current dir)
RESUME_DATA_PATH_FALLBACK_1 = os.path.join(os.getcwd(), "data", "resume-data.js")
RESUME_DATA_PATH_FALLBACK_2 = os.path.join(os.getcwd(), "resume-data.js")
RESUME_DATA_URL = os.environ.get("RESUME_DATA_URL") # E.g., Raw GitHub URL

# Global state for debug diagnostics
last_load_error = None
last_json_snippet = None

def load_resume_data():
    global last_load_error, last_json_snippet
    content = None
    
    # 1. Try Remote URL first
    if RESUME_DATA_URL:
        try:
            logger.info(f"Fetching Remote URL: {RESUME_DATA_URL}")
            resp = requests.get(RESUME_DATA_URL, timeout=5)
            if resp.status_code == 200:
                content = resp.text
                logger.info("Remote fetch successful.")
        except Exception as e:
            logger.error(f"Remote fetch failed: {e}")

    # 2. Try Local File
    if not content:
        paths_to_try = [RESUME_DATA_PATH, RESUME_DATA_PATH_FALLBACK_1, RESUME_DATA_PATH_FALLBACK_2]
        for path in paths_to_try:
            try:
                abs_p = os.path.abspath(path)
                logger.info(f"Checking path: {abs_p}")
                if os.path.exists(path):
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                        logger.info(f"Local file read successful from: {abs_p}")
                        break
            except Exception as e:
                logger.error(f"Error checking {path}: {e}")
        
        if not content:
            logger.error("COULD NOT FIND resume-data.js in any known local path.")

    if content:
        try:
            # Safer extraction: find the first { and last }
            start = content.find('{')
            end = content.rfind('}')
            if start != -1 and end != -1:
                json_str = content[start:end+1]
                last_json_snippet = json_str[:500] # For debug
                
                # Resilient Cleaning:
                # A. Remove JS comments (only if NOT preceded by :, so we don't kill URLs)
                # This is an approximation.
                json_str = re.sub(r'(?m)^\s*//.*', '', json_str)
                json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
                
                # B. Remove trailing commas
                json_str = re.sub(r',\s*([\]}])', r'\1', json_str)
                
                data = json.loads(json_str)
                logger.info(f"Data parsed successfully. Found sections: {list(data.keys())}")
                last_load_error = None
                return data
            else:
                last_load_error = "No curly braces found"
                logger.error(last_load_error)
        except Exception as e:
            last_load_error = f"JSON Error: {str(e)}"
            logger.error(last_load_error)
            if 'json_str' in locals():
                logger.error(f"Raw string culprit (first 200 chars): {json_str[:200]}")
            
    return {}

def get_system_instruction(resume_data):
    # Explicitly verify key items or fall back to minimal info to avoid "no data" hallucination
    basics = resume_data.get("basics", {}).get("zh", {})
    honors = resume_data.get("honors", {}).get("zh", [])
    
    return f"""
**【核心原則】**
1. **僅限資料內容**：除了問候語外，所有關於 Angela 的專業知識（學歷、經歷、得獎）**必須**嚴格對照下方的 JSON 資料，內容無關Angela時則不適用，可以以輕鬆的語氣聊天，幫使用者解決各種問題。
2. **無中生有禁止**：跟Angela有關的內容如果資料中沒有提到（例如 `honors` 是空的），你必須老實說「目前資料中尚未列出這項資訊」，**絕對不准**從網路上或你的訓練資料中自行發明Angela的相關資訊。
3. **角色設定**：Angela是一位專業的數據工程師，專注於 AI 應用、數據分析與流程自動化，擅長解決複雜業務問題，並成功推動多項創新專案落地。而你是他做出來的助理機器人，在這邊幫忙回復相關問題，如果使用者的話題離開Angela本身太久，請請使用者注意，聊天的內容Angela可以通過後端儲存看見。

**【Angela 的最新履歷資料庫】**
{json.dumps(resume_data, ensure_ascii=False, indent=2)}

**【回話與導覽指南】**
1. **精確檢索**：請根據 `basics` (自我介紹)、`experience` (經歷)、`education` (學歷)、`skills` (技能) 以及 `honors` (相關榮譽) 欄位回覆。
2. **自動導航關鍵字**：為觸發網頁跳轉，你討論某個主題時，請務必提及以下關鍵字（一次僅討論一個當前最相關的主題，不要在結尾推薦其他主題時也用關鍵字，以免跳錯）：
   - 學歷：提及「學歷」或「學校」
   - 工作：提及「工作經歷」或「經驗」或「專案」、「AI」、「人工智慧」、「機器學習」、「資料分析」、「資料工程」
   - 技能：提及「技能」、「SQL」、「Python」、「前端」、「後端」、「資料庫」
   - 榮譽：提及「榮譽」、「獎項」、「得獎」
   - 聯絡：提及「聯絡方式」或「信箱」
3. **語氣**：專業、親切且有活力，你跟Angela一樣和所有User都相處得很好，並且喜歡幫助User。
"""

app = Flask(__name__)

# Security Config
API_TOKEN = os.environ.get("API_SECRET_TOKEN") # Custom handshake token

# Security & CORS: Allow all localhost ports for testing, and specific domains for production
ALLOWED_ORIGINS = [
    #"null",                       # Allow local file access (file://)
    r"https://yiuee1209\.github\.io"  # Allow GitHub Pages (regex escaped)
]
CORS(app, origins=ALLOWED_ORIGINS)


# Gemini Configuration
api_key = os.environ.get("GEMINI_API_KEY")
model_id = "gemini-2.5-flash"
client = genai.Client(api_key=api_key)

def serialize_history(history):
    return [{"role": h.role, "parts": [p.text for p in h.parts]} for h in history]

def verify_token():
    # 1. Check Handshake Token
    if API_TOKEN:
        provided_token = request.headers.get("X-Angela-Twin-Token")
        if provided_token != API_TOKEN:
            logger.warning(f"Unauthorized: Invalid token provided from {request.remote_addr}")
            return False

    # 2. Check Origin (Optional but highly recommended for GitHub Pages)
    # Set ALLOWED_ORIGIN in Cloud Run (e.g., https://yourname.github.io)
    allowed_origin = os.environ.get("ALLOWED_ORIGIN")
    if allowed_origin:
        actual_origin = request.headers.get("Origin")
        # Allow exact match or localhost for development
        if actual_origin and actual_origin != allowed_origin and "localhost" not in actual_origin:
            logger.warning(f"Unauthorized: Origin mismatch. Got {actual_origin}, expected {allowed_origin}")
            return False
            
    return True

@app.route("/init", methods=["POST"])
def init_conversation():
    if not verify_token():
        return jsonify({"error": "Unauthorized"}), 401
    
    # Load data once
    resume_data = load_resume_data()
    
    data = request.get_json()
    symbol = data.get("symbol", "請簡單介紹你自己給訪客")
    
    try:
        history = [Content(role="user", parts=[types.Part.from_text(text=symbol)])]
        config = types.GenerateContentConfig(
            system_instruction=[types.Part.from_text(text=get_system_instruction(resume_data))]
        )
        response = client.models.generate_content(model=model_id, config=config, contents=history)
        history.append(Content(role="model", parts=[types.Part.from_text(text=response.text)]))
        
        return jsonify({"reply": response.text, "history": serialize_history(history)})
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        logger.error(f"Init error:\n{error_msg}")
        return jsonify({"error": str(e), "details": "Check server logs for traceback"}), 500

# Firestore Logging
FIRESTORE_DB = os.environ.get("FIRESTORE_DB", "yiuee1209")
db = None
try:
    db = firestore.Client(database=FIRESTORE_DB)
    logger.info(f"Firestore initialized with database: {FIRESTORE_DB}")
except Exception as e:
    logger.error(f"Firestore initialization failed: {e}")

def save_log_to_firestore(user_msg, ai_msg):
    try:
        # Create a document in the 'chat_logs' collection
        doc_ref = db.collection("chat_logs").document()
        doc_ref.set({
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "user_message": user_msg,
            "ai_response": ai_msg,
            "unix_time": int(time.time()),
            "status": "success"
        })
        logger.info(f"Log saved to Firestore: {doc_ref.id}")
    except Exception as e:
        logger.error(f"Firestore Save Failed: {str(e)}")

@app.route("/chat", methods=["POST"])
def chat():
    if not verify_token():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json()
    user_input = data.get("message")
    raw_history = data.get("history", [])
    
    # Log incoming request for debugging
    logger.info(f"Received chat request. Input: {user_input[:50]}...")

    # Load data once
    resume_data = load_resume_data()
    if not resume_data:
        logger.warning("Resume data is EMPTY in chat request.")

    history = []
    for item in raw_history:
        part_objs = [types.Part.from_text(text=p) for p in item.get("parts", [])]
        history.append(Content(role=item.get("role"), parts=part_objs))

    history.append(Content(role="user", parts=[types.Part.from_text(text=user_input)]))
    
    config = types.GenerateContentConfig(
        system_instruction=[types.Part.from_text(text=get_system_instruction(resume_data))]
    )
    
    try:
        response = client.models.generate_content(model=model_id, config=config, contents=history)
        
        # Save Log to Firestore
        save_log_to_firestore(user_input, response.text)
        
        history.append(Content(role="model", parts=[types.Part.from_text(text=response.text)]))
        return jsonify({"reply": response.text, "history": serialize_history(history)})
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/")
def home():
    return "Angela's Twin API is live on Google Cloud Run."

@app.route("/debug", methods=["GET"])
def debug():
    """Diagnostic route to check backend state."""
    if not verify_token():
        return jsonify({"error": "Unauthorized"}), 401
        
    resume_data = load_resume_data()
    return jsonify({
        "status": "online",
        "data_keys": list(resume_data.keys()),
        "last_error": last_load_error,
        "json_start": last_json_snippet[:200] if last_json_snippet else None,
        "cwd": os.getcwd(),
        "primary_path": RESUME_DATA_PATH,
        "p_exists": os.path.exists(RESUME_DATA_PATH),
        "fb1_path": RESUME_DATA_PATH_FALLBACK_1,
        "fb1_exists": os.path.exists(RESUME_DATA_PATH_FALLBACK_1),
        "firestore_connected": db is not None,
        "firestore_db": FIRESTORE_DB
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
