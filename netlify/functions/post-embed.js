const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const db = admin.database();

exports.handler = async (event, context) => {
    const postId = event.queryStringParameters.postId;

    if (!postId) {
        return {
            statusCode: 400,
            body: 'Missing postId query parameter.'
        };
    }

    try {
        const postRef = db.ref(`posts/${postId}`);
        const snapshot = await postRef.once('value');
        const post = snapshot.val();

        if (!post) {
            return {
                statusCode: 404,
                body: 'Post not found.'
            };
        }

        const postUrl = `${process.env.URL}/post/index.html?${postId}`; // Use Netlify's URL env var
        const imageUrl = post.imageUrl || `${process.env.URL}/assets/icon/yikegames.png`; // Default image
        const description = post.content ? post.content.substring(0, 150) + '...' : 'Check out this post on YikeGame!';

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${post.title}</title>

                <!-- Open Graph / Facebook -->
                <meta property="og:type" content="article">
                <meta property="og:url" content="${postUrl}">
                <meta property="og:title" content="${post.title}">
                <meta property="og:description" content="${description}">
                <meta property="og:image" content="${imageUrl}">

                <!-- Twitter -->
                <meta property="twitter:card" content="summary_large_image">
                <meta property="twitter:url" content="${postUrl}">
                <meta property="twitter:title" content="${post.title}">
                <meta property="twitter:description" content="${description}">
                <meta property="twitter:image" content="${imageUrl}">

                <!-- Redirect to the actual client-side page for browsers -->
                <meta http-equiv="refresh" content="0; url=${postUrl}">
                <link rel="canonical" href="${postUrl}">
            </head>
            <body>
                If you are not redirected automatically, follow this <a href="${postUrl}">link to the post</a>.
            </body>
            </html>
        `;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html',
            },
            body: html,
        };
    } catch (error) {
        console.error('Error in post-embed function:', error);
        return {
            statusCode: 500,
            body: `Error fetching post: ${error.message}`
        };
    }
};
