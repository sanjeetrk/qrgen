const userInput = document.getElementById("userInput");
const outputDisplay = document.getElementById("outputDisplay");
const qrcodeContainer = document.getElementById("qrcodeContainer");

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
 * Calculates adaptive QR size for different screen widths
 */
function getResponsiveQrSize() {
  const screenWidth = window.innerWidth;
  if (screenWidth < 360) return 160;
  if (screenWidth < 480) return 190;
  return 220;
}

/**
 * Resets the preview and canvas
 */
function resetQR() {
  qrcodeContainer.innerHTML = "";
  outputDisplay.textContent = "Waiting for input...";
  qrInstance = null;
}

/**
 * Generates and updates the QR Code
 */
function updateQRCode() {
  const rawValue = userInput.value.trim();

  if (!rawValue) {
    resetQR();
    return;
  }

  const formattedValue = formatInput(rawValue);
  outputDisplay.textContent = `Formatted: ${formattedValue}`;
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

// 1. Auto-clear when clicking/tapping the input box
userInput.addEventListener("focus", () => {
  userInput.value = "";
  resetQR();
});

// 2. Real-time auto-generation while typing (with 150ms debounce)
userInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(updateQRCode, 150);
});
