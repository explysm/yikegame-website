import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, get, push, set, remove, onValue, update } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const CLOUDINARY_CLOUD_NAME = "dhptbygpt";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";

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
    const db = getDatabase(app);
    const auth = getAuth(app);
  
    const postsContainer = document.getElementById("posts-container");
    const newPostSection = document.getElementById("new-post-section");
    const postTitleInput = document.getElementById("post-title");
    const postContentInput = document.getElementById("post-content");
    const postImageInput = document.getElementById("post-image");
    const postTagsInput = document.getElementById("post-tags");
    const createPostBtn = document.getElementById("create-post-btn");
    const prevBtn = document.getElementById("prev-page-btn");
    const nextBtn = document.getElementById("next-page-btn");
    const pageInfoSpan = document.getElementById("page-info");
    const postButton = document.getElementById("post-button");
    const tagSearchInput = document.getElementById("tag-search-input");
    const cancelButton = document.getElementById("cancel-btn");
  
    const postsPerPage = 5;
    let currentPage = 1;
    let currentUserIsDeveloper = false;
    let currentEditingComment = null;
    const postsRef = ref(db, "posts");
    const usersRef = ref(db, "users");
    let allPostsCache = [];
    let usersCache = {};
    let currentFilterTag = null;
  
    function showNotification(message, isSuccess = true) {
        const notificationContainer = document.getElementById("notification-container");
        const notification = document.createElement("div");
        notification.classList.add("notification");
        notification.classList.add(isSuccess ? "success" : "error");
        notification.innerHTML = `<p>${message}</p>`;
  
        notificationContainer.appendChild(notification);
  
        setTimeout(() => {
            notification.style.opacity = "0";
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }
  
    async function fetchUsers() {
        const snapshot = await get(usersRef);
        if (snapshot.exists()) {
            usersCache = snapshot.val();
        }
    }
  
    function fetchPosts(filterTag = null) {
        currentFilterTag = filterTag;
        onValue(postsRef, (snapshot) => {
            const postsData = snapshot.val();
            allPostsCache = [];
            if (postsData) {
                allPostsCache = Object.entries(postsData).map(([key, value]) => ({
                    id: key,
                    ...value
                }));
                allPostsCache.sort((a, b) => b.timestamp - a.timestamp);
            }
  
            let filteredPosts = allPostsCache;
            if (currentFilterTag) {
                filteredPosts = allPostsCache.filter(post => post.tags && post.tags.includes(currentFilterTag));
            }
  
            const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  
            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage >= totalPages;
            pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages || 1}`;
  
            const startIndex = (currentPage - 1) * postsPerPage;
            const paginatedPosts = filteredPosts.slice(startIndex, startIndex + postsPerPage);
  
            renderPosts(paginatedPosts);
        });
    }
  
    function getPfpUrl(authorName) {
        const userKeys = Object.keys(usersCache);
        const user = userKeys.find(key => usersCache[key].displayName === authorName || usersCache[key].email === authorName);
        return user && usersCache[user].photoURL ? usersCache[user].photoURL : "https://res.cloudinary.com/dhptbygpt/image/upload/v1700000000/default-pfp.png";
    }
  
    function renderPosts(posts) {
        postsContainer.innerHTML = "";
        const user = auth.currentUser;
  
        if (posts.length > 0) {
            posts.forEach(post => {
                const postElement = document.createElement("div");
                postElement.classList.add("post-item");
  
                const postAuthorPfp = getPfpUrl(post.author);
  
                let commentsHtml = '';
                if (post.comments) {
                    const sortedComments = Object.entries(post.comments).map(([key, value]) => ({
                        id: key,
                        ...value,
                    })).sort((a, b) => a.timestamp - b.timestamp);
                    commentsHtml = sortedComments.map(comment => {
                        const commentAuthorPfp = getPfpUrl(comment.author);
                        return `
                            <div class="comment-item" data-comment-id="${comment.id}">
                                <div class="comment-header">
                                    <img src="${commentAuthorPfp}" alt="Profile Picture" class="pfp-small">
                                    <p>${comment.text}</p>
                                </div>
                                <small>By ${comment.author} on ${new Date(comment.timestamp).toLocaleString()}</small>
                                <div class="comment-actions">
                                    ${(user && (user.email === comment.author || user.displayName === comment.author)) ? `<button class="edit-comment-btn" data-post-id="${post.id}" data-comment-id="${comment.id}">Edit</button>` : ''}
                                    ${(user && (user.email === comment.author || currentUserIsDeveloper)) ? `<button class="delete-comment-btn" data-post-id="${post.id}" data-comment-id="${comment.id}">Delete</button>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('');
                }
  
                const tagsHtml = (post.tags || []).map(tag => `<span class="tag" data-tag="${tag}">${tag}</span>`).join('');
  
                postElement.innerHTML = `
                    <div class="post-content">
                        <h3>${post.title}</h3>
                        <div class="post-actions">
                            ${currentUserIsDeveloper ? `<button class="delete-post-btn" data-post-id="${post.id}">Delete Post</button>` : ''}
                        </div>
                        <p>${post.content}</p>
                        ${post.imageUrl ? `<img src="${post.imageUrl}" alt="${post.title}" class="post-image-preview">` : ''}
                        <div class="tags-container">${tagsHtml}</div>
                        <div class="post-meta">
                            <img src="${postAuthorPfp}" alt="Profile Picture" class="pfp-small">
                            <small>By ${post.author} on ${new Date(post.timestamp).toLocaleString()}</small>
                        </div>
                    </div>
                    <div class="comments-section">
                        <button class="comments-toggle">Show/Hide Comments (${post.comments ? Object.keys(post.comments).length : 0})</button>
                        <div class="comments-list">
                            ${commentsHtml}
                            <div class="comment-form">
                                <textarea class="input-field comment-input" placeholder="Add a comment..."></textarea>
                                <button class="submit-comment-btn" data-post-id="${post.id}">Submit</button>
                            </div>
                        </div>
                    </div>
                    <div class="divider"></div>
                `;
                postsContainer.appendChild(postElement);
            });
        } else {
            postsContainer.innerHTML = '<p class="info-message">No posts yet. Be the first to create one!</p>';
        }
    }
  
    async function loadPosts() {
        await fetchUsers();
        const user = auth.currentUser;
        currentUserIsDeveloper = false;
        postButton.style.display = "none";
        newPostSection.classList.remove('visible');
  
        if (user) {
            const userRef = ref(db, 'users/' + user.uid);
            const snapshot = await get(userRef);
            if (snapshot.exists() && snapshot.val().isDeveloper === true) {
                currentUserIsDeveloper = true;
                postButton.style.display = "block";
            }
        }
  
        fetchPosts();
    }
  
    onAuthStateChanged(auth, async () => {
        loadPosts();
    });
  
    async function createPost() {
        const title = postTitleInput.value.trim();
        const content = postContentInput.value.trim();
        const imageFile = postImageInput.files[0];
        const tags = postTagsInput.value.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
        const user = auth.currentUser;
  
        if (!user) {
            showNotification("You must be logged in to create a post.", false);
            return;
        }
  
        const userRef = ref(db, 'users/' + user.uid);
        const snapshot = await get(userRef);
        if (!snapshot.exists() || snapshot.val().isDeveloper !== true) {
            showNotification("You do not have permission to create posts.", false);
            return;
        }
  
        if (!title || !content) {
            showNotification("Please enter a title and content for your post.", false);
            return;
        }
  
        createPostBtn.disabled = true;
        createPostBtn.innerText = "Creating...";
  
        let imageUrl = null;
  
        try {
            if (imageFile) {
                const formData = new FormData();
                formData.append("file", imageFile);
                formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
                const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                    method: "POST",
                    body: formData,
                });
                const data = await response.json();
                if (response.ok) {
                    imageUrl = data.secure_url;
                } else {
                    console.error("Cloudinary upload failed:", data);
                    showNotification("Image upload failed. Please try again.", false);
                    return;
                }
            }
  
            const newPostRef = push(ref(db, "posts"));
            await set(newPostRef, {
                title,
                content,
                imageUrl,
                tags,
                author: user.displayName || user.email,
                timestamp: Date.now()
            });
            showNotification("Post created successfully!");
        } catch (error) {
            console.error("Operation failed:", error);
            showNotification("An error occurred. Please try again.", false);
        } finally {
            createPostBtn.disabled = false;
            createPostBtn.innerText = "Create Post";
            postTitleInput.value = "";
            postContentInput.value = "";
            postImageInput.value = "";
            postTagsInput.value = "";
            togglePostForm();
        }
    }
  
    function togglePostForm() {
        newPostSection.classList.toggle('visible');
    }
  
    function hidePostForm() {
        newPostSection.classList.remove('visible');
    }
  
    postButton.addEventListener("click", togglePostForm);
    cancelButton.addEventListener("click", hidePostForm);
    createPostBtn.addEventListener("click", createPost);
  
    tagSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        currentPage = 1;
        if (query) {
            fetchPosts(query);
        } else {
            fetchPosts();
        }
    });
  
    postsContainer.addEventListener('click', async (e) => {
        const user = auth.currentUser;
  
        if (e.target.classList.contains('tag')) {
            const tag = e.target.dataset.tag;
            tagSearchInput.value = tag;
            currentPage = 1;
            fetchPosts(tag);
            return;
        }
  
        if (e.target.classList.contains('submit-comment-btn')) {
            if (!user) {
                showNotification("You must be logged in to comment.", false);
                return;
            }
  
            const postId = e.target.dataset.postId;
            const commentInput = e.target.parentElement.querySelector('.comment-input');
            const commentText = commentInput.value.trim();
  
            if (commentText) {
                if (currentEditingComment && currentEditingComment.postId === postId) {
                    const commentRef = ref(db, `posts/${postId}/comments/${currentEditingComment.commentId}`);
                    await update(commentRef, {
                        text: commentText,
                    });
                    showNotification("Comment updated successfully!");
                    currentEditingComment = null;
                    e.target.innerText = "Submit";
                    commentInput.parentElement.classList.remove('editing');
                } else {
                    const commentsRef = ref(db, `posts/${postId}/comments`);
                    const newCommentRef = push(commentsRef);
                    await set(newCommentRef, {
                        text: commentText,
                        author: user.displayName || user.email,
                        timestamp: Date.now()
                    });
                    showNotification("Comment created successfully!");
                }
                commentInput.value = "";
            }
        }
  
        if (e.target.classList.contains('edit-comment-btn')) {
            const postId = e.target.dataset.postId;
            const commentId = e.target.dataset.commentId;
            const commentItem = e.target.closest('.comment-item');
            const commentText = commentItem.querySelector('p').innerText;
            const postElement = e.target.closest('.post-item');
            const commentInput = postElement.querySelector('.comment-input');
            const submitBtn = postElement.querySelector('.submit-comment-btn');
  
            commentInput.value = commentText;
            submitBtn.innerText = "Update";
            commentInput.focus();
            commentInput.parentElement.classList.add('editing');
            currentEditingComment = { postId, commentId };
        }
  
        if (e.target.classList.contains('delete-comment-btn')) {
            if (!confirm("Are you sure you want to delete this comment?")) return;
            const postId = e.target.dataset.postId;
            const commentId = e.target.dataset.commentId;
            const commentRef = ref(db, `posts/${postId}/comments/${commentId}`);
            await remove(commentRef);
            showNotification("Comment deleted successfully!");
        }
  
        if (e.target.classList.contains('delete-post-btn')) {
            if (!currentUserIsDeveloper) {
                showNotification("You do not have permission to delete posts.", false);
                return;
            }
            if (!confirm("Are you sure you want to delete this post?")) return;
            const postId = e.target.dataset.postId;
            const postRef = ref(db, `posts/${postId}`);
            await remove(postRef);
            showNotification("Post deleted successfully!");
        }
  
        if (e.target.classList.contains('comments-toggle')) {
            const commentsList = e.target.nextElementSibling;
            commentsList.classList.toggle('show');
            if (commentsList.classList.contains('show')) {
                commentsList.style.maxHeight = commentsList.scrollHeight + 'px';
            } else {
                commentsList.style.maxHeight = '0';
            }
        }
  
        if (e.target.classList.contains('post-image-preview')) {
            const imageUrl = e.target.src;
            maximizeImage(imageUrl);
        }
    });
  
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchPosts(currentFilterTag);
        }
    });
  
    nextBtn.addEventListener('click', () => {
        currentPage++;
        fetchPosts(currentFilterTag);
    });
  
    function maximizeImage(imageSrc) {
        const overlay = document.createElement('div');
        overlay.classList.add('image-overlay');
        const imageContainer = document.createElement('div');
        imageContainer.classList.add('image-container');
        const maximizedImg = document.createElement('img');
        maximizedImg.src = imageSrc;
        maximizedImg.classList.add('maximized-image');
        const closeBtn = document.createElement('span');
        closeBtn.classList.add('close-btn');
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => {
            document.body.removeChild(overlay);
        };
        imageContainer.appendChild(maximizedImg);
        imageContainer.appendChild(closeBtn);
        overlay.appendChild(imageContainer);
        document.body.appendChild(overlay);
        overlay.onclick = (e) => {
            if (e.target.classList.contains('image-overlay')) {
                document.body.removeChild(overlay);
            }
        };
    }
  
    document.body.classList.add('fade-enter');
    setTimeout(() => {
        document.body.classList.add('fade-enter-active');
    }, 10);
  
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && !href.startsWith('http')) {
                e.preventDefault();
                document.body.classList.remove('fade-enter-active');
                document.body.classList.add('fade-exit-active');
                setTimeout(() => {
                    window.location.href = href;
                }, 500);
            }
        });
    });
});
