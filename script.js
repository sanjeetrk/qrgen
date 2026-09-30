const userInput = document.getElementById("userInput");
const badgeCard = document.getElementById("badgeCard");
const badgeHeader = document.getElementById("badgeHeader");
const qrcodeContainer = document.getElementById("qrcodeContainer");
const presetButtons = document.querySelectorAll(".preset-btn");

let qrInstance = null;
let debounceTimer = null;

/**
 * Transforms patterns like "A1c1" into "A-01-C-1"
 */
function formatInput(text) {
  const trimmed = text.trim();
  const regex = /^([a-zA-Z])(\d+)([a-zA-Z])(\d+)$/;
  const match = trimmed.match(regex);

  if (match) {
    const firstChar = match[1].toUpperCase();
    const firstNum = match[2].padStart(2, "0"); // 1 becomes 01, 10 remains 10
    const secondChar = match[3].toUpperCase();
    const secondNum = match[4];

    return `${firstChar}-${firstNum}-${secondChar}-${secondNum}`;
  }

  // Fallback: If it doesn't match the 4-part pattern, convert to uppercase
  return trimmed.toUpperCase();
}

/**
 * Keeps the header text on a single line
 */
function formatHeaderText(text) {
  return text.trim();
}

/**
 * Adaptive QR size to prevent off-screen overflow when keyboard is open
 */
function getResponsiveQrSize() {
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  if (vh < 550) {
    return 130;
  }
  if (vw < 380) {
    return 150;
  }
  return 175;
}

/**
 * Resets preview
 */
function resetQR() {
  if (badgeCard) badgeCard.style.display = "none";
  qrcodeContainer.innerHTML = "";
  qrInstance = null;
}

/**
 * Generates and updates the QR Code
 */
function updateQRCode(customValue = null) {
  const rawValue = customValue !== null ? customValue : userInput.value;

  if (!rawValue || !rawValue.trim()) {
    resetQR();
    return;
  }

  const formattedValue = formatInput(rawValue);

  if (badgeHeader) {
    badgeHeader.textContent = formatHeaderText(formattedValue);
  }
  if (badgeCard) {
    badgeCard.style.display = "flex";
  }

  qrcodeContainer.innerHTML = "";
  const size = getResponsiveQrSize();

  qrInstance = new QRCode(qrcodeContainer, {
    text: formattedValue,
    width: size,
    height: size,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  // Ensure card remains smoothly positioned in view
  setTimeout(() => {
    badgeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 50);
}

// 1. Preset button click listeners (Dismisses keyboard immediately)
presetButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const val = btn.getAttribute("data-value");
    userInput.value = val;
    userInput.blur(); // Hides virtual keyboard
    updateQRCode(val);
  });
});

// 2. Real-time typing listener (150ms debounce)
userInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    updateQRCode();
  }, 150);
});

// 3. Clear on focus
userInput.addEventListener("focus", () => {
  userInput.value = "";
  resetQR();
});
