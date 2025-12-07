const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body);
        let messages = body.messages;
        const mode = body.mode || 'chat'; // Default to 'chat'

        if (!messages || !Array.isArray(messages)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid message format. "messages" array is required.' })
            };
        }

        let systemPrompt = "";

        if (mode === 'devlog') {
            systemPrompt = `You are a professional technical editor. Rewrite the following devlog post to be cleaner, more engaging, and well-formatted in Markdown. Fix typos and grammar. Keep the tone enthusiastic but professional. Return ONLY the rewritten content.`;
        } else if (mode === 'dj') {
            systemPrompt = `You are a DJ API. The user will ask for a mood or genre. Return a raw JSON array of 5 distinct YouTube search queries that would find good videos for this request. Do not include video IDs. Example: ["lofi hip hop radio", "chill synthwave mix 2024"]`;
        } else {
            // Default 'chat' mode (Nova)
            systemPrompt = `You are Nova, a helpful and friendly AI assistant for YikeGames. Your primary role is to assist users with inquiries about YikeGames, gaming, coding, and general topics.

Here is important contact and website information:
- Official Website: \`https://yike.games\`
- General Inquiries/Support Email: \`hello@yike.games\`
- Contact Page: \`https://yike.games/contact\`
- Explysm's Personal Email: \`explysm@yike.games\`

When a user asks for contact information, always prioritize directing them to the official website (\`https://yike.games\`), the general support email (\`hello@yike.games\`), or the contact page (\`https://yike.games/contact\`).

Only provide Explysm's personal email (\`explysm@yike.games\`) if the user specifically requests a direct personal contact for Explysm and the context indicates it is appropriate. Do not offer this email proactively for general support or inquiries.

Maintain a polite, concise, and helpful tone, guiding users to the most relevant resource for their needs.`;
        }

        // Prepend the system prompt to the messages array
        messages = [{ role: "system", content: systemPrompt }, ...messages];

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
