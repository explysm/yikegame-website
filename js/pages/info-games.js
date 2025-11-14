import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDatabase, ref, push, onValue, get, remove, update } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

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
    
    const CLOUDINARY_CLOUD_NAME = "dhptbygpt";
    const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";

    let app;
    let auth;
    let db;
    let currentUserIsDeveloper = false;
    let currentUserId = null;
    let allGamesData = {};

    const gamesGrid = document.getElementById('games-grid');
    const developerControls = document.getElementById('developer-controls');
    const addGameButton = document.getElementById('add-game-button');
    const addGameModal = document.getElementById('add-game-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const gameForm = document.getElementById('game-form');
    const submitButton = document.getElementById('submit-button');
    const submitText = document.getElementById('submit-text');
    const submitSpinner = document.getElementById('submit-spinner');
    const notificationContainer = document.getElementById('notification-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const editGameModal = document.getElementById('edit-game-modal');
    const closeEditModalButton = document.getElementById('close-edit-modal-button');
    const editGameForm = document.getElementById('edit-game-form');
    const editSubmitButton = document.getElementById('edit-submit-button');
    const editSubmitText = document.getElementById('edit-submit-text');
    const editSubmitSpinner = document.getElementById('edit-submit-spinner');
    const editUploadStatus = document.getElementById('edit-upload-status');

    function showNotification(message, isSuccess) {
        const notification = document.createElement('div');
        notification.className = `notification ${isSuccess ? 'success' : 'error'}`;
        notification.textContent = message;
        notificationContainer.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }

    function toggleLoading(isLoading, submitBtn, submitTxt, submitSpin) {
        if (isLoading) {
            submitTxt.classList.add('hidden');
            submitSpin.classList.remove('hidden');
            submitBtn.disabled = true;
        } else {
            submitTxt.classList.remove('hidden');
            submitSpin.classList.add('hidden');
            submitBtn.disabled = false;
        }
    }

    async function uploadImageToCloudinary(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Image upload failed');
            }

            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error("Cloudinary upload error:", error);
            throw error;
        }
    }

    function renderGameCard(key, gameData) {
        const gameCard = document.createElement('div');
        gameCard.id = `game-${key}`;
        gameCard.className = 'game-card';
        
        const developerControlsHTML = currentUserIsDeveloper ? `
            <div class="developer-overlay">
                <button 
                    class="delete-btn js-delete-btn" 
                    data-game-id="${key}" 
                >
                    DELETE
                </button>
                <button 
                    class="edit-btn js-edit-btn" 
                    data-game-id="${key}" 
                >
                    EDIT
                </button>
            </div>
        ` : '';

        gameCard.innerHTML = `
            <div class="game-card-image-container">
                <div 
                    class="game-card-image-background" 
                    style="background-image: url('${gameData.coverPhotoUrl}');"
                ></div>
                <img src="${gameData.coverPhotoUrl}" alt="${gameData.title} cover photo" class="game-card-image">
                ${developerControlsHTML}
            </div>
            <div class="game-card-content">
                <h3 class="game-card-title">${gameData.title}</h3>
                <p class="game-card-description">${gameData.description}</p>
                <span class="game-card-author">Developer: ${gameData.author}</span>
                <a href="${gameData.downloadLink}" target="_blank" rel="noopener noreferrer" class="game-card-link">
                    DOWNLOAD
                </a>
            </div>
        `;
        
        gamesGrid.appendChild(gameCard);
    }
    
    function reRenderAllGames() {
        gamesGrid.innerHTML = '';
        if (Object.keys(allGamesData).length > 0) {
            const gamesArray = Object.keys(allGamesData).map(key => ({ key, ...allGamesData[key] }));
            gamesArray.reverse().forEach(game => {
                renderGameCard(game.key, game);
            });
        } else {
            gamesGrid.innerHTML = '<p class="full-span" style="text-align: center; margin-top: 20px;">NO GAME DATA FOUND. INITIALIZING DATABASE...</p>';
        }
    }

    async function deleteGame(gameId) {
        if (!currentUserIsDeveloper) {
            showNotification("Permission Denied: You must be a developer to delete games.", false);
            return;
        }
        if (confirm("SYSTEM ALERT: Confirm deletion of game ID: " + gameId + "? This action is IRREVERSIBLE.")) {
            try {
                await remove(ref(db, `games/${gameId}`));
                showNotification("Game deleted successfully! New entry logged.", true);
            } catch (error) {
                console.error("Error deleting game:", error);
                showNotification("ERROR: Failed to delete game. " + error.message, false);
            }
        }
    }

    function openEditModal(gameId) {
        if (!currentUserIsDeveloper) {
            showNotification("Permission Denied: You must be a developer to edit games.", false);
            return;
        }
        
        const gameData = allGamesData[gameId];
        if (!gameData) {
            showNotification("Error: Game data not found for ID: " + gameId, false);
            return;
        }

        document.getElementById('edit-game-id').value = gameId;
        document.getElementById('edit-game-title').value = gameData.title;
        document.getElementById('edit-game-description').value = gameData.description;
        document.getElementById('edit-game-download-link').value = gameData.downloadLink;
        editUploadStatus.textContent = "Current cover photo: " + gameData.coverPhotoUrl.substring(0, 40) + "...";

        editGameModal.classList.remove('hidden');
    }

    (async () => {
        try {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getDatabase(app);

            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                console.error("CRITICAL AUTH WARNING: Custom token not found. App will run in unauthenticated read-only mode, and posting/deletion may fail.");
            }

            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    currentUserId = user.uid;
                    const userRef = ref(db, 'users/' + user.uid);
                    const snapshot = await get(userRef);
                    
                    const isDeveloperBefore = currentUserIsDeveloper;
                    currentUserIsDeveloper = snapshot.exists() ? snapshot.val().isDeveloper === true : false;
                    
                    if (currentUserIsDeveloper) {
                        developerControls.classList.remove('hidden');
                    } else {
                        developerControls.classList.add('hidden');
                    }
                    
                    if (currentUserIsDeveloper !== isDeveloperBefore && Object.keys(allGamesData).length > 0) {
                        reRenderAllGames();
                    }
                } else {
                    currentUserId = null;
                    currentUserIsDeveloper = false;
                    developerControls.classList.add('hidden');
                    if (Object.keys(allGamesData).length > 0) {
                        reRenderAllGames();
                    }
                }
            });

            onValue(ref(db, 'games'), (snapshot) => {
                loadingSpinner.classList.add('hidden');
                if (snapshot.exists()) {
                    allGamesData = snapshot.val(); 
                } else {
                    allGamesData = {}; 
                }
                reRenderAllGames();
            }, (error) => {
                console.error("Error fetching games data:", error);
                loadingSpinner.classList.add('hidden');
                gamesGrid.innerHTML = '<p class="full-span" style="text-align: center; color: #ff007f;">DATA FETCH ERROR. Check console for details.</p>';
            });

        } catch (error) {
            console.error("CRITICAL FIREBASE INITIALIZATION ERROR:", error);
            showNotification("INIT FAILED. " + error.message, false);
            loadingSpinner.classList.add('hidden');
            gamesGrid.innerHTML = '<p class="full-span" style="text-align: center; color: #ff007f;">SYSTEM FAILURE. Cannot connect to Firebase.</p>';
        }
    })();

    gamesGrid.addEventListener('click', (e) => {
        const target = e.target;
        const gameId = target.getAttribute('data-game-id');

        if (target.classList.contains('js-delete-btn') && gameId) {
            deleteGame(gameId);
        }

        if (target.classList.contains('js-edit-btn') && gameId) {
            openEditModal(gameId);
        }
    });

    addGameButton.addEventListener('click', () => {
        addGameModal.classList.remove('hidden');
    });

    closeModalButton.addEventListener('click', () => {
        addGameModal.classList.add('hidden');
        gameForm.reset();
        document.getElementById('upload-status').textContent = "";
    });

    closeEditModalButton.addEventListener('click', () => {
        editGameModal.classList.add('hidden');
        editGameForm.reset();
        editUploadStatus.textContent = "";
    });

    gameForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUserIsDeveloper) {
            showNotification("PERMISSION DENIED: You are not authorized to post games.", false);
            return;
        }

        toggleLoading(true, submitButton, submitText, submitSpinner);

        const title = document.getElementById('game-title').value;
        const description = document.getElementById('game-description').value;
        const coverPhotoFile = document.getElementById('game-cover-photo').files[0];
        const downloadLink = document.getElementById('game-download-link').value;
        
        if (CLOUDINARY_CLOUD_NAME.includes("YOUR_CLOUDINARY") || CLOUDINARY_UPLOAD_PRESET.includes("YOUR_CLOUDINARY")) {
             showNotification("CONFIGURATION ERROR: Cloudinary credentials missing.", false);
             toggleLoading(false, submitButton, submitText, submitSpinner);
             return;
        }

        let coverPhotoUrl;
        try {
            const uploadStatus = document.getElementById('upload-status');
            uploadStatus.textContent = "UPLOADING IMAGE TO CLOUDINARY...";
            coverPhotoUrl = await uploadImageToCloudinary(coverPhotoFile);
            uploadStatus.textContent = "IMAGE UPLOAD COMPLETE. SAVING GAME DATA...";

            const userRef = ref(db, 'users/' + currentUserId);
            const userSnapshot = await get(userRef);
            const authorName = userSnapshot.exists() ? userSnapshot.val().displayName || "Developer" : "Developer";

            const newGame = {
                title: title,
                coverPhotoUrl: coverPhotoUrl,
                description: description,
                downloadLink: downloadLink,
                author: authorName,
                timestamp: Date.now()
            };

            await push(ref(db, 'games'), newGame);
            
            showNotification("Game post successful! New entry logged.", true);
            addGameModal.classList.add('hidden');
            gameForm.reset();
            uploadStatus.textContent = "";

        } catch (error) {
            console.error("CRITICAL POSTING ERROR:", error);
            showNotification("POSTING FAILED. " + error.message, false);
        } finally {
            toggleLoading(false, submitButton, submitText, submitSpinner);
        }
    });
    
    editGameForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUserIsDeveloper) {
            showNotification("PERMISSION DENIED: You are not authorized to edit games.", false);
            return;
        }

        toggleLoading(true, editSubmitButton, editSubmitText, editSubmitSpinner);

        const gameId = document.getElementById('edit-game-id').value;
        const title = document.getElementById('edit-game-title').value;
        const description = document.getElementById('edit-game-description').value;
        const coverPhotoFile = document.getElementById('edit-game-cover-photo').files[0];
        const downloadLink = document.getElementById('edit-game-download-link').value;
        
        let coverPhotoUrl = allGamesData[gameId].coverPhotoUrl;

        try {
            if (coverPhotoFile) {
                editUploadStatus.textContent = "UPLOADING NEW IMAGE TO CLOUDINARY...";
                if (CLOUDINARY_CLOUD_NAME.includes("YOUR_CLOUDINARY")) {
                     throw new Error("Cloudinary configuration missing.");
                }
                coverPhotoUrl = await uploadImageToCloudinary(coverPhotoFile);
            }
            editUploadStatus.textContent = "IMAGE HANDLING COMPLETE. SAVING GAME DATA...";
            
            const updatedGameData = {
                title: title,
                description: description,
                downloadLink: downloadLink,
                coverPhotoUrl: coverPhotoUrl, 
                lastUpdated: Date.now()
            };
            
            await update(ref(db, `games/${gameId}`), updatedGameData);

            showNotification(`Game "${title}" updated successfully!`, true);
            editGameModal.classList.add('hidden');
            editGameForm.reset();
            editUploadStatus.textContent = "";

        } catch (error) {
            console.error("CRITICAL EDITING ERROR:", error);
            showNotification("EDITING FAILED. " + error.message, false);
        } finally {
            toggleLoading(false, editSubmitButton, editSubmitText, editSubmitSpinner);
        }

    });
});
