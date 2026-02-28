(function() {
    "use strict";

    // Configuration
    const API_ENDPOINT = '/api/chat';  // relative URL to your Flask backend

    // Create DOM elements
    const chatButton = document.createElement('button');
    chatButton.className = 'ai-chat-button';
    chatButton.innerHTML = '🤖';
    chatButton.setAttribute('aria-label', 'Open AI Chat');
    chatButton.id = 'aiChatButton';

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

    // Append to body
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

    // Toggle chat window
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

    btn.addEventListener('click', openChat);
    closeBtn.addEventListener('click', closeChat);

    // Send message
    async function sendMessage() {
        const text = inputEl.value.trim();
        if (!text) return;

        // Disable input & button while waiting
        inputEl.disabled = true;
        sendBtn.disabled = true;

        // Add user message
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
            // Remove typing indicator
            removeTypingIndicator(typingId);
            // Add assistant message (markdown rendered)
            addMessage(data.reply, 'assistant');
        } catch (error) {
            removeTypingIndicator(typingId);
            addMessage(`Error: ${error.message}`, 'error');
        } finally {
            inputEl.disabled = false;
            sendBtn.disabled = false;
            inputEl.focus();
        }
    }

    function addMessage(text, role) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        if (role === 'assistant') {
            // Render markdown
            msgDiv.innerHTML = marked.parse(text);
        } else {
            msgDiv.textContent = text;
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

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Close chat when clicking outside (optional)
    document.addEventListener('click', (e) => {
        if (isOpen && !windowEl.contains(e.target) && !btn.contains(e.target)) {
            closeChat();
        }
    });
})();