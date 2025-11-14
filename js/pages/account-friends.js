import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAUZZBN9qoM34lsvyEOeK2znSSw6kKMcEE",
    authDomain: "yikegames-website.firebaseapp.com",
    projectId: "yikegames-website",
    databaseURL: "https://yikegames-website-default-rtdb.firebaseio.com/",
    storageBucket: "yikegames-website.firebasestorage.app",
    messagingSenderId: "1086586566551",
    appId: "1:1086586566551:web:b64dfc25e6e6ac5a09b6d2",
    measurementId: "G-FXH0D07D86"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadFriends(user.uid);
    } else {
        window.location.href = '../login/';
    }
});

async function loadFriends(userId) {
    const friendsListContainer = document.getElementById('friends-list-container');
    const friendsRef = ref(db, `users/${userId}/friends`);
    const snapshot = await get(friendsRef);

    if (snapshot.exists()) {
        const friends = snapshot.val();
        const friendUids = Object.keys(friends);
        let friendsHtml = '';

        for (const friendUid of friendUids) {
            const userRef = ref(db, `users/${friendUid}`);
            const userSnapshot = await get(userRef);
            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                let cardStyle = '';
                if (userData.profile) {
                    if (userData.profile.profileBackgroundType === 'image' && userData.profile.profileBackgroundImageUrl) {
                        cardStyle = `style="background-image: url(${userData.profile.profileBackgroundImageUrl}); background-size: cover; background-position: center;"`;
                    } else if (userData.profile.profileBackgroundColor) {
                        cardStyle = `style="background-color: ${userData.profile.profileBackgroundColor};"`;
                    }
                }
                friendsHtml += `
                    <div class="friend-card" ${cardStyle}>
                        <img src="${userData.photoURL || 'https://res.cloudinary.com/dhptbygpt/image/upload/v1700000000/default-pfp.png'}" alt="${userData.displayName}'s Profile Picture">
                        <h4>${userData.displayName}</h4>
                        <a href="../user/index.html?u=${userData.displayName}" class="btn">View Profile</a>
                    </div>
                `;
            }
        }

        friendsListContainer.innerHTML = friendsHtml;
    } else {
        friendsListContainer.innerHTML = '<p>You have no friends yet.</p>';
    }
}

