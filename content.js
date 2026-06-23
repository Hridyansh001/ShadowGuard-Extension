console.log("ShadowGuard v2 Loaded");

const BACKEND_URL = "http://localhost:8080/api/scan";

let lastValue = ""; 
let timeout = null;
let isBlocked = false;
let overrideOption = false;

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

  // Wire close button via JS (avoids CSP issues with inline onclick)
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

// ── MODAL ────────────────────────────────────────────────────────────────────
function showOverrideMethod(result) {
  if (document.getElementById("shadowguard-modal")) return;
  injectStyles();

  const sev   = getSeverity(result.riskScore);
  const score = result.riskScore;

  // SVG ring: circumference of r=36 circle
  const R   = 36;
  const C   = 2 * Math.PI * R;
  const gap = C - (score / 100) * C;

  // Masked text preview — show first 80 chars with middle redacted
  const rawText  = result.text || result.mask || "";
  const preview  = rawText.length > 60
    ? rawText.slice(0, 28) + " ████████ " + rawText.slice(-18)
    : rawText || null;

  const severityDesc = score >= 80
    ? "Immediate action required"
    : score >= 60 ? "Significant risk detected"
    : score >= 40 ? "Moderate risk level"
    : "Low risk level";

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

      <!-- Grid bg -->
      <div style="position:absolute;inset:0;pointer-events:none;z-index:0;
        background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);
        background-size:32px 32px;"></div>

      <!-- Glow orb top-right -->
      <div style="position:absolute;top:-60px;right:-60px;width:180px;height:180px;
        border-radius:50%;background:${sev.color};opacity:0.06;filter:blur(40px);pointer-events:none;z-index:0;"></div>

      <!-- ── HEADER ── -->
      <div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid #ffffff0f;">

        <div style="display:flex;align-items:center;gap:12px;">
          <!-- Animated shield -->
          <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <div style="position:absolute;inset:-5px;border:1.5px solid ${sev.color};border-radius:50%;animation:sg-ringPulse 1.8s ease-out infinite;"></div>
            <div style="position:absolute;inset:-10px;border:1px solid ${sev.color}44;border-radius:50%;animation:sg-ringPulse 1.8s ease-out 0.4s infinite;"></div>
            <div style="width:40px;height:40px;border-radius:11px;background:${sev.bg};border:1px solid ${sev.color}33;display:flex;align-items:center;justify-content:center;font-size:20px;">🛡️</div>
          </div>
          <div>
            <div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;font-weight:800;color:#f1f5f9;letter-spacing:-0.01em;">
              ShadowGuard Alert
            </div>
            <div style="font-size:9px;color:#475569;letter-spacing:0.12em;margin-top:2px;text-transform:uppercase;">
              Security violation detected
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

      <!-- ── BODY ── -->
      <div style="position:relative;z-index:1;padding:18px 20px;display:flex;flex-direction:column;gap:14px;">

        <!-- Score ring + Severity side by side -->
        <div style="display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;">

          <!-- SVG Score Ring -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
            <div style="position:relative;width:96px;height:96px;">
              <svg width="96" height="96" style="transform:rotate(-90deg);">
                <!-- Track -->
                <circle cx="48" cy="48" r="${R}" fill="none" stroke="#1e2832" stroke-width="7"/>
                <!-- Progress -->
                <circle id="sg-ring" cx="48" cy="48" r="${R}" fill="none"
                  stroke="${sev.color}" stroke-width="7"
                  stroke-linecap="round"
                  stroke-dasharray="${C}"
                  stroke-dashoffset="${C}"
                  style="transition:stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1);filter:drop-shadow(0 0 6px ${sev.color}88);"
                />
              </svg>
              <!-- Center label -->
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <div id="sg-score-num" style="font-family:system-ui,-apple-system,sans-serif;font-size:22px;font-weight:800;color:${sev.color};line-height:1;">0</div>
                <div style="font-size:9px;color:#475569;margin-top:1px;">/100</div>
              </div>
            </div>
            <div style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;">Risk Score</div>
          </div>

          <!-- Severity + description -->
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="background:#0e1318;border:1px solid ${sev.color}22;border-radius:12px;padding:12px 14px;">
              <div style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Severity Level</div>
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:8px;height:8px;border-radius:50%;background:${sev.color};box-shadow:0 0 8px ${sev.color};animation:sg-pulse 1.5s ease-in-out infinite;flex-shrink:0;"></div>
                <span style="font-family:system-ui,-apple-system,sans-serif;font-size:18px;font-weight:800;color:${sev.color};letter-spacing:-0.01em;">${sev.label}</span>
              </div>
              <div style="font-size:10px;color:#64748b;margin-top:6px;">${severityDesc}</div>
            </div>

            <!-- Mini progress bar below severity -->
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

        <!-- Detected threats -->
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
        <!-- Masked text preview -->
        <div style="background:#0e1318;border:1px solid #1e2832;border-radius:12px;padding:13px 15px;">
          <div style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Detected in input</div>
          <div style="font-size:11px;color:#64748b;line-height:1.6;word-break:break-all;font-family:ui-monospace,'Cascadia Code',monospace;">
            ${preview}
          </div>
        </div>
        ` : ""}

        <!-- Warning notice -->
        <div style="background:#1a0808;border:1px solid #ef444422;border-radius:10px;padding:11px 13px;display:flex;align-items:flex-start;gap:10px;">
          <span style="font-size:13px;flex-shrink:0;margin-top:1px;">⚠️</span>
          <span style="font-size:10px;color:#fca5a5;line-height:1.65;">
            This prompt may expose confidential information to an external AI service. Sending could violate your organisation's data security policy.
          </span>
        </div>

      </div>

      <!-- ── FOOTER ── -->
      <div style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 20px;border-top:1px solid #ffffff0f;">
        <span style="font-size:9px;color:#334155;letter-spacing:0.06em;">ESC TO DISMISS</span>
        <div style="display:flex;gap:8px;">
          <button id="sg-cancel" style="
            padding:9px 18px;border-radius:8px;
            background:#0e1318;border:1px solid #1e2832;
            color:#94a3b8;font-family:ui-monospace,'Cascadia Code',monospace;
            font-size:10px;cursor:pointer;letter-spacing:0.08em;transition:all 0.15s;
          ">CANCEL</button>
          <button id="sg-override" style="
            padding:9px 18px;border-radius:8px;
            background:${sev.color}18;border:1px solid ${sev.color}44;
            color:${sev.color};font-family:ui-monospace,'Cascadia Code',monospace;
            font-size:10px;font-weight:700;cursor:pointer;letter-spacing:0.08em;
            transition:all 0.2s;position:relative;overflow:hidden;
          ">OVERRIDE &amp; SEND</button>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  // ── Animate score ring + counter after render ──
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

  // ── Escape key to dismiss ──
  const onEsc = (e) => {
    if (e.key === "Escape") { toggleSendButton(true); modal.remove(); document.removeEventListener("keydown", onEsc); }
  };
  document.addEventListener("keydown", onEsc);

  // ── Backdrop click ──
  modal.addEventListener("click", (e) => {
    if (e.target === modal) { toggleSendButton(true); modal.remove(); document.removeEventListener("keydown", onEsc); }
  });

  // ── Button wiring ──
  document.getElementById("sg-close-x").addEventListener("click", () => {
    toggleSendButton(true); modal.remove(); document.removeEventListener("keydown", onEsc);
  });
  document.getElementById("sg-cancel").addEventListener("click", () => {
    toggleSendButton(true); modal.remove(); document.removeEventListener("keydown", onEsc);
  });
  document.getElementById("sg-override").addEventListener("click", () => {
    overrideOption = true; isBlocked = false;
    toggleSendButton(false); modal.remove(); removeBanner();
    document.removeEventListener("keydown", onEsc);
  });

  // ── Hover effects ──
  const cancelBtn   = document.getElementById("sg-cancel");
  const overrideBtn = document.getElementById("sg-override");
  const closeBtn    = document.getElementById("sg-close-x");

  cancelBtn.onmouseover   = () => { cancelBtn.style.borderColor = "#475569"; cancelBtn.style.color = "#e2e8f0"; };
  cancelBtn.onmouseout    = () => { cancelBtn.style.borderColor = "#1e2832"; cancelBtn.style.color = "#94a3b8"; };
  overrideBtn.onmouseover = () => { overrideBtn.style.background = sev.color + "30"; overrideBtn.style.boxShadow = `0 0 20px ${sev.glow}, inset 0 0 20px ${sev.color}10`; overrideBtn.style.borderColor = sev.color + "88"; };
  overrideBtn.onmouseout  = () => { overrideBtn.style.background = sev.color + "18"; overrideBtn.style.boxShadow = "none"; overrideBtn.style.borderColor = sev.color + "44"; };
  closeBtn.onmouseover    = () => { closeBtn.style.borderColor = "#475569"; closeBtn.style.color = "#e2e8f0"; };
  closeBtn.onmouseout     = () => { closeBtn.style.borderColor = "#1e2832"; closeBtn.style.color = "#475569"; };
}

// ── RESULT HANDLER ───────────────────────────────────────────────────────────
function handleResult(result) {
  if (result.verdict === "BLOCKED") {
    if (overrideOption) { overrideOption = false; return; }
    isBlocked = true;
    createBanner(result.topReasons.join(" · "), "blocked");
    toggleSendButton(true);
    showOverrideMethod(result);
  } else if (result.verdict === "WARNING") {
    isBlocked = false;
    createBanner(result.topReasons.join(" · "), "warning");
    toggleSendButton(false);
  } else {
    isBlocked = false;
    removeBanner();
    toggleSendButton(false);
  }
}

// ── INPUT DETECTION ──────────────────────────────────────────────────────────
function detectInput() {
  const editor =
    document.querySelector('[contenteditable="true"]') ||
    document.querySelector("textarea");

  if (!editor) { removeBanner(); return; }

  const text = (editor.innerText || editor.value || "").trim();

  if (!text || text.length < 5) {
    removeBanner();
    lastValue     = "";
    isBlocked     = false;
    overrideOption = false;
    const modal = document.getElementById("shadowguard-modal");
    if (modal) modal.remove();
    toggleSendButton(false);
    return;
  }

  if (text !== lastValue) {
    lastValue = text;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
        .then(r => r.json())
        .then(result => { console.log("[ShadowGuard]", result); handleResult(result); })
        .catch(err => console.error("[ShadowGuard] Backend error:", err));
    }, 200);
  }
}

setInterval(detectInput, 300);
document.addEventListener("input", detectInput);

document.addEventListener("keydown", (e) => {
  if (isBlocked && (e.key === "Enter" || e.keyCode === 13)) {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    return false;
  }
}, true);

document.addEventListener("submit", (e) => {
  if (isBlocked) {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    return false;
  }
}, true);