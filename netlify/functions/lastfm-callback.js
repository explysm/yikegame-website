
const fetch = require('node-fetch');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (ensure your Netlify environment variables are set for Firebase)
// Example: FIREBASE_SERVICE_ACCOUNT_KEY should be a JSON string of your service account key
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://yikegames-website-default-rtdb.firebaseio.com/",
    });
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // Exit if Firebase cannot be initialized, as it's a critical dependency
    throw new Error("Failed to initialize Firebase Admin SDK.");
  }
}

exports.handler = async (event, context) => {
  try {
    const { token, userId } = event.queryStringParameters;

    if (!token || !userId) {
      return {
        statusCode: 400,
        body: 'Missing Last.fm token or userId.',
      };
    }

    const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
    const LASTFM_SHARED_SECRET = process.env.LASTFM_SHARED_SECRET;

    if (!LASTFM_API_KEY || !LASTFM_SHARED_SECRET) {
      console.error("Missing Last.fm API key or shared secret.");
      return {
        statusCode: 500,
        body: 'Server configuration error: Last.fm API keys are not set.',
      };
    }

    // 1. Request a session key from Last.fm
    const lastfmApiUrl = `http://ws.audioscrobbler.com/2.0/?method=auth.getSession&api_key=${LASTFM_API_KEY}&token=${token}&api_sig=${generateApiSignature(LASTFM_API_KEY, LASTFM_SHARED_SECRET, token)}&format=json`;

    const response = await fetch(lastfmApiUrl);
    const data = await response.json();

    if (data.error) {
      console.error("Last.fm API error:", data.message);
      return {
        statusCode: 500,
        body: `Last.fm API error: ${data.message}`,
      };
    }

    const sessionKey = data.session.key;
    const username = data.session.name;

    // 2. Save session key and userId to Firebase Realtime Database
    const db = admin.database();
    const userRef = db.ref(`users/${userId}/lastfm`);

    await userRef.set({
      sessionKey: sessionKey,
      username: username,
      linkedAt: admin.database.ServerValue.TIMESTAMP,
    });

    // 3. Redirect the user to the profile page with a success message
    return {
      statusCode: 302,
      headers: {
        Location: `/user/index.html?lastfm_linked=success`,
      },
    };

  } catch (error) {
    console.error("Error in Last.fm callback function:", error);
    return {
      statusCode: 500,
      body: `Internal Server Error: ${error.message}`,
    };
  }
};

// Helper function to generate Last.fm API signature
function generateApiSignature(apiKey, sharedSecret, token) {
  const crypto = require('crypto');
  const params = {
    method: 'auth.getSession',
    api_key: apiKey,
    token: token,
  };

  const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
    acc += `${key}${params[key]}`;
    return acc;
  }, '');

  const signature = crypto.createHash('md5').update(sortedParams + sharedSecret).digest('hex');
  return signature;
}
