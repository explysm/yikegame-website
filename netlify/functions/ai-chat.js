const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body);
        const messages = body.messages;

        if (!messages || !Array.isArray(messages)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid message format. "messages" array is required.' })
            };
        }

        // Call OpenRouter API
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.MAIN_OPENROUTER_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://yikegames.netlify.app", // Optional, for OpenRouter rankings
                "X-Title": "YikeGames AI Chat" // Optional
            },
            body: JSON.stringify({
                "model": "amazon/nova-2-lite-v1:free",
                "messages": messages
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter API Error:", errorText);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `OpenRouter API Error: ${response.statusText}`, details: errorText })
            };
        }

        const data = await response.json();

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error("Server Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    }
};
