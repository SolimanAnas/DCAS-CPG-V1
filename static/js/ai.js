/* ========== AI Chat Widget – with markdown rendering ========== */

(function() {
    "use strict";

    // ---------- CONFIGURATION ----------
    const API_ENDPOINT = 'https://dcas-cpg-v1.onrender.com/api/chat';  // relative URL to your Flask backend

    // ---------- UTILITY: LOAD MARKED IF MISSING ----------
    function loadMarked(callback) {
        if (window.marked) {
            callback();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
        script.onload = callback;
        script.onerror = () => {
            console.error('Failed to load marked.js – markdown will not be rendered');
            callback(); // proceed without markdown
        };
        document.head.appendChild(script);
    }

    // ---------- DOM ELEMENT CREATION ----------
    function createChatElements() {
        // Prevent duplicate widgets
        if (document.getElementById('aiChatButton')) return;

        // Floating button
        const chatButton = document.createElement('button');
        chatButton.className = 'ai-chat-button';
        chatButton.innerHTML = '🤖';
        chatButton.setAttribute('aria-label', 'Open AI Chat');
        chatButton.id = 'aiChatButton';

        // Chat window
        const chatWindow = document.createElement('div');
        chatWindow.className = 'ai-chat-window';
        chatWindow.id = 'aiChatWindow';
        chatWindow.innerHTML = `
            <div class="ai-chat-header">
                <span>💬 DCAS AI Assistant</span>
                <button class="ai-chat-close" id="aiChatClose">✕</button>
            </div>
            <div class="ai-chat-messages" id="aiChatMessages">
                <div class="message assistant">Hello! Ask me anything about DCAS CPG 2025 guidelines.</div>
            </div>
            <div class="ai-chat-input-area">
                <input type="text" id="aiChatInput" placeholder="Type your question..." />
                <button id="aiChatSend">Send</button>
            </div>
        `;

        document.body.appendChild(chatButton);
        document.body.appendChild(chatWindow);

        // References
        const btn = chatButton;
        const windowEl = chatWindow;
        const closeBtn = document.getElementById('aiChatClose');
        const messagesEl = document.getElementById('aiChatMessages');
        const inputEl = document.getElementById('aiChatInput');
        const sendBtn = document.getElementById('aiChatSend');

        // State
        let isOpen = false;

        // Toggle functions
        function openChat() {
            windowEl.classList.add('open');
            btn.classList.add('hidden');
            isOpen = true;
            inputEl.focus();
        }

        function closeChat() {
            windowEl.classList.remove('open');
            btn.classList.remove('hidden');
            isOpen = false;
        }

        // Event listeners
        btn.addEventListener('click', openChat);
        closeBtn.addEventListener('click', closeChat);

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (isOpen && !windowEl.contains(e.target) && !btn.contains(e.target)) {
                closeChat();
            }
        });

        // ---------- MESSAGE HANDLING ----------
        async function sendMessage() {
            const text = inputEl.value.trim();
            if (!text) return;

            // Disable input & button while waiting
            inputEl.disabled = true;
            sendBtn.disabled = true;

            // Add user message (plain text)
            addMessage(text, 'user');
            inputEl.value = '';

            // Show typing indicator
            const typingId = showTypingIndicator();

            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text })
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const data = await response.json();
                removeTypingIndicator(typingId);

                // Render markdown if marked is available
                if (window.marked) {
                    // marked.parse returns HTML string
                    const html = window.marked.parse(data.reply);
                    addMessage(html, 'assistant', true);
                } else {
                    // fallback: display as plain text
                    addMessage(data.reply, 'assistant', false);
                }
            } catch (error) {
                removeTypingIndicator(typingId);
                addMessage(`Error: ${error.message}`, 'error');
            } finally {
                inputEl.disabled = false;
                sendBtn.disabled = false;
                inputEl.focus();
            }
        }

        function addMessage(content, role, isHtml = false) {
            const msgDiv = document.createElement('div');
            msgDiv.className = `message ${role}`;
            if (isHtml) {
                msgDiv.innerHTML = content;
            } else {
                msgDiv.textContent = content;
            }
            messagesEl.appendChild(msgDiv);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function showTypingIndicator() {
            const id = 'typing-' + Date.now();
            const typingDiv = document.createElement('div');
            typingDiv.className = 'message assistant typing';
            typingDiv.id = id;
            typingDiv.textContent = '🤖 ...';
            messagesEl.appendChild(typingDiv);
            messagesEl.scrollTop = messagesEl.scrollHeight;
            return id;
        }

        function removeTypingIndicator(id) {
            const el = document.getElementById(id);
            if (el) el.remove();
        }

        // Attach send events
        sendBtn.addEventListener('click', sendMessage);
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // ---------- INITIALISE WHEN DOM READY, LOADING MARKED FIRST ----------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadMarked(createChatElements);
        });
    } else {
        loadMarked(createChatElements);
    }
})();