let chatHistory = [];
const CHAT_API = "https://angela-ai-api-205712367810.asia-east1.run.app"; 
const API_TOKEN = "19961209"; // [SET THIS] Must match API_SECRET_TOKEN in Cloud Run

function toggleChat() {
    const chatbox = document.getElementById("chatbox");
    chatbox.style.display = chatbox.style.display === 'flex' ? 'none' : 'flex';
    if (chatbox.style.display === 'flex' && chatHistory.length === 0) {
        initChat();
    }
}

async function initChat() {
    appendMessage('bot', currentLang === 'zh' ? '大宇宙意識連線中...' : 'Connecting to my digital twin...');
    
    const symbol = `請用${currentLang === 'zh' ? '繁體中文' : 'English'}介紹 Angela Ko，不要超過50字，並詢問對方有什麼問題。`;
    
    try {
        const res = await fetch(`${CHAT_API}/init`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "X-Angela-Twin-Token": API_TOKEN
            },
            body: JSON.stringify({ symbol })
        });
        const data = await res.json();
        chatHistory = data.history;
        
        // Clear "Connecting..." message
        document.getElementById("chatlog").innerHTML = '';
        appendMessage('bot', data.reply);
    } catch (e) {
        appendMessage('bot', "Error: Could not connect to the assistant.");
    }
}

async function sendMessage() {
    const input = document.getElementById("chatInput");
    const sendBtn = document.querySelector("#userInput button");
    const typingIndicator = document.getElementById("typing-indicator");
    const message = input.value.trim();
    if (!message || sendBtn.disabled) return;

    // Set loading state
    sendBtn.disabled = true;
    const originalBtnText = sendBtn.textContent;
    sendBtn.textContent = "...";
    
    // Show typing indicator
    typingIndicator.style.display = 'block';
    typingIndicator.textContent = currentLang === 'zh' ? 'Angela 正在輸入...' : 'Angela is typing...';

    appendMessage('user', message);
    input.value = "";

    try {
        const res = await fetch(`${CHAT_API}/chat`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "X-Angela-Twin-Token": API_TOKEN
            },
            body: JSON.stringify({ message, history: chatHistory })
        });
        const data = await res.json();
        chatHistory = data.history;
        
        // Hide typing indicator before showing result
        typingIndicator.style.display = 'none';
        
        appendMessage('bot', data.reply);
        handleAICommands(data.reply);
    } catch (e) {
        typingIndicator.style.display = 'none';
        appendMessage('bot', "Error: Something went wrong.");
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = originalBtnText;
    }
}

function handleAICommands(text) {
    console.log("Analyzing AI response for commands:", text);
    const sections = [
        { id: 'education', keywords: ['學歷', '學校', '大學', '碩士', '學士', 'education', 'university', 'master', 'bachelor'] },
        { id: 'experience', keywords: ['工作經歷', '經歷', '公司', '專案', 'experience', 'work', 'company', 'project'] },
        { id: 'honors', keywords: ['榮譽', '得獎', '獎項', '證照', 'honors', 'awards', 'certificate'] },
        { id: 'skills', keywords: ['技能', '專長', '工具', 'SQL', 'Python', 'PowerBI', 'skills', 'tools'] },
        { id: 'contact-info', keywords: ['聯絡方式', '聯絡', '信箱', '電話', 'Email', 'contact'] }
    ];

    let firstMatch = null;
    let minIndex = Infinity;

    for (const section of sections) {
        for (const k of section.keywords) {
            const index = text.indexOf(k);
            if (index !== -1 && index < minIndex) {
                minIndex = index;
                firstMatch = section;
            }
        }
    }

    if (firstMatch) {
        const sectionId = firstMatch.id;
        console.log(`Command Matched! Earliest Target: ${sectionId} (at index ${minIndex})`);
        
        // Auto-expand the section if it is collapsed
        const contentEl = document.getElementById(`${sectionId}-content`);
        if (contentEl) {
            const isHidden = window.getComputedStyle(contentEl).display === 'none' || contentEl.style.display === 'none';
            if (isHidden) {
                console.log(`Auto-expanding section: ${sectionId}`);
                if (typeof toggleSection === 'function') {
                    toggleSection(`${sectionId}-content`);
                }
            }
        }

        const el = document.getElementById(sectionId);
        if (el) {
            setTimeout(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('highlight-flash');
                setTimeout(() => el.classList.remove('highlight-flash'), 3000);
            }, 100);
        }
    }
}

function appendMessage(role, text) {
    const log = document.getElementById("chatlog");
    const div = document.createElement("div");
    div.className = `message ${role}`;
    
    // Sanitize the HTML generated by marked to prevent XSS
    const rawHtml = marked.parse(text);
    div.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawHtml) : rawHtml;
    
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

// Draggable logic (Reuse simplified version)
let isDragging = false;
let startX, startY, initialLeft, initialTop;

const chatHeader = document.getElementById("chatHeader");
const chatbox = document.getElementById("chatbox");

chatHeader.onmousedown = (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = chatbox.offsetLeft;
    initialTop = chatbox.offsetTop;
};

document.onmousemove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    chatbox.style.left = `${initialLeft + dx}px`;
    chatbox.style.top = `${initialTop + dy}px`;
    chatbox.style.right = 'auto'; // Break fixed alignment
    chatbox.style.bottom = 'auto';
};

document.onmouseup = () => isDragging = false;
