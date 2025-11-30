import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

document.addEventListener('DOMContentLoaded', async () => {
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
    const db = getDatabase(app);
    const usersRef = ref(db, "users");
    let usersCache = {};

    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.keys().next().value; // Get the first (and only) key as the post ID

    if (!postId) {
        document.getElementById('post-title').textContent = "Post Not Found";
        document.getElementById('post-content').textContent = "No post ID provided in the URL.";
        return;
    }

    async function fetchUsers() {
        const snapshot = await get(usersRef);
        if (snapshot.exists()) {
            usersCache = snapshot.val();
        }
    }

    function getPfpUrl(authorName) {
        const userKeys = Object.keys(usersCache);
        const user = userKeys.find(key => usersCache[key].displayName === authorName || usersCache[key].email === authorName);
        return user && usersCache[user].photoURL ? usersCache[user].photoURL : "https://res.cloudinary.com/dhptbygpt/image/upload/v1700000000/default-pfp.png";
    }

    async function fetchAndRenderPost(postId) {
        await fetchUsers(); // Ensure users are cached for PFP
        const postRef = ref(db, `posts/${postId}`);
        const snapshot = await get(postRef);

        if (snapshot.exists()) {
            const post = snapshot.val();
            document.getElementById('page-title').textContent = post.title;
            document.getElementById('post-title').textContent = post.title;
            document.getElementById('post-content').innerHTML = post.content.replace(/\n/g, '<br>'); // Preserve newlines

            const postAuthorPfp = getPfpUrl(post.author);
            document.getElementById('post-author-pfp').src = postAuthorPfp;
            document.getElementById('post-author').textContent = post.author;
            document.getElementById('post-date').textContent = new Date(post.timestamp).toLocaleString();

            const postImage = document.getElementById('post-image');
            if (post.imageUrl) {
                postImage.src = post.imageUrl;
                postImage.style.display = 'block';
            } else {
                postImage.style.display = 'none';
            }

            updateMetaTags(post, postAuthorPfp);

        } else {
            document.getElementById('post-title').textContent = "Post Not Found";
            document.getElementById('post-content').textContent = "The requested post does not exist.";
            document.getElementById('post-author-pfp').style.display = 'none';
            document.getElementById('post-author').textContent = '';
            document.getElementById('post-date').textContent = '';
        }
    }

    function updateMetaTags(post, pfpUrl) {
        const currentUrl = window.location.href;
        const defaultImage = "https://res.cloudinary.com/dhptbygpt/image/upload/v1700000000/yikegames.png"; // Default image for OG if post has none

        // Helper to set meta tags
        const setMeta = (property, content) => {
            let element = document.querySelector(`meta[property='${property}']`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute('property', property);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        // Open Graph
        setMeta('og:url', currentUrl);
        setMeta('og:title', post.title);
        setMeta('og:description', post.content.substring(0, 150) + '...'); // Truncate description
        setMeta('og:image', post.imageUrl || defaultImage);
        setMeta('og:type', 'article');

        // Twitter Card
        setMeta('twitter:url', currentUrl);
        setMeta('twitter:title', post.title);
        setMeta('twitter:description', post.content.substring(0, 150) + '...');
        setMeta('twitter:image', post.imageUrl || defaultImage);
        setMeta('twitter:card', 'summary_large_image');
    }

    fetchAndRenderPost(postId);
});
