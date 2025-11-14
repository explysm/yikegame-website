import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, onChildAdded } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
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
        const friendRequestsRef = ref(db, `users/${user.uid}/profile/friendRequests`);
        onChildAdded(friendRequestsRef, (snapshot) => {
            const notificationContainer = document.getElementById('notification-container');
            const notification = document.createElement('div');
            notification.classList.add('notification');
            notification.innerHTML = `<p>You have a new friend request!</p>`;
            notificationContainer.appendChild(notification);
            notificationContainer.classList.remove('hidden');

            setTimeout(() => {
                notification.remove();
                if (notificationContainer.children.length === 0) {
                    notificationContainer.classList.add('hidden');
                }
            }, 5000);
        });
    }
});

