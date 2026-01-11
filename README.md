# Angela Ko - AI-Powered Professional Portfolio

A modern, high-end glassmorphism portfolio website featuring a generative AI assistant (Digital Twin) built with Google Gemini 1.5 Flash.

## 🌟 Key Features
- **Smart AI Assistant**: A floating chatbot that acts as Angela's digital twin, answering questions about her background.
- **Dynamic AI Knowledge**: The AI stays updated by directly reading your `resume-data.js` (locally or via GitHub Raw URL). No manual prompt updates needed!
- **Deep Linking & Auto-Expand**: The AI triggers page scrolling and **auto-expands collapsed sections** by detecting keywords (Education, Experience, Honors, Skills, Contact) in its response.
- **Interactive Resume**:
  - **Universal Collapsibility**: Every section (Summary, Experience, Education, Honors) can be toggled via title clicks.
  - **Experience Accordion**: Detailed job descriptions are tucked away in per-item accordions.
  - **Honors Detail Bubbles**: Interactive badges that show achievement details on click.
- **Download PDF**: Integrated print-optimized layout for professional resume generation.
- **Diagnostics**: Built-in `/debug` endpoint to verify resume data loading and Firestore connectivity.
- **Multi-language Support**: Seamless English/Chinese toggle.
- **Conversation Logging**: All user queries are securely saved to **Google Cloud Firestore**.
- **Premium Aesthetics**: Glassmorphism UI, custom scrollbars, and smooth entrance animations.

## 📂 Project Structure
- **`index.html`**: The main interface entry point.
- **`data/resume-data.js`**: **[EDIT HERE]** The core data. Modify this to update your resume content.
- **`assets/js/renderer.js`**: Handles the dynamic rendering and class-based collapsibility logic.
- **`assets/js/ai-bot.js`**: Controls the chat logic and keyword-based interaction.
- **`backend/main.py`**: Flask server optimized for Gemini 1.5/2.5 Flash and Firestore logging.

---

## 🛡️ Security & Cost Control

- **XSS Protection**: Integrated **DOMPurify** to sanitize AI responses, protecting against malicious injections.
- **Access Control**: Backend supports **`ALLOWED_ORIGIN`** environment variable to restrict API usage to your specific domain.
- **Rate Limiting**: Cloud Run capped at `--max-instances 2`; AI button is disabled during processing.
- **Privacy**: Only chat logs are stored in Firestore for improving the digital twin experience.

<br>
<hr>
<br>

# Angela Ko - AI 智慧專業履歷

這是一個兼具現代美感與磨砂玻璃風格 (Glassmorphism) 的個人履歷，搭載了由 Google Gemini 驅動的動態 AI 助教。

## 🌟 核心功能
- **智慧數位分身**：懸浮式 AI 聊天機器人，能回答您的專業背景。
- **動態知識同步**：AI 直接讀取 `resume-data.js`，JSON 更新即自動同步。
- **深度導覽與自動展開**：AI 透過關鍵字偵測（學歷、經歷、榮譽、技能、聯絡）觸發網頁自動捲動與區塊展開。
- **全方位互動式履歷**：
  - **萬用摺疊區塊**：所有大標題皆可自由收合（點擊標題即可）。
  - **經歷分項展開**：每一份工作內容皆有專屬摺疊手風琴。
  - **榮譽勳章泡泡**：點擊獎項即可看到詳細的中英文背景說明。
- **PDF 下載**：預設優化過的列印排版，方便訪客直接存為專業履歷。
- **診斷工具**：內建 `/debug` 路由，方便檢查資料讀取與 Firestore 連線狀態。
- **語系切換**：支援即時切換中英文。
- **對話日誌**：整合 **Google Cloud Firestore** 記錄互動。

---

## 🛡️ 安全性與成本控制
> [!WARNING]
> **GitHub Pages 安全提醒**：由於 GitHub Pages 為靜態託管，`ai-bot.js` 中的 Token 是公開可見的。此 Token 目前僅作為簡單的握手驗證，建議在後端設定 `ALLOWED_ORIGIN` 環境變數以限制僅能從您的網域請求。

- **XSS 防護**：整合 **DOMPurify** 過濾 AI 回覆內容，防止腳本注入攻擊。
- **流量限制**：後端限制執行個體數量，前端限制點擊頻率。
- **費用控制**：建議在 Google Cloud 設定預算警示。

