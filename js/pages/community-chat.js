import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getDatabase, ref, push, onValue, set, onDisconnect, get, serverTimestamp, update } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

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

  let currentUser = null;
  let currentDisplayName = null;
  const usersCache = {};
  let typingTimeout = null;
  let isMessageListenerActive = false; 

  const discordWebhookUrl = "https://discord.com/api/webhooks/1419226962643124336/kOCwAB9OGdalcetSAsG76w-WoaDjLW43y4DmavFgumUn383tY0TwvoEU1Goj4Oz6WeMq";
  const defaultPfp = "https://res.cloudinary.com/dhptbygpt/image/upload/v1700000000/default-pfp.png";

  const chatContainer = document.getElementById("chat-container");
  const messageInput = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");
  const charCount = document.getElementById("char-count");
  const typingIndicator = document.getElementById("typing-indicator");
  const userList = document.getElementById("user-list");

  class RateLimiter {
    constructor(maxMessages, timeWindowMs) {
      this.maxMessages = maxMessages;
      this.timeWindowMs = timeWindowMs;
      this.timestamps = [];
    }
    canSend() {
      const now = Date.now();
      this.timestamps = this.timestamps.filter(ts => now - ts < this.timeWindowMs);
      return this.timestamps.length < this.maxMessages;
    }
    recordMessage() {
      this.timestamps.push(Date.now());
    }
    getTimeUntilNextMessage() {
      if (this.canSend()) return 0;
      const oldestTimestamp = this.timestamps[0];
      const timeUntilExpiry = this.timeWindowMs - (Date.now() - oldestTimestamp);
      return Math.ceil(timeUntilExpiry / 1000);
    }
  }
  const rateLimiter = new RateLimiter(5, 10000);

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getUserData(authorName) {
    if (currentUser && currentUser.displayName === authorName) {
      return {
        photoURL: currentUser.photoURL || usersCache[currentUser.uid]?.photoURL || defaultPfp,
      };
    }

    const userKeys = Object.keys(usersCache);
    const userKey = userKeys.find(key => 
      usersCache[key].displayName === authorName || usersCache[key].email === authorName
    );
    
    if (userKey) {
      return {
        photoURL: usersCache[userKey].photoURL || defaultPfp,
      };
    }
    
    return {
      photoURL: defaultPfp,
    };
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
             date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  }

  function checkForMention(messageText, currentUserName) {
    if (!currentUserName || !messageText) return false;
    const escapedUserName = currentUserName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mentionPattern = new RegExp(`@${escapedUserName}\\b`, 'i');
    return mentionPattern.test(messageText);
  }

  function highlightMentions(text, currentUserName) {
    if (!currentUserName) return escapeHtml(text);
    const escapedUserName = currentUserName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mentionPattern = new RegExp(`(@${escapedUserName})\\b`, 'gi');
    return escapeHtml(text).replace(mentionPattern, '<span class="mention-tag">$1</span>');
  }

  function insertMention(authorName) {
      if (!currentDisplayName) {
        alert("You must be logged in to mention others.");
        return;
      }
      const mentionText = `@${authorName} `; 
      
      if (messageInput.value.includes(mentionText.trim())) {
          return; 
      }

      messageInput.value = mentionText + messageInput.value.trim();
      
      const length = messageInput.value.length;
      charCount.textContent = `${length} / 500`;

      messageInput.focus();
  }

  messageInput.addEventListener('input', () => {
    const length = messageInput.value.length;
    charCount.textContent = `${length} / 500`;
    charCount.classList.remove('warning', 'error');
    if (length > 450) charCount.classList.add('warning');
    if (length >= 500) charCount.classList.add('error');
  });

  messageInput.addEventListener('input', () => {
    if (!currentUser) return;
    const typingRef = ref(db, `users/${currentUser.uid}`);
    update(typingRef, { typing: true }); 
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      update(typingRef, { typing: false });
    }, 2000);
  });

  const usersRef = ref(db, "users");
  onValue(usersRef, snapshot => {
    const usersData = snapshot.val();
    if (usersData) {
      Object.assign(usersCache, usersData);
      updateUserList(usersData);
      updateTypingIndicator(usersData);
    }
  });

  function updateUserList(usersData) {
    userList.innerHTML = '';
    
    const users = Object.entries(usersData)
      .filter(([uid, data]) => data.online === true) 
      .sort((a, b) => (a[1].displayName || '').localeCompare(b[1].displayName || ''));
    
    if (users.length === 0) {
      userList.innerHTML = '<p style="text-align: center; color: rgba(1, 237, 240, 0.5); padding: 20px;">No users online</p>';
      return;
    }

    users.forEach(([uid, userData]) => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';
      
      const avatarWrapper = document.createElement('div');
      avatarWrapper.className = 'user-avatar-wrapper';
      
      const avatar = document.createElement('img');
      avatar.src = userData.photoURL || defaultPfp;
      avatar.className = 'user-avatar-small';
      avatar.alt = userData.displayName || 'User';
      
      const statusIndicator = document.createElement('div');
      statusIndicator.className = `status-indicator ${userData.online ? 'online' : 'offline'}`;
      
      const userName = document.createElement('span');
      userName.className = 'user-name';
      userName.textContent = userData.displayName || userData.email?.split('@')[0] || 'Unknown';

      avatarWrapper.appendChild(avatar);
      avatarWrapper.appendChild(statusIndicator);
      
      userItem.appendChild(avatarWrapper);
      userItem.appendChild(userName);
      userList.appendChild(userItem);
    });
  }

  function updateTypingIndicator(usersData) {
    const typingUsers = Object.entries(usersData)
      .filter(([uid, data]) => data.typing && data.online && uid !== currentUser?.uid) 
      .map(([uid, data]) => data.displayName || data.email?.split('@')[0]);
    
    if (typingUsers.length === 0) {
      typingIndicator.textContent = '';
    } else if (typingUsers.length === 1) {
      typingIndicator.textContent = `${typingUsers[0]} is typing...`;
    } else if (typingUsers.length === 2) {
      typingIndicator.textContent = `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    } else {
      typingIndicator.textContent = `${typingUsers.length} people are typing...`;
    }
  }

  function startChatListeners() {
    if (isMessageListenerActive) return; 

    const messagesRef = ref(db, "global-chat");
    onValue(messagesRef, snapshot => {
      const shouldScroll = chatContainer.scrollTop + chatContainer.clientHeight >= chatContainer.scrollHeight - 50;

      chatContainer.innerHTML = "";
      const data = snapshot.val();
      if (!data) {
          chatContainer.innerHTML = '<p style="text-align: center; color: rgba(1, 237, 240, 0.5); padding: 40px;">No messages yet. Be the first to say something!</p>';
          return;
      }

      const messagesArray = Object.entries(data).sort((a, b) => a[1].timestamp - b[1].timestamp);

      messagesArray.forEach(([id, msg]) => {
        if (!msg || !msg.text || !msg.author) {
          console.warn("Skipping incomplete chat message:", msg);
          return;
        }

        const userData = getUserData(msg.author); 
        
        const messageDiv = document.createElement("div");
        messageDiv.className = "message";

        if (currentDisplayName) {
          const isNotSelf = msg.author.toLowerCase() !== currentDisplayName.toLowerCase();
          const isMentioned = checkForMention(msg.text, currentDisplayName);

          if (isNotSelf && isMentioned) {
            messageDiv.classList.add("mention-highlight");
          }
        }

        const avatar = document.createElement("img");
        avatar.src = userData.photoURL; 
        avatar.className = "message-avatar";
        avatar.alt = msg.author;

        const content = document.createElement("div");
        content.className = "message-content";

        const header = document.createElement("div");
        header.className = "message-header";

        const author = document.createElement("span");
        author.className = "message-author";
        author.textContent = msg.author; 
        
        const timestamp = document.createElement("span");
        timestamp.className = "message-timestamp";
        timestamp.textContent = formatTimestamp(msg.timestamp);

        const text = document.createElement("div");
        text.className = "message-text";
        text.innerHTML = highlightMentions(msg.text, currentDisplayName);

        header.appendChild(author);
        header.appendChild(timestamp);
        content.appendChild(header);
        content.appendChild(text);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        const replyButton = document.createElement("button");
        replyButton.className = "reply-button";
        replyButton.textContent = "Reply";
        replyButton.dataset.author = msg.author; 

        replyButton.addEventListener('click', (e) => {
            e.stopPropagation(); 
            insertMention(replyButton.dataset.author);
        });
        
        if (currentDisplayName && msg.author.toLowerCase() !== currentDisplayName.toLowerCase()) {
          messageDiv.appendChild(replyButton);
        }
        
        chatContainer.appendChild(messageDiv);
      });

      if (shouldScroll) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    });

    isMessageListenerActive = true;
  }

  onAuthStateChanged(auth, async user => {
    currentUser = user;

    if (user) {
      const userRef = ref(db, `users/${user.uid}`);
      let nameToUse = user.displayName || user.email.split('@')[0];
      
      const userSnapshot = await get(userRef);
      
      let userData = {};
      if (userSnapshot.exists()) {
        userData = userSnapshot.val();
        nameToUse = userData.displayName || nameToUse;
        
        await update(userRef, {
            displayName: nameToUse,
            photoURL: user.photoURL || userData.photoURL || null,
            email: user.email,
        });
      } else {
        await set(userRef, {
          displayName: nameToUse,
          photoURL: user.photoURL || null,
          email: user.email,
          online: false, 
          typing: false,
        });
      }
      
      usersCache[user.uid] = { 
        ...userData, 
        displayName: nameToUse, 
        photoURL: user.photoURL || userData.photoURL || null,
      };
      currentDisplayName = nameToUse; 

      const onlineRef = ref(db, `.info/connected`);
      
      onValue(onlineRef, (snapshot) => {
        if (snapshot.val() === true) {
          update(userRef, {
            online: true,
            typing: false
          });
          
          onDisconnect(userRef).update({
            online: false,
            typing: false
          });
        }
      });
      
      startChatListeners();

      messageInput.disabled = false;
      sendBtn.disabled = false;
      messageInput.placeholder = "Type your message...";
    } else {
      currentDisplayName = null;
      const previousUser = currentUser;
      currentUser = null;
      messageInput.disabled = true;
      sendBtn.disabled = true;
      messageInput.placeholder = "You must be logged in to chat.";
      
      if (previousUser) {
          update(ref(db, `users/${previousUser.uid}`), { typing: false });
      }
      
      chatContainer.innerHTML = '<p style="text-align: center; color: rgba(1, 237, 240, 0.5); padding: 40px;">Please log in to view and send messages.</p>';
      isMessageListenerActive = false;
    }
  });

  async function sendToDiscord(username, message, avatarUrl) {
    message = message + " - (***This was sent from the web client.***)"
    const payload = {
      username: username,
      content: message
    };
    
    if (avatarUrl) {
      payload.avatar_url = avatarUrl;
    }

    try {
      const response = await fetch(discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        console.error("Failed to send to Discord:", response.status);
      }
    } catch (error) {
      console.error("Error sending to Discord:", error);
    }
  }

  sendBtn.addEventListener("click", () => {
    if (!currentDisplayName) {
      alert("You must be logged in to send messages.");
      return;
    }

    if (!rateLimiter.canSend()) {
      const waitTime = rateLimiter.getTimeUntilNextMessage();
      alert(`Please slow down! Wait ${waitTime} seconds before sending another message.`);
      return;
    }

    const text = messageInput.value.trim();
    if (!text) return;

    if (text.length > 500) {
      alert("Message is too long. Maximum 500 characters.");
      return;
    }

    const displayName = currentDisplayName;
    const photoUrl = getUserData(displayName).photoURL;

    rateLimiter.recordMessage();

    const newMsgRef = push(ref(db, "global-chat"));
    set(newMsgRef, {
      author: displayName,
      text,
      timestamp: serverTimestamp()
    });

    sendToDiscord(displayName, text, photoUrl);

    if (currentUser) {
      update(ref(db, `users/${currentUser.uid}`), { typing: false });
    }

    messageInput.value = "";
    charCount.textContent = "0 / 500";
    charCount.classList.remove('warning', 'error');
  });

  messageInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !messageInput.disabled) {
      e.preventDefault();
      sendBtn.click();
    }
  });

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
        setTimeout(() => { window.location.href = href; }, 500);
      }
    });
  });
});
