
const fetch = require('node-fetch');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (ensure your Netlify environment variables are set for Firebase)
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://yikegames-website-default-rtdb.firebaseio.com/",
    });
  } catch (error) {
    console.error("Firebase initialization error:", error);
    throw new Error("Failed to initialize Firebase Admin SDK.");
  }
}

exports.handler = async (event, context) => {
  try {
    const { userId } = event.queryStringParameters;

    if (!userId) {
      return {
        statusCode: 400,
        body: 'Missing userId query parameter.',
      };
    }

    const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

    if (!LASTFM_API_KEY) {
      console.error("Missing Last.fm API key.");
      return {
        statusCode: 500,
        body: 'Server configuration error: Last.fm API key is not set.',
      };
    }

    const db = admin.database();
    const userRef = db.ref(`users/${userId}/lastfm`);
    const snapshot = await userRef.once('value');
    const lastfmData = snapshot.val();

    if (!lastfmData || !lastfmData.sessionKey || !lastfmData.username) {
      return {
        statusCode: 404,
        body: 'Last.fm session key or username not found for this user.',
      };
    }

    const username = lastfmData.username;

    // Fetch recent tracks from Last.fm
    const lastfmApiUrl = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${LASTFM_API_KEY}&limit=1&format=json`;

    const response = await fetch(lastfmApiUrl);
    const data = await response.json();

    if (data.error) {
      console.error("Last.fm API error:", data.message);
      return {
        statusCode: 500,
        body: `Last.fm API error: ${data.message}`,
      };
    }

    const recentTracks = data.recenttracks;

    if (!recentTracks || !recentTracks.track || recentTracks.track.length === 0) {
      return {
        statusCode: 404,
        body: 'No recent tracks found for this user.',
      };
    }

    const currentTrack = recentTracks.track[0];

    // Check if the track is currently playing
    if (currentTrack['@attr'] && currentTrack['@attr'].nowplaying === 'true') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentTrack),
      };
    } else {
      return {
        statusCode: 404,
        body: 'No song currently playing.',
      };
    }

  } catch (error) {
    console.error("Error in Last.fm song function:", error);
    return {
      statusCode: 500,
      body: `Internal Server Error: ${error.message}`,
    };
  }
};
