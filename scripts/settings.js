// Settings Modal Logic
const modal = document.getElementById("settings-modal");
const settingsBtn = document.getElementById("settings-btn");
const closeBtn = document.getElementById("close-settings");
const themeSelect = document.getElementById("theme-select");

// Open modal
settingsBtn.addEventListener("click", () => {
  modal.style.display = "block";
});

// Close modal
closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target == modal) modal.style.display = "none";
});

// Apply theme
function applyTheme(theme) {
  document.body.classList.remove("light", "dark", "gradient");
  document.body.classList.add(theme);
  localStorage.setItem("theme", theme);
  themeSelect.value = theme;
}

// Load saved theme
const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme);

// Change event
themeSelect.addEventListener("change", () => {
  applyTheme(themeSelect.value);
});