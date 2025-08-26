// DOM elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const chatBox = document.getElementById("chatBox");
const messagesDiv = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");

let currentUser = null;

// Login with Google
loginBtn.addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    currentUser = result.user;
  } catch (err) {
    console.error(err);
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await auth.signOut();
});

// Watch auth state
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
    chatBox.classList.remove("hidden");
    loadMessages();
  } else {
    currentUser = null;
    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";
    chatBox.classList.add("hidden");
    messagesDiv.innerHTML = "";
  }
});

// Send message
chatForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser) return;

  const text = messageInput.value.trim();
  if (!text) return;

  await db.collection("messages").add({
    uid: currentUser.uid,
    username: currentUser.displayName || "Anonymous",
    text: text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  messageInput.value = "";
});

// Load messages in realtime
function loadMessages() {
  const messagesRef = db.collection("messages").orderBy("timestamp");

  messagesRef.onSnapshot(snapshot => {
    messagesDiv.innerHTML = "";

    snapshot.forEach(doc => {
      const msg = doc.data();
      const msgDiv = document.createElement("div");
      msgDiv.classList.add("chat-message");

      const userSpan = document.createElement("div");
      userSpan.classList.add("chat-username");
      userSpan.textContent = msg.username;

      const textSpan = document.createElement("div");
      textSpan.textContent = msg.text;

      msgDiv.appendChild(userSpan);
      msgDiv.appendChild(textSpan);
      messagesDiv.appendChild(msgDiv);
    });

    // Scroll to bottom
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}