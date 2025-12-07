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
        // ... (rest of the function is unchanged) ...
    }

    async function sendMessage() {
        // ... (rest of the function is unchanged) ...
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
