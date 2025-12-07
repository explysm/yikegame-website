import { marked } from "https://cdn.jsdelivr.net/npm/marked@15.0.3/lib/marked.esm.js";

document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const typingIndicator = document.getElementById('typing-indicator');
    const clearChatBtn = document.getElementById('clear-chat-btn');

    // State
    let messages = []; // Frontend messages array now only holds user/assistant turns

    // Load history from local storage if available
    const savedHistory = localStorage.getItem('yikegames_ai_chat_history');
    if (savedHistory) {
        try {
            const parsed = JSON.parse(savedHistory);
            if (Array.isArray(parsed)) {
                // Filter out any system messages if they were accidentally saved
                messages = parsed.filter(msg => msg.role !== 'system');
                // Render history
                messages.forEach(msg => addMessageToUI(msg.role, msg.content, false));
            }
        } catch (e) {
            console.error("Failed to load chat history", e);
        }
    }

    // If no history, ensure the initial AI greeting from HTML is kept, or add one programmatically.
    // The initial greeting is already in index.html, so no need to add again here.
    // The 'messages' array only contains actual turns sent to the backend.

    // Auto-scroll to bottom
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    scrollToBottom();

    // Add message to UI
    function addMessageToUI(role, text, animate = true) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', role === 'user' ? 'user' : 'ai');

        const avatarImg = document.createElement('img');
        avatarImg.classList.add('message-avatar');
        if (role === 'user') {
            avatarImg.src = '../../assets/pfp/default-pfp.png';
            avatarImg.alt = 'User';
        } else {
            avatarImg.src = '../../assets/icon/yikegames.png';
            avatarImg.alt = 'AI';
        }

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        const authorSpan = document.createElement('span');
        authorSpan.classList.add('message-author');
        authorSpan.textContent = role === 'user' ? 'You' : 'Nova AI';

        const textDiv = document.createElement('div');
        textDiv.classList.add('message-text');

        if (role === 'ai' || role === 'assistant') {
            textDiv.innerHTML = marked.parse(text);
        } else {
            const p = document.createElement('p');
            p.textContent = text;
            textDiv.appendChild(p);
        }

        contentDiv.appendChild(authorSpan);
        contentDiv.appendChild(textDiv);

        messageDiv.appendChild(avatarImg);
        messageDiv.appendChild(contentDiv);

        chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto'; // Reset height if it was expanded

        // Add user message to UI and state
        addMessageToUI('user', text);
        messages.push({ role: 'user', content: text });
        saveHistory();

        // Show typing state
        typingIndicator.classList.add('visible');
        sendBtn.disabled = true;

        try {
            const response = await fetch('/.netlify/functions/ai-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages: messages })
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const data = await response.json();
            
            // Expected format from OpenAI/OpenRouter: data.choices[0].message.content
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                const aiResponse = data.choices[0].message.content;
                
                // Add AI message to UI and state
                addMessageToUI('ai', aiResponse);
                messages.push({ role: 'assistant', content: aiResponse });
                saveHistory();
            } else {
                throw new Error('Invalid response format from server');
            }

        } catch (error) {
            console.error('Error sending message:', error);
            addMessageToUI('ai', `*Sorry, I encountered an error: ${error.message}*`);
        } finally {
            typingIndicator.classList.remove('visible');
            sendBtn.disabled = false;
            messageInput.focus();
        }
    }

    function saveHistory() {
        // Limit history to last 50 messages to save space
        const historyToSave = messages.slice(-50); // messages already excludes system prompt
        localStorage.setItem('yikegames_ai_chat_history', JSON.stringify(historyToSave));
    }

    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    clearChatBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear the chat history?")) {
            localStorage.removeItem('yikegames_ai_chat_history');
            messages = []; // Clear all user/assistant messages
            chatContainer.innerHTML = ''; // Clear UI
            // Add initial greeting after clearing
            addMessageToUI('ai', "Hello! I am Nova. How can I assist you today?");
        }
    });
});
