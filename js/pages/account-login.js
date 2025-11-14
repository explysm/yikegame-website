import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAUZZBN9qoM34lsvyEOeK2znSSw6kKMcEE",
    authDomain: "yikegames-website.firebaseapp.com",
    projectId: "yikegames-website",
    storageBucket: "yikegames-website.firebasestorage.app",
    messagingSenderId: "1086586566551",
    appId: "1:1086586566551:web:b64dfc25e6e6ac5a09b6d2",
    measurementId: "G-FXH0D07D86"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.logInUser = async function() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        alert(`Welcome back, ${userCredential.user.email}!`);
        window.location.href = "../../index.html";
    } catch (error) {
        alert(error.message);
    }
}

