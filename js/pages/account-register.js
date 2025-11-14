import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { initFadeTransitions } from '../utils/fade-transitions.js';

document.addEventListener('DOMContentLoaded', () => {
    const firebaseConfig = {
        apiKey: "AIzaSyAUZZBN9qoM34lsvyEOeK2znSSw6kKMcEE",
        authDomain: "yikegames-website.firebaseapp.com",
        databaseURL: "https://yikegames-website-default-rtdb.firebaseio.com/",
        projectId: "yikegames-website",
        storageBucket: "yikegames-website.firebasestorage.app",
        messagingSenderId: "1086586566551",
        appId: "1:1086586566551:web:b64dfc25e6e6ac5a09b6d2",
        measurementId: "G-FXH0D07D86"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getDatabase(app);

    window.registerUser = async function() {
        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!username || !email || !password) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            const usernameSnapshot = await get(child(ref(db), `usernames/${username}`));
            if (usernameSnapshot.exists()) {
                alert("This username is already in use. Please choose another.");
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: username });

            await set(ref(db, 'users/' + user.uid), {
                displayName: username,
                email: user.email,
                isDeveloper: false
            });
            await set(ref(db, 'usernames/' + username), user.uid);

            alert(`Account created for ${username}!`);
            window.location.href = "../login/";
        } catch (error) {
            alert(error.message);
        }
    }

    const generateBtn = document.getElementById('generate-btn');
    const emailInput = document.getElementById('email');
    if (generateBtn && emailInput) {
        generateBtn.addEventListener('click', () => {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            const length = 20;
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            emailInput.value = result + '@gmail.com';
        });
    }
    
    initFadeTransitions();
});

