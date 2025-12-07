import { marked } from "https://cdn.jsdelivr.net/npm/marked@15.0.3/lib/marked.esm.js";

document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const typingIndicator = document.getElementById('typing-indicator');
    const clearChatBtn = document.getElementById('clear-chat-btn');

    // State
    let messages = [
        { role: "system", content: "You are Nova, a helpful and friendly AI assistant for YikeGames. You are knowledgeable about gaming, coding, and general topics. Be concise but helpful." }
    ];

    // Load history from local storage if available
    const savedHistory = localStorage.getItem('yikegames_ai_chat_history');
    if (savedHistory) {
        try {
            const parsed = JSON.parse(savedHistory);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Keep the system prompt always at index 0, or merge
                if (parsed[0].role !== 'system') {
                    messages = [messages[0], ...parsed];
                } else {
                    messages = parsed;
                }
                // Render history
                // Skip system message (index 0)
                messages.slice(1).forEach(msg => addMessageToUI(msg.role, msg.content, false));
            }
        } catch (e) {
            console.error("Failed to load chat history", e);
        }
    }

    // Auto-scroll to bottom
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    scrollToBottom();

    // Add message to UI
    function addMessageToUI(role, text, animate = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'user' ? 'user' : 'ai'}`;
        
        // Avatar
        const avatarImg = document.createElement('img');
        avatarImg.className = 'message-avatar';
        if (role === 'user') {
            // Try to get user pfp from local storage or default (simplified)
            // Ideally we'd grab it from firebase auth state but let's keep it simple for now
            // or use a generic user icon
            avatarImg.src = "../../assets/pfp/default-pfp.png"; 
            avatarImg.onerror = () => { avatarImg.src = "https://ui-avatars.com/api/?name=User&background=01edf0&color=fff"; };
        } else {
            avatarImg.src = "../../assets/icon/yikegames.png";
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const authorSpan = document.createElement('span');
        authorSpan.className = 'message-author';
        authorSpan.textContent = role === 'user' ? 'You' : 'Nova AI';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        
        if (role === 'ai') {
            // Parse Markdown
            textDiv.innerHTML = marked.parse(text);
        } else {
            // Text only for user to prevent XSS (though marked handles it usually, simple text is safer for user input display)
            const p = document.createElement('p');
            p.textContent = text;
            textDiv.appendChild(p);
        }
        
        contentDiv.appendChild(authorSpan);
        contentDiv.appendChild(textDiv);
        
        messageDiv.appendChild(avatarImg);
        messageDiv.appendChild(contentDiv);
        
        if (!animate) {
            messageDiv.style.animation = 'none';
        }

        chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        // UI Updates
        messageInput.value = '';
        messageInput.disabled = true;
        sendBtn.disabled = true;
        typingIndicator.classList.add('visible');
        
        // Add User Message
        addMessageToUI('user', text);
        messages.push({ role: "user", content: text });
        saveHistory();

        try {
            const response = await fetch('/.netlify/functions/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: messages })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server Error: ${response.status}`);
            }

            const data = await response.json();
            
            // Check structure of OpenRouter/OpenAI response
            const aiText = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
            
            // Add AI Message
            addMessageToUI('ai', aiText);
            messages.push({ role: "assistant", content: aiText });
            saveHistory();

        } catch (error) {
            console.error("Chat Error:", error);
            addMessageToUI('ai', `**Error:** ${error.message}. Please try again later.`);
            // Remove the user message from history if it failed? Or keep it?
            // Usually keeping it is fine, but maybe we don't save the error message to history context
        } finally {
            messageInput.disabled = false;
            sendBtn.disabled = false;
            messageInput.focus();
            typingIndicator.classList.remove('visible');
        }
    }

    function saveHistory() {
        // Limit history to last 50 messages to save space
        const historyToSave = messages.slice(-50);
        // Ensure system prompt is preserved if we splice
        if (historyToSave[0].role !== 'system') {
           // It's fine, we re-add system prompt on load if missing at index 0
        }
        localStorage.setItem('yikegames_ai_chat_history', JSON.stringify(messages));
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
            messages = [messages[0]]; // Keep system prompt
            chatContainer.innerHTML = '';
            // Add initial greeting again
            addMessageToUI('ai', "Chat history cleared. How can I help you now?");
        }
    });
});
