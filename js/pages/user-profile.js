import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, get, set, remove, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

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
    const db = getDatabase(app);
    const auth = getAuth(app);

    let currentUser = null;

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        loadUserProfile();
    });

    async function loadUserProfile() {
        const debugEl = document.getElementById('debug-info');
        debugEl.innerHTML = '--- Debug Info ---<br>';

        const urlParams = new URLSearchParams(window.location.search);
        const username = urlParams.get('u');
        
        debugEl.innerHTML += `1. Raw URL query string: ${window.location.search}<br>`;
        debugEl.innerHTML += `2. Username parsed from URL (?u=): '${username}'<br>`;

        const displayNameEl = document.getElementById('user-display-name');
        const pfpEl = document.getElementById('pfp-display');
        const bioEl = document.getElementById('user-bio');
        const socialsEl = document.getElementById('user-socials');
        const joinDateEl = document.getElementById('user-join-date');
        const friendStatusContainer = document.getElementById('friend-status-container');
        const profileContainer = document.querySelector('.profile-container');
        const profileErrorMessage = document.getElementById('profile-error-message');

        profileErrorMessage.classList.add('hidden');
        profileErrorMessage.textContent = '';

        if (!username) {
            displayNameEl.textContent = 'User not specified';
            profileErrorMessage.textContent = 'No username provided in the URL. Please ensure you are navigating to a valid profile link.';
            profileErrorMessage.classList.remove('hidden');
            debugEl.innerHTML += '<br><strong>ERROR: No username found in URL.</strong> Script stopped.';
            return;
        }

        try {
            debugEl.innerHTML += `3. Preparing to query Firebase for displayName: '${username}'<br>`;
            const usersRef = ref(db, 'users');
            const userQuery = query(usersRef, orderByChild('displayName'), equalTo(username));
            
            debugEl.innerHTML += '4. Executing Firebase query...<br>';
            const snapshot = await get(userQuery);
            debugEl.innerHTML += '5. Firebase query executed.<br>';

            if (!snapshot.exists()) {
                displayNameEl.textContent = 'User not found';
                profileErrorMessage.textContent = `Profile for "${username}" not found. It might not exist or there was an issue retrieving it.`;
                profileErrorMessage.classList.remove('hidden');
                debugEl.innerHTML += `<br><strong>ERROR: Firebase query returned no results (snapshot.exists() is false).</strong><br>Checked for displayName = '${username}'. Double-check that this exact user exists in your database.`;
                return;
            }
            
            debugEl.innerHTML += '6. Success! Snapshot exists. Processing user data...<br>';

            const userData = snapshot.val();
            const userId = Object.keys(userData)[0];
            const data = userData[userId];

            displayNameEl.textContent = data.displayName || 'Unnamed User';
            pfpEl.src = data.photoURL || 'https://res.cloudinary.com/dhptbygpt/image/upload/v1700000000/default-pfp.png';
            bioEl.textContent = data.profile?.description || 'No bio yet.';
            if (data.creationTime) {
                joinDateEl.textContent = `Joined ${new Date(data.creationTime).toLocaleDateString()}`;
            } else {
                joinDateEl.textContent = 'Join date not available';
            }

            if (data.profile?.profilePanelColor) {
                profileContainer.style.backgroundColor = data.profile.profilePanelColor;
            }
            if (data.profile?.profileTextColor) {
                profileContainer.style.color = data.profile.profileTextColor;
            }

            document.body.style.setProperty('--accent-color', data.profile?.accentColor || '#333333');
            document.body.style.setProperty('--button-hover-color', data.profile?.buttonHoverColor || '#444444');
            if (data.profile?.profileBackgroundType === 'image' && data.profile?.profileBackgroundImageUrl) {
                document.body.style.backgroundImage = `url(${data.profile.profileBackgroundImageUrl})`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundAttachment = 'fixed';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundColor = 'transparent'; // Ensure color doesn't show through
            } else if (data.profile?.profileBackgroundColor) {
                document.body.style.backgroundColor = data.profile.profileBackgroundColor;
                document.body.style.backgroundImage = 'none';
            }

            if (data.profile?.profileBorderColor) {
                document.body.style.setProperty('--profile-border-color', data.profile.profileBorderColor);
            }

            const profileViewsRef = ref(db, `users/${userId}/profile/profileViews`);
            let currentViews = ((await get(profileViewsRef)).val() || 0);

            if (currentUser) {
                try {
                    await set(profileViewsRef, currentViews + 1);
                    currentViews++;
                } catch (e) {
                    console.warn("Could not increment profile views.", e);
                }
            }
            document.getElementById('profile-views').textContent = `Profile Views: ${currentViews}`;

            socialsEl.innerHTML = '';
            let hasSocialLinks = false;

            // Display existing social links (Twitter, GitHub, etc.)
            if (data.profile?.socials && Object.keys(data.profile.socials).length > 0) {
                for (const [platform, handle] of Object.entries(data.profile.socials)) {
                    if (!handle) continue;
                    const link = document.createElement('a');
                    link.href = `https://${platform}.com/${handle}`;
                    link.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    socialsEl.appendChild(link);
                    hasSocialLinks = true;
                }
            }

            // Display custom social links
            if (data.profile?.customSocials && Object.keys(data.profile.customSocials).length > 0) {
                Object.values(data.profile.customSocials).forEach(linkData => {
                    if (!linkData.url || !linkData.displayName) return;
                    const link = document.createElement('a');
                    link.href = linkData.url;
                    link.textContent = linkData.displayName;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    socialsEl.appendChild(link);
                    hasSocialLinks = true;
                });
            }

            if (!hasSocialLinks) {
                socialsEl.textContent = 'No social links added yet.';
            }

            // Last.fm Now Playing Logic
            const lastfmNowPlayingSection = document.getElementById('lastfm-now-playing-section');
            const lastfmAlbumArt = document.getElementById('lastfm-album-art');
            const lastfmTrackInfo = document.getElementById('lastfm-track-info');
            const lastfmTrackLink = document.getElementById('lastfm-track-link');

            try {
                const lastfmResponse = await fetch(`/.netlify/functions/lastfm-song?userId=${userId}`);
                if (lastfmResponse.ok) {
                    const track = await lastfmResponse.json();
                    // Check if the track is actually playing before displaying the section
                    if (track['@attr'] && track['@attr'].nowplaying === 'true') {
                        lastfmNowPlayingSection.style.display = 'block';
                        lastfmTrackInfo.textContent = `${track.artist['#text']} - ${track.name}`;
                        lastfmTrackLink.href = track.url;
                        lastfmTrackLink.style.display = 'inline-block';

                        const albumArt = track.image.find(img => img.size === 'large') || track.image[0];
                        if (albumArt && albumArt['#text']) {
                            lastfmAlbumArt.src = albumArt['#text'];
                            lastfmAlbumArt.style.display = 'block';
                        } else {
                            lastfmAlbumArt.style.display = 'none';
                        }
                    } else {
                        // No song currently playing, keep section hidden
                        lastfmNowPlayingSection.style.display = 'none';
                    }
                } else if (lastfmResponse.status === 404) {
                    // No song currently playing or Last.fm not linked, keep section hidden
                    lastfmNowPlayingSection.style.display = 'none';
                } else {
                    console.error('Error fetching Last.fm song:', await lastfmResponse.text());
                    // Error, keep section hidden
                    lastfmNowPlayingSection.style.display = 'none';
                }
            } catch (error) {
                console.error('Network error fetching Last.fm song:', error);
                lastfmNowPlayingSection.style.display = 'block';
                lastfmTrackInfo.textContent = 'Error loading Last.fm song.';
                lastfmAlbumArt.style.display = 'none';
                lastfmTrackLink.style.display = 'none';
            }

            // Friend status logic
            friendStatusContainer.innerHTML = '';
            if (currentUser && currentUser.uid !== userId) {
                const currentUserRef = ref(db, `users/${currentUser.uid}`);
                const currentUserSnapshot = await get(currentUserRef);
                const currentUserData = currentUserSnapshot.val();

                if (currentUserData.friends && currentUserData.friends[userId]) {
                    friendStatusContainer.innerHTML = '<p>Friends</p>';
                } else if (data.profile?.friendRequests && data.profile.friendRequests[currentUser.uid]) {
                    friendStatusContainer.innerHTML = '<p>Friend Request Sent</p>';
                } else if (currentUserData.profile?.friendRequests && currentUserData.profile.friendRequests[userId]) {
                    friendStatusContainer.innerHTML = '<button id="accept-friend-btn" class="btn">Accept Friend Request</button>';
                    document.getElementById('accept-friend-btn').addEventListener('click', () => acceptFriendRequest(userId));
                } else {
                    friendStatusContainer.innerHTML = '<button id="add-friend-btn" class="btn">Add Friend</button>';
                    document.getElementById('add-friend-btn').addEventListener('click', () => addFriend(userId));
                }
            }
            debugEl.innerHTML += '7. Profile rendering complete.';

        } catch (error) {
            console.error("Failed to load user profile:", error);
            debugEl.innerHTML += `<br><strong>FATAL ERROR in try block:</strong> ${error.message}<br>Stack: ${error.stack}`;
            displayNameEl.textContent = 'Error loading profile';
            if (error.message && error.message.toLowerCase().includes("permission denied")) {
                profileErrorMessage.textContent = "Permission denied. The Firebase security rules for this project do not allow public access to user profiles. Please update your rules to allow reads on the 'users' data.";
            } else {
                profileErrorMessage.textContent = `An unexpected error occurred while loading the profile: ${error.message}. Please try again later.`;
            }
            profileErrorMessage.classList.remove('hidden');
        }
    }

    async function addFriend(profileUserId) {
        if (!currentUser) return alert('You must be logged in to add friends.');

        const friendRequestRef = ref(db, `users/${profileUserId}/profile/friendRequests/${currentUser.uid}`);
        await set(friendRequestRef, true);
    loadUserProfile(); // Refresh the profile to show the updated status
    }

    async function acceptFriendRequest(profileUserId) {
        if (!currentUser) return alert('You must be logged in to accept friend requests.');

        // Remove friend request from both users
        const currentUserFriendRequestRef = ref(db, `users/${currentUser.uid}/profile/friendRequests/${profileUserId}`);
        const profileUserFriendRequestRef = ref(db, `users/${profileUserId}/profile/friendRequests/${currentUser.uid}`);
        await remove(currentUserFriendRequestRef);
        await remove(profileUserFriendRequestRef);

        // Add to friends list for both users
        const currentUserFriendRef = ref(db, `users/${currentUser.uid}/friends/${profileUserId}`);
        const profileUserFriendRef = ref(db, `users/${profileUserId}/friends/${currentUser.uid}`);
        await set(currentUserFriendRef, true);
        await set(profileUserFriendRef, true);

        loadUserProfile(); // Refresh the profile to show the updated status
    }
});
