import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDatabase, ref, get, query, orderByChild, startAt, endAt } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

// --- Firebase Config ---
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
const auth = getAuth(app);
const db = getDatabase(app);

// --- Electron Update Notification ---
async function checkForNewRelease() {
    if (typeof window.electronAPI === 'undefined') return;
    try {
        const CURRENT_TAG = await window.electronAPI.getCurrentTag();
        if (CURRENT_TAG === "unknown-tag") return;

        const REPO = "explysm/yikegames";
        const notificationArea = document.getElementById("update-notification");
        const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
        const latestRelease = await res.json();
        const LATEST_TAG = latestRelease.tag_name;

        if (LATEST_TAG !== CURRENT_TAG) {
            notificationArea.style.display = 'block';
            notificationArea.innerHTML = `
                <p class="warning1" style="color: red; font-weight: bold;">
                    📢 New App Update Available! Your version: ${CURRENT_TAG}, Latest: 
                    <a href="${latestRelease.html_url}" target="_blank">Version ${LATEST_TAG}</a>.
                </p>`;
        }
    } catch (err) { console.error("Update check error:", err); }
}

// --- Auth State Update ---
onAuthStateChanged(auth, user => {
    const loginBtnAnchor = document.getElementById("login-register-btn");
    const loginBtnButton = loginBtnAnchor.querySelector('button');
    if (user && loginBtnButton) {
        loginBtnButton.textContent = "Account";
        loginBtnAnchor.href = "account/account/";
    }
});

// --- Fetch GitHub Commits ---
async function loadCommits(repo, listId, branch = 'main') {
    const list = document.getElementById(listId);
    list.innerHTML = "<li>Loading commits...</li>";
    try {
        const res = await fetch(`https://api.github.com/repos/${repo}/commits?sha=${branch}`);
        const commits = await res.json();
        list.innerHTML = "";
        commits.slice(0,5).forEach(c => {
            const li = document.createElement("li");
            const lines = c.commit.message.split('\n');
            const title = lines[0];
            const body = lines.slice(1).join('\n').trim();
            if (body) {
                li.innerHTML = `
                <details>
                    <summary><strong>${c.commit.author.name}</strong>: ${title}</summary>
                    <pre style="white-space: pre-wrap; font-family: inherit;">${body}</pre>
                    <small>${new Date(c.commit.author.date).toLocaleString()}</small>
                </details>`;
            } else {
                li.innerHTML = `<strong>${c.commit.author.name}</strong>: ${title}<br>
                <small>${new Date(c.commit.author.date).toLocaleString()}</small>`;
            }
            list.appendChild(li);
        });
    } catch (err) { 
        console.error("Commit fetch error:", err);
        list.innerHTML = "<li>Could not load commits.</li>";
    }
}

// --- Commit Toggle ---
function toggleCommits(showId) {
    const appContainer = document.getElementById('app-commits-container');
    const gameContainer = document.getElementById('game-commits-container');
    const appButton = document.getElementById('toggle-app-commits');
    const gameButton = document.getElementById('toggle-game-commits');

    appContainer.classList.remove('active');
    gameContainer.classList.remove('active');
    appButton.classList.remove('active');
    gameButton.classList.remove('active');

    if (showId === 'app-commits-container') {
        appContainer.classList.add('active');
        appButton.classList.add('active');
    } else if (showId === 'game-commits-container') {
        gameContainer.classList.add('active');
        gameButton.classList.add('active');
    }
}

// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    // Load commits
    loadCommits("explysm/yikegame-website","commit-list", "website");
    loadCommits("explysm/Games","commit-list-games");

    // Toggle buttons
    document.getElementById('toggle-app-commits').addEventListener('click', () => toggleCommits('app-commits-container'));
    document.getElementById('toggle-game-commits').addEventListener('click', () => toggleCommits('game-commits-container'));

    toggleCommits('app-commits-container');

    // Search modal
    const searchIcon = document.getElementById('search-icon');
    const searchModal = document.getElementById('search-modal');
    const closeSearchModalBtn = document.getElementById('close-search-modal');
    const searchForm = document.getElementById('search-form');
    const searchUsernameInput = document.getElementById('search-username');
    const searchStatus = document.getElementById('search-status');

    searchIcon.addEventListener('click', () => searchModal.classList.remove('hidden'));
    closeSearchModalBtn.addEventListener('click', () => searchModal.classList.add('hidden'));

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const searchTerm = searchUsernameInput.value.trim();

        if (!searchTerm) return;

        searchStatus.innerHTML = 'Searching...';

        try {
            const usersRef = ref(db, 'users');
            const userQuery = query(usersRef, orderByChild('displayName'), startAt(searchTerm), endAt(searchTerm + '\uf8ff'));
            const snapshot = await get(userQuery);

            if (snapshot.exists()) {
                const usersData = snapshot.val();
                let resultsHtml = '<ul class="search-results-list">';

                for (const uid in usersData) {
                    const user = usersData[uid];
                    resultsHtml += `
                        <li class="search-result-item">
                            <a href="user/index.html?u=${user.displayName}">
                                <img src="${user.photoURL || 'https://res.cloudinary.com/dhptbygpt/image/upload/v1700000000/default-pfp.png'}" alt="${user.displayName}'s profile picture">
                                <span>${user.displayName}</span>
                            </a>
                        </li>
                    `;
                }

                resultsHtml += '</ul>';
                searchStatus.innerHTML = resultsHtml;
            } else {
                searchStatus.textContent = `No users found starting with "${searchTerm}".`;
            }
        } catch (err) {
            console.error(err);
            searchStatus.textContent = 'Error searching for user.';
        }
    });

    // Fade transitions
    document.body.classList.add('fade-enter');
    setTimeout(() => document.body.classList.add('fade-enter-active'), 10);
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && !href.startsWith('http')) {
                e.preventDefault();
                document.body.classList.remove('fade-enter-active');
                document.body.classList.add('fade-exit-active');
                setTimeout(() => { window.location.href = href; }, 500);
            }
        });
    });

    // Run Electron update check
    checkForNewRelease();
});

