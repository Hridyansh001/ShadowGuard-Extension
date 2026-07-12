let sgEnabled = true;
let sgSensitivity = "balanced";

function isExtensionContextValid() {
  return typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id;
}

function logToTerminal(message, type = "info") {
  if (!isExtensionContextValid()) return;
  try {
    chrome.storage.local.get(["sg_terminal_logs"], (data) => {
      if (chrome.runtime.lastError) return;
      const logs = data.sg_terminal_logs || [];
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      logs.push({ timestamp, message, type });
      if (logs.length > 40) logs.shift(); // Keep last 40 logs
      chrome.storage.local.set({ sg_terminal_logs: logs });
    });
  } catch (e) {
    // Ignore runtime context errors
  }
}

function injectFirewallActivationToast() {
  const toastId = "shadowguard-activation-toast";
  let toast = document.getElementById(toastId);
  if (toast) toast.remove();

  toast = document.createElement("div");
  toast.id = toastId;
  
  const cubeSvg = `
    <svg width="24" height="24" viewBox="0 0 32 32" style="flex-shrink:0; margin-right: 12px; filter: drop-shadow(0 0 5px #00f2fe);">
      <g transform="translate(0, 2)">
        <path d="M4 18 l6 -3.5 l6 3.5 l-6 3.5 z" fill="#22d3ee" />
        <path d="M4 18 l6 3.5 v4.5 l-6 -3.5 z" fill="#0891b2" />
        <path d="M10 21.5 l6 -3.5 v4.5 l-6 3.5 z" fill="#0e7490" />
        <path d="M8 12 l6 -3.5 l6 3.5 l-6 3.5 z" fill="#22d3ee" />
        <path d="M8 12 l6 3.5 v4.5 l-6 -3.5 z" fill="#0891b2" />
        <path d="M14 15.5 l6 -3.5 v4.5 l-6 3.5 z" fill="#0e7490" />
        <path d="M12 6 l6 -3.5 l6 3.5 l-6 3.5 z" fill="#67e8f9" />
        <path d="M12 6 l6 3.5 v4.5 l-6 -3.5 z" fill="#06b6d4" />
        <path d="M18 9.5 l6 -3.5 v4.5 l-6 3.5 z" fill="#0891b2" />
      </g>
    </svg>
  `;

  toast.innerHTML = `
    <div class="sg-toast-inner">
      ${cubeSvg}
      <div class="sg-toast-text">
        <span class="sg-cyan">SHADOW</span>GUARD FIREWALL ARCHITECTURE ACTIVATED
      </div>
      <div class="sg-toast-glow-bar"></div>
    </div>
  `;

  const toastStyles = `
    #shadowguard-activation-toast {
      position: fixed !important;
      top: 24px !important;
      left: 50% !important;
      transform: translateX(-50%) translateY(-100px) !important;
      z-index: 2147483647 !important;
      background: #080b0f !important;
      border: 1.5px solid #00f2fe !important;
      border-radius: 40px !important;
      padding: 8px 24px 8px 16px !important;
      box-shadow: 0 0 25px rgba(0, 242, 254, 0.5), inset 0 0 10px rgba(0, 242, 254, 0.15) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
      pointer-events: none !important;
      font-family: ui-monospace, 'Cascadia Code', 'JetBrains Mono', monospace !important;
      letter-spacing: 0.08em !important;
    }
    #shadowguard-activation-toast.sg-active {
      transform: translateX(-50%) translateY(0) !important;
    }
    .sg-toast-inner {
      display: flex !important;
      align-items: center !important;
      position: relative !important;
    }
    .sg-toast-text {
      color: #ffffff !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      white-space: nowrap !important;
      text-shadow: 0 0 4px rgba(255,255,255,0.2) !important;
    }
    .sg-toast-text .sg-cyan {
      color: #00f2fe !important;
      font-weight: 900 !important;
      text-shadow: 0 0 8px rgba(0,242,254,0.6) !important;
    }
    .sg-toast-glow-bar {
      position: absolute !important;
      bottom: -9px !important;
      left: 10% !important;
      width: 80% !important;
      height: 1px !important;
      background: linear-gradient(90deg, transparent, #00f2fe, transparent) !important;
      box-shadow: 0 0 8px #00f2fe !important;
    }
  `;

  let styleEl = document.getElementById("sg-toast-style");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "sg-toast-style";
    styleEl.textContent = toastStyles;
    document.head.appendChild(styleEl);
  }

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    setTimeout(() => {
      if (toast) toast.classList.add("sg-active");
    }, 50);
  });

  setTimeout(() => {
    if (toast) {
      toast.classList.remove("sg-active");
      setTimeout(() => toast.remove(), 600);
    }
  }, 3500);
}

if (isExtensionContextValid()) {
  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "SG_TOGGLE") {
        sgEnabled = msg.enabled;
        if (!sgEnabled) {
          removeBanner();
          isBlocked = false;
          toggleSendButton(false);
          const modal = document.getElementById("shadowguard-modal");
          if (modal) modal.remove();
        } else {
          injectFirewallActivationToast();
        }
        updateShieldWidget();
      }
    });

    chrome.storage.local.get(["sg_enabled", "sg_sensitivity"], (data) => {
      if (chrome.runtime.lastError) return;
      sgEnabled = data.sg_enabled !== false;
      sgSensitivity = data.sg_sensitivity || "balanced";
      
      logToTerminal("ShadowGuard Core initialized.", "system");
      if (sgEnabled) {
        setTimeout(() => {
          injectFirewallActivationToast();
        }, 1500);
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local") {
        if (changes.sg_sensitivity) {
          sgSensitivity = changes.sg_sensitivity.newValue || "balanced";
          logToTerminal("Sensitivity set to: " + sgSensitivity.toUpperCase(), "system");
        }
        if (changes.sg_enabled) {
          sgEnabled = changes.sg_enabled.newValue !== false;
          if (sgEnabled) {
            logToTerminal("Cognitive Firewall activated.", "system");
            injectFirewallActivationToast();
          } else {
            logToTerminal("Firewall deactivated. Scanning paused.", "warning");
            removeBanner();
            isBlocked = false;
            toggleSendButton(false);
            const modal = document.getElementById("shadowguard-modal");
            if (modal) modal.remove();
          }
          updateShieldWidget();
        }
      }
    });
  } catch (e) {
    console.warn("[ShadowGuard] Failed to init chrome APIs:", e);
  }
}

console.log("ShadowGuard v2 Loaded");

// const BACKEND_URL = "http://localhost:8080/api/scan";
const BACKEND_URL = "https://shadowguard-backend-final.onrender.com/api/scan";
const IMAGE_SCAN_URL = "https://shadowguard-backend-final.onrender.com/api/scan/image";

let lastValue = "";
let timeout = null;
let isBlocked = false;
let overrideOption = false;
let isFileScanActive = false;
let isImageScanning = false;

// NEW: track what triggered the current scan + which file input (if any) holds the file
let currentFileInput = null;
let lastScanSource = "text"; // "text" | "file" | "image"

// Interactive Shield Widget state tracking
let latestScanResult = null;
let isTooltipHovered = false;
let isShieldHovered = false;

// Pasted screenshots are intercepted BEFORE the host page inserts them, so we
// hold onto the raw file + target editor until the scan verdict comes back.
let pendingScreenshotFile = null;
let pendingScreenshotEditor = null;
let sgSuppressPasteIntercept = false; // true while we're re-dispatching a paste ourselves

// ── STYLES ──────────────────────────────────────────────────────────────────
const STYLES = `
  @keyframes sg-slideDown {
    from { opacity: 0; transform: translateY(-12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes sg-slideUp {
    from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes sg-fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes sg-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
    50%       { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
  }
  @keyframes sg-shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes sg-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes sg-ringPulse {
    0%   { transform: scale(1); opacity: 0.7; }
    100% { transform: scale(2); opacity: 0; }
  }
  @keyframes sg-barFill {
    from { width: 0%; }
  }

  #shadowguard-banner {
    position: fixed !important;
    top: 16px !important;
    right: 16px !important;
    z-index: 999998 !important;
    width: 280px !important;
    border-radius: 10px;
    padding: 12px 14px;
    font-family: ui-monospace, 'Cascadia Code', monospace;
    font-size: 11px;
    animation: sg-slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1);
    backdrop-filter: blur(12px);
    border: 1px solid;
  }
  #shadowguard-banner.sg-blocked {
    background: rgba(26,10,10,0.95);
    border-color: #7f1d1d;
    color: #fca5a5;
    box-shadow: 0 0 24px rgba(239,68,68,0.2), 0 8px 32px rgba(0,0,0,0.5);
  }
  #shadowguard-banner.sg-warning {
    background: rgba(26,18,0,0.95);
    border-color: #78350f;
    color: #fcd34d;
    box-shadow: 0 0 24px rgba(245,158,11,0.15), 0 8px 32px rgba(0,0,0,0.5);
  }
  .sg-banner-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 800;
  }
  .sg-banner-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    flex-shrink: 0;
  }
  .sg-blocked .sg-banner-icon { background: rgba(239,68,68,0.2); }
  .sg-warning .sg-banner-icon { background: rgba(245,158,11,0.2); }
  .sg-banner-reasons {
    opacity: 0.8;
    line-height: 1.5;
    font-size: 11px;
  }
  .sg-banner-close {
    position: absolute;
    top: 10px;
    right: 12px;
    background: none;
    border: none;
    color: inherit;
    opacity: 0.5;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 2px 4px;
  }
  .sg-banner-close:hover { opacity: 1; }

  /* ── SHIELD WIDGET STYLES ── */
  #shadowguard-shield-widget {
    position: fixed !important;
    z-index: 2147483640 !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 26px !important;
    height: 26px !important;
    border-radius: 50% !important;
    border: 1.5px solid !important;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    pointer-events: auto !important;
  }
  #shadowguard-shield-widget:hover {
    transform: scale(1.12) !important;
  }
  .sg-shield-safe {
    border-color: #22c55e !important;
    background: rgba(8, 15, 10, 0.9) !important;
    color: #22c55e !important;
    box-shadow: 0 0 10px rgba(34, 197, 94, 0.25) !important;
  }
  .sg-shield-warning {
    border-color: #f59e0b !important;
    background: rgba(15, 12, 8, 0.9) !important;
    color: #f59e0b !important;
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.4) !important;
    animation: sg-shield-pulse-warning 1.8s infinite !important;
  }
  .sg-shield-blocked {
    border-color: #ef4444 !important;
    background: rgba(15, 8, 8, 0.9) !important;
    color: #ef4444 !important;
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.5) !important;
    animation: sg-shield-pulse-blocked 1.4s infinite !important;
  }
  @keyframes sg-shield-pulse-warning {
    0%, 100% { box-shadow: 0 0 10px rgba(245, 158, 11, 0.3); }
    50% { box-shadow: 0 0 18px rgba(245, 158, 11, 0.6), inset 0 0 4px rgba(245, 158, 11, 0.2); }
  }
  @keyframes sg-shield-pulse-blocked {
    0%, 100% { box-shadow: 0 0 12px rgba(239, 68, 68, 0.4); }
    50% { box-shadow: 0 0 22px rgba(239, 68, 68, 0.75), inset 0 0 6px rgba(239, 68, 68, 0.3); }
  }

  #shadowguard-shield-tooltip {
    position: fixed !important;
    z-index: 2147483641 !important;
    width: 250px !important;
    background: #080c12 !important;
    border: 1px solid #1e2832 !important;
    border-radius: 10px !important;
    padding: 10px 12px !important;
    box-shadow: 0 10px 25px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) !important;
    font-family: ui-monospace, 'Cascadia Code', monospace !important;
    color: #cbd5e1 !important;
    display: none !important;
    opacity: 0 !important;
    transform: scale(0.96) translateX(-4px) !important;
    transition: opacity 0.15s ease, transform 0.15s ease !important;
    pointer-events: auto !important;
  }
  #shadowguard-shield-tooltip.sg-tooltip-visible {
    display: block !important;
    opacity: 1 !important;
    transform: scale(1) translateX(0) !important;
  }
  .sg-tooltip-header {
    font-family: system-ui, -apple-system, sans-serif !important;
    font-weight: 800 !important;
    font-size: 11px !important;
    margin-bottom: 6px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    color: #ffffff !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
  }
  .sg-tooltip-title-row {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
  }
  .sg-tooltip-score {
    font-size: 9px !important;
    padding: 1px 5px !important;
    border-radius: 4px !important;
    font-weight: 700 !important;
    background: rgba(255,255,255,0.06) !important;
    color: #94a3b8 !important;
  }
  .sg-tooltip-content {
    font-size: 10px !important;
    color: #94a3b8 !important;
    line-height: 1.4 !important;
    margin-bottom: 8px !important;
  }
  .sg-tooltip-reasons {
    display: flex !important;
    flex-direction: column !important;
    gap: 4px !important;
    margin-top: 6px !important;
    margin-bottom: 8px !important;
  }
  .sg-tooltip-reason-item {
    font-size: 9px !important;
    color: #e2e8f0 !important;
    background: rgba(255,255,255,0.03) !important;
    border: 1px solid rgba(255,255,255,0.04) !important;
    padding: 3px 6px !important;
    border-radius: 4px !important;
    display: flex !important;
    align-items: center !important;
    gap: 4px !important;
  }
  .sg-tooltip-btn {
    width: 100% !important;
    border: none !important;
    border-radius: 5px !important;
    padding: 6px !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    font-family: inherit !important;
    cursor: pointer !important;
    text-align: center !important;
    text-transform: uppercase !important;
    letter-spacing: 0.04em !important;
    transition: all 0.15s !important;
    background: #0284c7 !important;
    color: #ffffff !important;
  }
  .sg-tooltip-btn:hover {
    background: #0369a1 !important;
  }
`;

function injectStyles() {
  if (document.getElementById("sg-styles")) return;
  const el = document.createElement("style");
  el.id = "sg-styles";
  el.textContent = STYLES;
  document.head.appendChild(el);
}

// ── SEVERITY ────────────────────────────────────────────────────────────────
function getSeverity(score) {
  if (score >= 80) return { label: "CRITICAL", color: "#ef4444", bg: "rgba(239,68,68,0.12)", glow: "rgba(239,68,68,0.4)" };
  if (score >= 60) return { label: "HIGH",     color: "#f97316", bg: "rgba(249,115,22,0.12)", glow: "rgba(249,115,22,0.4)" };
  if (score >= 40) return { label: "MEDIUM",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)", glow: "rgba(245,158,11,0.35)" };
  return               { label: "LOW",      color: "#22c55e", bg: "rgba(34,197,94,0.12)",  glow: "rgba(34,197,94,0.3)"  };
}

// ── BANNER ───────────────────────────────────────────────────────────────────
function createBanner(message, type = "warning") {
  removeBanner();
  injectStyles();

  const banner = document.createElement("div");
  banner.id = "shadowguard-banner";
  banner.className = `sg-${type}`;

  const icon = type === "blocked" ? "🚫" : "⚠️";
  const title = type === "blocked" ? "Blocked" : "Warning";

  banner.innerHTML = `
    <button class="sg-banner-close" id="sg-banner-close-btn">✕</button>
    <div class="sg-banner-header">
      <div class="sg-banner-icon">${icon}</div>
      ShadowGuard — ${title}
    </div>
    <div class="sg-banner-reasons">${message}</div>
  `;

  document.body.appendChild(banner);

  const closeBtn = document.getElementById("sg-banner-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", () => banner.remove());
}

function removeBanner() {
  const old = document.getElementById("shadowguard-banner");
  if (old) old.remove();
}

// ── SEND BUTTON ──────────────────────────────────────────────────────────────
function toggleSendButton(disabled) {
  document.querySelectorAll("button").forEach(button => {
    const label = (button.innerText || "").toLowerCase();
    const aria  = (button.getAttribute("aria-label") || "").toLowerCase();
    if (label.includes("send") || label.includes("submit") || aria.includes("send") || aria.includes("submit")) {
      if (disabled) {
        button.setAttribute("disabled", "true");
        button.style.pointerEvents = "none";
        button.onclick = (e) => { e.preventDefault(); e.stopPropagation(); return false; };
      } else {
        button.removeAttribute("disabled");
        button.style.pointerEvents = "auto";
        button.onclick = null;
      }
      button.style.opacity = disabled ? "0.4" : "1";
      button.style.cursor  = disabled ? "not-allowed" : "pointer";
    }
  });
}

// ── ATTACHMENT CLEANUP ───────────────────────────────────────────────────────
// Clears the native <input type="file"> FileList AND attempts to remove the
// host page's own attachment/thumbnail chip from the DOM (best-effort — the
// selectors below are generic guesses and may need to be tailored to the
// specific chat site you're targeting).
function removeAttachmentPreview() {
  // 1. Native file input — this is the part that actually determines what
  //    gets uploaded on submit, so this MUST be cleared.
  if (currentFileInput) {
    try {
      currentFileInput.value = "";
      currentFileInput.dispatchEvent(new Event("input", { bubbles: true }));
      currentFileInput.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) {
      console.error("[ShadowGuard] Failed to clear file input:", e);
    }
    currentFileInput = null;
  }

  // 2. Host page's own visual attachment chip / thumbnail (often backed by
  //    React/JS state rather than the raw input). Try a handful of common
  //    patterns for a "remove attachment" control.
  const removeSelectors = [
    '[aria-label*="Remove attachment" i]',
    '[aria-label*="Remove file" i]',
    '[aria-label*="Remove image" i]',
    '[aria-label*="Delete attachment" i]',
    '[data-testid*="remove-attachment" i]',
    '[data-testid*="delete-attachment" i]',
    '[data-testid*="close-attachment" i]',
    'button[aria-label*="Remove" i]',
    'button[aria-label*="Delete" i]',
  ];

  for (const sel of removeSelectors) {
    const btn = document.querySelector(sel);
    if (btn) {
      btn.click();
      break;
    }
  }
}

// ── CLIENT-SIDE REDACTION SAFETY NET ────────────────────────────────────────
// Some backend endpoints (notably the image/OCR scanner) can return a
// "mask" field that's just a copy of the raw text — i.e. nothing was
// actually redacted server-side. This runs a final pattern pass over
// whatever text is about to be sent so obvious secrets get masked
// regardless of what the backend did or didn't do.
function clientSideRedact(text) {
  if (!text) return text;
  let out = text;

  const maskMatch = (match) => {
    if (match.length <= 8) return "*".repeat(match.length);
    return match.slice(0, 4) + "*".repeat(Math.max(4, match.length - 8)) + match.slice(-4);
  };

  const patterns = [
    // OpenAI-style secret keys: sk-..., sk-proj-..., etc.
    /\bsk-[A-Za-z0-9_-]{16,}\b/g,
    // AWS access key IDs
    /\bAKIA[0-9A-Z]{16}\b/g,
    // Google API keys
    /\bAIza[0-9A-Za-z_-]{35}\b/g,
    // Slack tokens
    /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g,
    // Generic "Bearer <token>" headers
    /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/gi,
    // JWTs (header.payload.signature)
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    // PEM private key blocks
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    // Generic high-entropy tokens: 20+ chars, mixes upper/lower/digit, no spaces
    /\b(?=[A-Za-z0-9]{20,}\b)(?=[A-Za-z0-9]*[0-9])(?=[A-Za-z0-9]*[a-z])(?=[A-Za-z0-9]*[A-Z])[A-Za-z0-9]{20,}\b/g,
  ];

  for (const re of patterns) {
    out = out.replace(re, maskMatch);
  }

  return out;
}

// ── SANITIZE & SEND ──────────────────────────────────────────────────────────
// options.clearAttachment = true strips any attached file/screenshot before
// writing the masked text into the editor and sending.
function sanitizeAndSend(maskedText, options = {}) {
  const { clearAttachment = false } = options;

  const editor =
    document.querySelector('[contenteditable="true"]') ||
    document.querySelector("textarea");

  if (!editor) return;

  if (clearAttachment) {
    removeAttachmentPreview();
  }

  // Replace input content with masked version
  if (editor.isContentEditable) {
    editor.innerText = maskedText;
  } else {
    editor.value = maskedText;
  }

  // Update lastValue so detectInput doesn't re-scan immediately
  lastValue = maskedText;
  isBlocked = false;
  overrideOption = true; // prevent re-trigger

  toggleSendButton(false);

  // Trigger input event so the page recognizes the change
  editor.dispatchEvent(new Event("input", { bubbles: true }));

  // Small delay then auto-click send
  setTimeout(() => {
    overrideOption = false;
    const sendBtn = [...document.querySelectorAll("button")].find(b => {
      const label = (b.innerText || "").toLowerCase();
      const aria  = (b.getAttribute("aria-label") || "").toLowerCase();
      return label.includes("send") || aria.includes("send");
    });
    if (sendBtn) sendBtn.click();
  }, 300);
}

// ── MODAL ────────────────────────────────────────────────────────────────────
// mode: "blocked" | "warning" — controls copy, colors and button behavior.
function showOverrideMethod(result, mode = "blocked") {
  if (document.getElementById("shadowguard-modal")) return;
  injectStyles();

  const isBlockedMode = mode === "blocked";

  const sev   = getSeverity(result.riskScore);
  const score = result.riskScore;

  const R   = 36;
  const C   = 2 * Math.PI * R;
  const gap = C - (score / 100) * C;

  const rawText  = result.text || result.mask || "";
  const preview  = rawText.length > 60
    ? rawText.slice(0, 28) + " ████████ " + rawText.slice(-18)
    : rawText || null;

  const severityDesc = score >= 80
    ? "Immediate action required"
    : score >= 60 ? "Significant risk detected"
    : score >= 40 ? "Moderate risk level"
    : "Low risk level";

  // Copy / color deck that differs between a hard BLOCK and a soft WARNING.
  const modalTitle    = isBlockedMode ? "ShadowGuard Alert" : "ShadowGuard Warning";
  const modalSubtitle = isBlockedMode ? "Security violation detected" : "Potential risk detected";
  const noticeText    = isBlockedMode
    ? "This prompt may expose confidential information to an external AI service. Sending could violate your organisation's data security policy."
    : "This prompt may contain sensitive information. Review the details below before sending — you can still proceed if you're confident it's safe.";
  const noticeBg      = isBlockedMode ? "#1a0808" : "#1a1400";
  const noticeBorder  = isBlockedMode ? "#ef444422" : "#f59e0b33";
  const noticeText2Color = isBlockedMode ? "#fca5a5" : "#fcd34d";
  const noticeIcon    = isBlockedMode ? "⚠️" : "🔎";
  const eyebrowText   = isBlockedMode ? "Security violation detected" : "Review recommended";
  const cancelLabel   = isBlockedMode ? "CANCEL" : "DISMISS";
  const overrideLabel = isBlockedMode ? "SANITIZE & SEND" : "SANITIZE & SEND";
  const secondaryOverrideLabel = "SEND AS-IS";

  const modal = document.createElement("div");
  modal.id = "shadowguard-modal";
  modal.style.cssText = `
    position: fixed !important;
    inset: 0 !important;
    background: rgba(0,0,0,0.78);
    backdrop-filter: blur(10px);
    z-index: 999999 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: sg-fadeIn 0.2s ease;
    font-family: ui-monospace, 'Cascadia Code', monospace;
  `;

  modal.innerHTML = `
    <div id="sg-card" style="
      background: #080c12;
      border: 1px solid ${sev.color}44;
      border-top: 3px solid ${sev.color};
      border-radius: 20px;
      width: 460px;
      max-width: calc(100vw - 32px);
      box-shadow: 0 0 80px ${sev.glow}, 0 0 0 1px #ffffff08, 0 40px 80px rgba(0,0,0,0.8);
      animation: sg-slideUp 0.4s cubic-bezier(0.34,1.3,0.64,1);
      overflow: hidden;
      position: relative;
    ">

      <div style="position:absolute;inset:0;pointer-events:none;z-index:0;
        background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);
        background-size:32px 32px;"></div>

      <div style="position:absolute;top:-60px;right:-60px;width:180px;height:180px;
        border-radius:50%;background:${sev.color};opacity:0.06;filter:blur(40px);pointer-events:none;z-index:0;"></div>

      <div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid #ffffff0f;">

        <div style="display:flex;align-items:center;gap:12px;">
          <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <div style="position:absolute;inset:-5px;border:1.5px solid ${sev.color};border-radius:50%;animation:sg-ringPulse 1.8s ease-out infinite;"></div>
            <div style="position:absolute;inset:-10px;border:1px solid ${sev.color}44;border-radius:50%;animation:sg-ringPulse 1.8s ease-out 0.4s infinite;"></div>
            <div style="width:40px;height:40px;border-radius:11px;background:${sev.bg};border:1px solid ${sev.color}33;display:flex;align-items:center;justify-content:center;font-size:20px;">${isBlockedMode ? "🛡️" : "🔔"}</div>
          </div>
          <div>
            <div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;font-weight:800;color:#f1f5f9;letter-spacing:-0.01em;">
              ${modalTitle}
            </div>
            <div style="font-size:9px;color:#475569;letter-spacing:0.12em;margin-top:2px;text-transform:uppercase;">
              ${eyebrowText}
            </div>
          </div>
        </div>

        <button id="sg-close-x" style="
          background:#0e1318;border:1px solid #1e2832;border-radius:8px;
          color:#475569;width:30px;height:30px;cursor:pointer;
          font-size:12px;display:flex;align-items:center;justify-content:center;
          transition:all 0.15s;flex-shrink:0;
        ">✕</button>
      </div>

      <div style="position:relative;z-index:1;padding:18px 20px;display:flex;flex-direction:column;gap:14px;">

        <div style="display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;">

          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
            <div style="position:relative;width:96px;height:96px;">
              <svg width="96" height="96" style="transform:rotate(-90deg);">
                <circle cx="48" cy="48" r="${R}" fill="none" stroke="#1e2832" stroke-width="7"/>
                <circle id="sg-ring" cx="48" cy="48" r="${R}" fill="none"
                  stroke="${sev.color}" stroke-width="7"
                  stroke-linecap="round"
                  stroke-dasharray="${C}"
                  stroke-dashoffset="${C}"
                  style="transition:stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1);filter:drop-shadow(0 0 6px ${sev.color}88);"
                />
              </svg>
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <div id="sg-score-num" style="font-family:system-ui,-apple-system,sans-serif;font-size:22px;font-weight:800;color:${sev.color};line-height:1;">0</div>
                <div style="font-size:9px;color:#475569;margin-top:1px;">/100</div>
              </div>
            </div>
            <div style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">Risk Score</div>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="background:#0e1318;border:1px solid ${sev.color}22;border-radius:12px;padding:12px 14px;">
              <div style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Severity Level</div>
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:8px;height:8px;border-radius:50%;background:${sev.color};box-shadow:0 0 8px ${sev.color};animation:sg-pulse 1.5s ease-in-out infinite;flex-shrink:0;"></div>
                <span style="font-family:system-ui,-apple-system,sans-serif;font-size:18px;font-weight:800;color:${sev.color};letter-spacing:-0.01em;">${sev.label}</span>
              </div>
              <div style="font-size:10px;color:#64748b;margin-top:6px;">${severityDesc}</div>
            </div>

            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                <span style="font-size:9px;color:#475569;">Threat level</span>
                <span style="font-size:9px;color:${sev.color};">${score}%</span>
              </div>
              <div style="height:4px;background:#1e2832;border-radius:2px;overflow:hidden;">
                <div id="sg-bar" style="height:100%;width:0%;background:linear-gradient(90deg,${sev.color}88,${sev.color});border-radius:2px;box-shadow:0 0 6px ${sev.color}66;transition:width 1s ease;"></div>
              </div>
            </div>
          </div>
        </div>

        <div style="background:#0e1318;border:1px solid #1e2832;border-radius:12px;padding:13px 15px;">
          <div style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Detected Threats</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${result.topReasons.map((r, i) => `
              <div style="display:flex;align-items:center;gap:10px;padding:6px 10px;background:#080c12;border:1px solid #1e2832;border-radius:7px;animation:sg-fadeIn 0.3s ease ${i * 0.08}s both;">
                <div style="width:5px;height:5px;border-radius:50%;background:${sev.color};flex-shrink:0;box-shadow:0 0 5px ${sev.color};"></div>
                <span style="font-size:11px;color:#cbd5e1;">${r}</span>
              </div>
            `).join("")}
          </div>
        </div>

        ${preview ? `
        <div style="background:#0e1318;border:1px solid #1e2832;border-radius:12px;padding:13px 15px;">
          <div style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Detected in input</div>
          <div style="font-size:11px;color:#64748b;line-height:1.6;word-break:break-all;font-family:ui-monospace,'Cascadia Code',monospace;">
            ${preview}
          </div>
        </div>
        ` : ""}

        <div style="background:${noticeBg};border:1px solid ${noticeBorder};border-radius:10px;padding:11px 13px;display:flex;align-items:flex-start;gap:10px;">
          <span style="font-size:13px;flex-shrink:0;margin-top:1px;">${noticeIcon}</span>
          <span style="font-size:10px;color:${noticeText2Color};line-height:1.65;">
            ${noticeText}
          </span>
        </div>

      </div>

      <div style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 20px;border-top:1px solid #ffffff0f;">
        <span style="font-size:9px;color:#334155;letter-spacing:0.06em;">ESC TO DISMISS</span>
        <div style="display:flex;gap:8px;">
          <button id="sg-cancel" style="
            padding:9px 18px;border-radius:8px;
            background:#0e1318;border:1px solid #1e2832;
            color:#94a3b8;font-family:ui-monospace,'Cascadia Code',monospace;
            font-size:10px;cursor:pointer;letter-spacing:0.08em;transition:all 0.15s;
          ">${cancelLabel}</button>
          ${!isBlockedMode ? `
          <button id="sg-send-as-is" style="
            padding:9px 18px;border-radius:8px;
            background:#0e1318;border:1px solid #334155;
            color:#94a3b8;font-family:ui-monospace,'Cascadia Code',monospace;
            font-size:10px;cursor:pointer;letter-spacing:0.08em;transition:all 0.15s;
          ">${secondaryOverrideLabel}</button>
          ` : ""}
          <button id="sg-override" style="
            padding:9px 18px;border-radius:8px;
            background:${sev.color}18;border:1px solid ${sev.color}44;
            color:${sev.color};font-family:ui-monospace,'Cascadia Code',monospace;
            font-size:10px;font-weight:700;cursor:pointer;letter-spacing:0.08em;
            transition:all 0.2s;position:relative;overflow:hidden;
          ">${overrideLabel}</button>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  requestAnimationFrame(() => {
    setTimeout(() => {
      const ring = document.getElementById("sg-ring");
      const num  = document.getElementById("sg-score-num");
      const bar  = document.getElementById("sg-bar");
      if (ring) ring.style.strokeDashoffset = gap;
      if (bar)  bar.style.width = score + "%";
      if (num) {
        let current = 0;
        const step  = Math.ceil(score / 40);
        const tick  = setInterval(() => {
          current = Math.min(current + step, score);
          num.textContent = current;
          if (current >= score) clearInterval(tick);
        }, 25);
      }
    }, 80);
  });

  // Closing the modal only re-locks the send button when we were in a hard
  // BLOCKED state. In WARNING mode the send button was never disabled, so
  // dismissing just closes the dialog and leaves the user free to send.
  const closeModal = () => {
    if (isBlockedMode) toggleSendButton(true);
    // Dismissing without a decision drops the held-back screenshot rather
    // than silently inserting it — the user can re-paste if they want it.
    if (lastScanSource === "image") {
      pendingScreenshotFile = null;
      pendingScreenshotEditor = null;
    }
    modal.remove();
    document.removeEventListener("keydown", onEsc);
    // Hand control back to normal text scanning once this alert is dismissed,
    // so a file/image scan doesn't permanently suppress the empty-text cleanup.
    lastScanSource = "text";
  };

  const onEsc = (e) => {
    if (e.key === "Escape") closeModal();
  };
  document.addEventListener("keydown", onEsc);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById("sg-close-x").addEventListener("click", closeModal);
  document.getElementById("sg-cancel").addEventListener("click", closeModal);

  // ── OVERRIDE: masked text always goes into the chatbox. For file
  //    attachments we strip the attachment; for a held-back screenshot we
  //    simply discard it (the masked OCR text is sent in its place). ──
  document.getElementById("sg-override").addEventListener("click", () => {
    modal.remove();
    removeBanner();
    document.removeEventListener("keydown", onEsc);

    // Run a client-side pass on top of whatever the backend gave us — this
    // catches cases (like the image/OCR scanner) where "mask" is really
    // just an unredacted copy of "text".
    const maskedText = clientSideRedact(result.mask || result.text || "");

    if (lastScanSource === "file") {
      sanitizeAndSend(maskedText, { clearAttachment: true });
    } else if (lastScanSource === "image") {
      // The original screenshot was never inserted into the page — just
      // discard it and send the masked text instead.
      pendingScreenshotFile = null;
      pendingScreenshotEditor = null;
      sanitizeAndSend(maskedText);
    } else {
      sanitizeAndSend(maskedText);
    }

    lastScanSource = "text";
  });

  // ── SEND AS-IS (warning mode only): dismiss without masking. For text/file
  //    sources the original content is already in the box. For a held-back
  //    screenshot, explicitly re-insert the original image the user pasted. ──
  const sendAsIsBtn = document.getElementById("sg-send-as-is");
  if (sendAsIsBtn) {
    sendAsIsBtn.addEventListener("click", () => {
      modal.remove();
      removeBanner();
      document.removeEventListener("keydown", onEsc);

      if (lastScanSource === "image" && pendingScreenshotFile) {
        reinsertPastedImage(pendingScreenshotEditor, pendingScreenshotFile);
        pendingScreenshotFile = null;
        pendingScreenshotEditor = null;
      }

      toggleSendButton(false);
      overrideOption = true;
      lastScanSource = "text";
      setTimeout(() => { overrideOption = false; }, 500);
    });
  }

  const cancelBtn   = document.getElementById("sg-cancel");
  const overrideBtn = document.getElementById("sg-override");
  const closeBtn    = document.getElementById("sg-close-x");

  cancelBtn.onmouseover   = () => { cancelBtn.style.borderColor = "#475569"; cancelBtn.style.color = "#e2e8f0"; };
  cancelBtn.onmouseout    = () => { cancelBtn.style.borderColor = "#1e2832"; cancelBtn.style.color = "#94a3b8"; };
  if (sendAsIsBtn) {
    sendAsIsBtn.onmouseover = () => { sendAsIsBtn.style.borderColor = "#64748b"; sendAsIsBtn.style.color = "#e2e8f0"; };
    sendAsIsBtn.onmouseout  = () => { sendAsIsBtn.style.borderColor = "#334155"; sendAsIsBtn.style.color = "#94a3b8"; };
  }
  overrideBtn.onmouseover = () => { overrideBtn.style.background = sev.color + "30"; overrideBtn.style.boxShadow = `0 0 20px ${sev.glow}, inset 0 0 20px ${sev.color}10`; overrideBtn.style.borderColor = sev.color + "88"; };
  overrideBtn.onmouseout  = () => { overrideBtn.style.background = sev.color + "18"; overrideBtn.style.boxShadow = "none"; overrideBtn.style.borderColor = sev.color + "44"; };
  closeBtn.onmouseover    = () => { closeBtn.style.borderColor = "#475569"; closeBtn.style.color = "#e2e8f0"; };
  closeBtn.onmouseout     = () => { closeBtn.style.borderColor = "#1e2832"; closeBtn.style.color = "#475569"; };
}

function applySensitivityOverrides(result, sensitivity = "balanced") {
  const overriden = { ...result };
  
  if (!overriden.topReasons) {
    overriden.topReasons = [];
  }
  
  if (sensitivity === "relaxed") {
    if (overriden.verdict === "WARNING" && overriden.riskScore < 55) {
      overriden.verdict = "SAFE";
    } else if (overriden.verdict === "BLOCKED" && overriden.riskScore < 75) {
      overriden.verdict = "WARNING";
    }
  } else if (sensitivity === "strict") {
    if (overriden.verdict === "SAFE" && overriden.riskScore > 25) {
      overriden.verdict = "WARNING";
      if (overriden.topReasons.length === 0) {
        overriden.topReasons = ["Low-level threat anomaly"];
      }
    } else if (overriden.verdict === "WARNING" && overriden.riskScore > 55) {
      overriden.verdict = "BLOCKED";
    }
  }
  return overriden;
}

function saveScanResult(result) {
  if (!isExtensionContextValid()) return;
  try {
    chrome.storage.local.get(["sg_stats", "sg_history"], (data) => {
      if (chrome.runtime.lastError) return;
      const stats   = data.sg_stats   || { blocked: 0, warning: 0, safe: 0 };
      const history = data.sg_history || [];
      const v = result.verdict.toLowerCase();
      if (v === "blocked") stats.blocked++;
      else if (v === "warning") stats.warning++;
      else stats.safe++;
      
      history.unshift({
        verdict: result.verdict,
        text: (result.text || result.mask || "").slice(0, 100),
        time: new Date().toISOString(),
        riskScore: result.riskScore || 0,
        topReasons: result.topReasons || []
      });
      if (history.length > 20) history.pop();
      try {
        chrome.storage.local.set({ sg_stats: stats, sg_history: history });
      } catch (e) {}
    });
  } catch (e) {}
}

function handleResult(result) {
  const finalResult = applySensitivityOverrides(result, sgSensitivity);
  latestScanResult = finalResult;
  updateShieldWidget();

  const scoreText = `(Score: ${finalResult.riskScore}/100)`;
  const threats = finalResult.topReasons && finalResult.topReasons.length > 0 
    ? ` Threats: ${finalResult.topReasons.join(" · ")}` 
    : "";
    
  if (finalResult.verdict === "BLOCKED") {
    logToTerminal(`Blocked prompt input! ${scoreText}${threats}`, "error");
    saveScanResult(finalResult);
    if (overrideOption) { overrideOption = false; return; }
    isBlocked = true;
    createBanner(finalResult.topReasons.join(" · ") || "Blocked", "blocked");
    toggleSendButton(true);
    showOverrideMethod(finalResult, "blocked");
  } else if (finalResult.verdict === "WARNING") {
    logToTerminal(`Warning flagged for input. ${scoreText}${threats}`, "warning");
    saveScanResult(finalResult);
    if (overrideOption) { overrideOption = false; return; }
    isBlocked = false;
    createBanner(finalResult.topReasons.join(" · ") || "Warning", "warning");
    toggleSendButton(false);
    showOverrideMethod(finalResult, "warning");
  } else {
    logToTerminal(`Input scan passed. SAFE. ${scoreText}`, "success");
    saveScanResult(finalResult);
    isBlocked = false;
    removeBanner();
    toggleSendButton(false);
    lastScanSource = "text";
  }
}

// Re-dispatches the originally pasted file as a fresh "paste" event on the
// editor, so the host page's own paste handling runs exactly as if the user
// had pasted it themselves. Used when a screenshot turns out to be SAFE, or
// when the user explicitly chooses "Send As-Is" on a warning.
function reinsertPastedImage(editor, file) {
  if (!editor || !file) return;
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    const pasteEvent = new ClipboardEvent("paste", {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    });
    sgSuppressPasteIntercept = true;
    editor.focus();
    editor.dispatchEvent(pasteEvent);
  } catch (e) {
    console.warn("[ShadowGuard] Failed to re-insert original screenshot:", e);
  } finally {
    setTimeout(() => { sgSuppressPasteIntercept = false; }, 150);
  }
}

async function scanClipboardImage(file, editor) {

  if (isImageScanning) return;

  isImageScanning = true;
  lastScanSource = "image"; // NEW
  pendingScreenshotFile = file;
  pendingScreenshotEditor = editor || null;

  toggleSendButton(true);

  logToTerminal(`Pasted image detected (${(file.size / 1024).toFixed(1)} KB). Scanning...`, "info");
  createBanner("Scanning pasted screenshot...", "warning");

  const formData = new FormData();
  formData.append("file", file);

  try {

    const response = await fetch(IMAGE_SCAN_URL, {
    method: "POST",
    body: formData
});

if (!response.ok) {
    throw new Error("OCR request failed");
}

const result = await response.json();

    console.log("[ShadowGuard Screenshot]", result);

    removeBanner();

    isImageScanning = false;

    if (result.verdict === "SAFE") {
      // Nothing sensitive found — let the original screenshot through untouched.
      reinsertPastedImage(pendingScreenshotEditor, pendingScreenshotFile);
      pendingScreenshotFile = null;
      pendingScreenshotEditor = null;
      handleResult(result);
      toggleSendButton(false);
    } else {
      // BLOCKED / WARNING: keep holding the file. The modal's buttons decide
      // whether it gets sanitized (masked text only, image discarded) or
      // re-inserted as-is.
      handleResult(result);
    }

  } catch (err) {

    console.error(err);

    isImageScanning = false;

    removeBanner();

    toggleSendButton(false);

    logToTerminal(`Image scan failed: ${err.message}`, "error");
    createBanner(
      "Screenshot scan failed.",
      "warning"
    );

    // Scan itself failed (not a verdict) — fail open and let the original
    // paste through rather than silently swallowing the user's screenshot.
    reinsertPastedImage(pendingScreenshotEditor, pendingScreenshotFile);
    pendingScreenshotFile = null;
    pendingScreenshotEditor = null;
  }
}

// ── INPUT DETECTION ──────────────────────────────────────────────────────────
function detectInput() {
  if (!sgEnabled || isFileScanActive || isImageScanning) {
    const shield = document.getElementById("shadowguard-shield-widget");
    if (shield) shield.style.display = "none";
    hideTooltip();
    return;
  }
  const editor =
    document.querySelector('[contenteditable="true"]') ||
    document.querySelector("textarea");

  if (!editor) {
    removeBanner();
    const shield = document.getElementById("shadowguard-shield-widget");
    if (shield) shield.style.display = "none";
    hideTooltip();
    return;
  }

  const text = (editor.innerText || editor.value || "").trim();

  if (!text || text.length < 5) {
    if (isBlocked) return;
    // File/image scans rarely leave text in the box — don't let the
    // "box is basically empty" cleanup rip away a file/image warning
    // that's still waiting on the user's decision.
    if (lastScanSource === "file" || lastScanSource === "image") return;
    removeBanner();
    lastValue      = "";
    overrideOption = false;
    const modal = document.getElementById("shadowguard-modal");
    if (modal) modal.remove();
    toggleSendButton(false);

    // Reset shield widget
    latestScanResult = null;
    updateShieldWidget();
    return;
  }

  // Position and render/refresh the shield widget
  updateShieldWidget();

  if (text !== lastValue) {
    lastValue = text;
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      logToTerminal(`Scanning prompt text change...`, "info");
      try {
        const response = await fetch(BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!response.ok) throw new Error("HTTP error " + response.status);
        const result = await response.json();
        console.log("[ShadowGuard]", result);
        lastScanSource = "text"; // NEW
        handleResult(result);
      } catch (err) {
        logToTerminal(`Text scan failed: backend unreachable`, "error");
        console.error("[ShadowGuard] Backend error:", err);
      }
    }, 1000);
  }
}

setInterval(detectInput, 300);
document.addEventListener("input", detectInput);

document.addEventListener("keydown", (e) => {

  if ((isBlocked || isImageScanning) && (e.key === "Enter" || e.keyCode === 13)) {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    return false;
  }
}, true);

document.addEventListener("submit", (e) => {
  if (isBlocked || isImageScanning) {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    return false;
  }
}, true);

document.addEventListener(
  "paste",
  async (event) => {

    if (sgSuppressPasteIntercept) return; // this is our own programmatic re-paste — let it through

    const items = event.clipboardData?.items;

    if (!items) return;

    for (const item of items) {

      if (!item.type.startsWith("image/")) continue;

      const file = item.getAsFile();

      if (!file) return;

      console.log("[ShadowGuard] Screenshot detected");

      // Block the host page from inserting the raw screenshot until we've
      // scanned it. Otherwise "sanitize & send" can only mask the OCR'd
      // text while the original, unmasked image has already been attached.
      event.preventDefault();
      event.stopImmediatePropagation();

      const editor =
        document.querySelector('[contenteditable="true"]') ||
        document.querySelector("textarea");

      scanClipboardImage(file, editor);

      return;
    }

  },
  true
);

document.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.type !== "file") return;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];

  currentFileInput = target;  // NEW: remember which input holds the file
  lastScanSource = "file";    // NEW

  isFileScanActive = true;  // pause text scanning
  toggleSendButton(true);
  logToTerminal(`File upload detected: ${file.name} (${(file.size / 1024).toFixed(1)} KB). Scanning...`, "info");
  createBanner("Scanning uploaded file...", "warning");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("https://shadowguard-backend-final.onrender.com/api/scan/file", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("HTTP error " + response.status);
    const result = await response.json();
    console.log("[ShadowGuard File]", result);
    removeBanner();
    isFileScanActive = false;  // resume text scanning
    handleResult(result);
  } catch (err) {
    logToTerminal(`File scan failed: backend unreachable`, "error");
    console.error("[ShadowGuard File]", err);
    removeBanner();
    isFileScanActive = false;
    toggleSendButton(false);
    createBanner("File scan failed — backend unreachable", "warning");
  }
});

// ── SHIELD WIDGET LOGIC ──
function ensureShieldWidget(editor) {
  let shield = document.getElementById("shadowguard-shield-widget");
  let tooltip = document.getElementById("shadowguard-shield-tooltip");

  if (!shield) {
    injectStyles();

    shield = document.createElement("div");
    shield.id = "shadowguard-shield-widget";
    shield.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    `;
    document.body.appendChild(shield);

    // Event listeners for hover
    shield.addEventListener("mouseenter", () => {
      isShieldHovered = true;
      showTooltip();
    });

    shield.addEventListener("mouseleave", () => {
      isShieldHovered = false;
      setTimeout(() => {
        if (!isShieldHovered && !isTooltipHovered) {
          hideTooltip();
        }
      }, 100);
    });
  }

  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "shadowguard-shield-tooltip";
    document.body.appendChild(tooltip);

    tooltip.addEventListener("mouseenter", () => {
      isTooltipHovered = true;
    });

    tooltip.addEventListener("mouseleave", () => {
      isTooltipHovered = false;
      setTimeout(() => {
        if (!isShieldHovered && !isTooltipHovered) {
          hideTooltip();
        }
      }, 100);
    });
  }
}

function updateShieldPosition(editor, shield) {
  const rect = editor.getBoundingClientRect();
  // Align to top-right of the text input area
  const top = rect.top + 6;
  const left = rect.right - 32;
  shield.style.top = `${top}px`;
  shield.style.left = `${left}px`;
}

function updateShieldWidget() {
  if (!sgEnabled) {
    const shield = document.getElementById("shadowguard-shield-widget");
    if (shield) shield.style.display = "none";
    hideTooltip();
    return;
  }

  const editor =
    document.querySelector('[contenteditable="true"]') ||
    document.querySelector("textarea");

  if (!editor) {
    const shield = document.getElementById("shadowguard-shield-widget");
    if (shield) shield.style.display = "none";
    hideTooltip();
    return;
  }

  ensureShieldWidget(editor);

  const shield = document.getElementById("shadowguard-shield-widget");
  if (!shield) return;

  updateShieldPosition(editor, shield);
  shield.style.display = "flex";

  shield.className = "";
  
  if (!latestScanResult) {
    shield.classList.add("sg-shield-safe");
    return;
  }

  const result = latestScanResult;
  if (result.verdict === "BLOCKED") {
    shield.classList.add("sg-shield-blocked");
  } else if (result.verdict === "WARNING") {
    shield.classList.add("sg-shield-warning");
  } else {
    shield.classList.add("sg-shield-safe");
  }
}

function showTooltip() {
  const tooltip = document.getElementById("shadowguard-shield-tooltip");
  if (!tooltip) return;
  
  updateTooltipContent();
  tooltip.classList.add("sg-tooltip-visible");
  
  // Position to the left of the shield
  const shield = document.getElementById("shadowguard-shield-widget");
  if (shield) {
    const shieldRect = shield.getBoundingClientRect();
    tooltip.style.top = `${shieldRect.top + (shieldRect.height / 2) - (tooltip.offsetHeight / 2)}px`;
    tooltip.style.left = `${shieldRect.left - tooltip.offsetWidth - 8}px`;
  }
}

function hideTooltip() {
  const tooltip = document.getElementById("shadowguard-shield-tooltip");
  if (tooltip) {
    tooltip.classList.remove("sg-tooltip-visible");
  }
}

function updateTooltipContent() {
  const tooltip = document.getElementById("shadowguard-shield-tooltip");
  if (!tooltip) return;

  if (!latestScanResult) {
    tooltip.innerHTML = `
      <div class="sg-tooltip-header">
        <div class="sg-tooltip-title-row">
          <span style="color: #22c55e;">🛡️</span> ShadowGuard
        </div>
      </div>
      <div class="sg-tooltip-content">
        Scanning active. Ready to check prompt security.
      </div>
    `;
    return;
  }

  const result = latestScanResult;
  const isBlockedMode = result.verdict === "BLOCKED";
  const isWarningMode = result.verdict === "WARNING";
  
  let headerColor = "#22c55e";
  let statusIcon = "🛡️";
  if (isBlockedMode) {
    headerColor = "#ef4444";
    statusIcon = "🚫";
  } else if (isWarningMode) {
    headerColor = "#f59e0b";
    statusIcon = "⚠️";
  }

  const scoreText = result.riskScore !== undefined ? `${result.riskScore}/100` : "";

  let contentHtml = "";
  if (isBlockedMode) {
    contentHtml = "Prompt violates security policy and is blocked.";
  } else if (isWarningMode) {
    contentHtml = "Sensitive details detected. Review recommended.";
  } else {
    contentHtml = "Input is secure. No sensitive details detected.";
  }

  let reasonsHtml = "";
  if (result.topReasons && result.topReasons.length > 0 && (isBlockedMode || isWarningMode)) {
    reasonsHtml = `
      <div class="sg-tooltip-reasons">
        ${result.topReasons.map(r => `
          <div class="sg-tooltip-reason-item">
            <span style="color: ${headerColor};">•</span> ${r}
          </div>
        `).join("")}
      </div>
    `;
  }

  let buttonHtml = "";
  if (isBlockedMode || isWarningMode) {
    buttonHtml = `
      <button class="sg-tooltip-btn" id="sg-tooltip-sanitize-btn">Sanitize Prompt</button>
    `;
  }

  tooltip.innerHTML = `
    <div class="sg-tooltip-header">
      <div class="sg-tooltip-title-row">
        <span style="color: ${headerColor};">${statusIcon}</span> ShadowGuard
      </div>
      ${scoreText ? `<span class="sg-tooltip-score" style="color: ${headerColor}; border: 1px solid ${headerColor}33;">${scoreText}</span>` : ""}
    </div>
    <div class="sg-tooltip-content">
      ${contentHtml}
      ${reasonsHtml}
    </div>
    ${buttonHtml}
  `;

  const sanitizeBtn = document.getElementById("sg-tooltip-sanitize-btn");
  if (sanitizeBtn) {
    sanitizeBtn.addEventListener("click", () => {
      handleSanitizeAction();
    });
  }
}

function handleSanitizeAction() {
  const editor =
    document.querySelector('[contenteditable="true"]') ||
    document.querySelector("textarea");

  if (!editor || !latestScanResult) return;

  const rawText = latestScanResult.mask || latestScanResult.text || "";
  const maskedText = clientSideRedact(rawText);

  if (editor.isContentEditable) {
    editor.innerText = maskedText;
  } else {
    editor.value = maskedText;
  }

  lastValue = maskedText;
  isBlocked = false;
  overrideOption = true;
  toggleSendButton(false);
  removeBanner();

  editor.dispatchEvent(new Event("input", { bubbles: true }));

  const modal = document.getElementById("shadowguard-modal");
  if (modal) modal.remove();

  latestScanResult = null;
  updateShieldWidget();
  hideTooltip();

  setTimeout(() => {
    overrideOption = false;
  }, 500);
}

// Coordinate positions during scrolls/resizes
function syncAllPositions() {
  const editor = document.querySelector('[contenteditable="true"]') || document.querySelector("textarea");
  const shield = document.getElementById("shadowguard-shield-widget");
  if (editor && shield && shield.style.display !== "none") {
    updateShieldPosition(editor, shield);
    const tooltip = document.getElementById("shadowguard-shield-tooltip");
    if (tooltip && tooltip.classList.contains("sg-tooltip-visible")) {
      const shieldRect = shield.getBoundingClientRect();
      tooltip.style.top = `${shieldRect.top + (shieldRect.height / 2) - (tooltip.offsetHeight / 2)}px`;
      tooltip.style.left = `${shieldRect.left - tooltip.offsetWidth - 8}px`;
    }
  }
}

window.addEventListener("scroll", syncAllPositions, { passive: true });
window.addEventListener("resize", syncAllPositions, { passive: true });

