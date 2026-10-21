const userInput = document.getElementById("userInput");
const clearBtn = document.getElementById("clearBtn");
const badgeCard = document.getElementById("badgeCard");
const badgeHeader = document.getElementById("badgeHeader");
const qrcodeContainer = document.getElementById("qrcodeContainer");
const historyLeft = document.getElementById("historyLeft");
const historyRight = document.getElementById("historyRight");
const dropdownLeft = document.getElementById("dropdownLeft");
const dropdownRight = document.getElementById("dropdownRight");
const presetButtons = document.querySelectorAll(".preset-btn");

let qrDebounceTimer = null;
let historyDebounceTimer = null;
let historyList = [];
let activeDropdown = null; // tracks which dropdown is open

// Random suffix generator for PBL / PBM (last 3 digits: 100–499)
function randomPBSuffix() {
  return Math.floor(Math.random() * 400) + 100; // 100 to 499
}

// Load persisted history from localStorage
try {
  const saved = localStorage.getItem("qr_history_list");
  if (saved) {
    historyList = JSON.parse(saved);
  }
} catch (e) {
  historyList = [];
}

function toggleClearBtn() {
  if (clearBtn) {
    clearBtn.style.display = userInput.value.trim() ? "block" : "none";
  }
}

/**
 * Transforms patterns like "A1c1" into "A-01-C-1"
 */
function formatInput(text) {
  const trimmed = text.trim();
  const regex = /^([a-zA-Z])(\d+)([a-zA-Z])(\d+)$/;
  const match = trimmed.match(regex);

  if (match) {
    const firstChar = match[1].toUpperCase();
    const firstNum = match[2].padStart(2, "0");
    const secondChar = match[3].toUpperCase();
    const secondNum = match[4];

    return `${firstChar}-${firstNum}-${secondChar}-${secondNum}`;
  }

  return trimmed.toUpperCase();
}

/**
 * Formats history text into clean vertical lines
 */
function formatHistoryText(text) {
  if (!text) return "";

  // 1. Location patterns: A-05-C-1 -> A, 5, C1
  const formattedMatch = text.match(/^([a-zA-Z])-(\d+)-([a-zA-Z])-(\d+)$/);
  if (formattedMatch) {
    const p1 = formattedMatch[1].toUpperCase();
    const p2 = String(parseInt(formattedMatch[2], 10)); // removes leading 0
    const p3 = `${formattedMatch[3].toUpperCase()}${formattedMatch[4]}`;
    return `<span>${p1}</span><span>${p2}</span><span>${p3}</span>`;
  }

  // 2. Hyphenated or Underscore words like IFC-PRN_123456
  if (text.includes("-") || text.includes("_")) {
    const parts = text.split(/[-_]/).filter(Boolean);
    return parts.slice(0, 3).map(part => `<span>${part}</span>`).join("");
  }

  // 3. Plain long numbers or words (like 6262626) -> chunk into segments of 3-4 chars
  if (text.length > 4) {
    const chunks = text.match(/.{1,3}/g) || [text];
    return chunks.slice(0, 3).map(chunk => `<span>${chunk}</span>`).join("");
  }

  return `<span>${text}</span>`;
}

function getResponsiveQrSize() {
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  if (vh < 550) return 120;
  if (vw < 380) return 140;
  return 165;
}

/**
 * Render history slot
 */
function renderHistorySlot(container, value, label) {
  container.innerHTML = "";
  if (!value) return;

  const card = document.createElement("div");
  card.className = "history-card";
  card.setAttribute("title", `Click to load: ${value}`);

  card.innerHTML = `
    <span class="history-label">${label}</span>
    <div class="history-text">${formatHistoryText(value)}</div>
  `;

  // Clicking history reloads it into input & displays QR
  card.addEventListener("click", () => {
    userInput.value = value;
    userInput.blur();
    updateQRCode(value, false);
  });

  container.appendChild(card);
}

/**
 * Render the full dropdown list (items 2–9, i.e. older entries)
 */
function renderDropdown(dropdownEl, startIndex) {
  dropdownEl.innerHTML = "";

  // Show items from startIndex up to 10
  const items = historyList.slice(startIndex, 10);

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-dropdown-empty";
    empty.textContent = "No older history";
    dropdownEl.appendChild(empty);
    return;
  }

  items.forEach((val, idx) => {
    const item = document.createElement("div");
    item.className = "history-dropdown-item";
    item.innerHTML = `<span class="hdi-num">${startIndex + idx + 1}</span><span class="hdi-val">${val}</span>`;
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      userInput.value = val;
      userInput.blur();
      updateQRCode(val, false);
      closeAllDropdowns();
    });
    dropdownEl.appendChild(item);
  });
}

function openDropdown(dropdownEl, slotEl, startIndex) {
  const arrowEl = dropdownEl.previousElementSibling; // the button
  if (activeDropdown === dropdownEl) {
    closeAllDropdowns();
    return;
  }
  closeAllDropdowns();
  renderDropdown(dropdownEl, startIndex);
  dropdownEl.classList.add("open");
  if (arrowEl) arrowEl.classList.add("rotated");
  activeDropdown = dropdownEl;
}

function closeAllDropdowns() {
  if (dropdownLeft) {
    dropdownLeft.classList.remove("open");
    const aL = dropdownLeft.previousElementSibling;
    if (aL) aL.classList.remove("rotated");
  }
  if (dropdownRight) {
    dropdownRight.classList.remove("open");
    const aR = dropdownRight.previousElementSibling;
    if (aR) aR.classList.remove("rotated");
  }
  activeDropdown = null;
}

function renderHistoryUI() {
  renderHistorySlot(historyLeft, historyList[0], "Prev 1");
  renderHistorySlot(historyRight, historyList[1], "Prev 2");
  // Update arrow visibility
  const arrowLeft = document.getElementById("arrowLeft");
  const arrowRight = document.getElementById("arrowRight");
  if (arrowLeft) arrowLeft.style.display = historyList.length > 2 ? "flex" : "none";
  if (arrowRight) arrowRight.style.display = historyList.length > 2 ? "flex" : "none";
}

/**
 * Pushes any valid string into history
 */
function pushHistory(value) {
  if (!value || !value.trim()) return;
  const cleanVal = value.trim();

  // If already at the top of history, don't duplicate
  if (historyList[0] === cleanVal) return;

  // Filter existing duplicates and keep top 10
  historyList = [cleanVal, ...historyList.filter(item => item !== cleanVal)].slice(0, 10);

  try {
    localStorage.setItem("qr_history_list", JSON.stringify(historyList));
  } catch (e) {}

  renderHistoryUI();
}

function resetQR() {
  if (badgeCard) badgeCard.style.display = "none";
  if (qrcodeContainer) qrcodeContainer.innerHTML = "";
  toggleClearBtn();
}

/**
 * Generates and updates the QR Code
 */
function updateQRCode(customValue = null, saveToHistory = false) {
  const rawValue = customValue !== null ? customValue : userInput.value;

  toggleClearBtn();

  if (!rawValue || !rawValue.trim()) {
    resetQR();
    return;
  }

  if (!qrcodeContainer || typeof QRCode === "undefined") {
    return;
  }

  const formattedValue = formatInput(rawValue);

  if (badgeHeader) {
    badgeHeader.textContent = formattedValue;
  }

  badgeCard.style.display = "flex";
  qrcodeContainer.innerHTML = "";

  const size = getResponsiveQrSize();

  new QRCode(qrcodeContainer, {
    text: formattedValue,
    width: size,
    height: size,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  // Direct save (for preset clicks or blur/enter)
  if (saveToHistory) {
    pushHistory(formattedValue);
  }
}

// 1. Preset button listeners (saves immediately to history)
presetButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const val = btn.getAttribute("data-value");
    userInput.value = val;
    userInput.blur();
    updateQRCode(val, true);
  });
});

// 2a. PBL random button
const btnPBL = document.getElementById("btnPBL");
if (btnPBL) {
  btnPBL.addEventListener("click", () => {
    const code = `PBL-3200490${randomPBSuffix()}`;
    userInput.value = code;
    userInput.blur();
    updateQRCode(code, true);
  });
}

// 2b. PBM random button
const btnPBM = document.getElementById("btnPBM");
if (btnPBM) {
  btnPBM.addEventListener("click", () => {
    const code = `PBM-3200490${randomPBSuffix()}`;
    userInput.value = code;
    userInput.blur();
    updateQRCode(code, true);
  });
}

// 2c. BBNow random button (BB + 9 random digits, each 1–9)
const btnBBNow = document.getElementById("btnBBNow");
if (btnBBNow) {
  btnBBNow.addEventListener("click", () => {
    let digits = "";
    for (let i = 0; i < 9; i++) {
      digits += Math.floor(Math.random() * 9 + 1); // 1–9
    }
    const code = `BB${digits}`;
    userInput.value = code;
    userInput.blur();
    updateQRCode(code, true);
  });
}

// 2. Real-time typing listener
userInput.addEventListener("input", () => {
  toggleClearBtn();

  // Fast QR render while typing (150ms)
  clearTimeout(qrDebounceTimer);
  qrDebounceTimer = setTimeout(() => {
    updateQRCode();
  }, 150);

  // History commit triggers only after user pauses typing for 600ms
  clearTimeout(historyDebounceTimer);
  historyDebounceTimer = setTimeout(() => {
    const val = userInput.value.trim();
    if (val.length >= 2) {
      pushHistory(formatInput(val));
    }
  }, 1500);
});

// 3. User finishes typing and closes keyboard / clicks away
userInput.addEventListener("blur", () => {
  const val = userInput.value.trim();
  if (val.length >= 2) {
    pushHistory(formatInput(val));
  }
});

// 4. Clear button event
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    userInput.value = "";
    resetQR();
    userInput.focus();
  });
}

// Initial history load
renderHistoryUI();

// Arrow button click handlers
const arrowLeft = document.getElementById("arrowLeft");
const arrowRight = document.getElementById("arrowRight");

if (arrowLeft) {
  arrowLeft.addEventListener("click", (e) => {
    e.stopPropagation();
    openDropdown(dropdownLeft, historyLeft, 2);
  });
}

if (arrowRight) {
  arrowRight.addEventListener("click", (e) => {
    e.stopPropagation();
    openDropdown(dropdownRight, historyRight, 2);
  });
}

// Close dropdowns when clicking outside
document.addEventListener("click", (e) => {
  const leftWrapper = document.getElementById("historyLeftWrapper");
  const rightWrapper = document.getElementById("historyRightWrapper");
  if (
    activeDropdown &&
    !leftWrapper?.contains(e.target) &&
    !rightWrapper?.contains(e.target)
  ) {
    closeAllDropdowns();
  }
});