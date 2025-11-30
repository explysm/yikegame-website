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
  
    function generateUniqueId() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    const app = initializeApp(firebaseConfig);
    const urlParams = new URLSearchParams(window.location.search);
    let singlePostId = null;
    // Check if there's a query string and it's not a named parameter
    if (window.location.search.startsWith('?')) {
        const potentialId = window.location.search.substring(1); // Remove the '?'
        // Basic check for a 5-character alphanumeric ID
        if (potentialId.length === 5 && /^[a-zA-Z0-9]+$/.test(potentialId)) {
            singlePostId = potentialId;
        }
    }
    // Fallback for named parameter if needed, though user requested direct ID
    if (!singlePostId) {
        singlePostId = urlParams.get('postId');
    }

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
    const shareLinkModal = document.getElementById("share-link-modal");
    const postShareLinkInput = document.getElementById("post-share-link-input");
    const modalCloseButton = shareLinkModal.querySelector(".close-button");
    const copyModalLinkBtn = document.getElementById("copy-modal-link-btn");
    const richRefBtn = document.getElementById("rich-ref-btn");
    const richRefModal = document.getElementById("rich-ref-modal");
    const richRefModalCloseButton = richRefModal.querySelector(".close-button");

    // Initialize Quill editor
    const quill = new Quill('#editor', {
        theme: 'snow',
        placeholder: 'Write your post content here...',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
                ['blockquote', 'code-block'],

                [{ 'header': 1 }, { 'header': 2 }],               // custom button values
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
                [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
                [{ 'direction': 'rtl' }],                         // text direction

                [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

                [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
                [{ 'font': [] }],
                [{ 'align': [] }],

                ['link', 'image', 'video'],                         // link and image, video

                ['clean']                                         // remove formatting button
            ]
        }
    });


  
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
  
    function fetchPosts(filterTag = null, singlePostId = null) {
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

            let postsToRender = [];
            if (singlePostId) {
                const post = allPostsCache.find(p => p.id === singlePostId);
                if (post) {
                    postsToRender = [post];
                }
                // Hide pagination and post button for single post view
                document.querySelector('.pagination').style.display = 'none';
                postButton.style.display = 'none';
                tagSearchInput.style.display = 'none';
            } else {
                let filteredPosts = allPostsCache;
                if (currentFilterTag) {
                    filteredPosts = allPostsCache.filter(post => post.tags && post.tags.includes(currentFilterTag));
                }

                const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

                prevBtn.disabled = currentPage === 1;
                nextBtn.disabled = currentPage >= totalPages;
                pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages || 1}`;

                const startIndex = (currentPage - 1) * postsPerPage;
                postsToRender = filteredPosts.slice(startIndex, startIndex + postsPerPage);

                // Show pagination and post button for normal view
                document.querySelector('.pagination').style.display = 'flex';
                if (currentUserIsDeveloper) {
                    postButton.style.display = 'block';
                }
                tagSearchInput.style.display = 'block';
            }
            renderPosts(postsToRender);
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
                                    <img src="${commentAuthorPfp}" alt="Profile Picture" class="pfp-small" loading="lazy">
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
                            <button class="share-post-btn" data-post-id="${post.id}">Share</button>
                        </div>
                        <div class="post-body-container">
                            <div class="post-body">${post.content}</div>
                            <button class="read-more-btn" style="display:none;">Read More</button>
                        </div>
                        ${post.imageUrl ? `<img src="${post.imageUrl}" alt="${post.title}" class="post-image-preview" loading="lazy">` : ''}
                        <div class="tags-container">${tagsHtml}</div>
                        <div class="post-meta">
                            <img src="${postAuthorPfp}" alt="Profile Picture" class="pfp-small" loading="lazy">
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

                // Read More functionality
                const postBodyContainer = postElement.querySelector('.post-body-container');
                const postBody = postElement.querySelector('.post-body');
                const readMoreBtn = postElement.querySelector('.read-more-btn');
                const maxHeight = 200; // Max height before truncating

                if (postBody.scrollHeight > maxHeight) {
                    postBody.style.maxHeight = `${maxHeight}px`;
                    postBody.style.overflow = 'hidden';
                    readMoreBtn.style.display = 'block';
                    readMoreBtn.textContent = 'Read More';

                    readMoreBtn.addEventListener('click', () => {
                        if (postBody.style.maxHeight === `${maxHeight}px`) {
                            postBody.style.maxHeight = 'none';
                            readMoreBtn.textContent = 'Show Less';
                        } else {
                            postBody.style.maxHeight = `${maxHeight}px`;
                            readMoreBtn.textContent = 'Read More';
                        }
                    });
                }
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
                if (!singlePostId) { // Only show post button if not in single post view
                    postButton.style.display = "block";
                }
            }
        }
  
        fetchPosts(null, singlePostId);
    }
  
    onAuthStateChanged(auth, async () => {
        loadPosts();
    });
  
    async function createPost() {
        const title = postTitleInput.value.trim();
        const content = quill.root.innerHTML.trim(); // Get content from Quill editor
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
  
            const postId = generateUniqueId();
            const newPostRef = ref(db, `posts/${postId}`);
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
            quill.setContents([]); // Clear Quill editor
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

    // Modal event listeners
    modalCloseButton.addEventListener("click", () => {
        shareLinkModal.style.display = "none";
    });

    window.addEventListener("click", (event) => {
        if (event.target == shareLinkModal) {
            shareLinkModal.style.display = "none";
        }
    });

    copyModalLinkBtn.addEventListener("click", async () => {
        const linkToCopy = postShareLinkInput.value;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(linkToCopy);
                showNotification("Link copied to clipboard!");
                shareLinkModal.style.display = "none";
            } catch (err) {
                console.error('Failed to copy link from modal:', err);
                showNotification(`Failed to copy link: ${err.message || err}`, false);
            }
        } else {
            // Fallback for environments where clipboard.writeText is still not available even in modal
            postShareLinkInput.select();
            document.execCommand("copy");
            showNotification("Link copied to clipboard (manual fallback)!");
            shareLinkModal.style.display = "none";
        }
    });

    // Rich Ref Modal Event Listeners
    richRefBtn.addEventListener("click", () => {
        richRefModal.style.display = "flex";
    });

    richRefModalCloseButton.addEventListener("click", () => {
        richRefModal.style.display = "none";
    });

    window.addEventListener("click", (event) => {
        if (event.target == richRefModal) {
            richRefModal.style.display = "none";
        }
    });
  
    tagSearchInput.addEventListener('input', (e) => {
        if (singlePostId) return; // Do nothing if in single post view
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
            if (singlePostId) return; // Do nothing if in single post view
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
  
        if (e.target.classList.contains('share-post-btn')) {
            const postId = e.target.dataset.postId;
            const postUrl = `${window.location.origin}/post/index.html?${postId}`;

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Check out this post!',
                        url: postUrl,
                    });
                    showNotification("Post shared successfully!");
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Error sharing:', error);
                        showNotification("Failed to share post.", false);
                    }
                }
            } else {
                // Fallback for browsers that do not support the Web Share API
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    try {
                        await navigator.clipboard.writeText(postUrl);
                        showNotification("Post link copied to clipboard!");
                    } catch (err) {
                        console.error('Failed to copy link to clipboard:', err);
                        showNotification(`Failed to copy link to clipboard: ${err.message || err}`, false);
                    }
                } else {
                    // If Clipboard API is not available at all, show modal
                    postShareLinkInput.value = postUrl;
                    shareLinkModal.style.display = "flex"; // Use flex to center
                    postShareLinkInput.select(); // Select the text for easy copying
                    postShareLinkInput.setSelectionRange(0, 99999); // For mobile devices
                }
            }
            return;
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
        if (singlePostId) return; // Do nothing if in single post view
        if (currentPage > 1) {
            currentPage--;
            fetchPosts(currentFilterTag);
        }
    });
  
    nextBtn.addEventListener('click', () => {
        if (singlePostId) return; // Do nothing if in single post view
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
