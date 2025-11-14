import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDatabase, ref, get, set, remove, query, orderByChild, equalTo, update as dbUpdate, push } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
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

    const DEFAULT_PFP_URL = "https://res.cloudinary.com/dhptbygpt/image/upload/v1700000000/default-pfp.png";
    const CLOUDINARY_CLOUD_NAME = "dhptbygpt";
    const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";

    const devEmailInput = document.getElementById("dev-email-input");
    const toggleDevBtn = document.getElementById("toggle-dev-btn");
    const devStatusMessage = document.getElementById("dev-status-message");
    const pfpDisplay = document.getElementById("pfp-display");
    const pfpInput = document.getElementById("pfp-input");
    const developerTab = document.getElementById("developer-tab");

    function showStatus(element, message, isError = false) {
        element.textContent = message;
        element.style.color = isError ? 'red' : 'inherit';
    }

    const developersModal = document.getElementById('developers-modal');
    const developersList = document.getElementById('developers-list');
    const devModalStatus = document.getElementById('dev-modal-status');

    window.openDevelopersModal = async function() {
        developersList.innerHTML = '';
        showStatus(devModalStatus, 'Fetching developer list...');
        developersModal.style.display = 'block';

        try {
            const usersRef = ref(db, 'users');
            const developersQuery = query(usersRef, orderByChild('isDeveloper'), equalTo(true));
            const snapshot = await get(developersQuery);

            if (snapshot.exists()) {
                const developers = snapshot.val();
                const fragment = document.createDocumentFragment();
                let count = 0;

                Object.values(developers).forEach(userData => {
                    if (userData.email) {
                        const listItem = document.createElement('li');
                        listItem.textContent = userData.email;
                        fragment.appendChild(listItem);
                        count++;
                    }
                });

                if (count > 0) {
                    developersList.appendChild(fragment);
                    showStatus(devModalStatus, `Found ${count} developer(s).`);
                } else {
                    showStatus(devModalStatus, 'No active developers found.');
                }
            } else {
                showStatus(devModalStatus, 'No developers found in the database.');
            }
        } catch (error) {
            console.error("Error fetching developers:", error);
            showStatus(devModalStatus, `Error fetching list: ${error.message}`, true);
        }
    }

    window.closeDevelopersModal = function() {
        developersModal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == developersModal) {
            closeDevelopersModal();
        }
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            document.getElementById("user-display-name").textContent = user.displayName || user.email;
            document.getElementById("user-join-date").textContent = new Date(user.metadata.creationTime).toLocaleDateString();
            pfpDisplay.src = user.photoURL || DEFAULT_PFP_URL;
            document.getElementById('view-profile-btn').href = `../user/index.html?u=${user.displayName}`;

            const userRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userRef);
            const userData = snapshot.val();

            if (userData && !userData.creationTime) {
                dbUpdate(ref(db, `users/${user.uid}`), { creationTime: user.metadata.creationTime });
            }

            if (userData && userData.isDeveloper === true) {
                developerTab.style.display = "block";
            } else {
                developerTab.style.display = "none";
            }

            if (userData && userData.profile) {
                document.getElementById('bio').value = userData.profile.description || '';
                if (userData.profile.socials) {
                    document.getElementById('twitter').value = userData.profile.socials.twitter || '';
                    document.getElementById('github').value = userData.profile.socials.github || '';
                }
                if (userData.profile.customSocials) {
                    displayCustomSocialLinks(userData.profile.customSocials);
                }
                if (userData.profile.accentColor) {
                    document.getElementById('accent-color').value = userData.profile.accentColor;
                    document.body.style.setProperty('--accent-color', userData.profile.accentColor);
                }
                if (userData.profile.buttonHoverColor) {
                    document.getElementById('button-hover-color').value = userData.profile.buttonHoverColor;
                    document.body.style.setProperty('--button-hover-color', userData.profile.buttonHoverColor);
                }
                if (userData.profile.profileBackgroundColor) {
                    document.getElementById('profile-background-color').value = userData.profile.profileBackgroundColor;
                }
                if (userData.profile.profileTextColor) {
                    document.getElementById('profile-text-color').value = userData.profile.profileTextColor;
                }
                if (userData.profile.profilePanelColor) {
                    document.getElementById('profile-panel-color').value = userData.profile.profilePanelColor;
                }
                if (userData.profile.profileBorderColor) {
                    document.getElementById('profile-border-color').value = userData.profile.profileBorderColor;
                }

                if (userData.profile.profileBackgroundType === 'image') {
                    bgTypeImage.checked = true;
                    if (userData.profile.profileBackgroundImageUrl) {
                        profileBackgroundImagePreview.src = userData.profile.profileBackgroundImageUrl;
                        profileBackgroundImagePreview.style.display = 'block';
                    }
                } else {
                    bgTypeColor.checked = true;
                }
                toggleBackgroundType();

                const LASTFM_API_KEY_PUBLIC = "c0b5baee33a5182668424f7063155206";
                const NETLIFY_LASTFM_CALLBACK_URL = window.location.origin + "/.netlify/functions/lastfm-callback";

                const lastfmStatusEl = document.getElementById('lastfm-status');
                const linkLastfmBtn = document.getElementById('link-lastfm-btn');
                const unlinkLastfmBtn = document.getElementById('unlink-lastfm-btn');
                const lastfmMessageEl = document.getElementById('lastfm-message');

                async function checkLastfmLinkStatus() {
                    const lastfmRef = ref(db, `users/${user.uid}/lastfm`);
                    const lastfmSnapshot = await get(lastfmRef);
                    if (lastfmSnapshot.exists()) {
                        const lastfmData = lastfmSnapshot.val();
                        lastfmStatusEl.textContent = `Linked to Last.fm as: ${lastfmData.username}`;
                        linkLastfmBtn.style.display = 'none';
                        unlinkLastfmBtn.style.display = 'inline-block';
                    } else {
                        lastfmStatusEl.textContent = 'Not linked.';
                        linkLastfmBtn.style.display = 'inline-block';
                        unlinkLastfmBtn.style.display = 'none';
                    }
                }

                linkLastfmBtn.addEventListener('click', () => {
                    const lastfmAuthUrl = `http://www.last.fm/api/auth/?api_key=${LASTFM_API_KEY_PUBLIC}&cb=${NETLIFY_LASTFM_CALLBACK_URL}?userId=${user.uid}`;
                    window.location.href = lastfmAuthUrl;
                });

                unlinkLastfmBtn.addEventListener('click', async () => {
                    if (confirm('Are you sure you want to unlink your Last.fm account?')) {
                        try {
                            const lastfmRef = ref(db, `users/${user.uid}/lastfm`);
                            await remove(lastfmRef);
                            lastfmMessageEl.textContent = 'Last.fm account unlinked successfully!';
                            lastfmMessageEl.style.color = 'green';
                            checkLastfmLinkStatus();
                        } catch (error) {
                            console.error('Error unlinking Last.fm:', error);
                            lastfmMessageEl.textContent = `Error unlinking Last.fm: ${error.message}`;
                            lastfmMessageEl.style.color = 'red';
                        }
                    }
                });

                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('lastfm_linked')) {
                    if (urlParams.get('lastfm_linked') === 'success') {
                        lastfmMessageEl.textContent = 'Last.fm account linked successfully!';
                        lastfmMessageEl.style.color = 'green';
                    } else if (urlParams.get('lastfm_linked') === 'error') {
                        lastfmMessageEl.textContent = 'Failed to link Last.fm account.';
                        lastfmMessageEl.style.color = 'red';
                    }
                    urlParams.delete('lastfm_linked');
                    const newUrl = window.location.pathname + urlParams.toString();
                    window.history.replaceState({}, document.title, newUrl);
                }

                checkLastfmLinkStatus();
            }
        } else {
            window.location.href = "../login/";
        }
    });

    window.changeUsername = async function() {
        const newUsernameInput = document.getElementById("newUsername");
        const changeBtn = document.querySelector(".username-btn");
        const newUsername = newUsernameInput.value.trim();
        const user = auth.currentUser;

        if (!user) return alert("You must be logged in to change your username!");
        if (!newUsername) return alert("Please enter a username!");

        if (newUsername.length < 3 || newUsername.length > 20) {
            return alert("Username must be between 3 and 20 characters.");
        }
        if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
            return alert("Username can only contain letters, numbers, and underscores.");
        }
        
        changeBtn.disabled = true;
        newUsernameInput.disabled = true;

        try {
            const usernameRef = ref(db, `usernames/${newUsername}`);
            const usernameSnapshot = await get(usernameRef);
            if (usernameSnapshot.exists()) {
                alert("That username is already taken. Please choose another.");
                return;
            }

            const oldUsername = user.displayName;

            if (oldUsername && oldUsername !== newUsername) {
                const oldUsernameRef = ref(db, `usernames/${oldUsername}`);
                await remove(oldUsernameRef);
            }
            
            await updateProfile(user, { displayName: newUsername });
            await dbUpdate(ref(db, `users/${user.uid}`), { displayName: newUsername });
            await set(ref(db, `usernames/${newUsername}`), user.uid);

            document.getElementById("user-display-name").textContent = newUsername;
            alert("Username updated successfully!");
            newUsernameInput.value = "";
        } catch (error) {
            alert("Failed to change username: " + error.message);
        } finally {
            changeBtn.disabled = false;
            newUsernameInput.disabled = false;
        }
    };

    window.changePfp = async function() {
        const file = pfpInput.files[0];
        const user = auth.currentUser;
        const changeBtn = document.querySelector(".pfp-btn");

        if (!user) return alert("You must be logged in to change your profile picture!");
        if (!file) return alert("Please select an image to upload!");

        changeBtn.disabled = true;
        pfpInput.disabled = true;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Cloudinary upload failed!');

            const data = await response.json();
            const imageUrl = data.secure_url;

            await updateProfile(user, { photoURL: imageUrl });
            await dbUpdate(ref(db, `users/${user.uid}`), { photoURL: imageUrl });

            pfpDisplay.src = imageUrl;
            pfpInput.value = '';

            alert("Profile picture updated successfully!");
        } catch (error) {
            console.error("Failed to change profile picture:", error);
            alert("Failed to change profile picture: " + error.message);
        } finally {
            changeBtn.disabled = false;
            pfpInput.disabled = false;
        }
    };

    const bgTypeColor = document.getElementById('bg-type-color');
    const bgTypeImage = document.getElementById('bg-type-image');
    const profileBackgroundColorGroup = document.getElementById('profile-background-color-group');
    const profileBackgroundImageGroup = document.getElementById('profile-background-image-group');
    const profileBackgroundImageInput = document.getElementById('profile-background-image-input');
    const uploadBackgroundImageBtn = document.getElementById('upload-background-image-btn');
    const backgroundImageStatus = document.getElementById('background-image-status');
    const profileBackgroundImagePreview = document.getElementById('profile-background-image-preview');

    function toggleBackgroundType() {
        if (bgTypeColor.checked) {
            profileBackgroundColorGroup.style.display = 'block';
            profileBackgroundImageGroup.style.display = 'none';
        } else {
            profileBackgroundColorGroup.style.display = 'none';
            profileBackgroundImageGroup.style.display = 'block';
        }
    }

    bgTypeColor.addEventListener('change', toggleBackgroundType);
    bgTypeImage.addEventListener('change', toggleBackgroundType);

    uploadBackgroundImageBtn.addEventListener('click', async () => {
        const file = profileBackgroundImageInput.files[0];
        const user = auth.currentUser;

        if (!user) return alert("You must be logged in to upload a background image!");
        if (!file) return alert("Please select an image to upload!");

        uploadBackgroundImageBtn.disabled = true;
        profileBackgroundImageInput.disabled = true;
        backgroundImageStatus.textContent = 'Uploading...';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Cloudinary upload failed!');

            const data = await response.json();
            const imageUrl = data.secure_url;

            await dbUpdate(ref(db, `users/${user.uid}/profile`), { profileBackgroundImageUrl: imageUrl });

            profileBackgroundImagePreview.src = imageUrl;
            profileBackgroundImagePreview.style.display = 'block';
            profileBackgroundImageInput.value = '';
            backgroundImageStatus.textContent = 'Background image uploaded successfully!';
        } catch (error) {
            console.error("Failed to upload background image:", error);
            backgroundImageStatus.textContent = `Failed to upload background image: ${error.message}`;
        } finally {
            uploadBackgroundImageBtn.disabled = false;
            profileBackgroundImageInput.disabled = false;
        }
    });

    window.logout = async function() {
        try {
            await signOut(auth);
            window.location.href = "../../index.html";
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    toggleDevBtn.addEventListener('click', async () => {
        devStatusMessage.textContent = '';
        const email = devEmailInput.value.trim();
        
        if (!email) return showStatus(devStatusMessage, "Please enter an email.", true);
        if (!email.includes('@')) return showStatus(devStatusMessage, "Invalid email format.", true);

        toggleDevBtn.disabled = true;
        devEmailInput.disabled = true;

        try {
            const usersRef = ref(db, 'users');
            const usersQuery = query(usersRef, orderByChild('email'), equalTo(email));
            const snapshot = await get(usersQuery);

            if (snapshot.exists()) {
                let userKey = Object.keys(snapshot.val())[0];
                let userData = snapshot.val()[userKey];
                let newStatus = !(userData.isDeveloper === true);

                await dbUpdate(ref(db, `users/${userKey}`), { isDeveloper: newStatus });
                showStatus(devStatusMessage, `${email} is now ${newStatus ? 'a developer' : 'not a developer'}.`);
                devEmailInput.value = '';
            } else {
                showStatus(devStatusMessage, `User with email "${email}" not found.`, true);
            }
        } catch (error) {
            console.error("Error toggling developer status:", error);
            showStatus(devStatusMessage, `Error: ${error.message}`, true);
        } finally {
            toggleDevBtn.disabled = false;
            devEmailInput.disabled = false;
        }
    });

    document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const profileData = {
            description: document.getElementById('bio').value,
            accentColor: document.getElementById('accent-color').value,
            buttonHoverColor: document.getElementById('button-hover-color').value,
            profileBackgroundColor: document.getElementById('profile-background-color').value,
            profileTextColor: document.getElementById('profile-text-color').value,
            profilePanelColor: document.getElementById('profile-panel-color').value,
            profileBorderColor: document.getElementById('profile-border-color').value,
            profileBackgroundType: document.querySelector('input[name="background-type"]:checked').value
        };

        const userProfileRef = ref(db, `users/${user.uid}/profile`);
        await dbUpdate(userProfileRef, profileData);

        alert('Profile updated successfully!');
    });

    const customSocialLinksList = document.getElementById('custom-social-links-list');
    const socialDisplayNameInput = document.getElementById('socialDisplayName');
    const socialUrlInput = document.getElementById('socialUrl');
    const addSocialLinkBtn = document.getElementById('add-social-link-btn');

    function displayCustomSocialLinks(socials) {
        customSocialLinksList.innerHTML = '';
        if (!socials) return;

        Object.entries(socials).forEach(([key, link]) => {
            const linkDiv = document.createElement('div');
            linkDiv.className = 'social-link-item';
            linkDiv.innerHTML = `
                <span>${link.displayName}: <a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.url}</a></span>
                <button class="btn btn-small edit-social-link" data-key="${key}">Edit</button>
                <button class="btn btn-small remove-social-link" data-key="${key}">Remove</button>
            `;
            customSocialLinksList.appendChild(linkDiv);
        });

        document.querySelectorAll('.edit-social-link').forEach(button => {
            button.addEventListener('click', (e) => editSocialLink(e.target.dataset.key));
        });
        document.querySelectorAll('.remove-social-link').forEach(button => {
            button.addEventListener('click', (e) => removeSocialLink(e.target.dataset.key));
        });
    }

    addSocialLinkBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return alert('You must be logged in to add social links!');

        const displayName = socialDisplayNameInput.value.trim();
        const url = socialUrlInput.value.trim();

        if (!displayName || !url) {
            return alert('Please enter both a display name and a URL for the social link.');
        }
        if (!/^https?:\/\//i.test(url)) {
            return alert('Please enter a valid URL starting with http:// or https://');
        }

        try {
            const userSocialsRef = ref(db, `users/${user.uid}/profile/customSocials`);
            const newSocialRef = await push(userSocialsRef);
            await set(newSocialRef, { displayName, url });

            socialDisplayNameInput.value = '';
            socialUrlInput.value = '';
            
            const snapshot = await get(userSocialsRef);
            displayCustomSocialLinks(snapshot.val());
            alert('Social link added successfully!');
        } catch (error) {
            console.error('Error adding social link:', error);
            alert('Failed to add social link: ' + error.message);
        }
    });

    async function editSocialLink(key) {
        const user = auth.currentUser;
        if (!user) return alert('You must be logged in to edit social links!');

        const userSocialsRef = ref(db, `users/${user.uid}/profile/customSocials/${key}`);
        const snapshot = await get(userSocialsRef);
        const currentLink = snapshot.val();

        if (currentLink) {
            const newDisplayName = prompt('Edit Display Name:', currentLink.displayName);
            const newUrl = prompt('Edit URL:', currentLink.url);

            if (newDisplayName !== null && newUrl !== null) {
                if (!newDisplayName.trim() || !newUrl.trim()) {
                    return alert('Display name and URL cannot be empty.');
                }
                if (!/^https?:\/\//i.test(newUrl)) {
                    return alert('Please enter a valid URL starting with http:// or https://');
                }
                await dbUpdate(userSocialsRef, { displayName: newDisplayName, url: newUrl });
                const updatedSnapshot = await get(ref(db, `users/${user.uid}/profile/customSocials`));
                displayCustomSocialLinks(updatedSnapshot.val());
                alert('Social link updated successfully!');
            }
        }
    }

    async function removeSocialLink(key) {
        const user = auth.currentUser;
        if (!user) return alert('You must be logged in to remove social links!');

        if (confirm('Are you sure you want to remove this social link?')) {
            try {
                const userSocialsRef = ref(db, `users/${user.uid}/profile/customSocials/${key}`);
                await remove(userSocialsRef);
                const snapshot = await get(ref(db, `users/${user.uid}/profile/customSocials`));
                displayCustomSocialLinks(snapshot.val());
                alert('Social link removed successfully!');
            } catch (error) {
                console.error('Error removing social link:', error);
                alert('Failed to remove social link: ' + error.message);
            }
        }
    }

    document.getElementById('socials-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const twitterHandle = document.getElementById('twitter').value.trim();
        const githubHandle = document.getElementById('github').value.trim();

        const socialData = {
            socials: {
                twitter: twitterHandle,
                github: githubHandle
            }
        };

        const userProfileRef = ref(db, `users/${user.uid}/profile`);
        await dbUpdate(userProfileRef, socialData);

        alert('Social links updated successfully!');
    });

    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    window.deleteAccount = async function() {
        const user = auth.currentUser;
        if (!user) return;

        const confirmation = prompt(`This action is irreversible. You will lose all your data, including profile, friends, and posts. To confirm, please type your username "${user.displayName}":`);

        if (confirmation === null) {
            alert("Account deletion cancelled.");
            return;
        }

        if (confirmation !== user.displayName) {
            alert("Username does not match. Account deletion cancelled.");
            return;
        }

        try {
            const uid = user.uid;
            const username = user.displayName;

            const userRef = ref(db, `users/${uid}`);
            await remove(userRef);

            const usernameRef = ref(db, `usernames/${username}`);
            await remove(usernameRef);

            await deleteUser(user);

            alert("Your account has been successfully deleted.");
            window.location.href = "../../index.html";

        } catch (error) {
            console.error("Error deleting account:", error);
            alert("An error occurred while deleting your account. You may need to log out and log back in to complete this action.\n" + error.message);
        }
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            navItems.forEach(i => i.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            item.classList.add('active');

            const tabId = item.getAttribute('data-tab');
            if (tabId === 'developer') {
                document.getElementById('developer-tab-content').classList.add('active');
            } else {
                const tabContent = document.getElementById(tabId + '-tab');
                if (tabContent) {
                    tabContent.classList.add('active');
                }
            }
        });
    });
});
