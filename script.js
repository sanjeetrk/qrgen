const userInput = document.getElementById("userInput");
const badgeCard = document.getElementById("badgeCard");
const badgeHeader = document.getElementById("badgeHeader");
const qrcodeContainer = document.getElementById("qrcodeContainer");
const presetButtons = document.querySelectorAll(".preset-btn");

let qrInstance = null;
let debounceTimer = null;

/**
 * Transforms patterns like "A1c1" into "A-01-C-1"
 * Automatically pads single-digit first numbers with a leading zero
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
 * Formats the badge header display with a clean line-break after the hyphen
 */
function formatHeaderText(text) {
  if (text.includes("-") && !text.includes("\n")) {
    return text.replace("-", "-\n");
  }
  return text;
}

/**
 * Calculates adaptive QR size for different screen widths
 */
function getResponsiveQrSize() {
  const screenWidth = window.innerWidth;
  if (screenWidth < 360) return 150;
  if (screenWidth < 480) return 180;
  return 200;
}

/**
 * Resets the preview and canvas
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

  // Apply original pattern formatting
  const formattedValue = formatInput(rawValue);

  // Update header text and show badge
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
}

// 1. Preset button click handlers
presetButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const val = btn.getAttribute("data-value");
    userInput.value = val;
    updateQRCode(val);
  });
});

// 2. Auto-clear when clicking/tapping the input box
userInput.addEventListener("focus", () => {
  userInput.value = "";
  resetQR();
});

// 3. Real-time auto-generation while typing (with 150ms debounce)
userInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    updateQRCode();
  }, 150);
});
