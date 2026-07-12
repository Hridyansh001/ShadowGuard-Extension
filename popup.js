const DASHBOARD_URL = "https://shadowguard-dashboard.vercel.app";

// ── Load state from storage ──
function loadState() {
  chrome.storage.local.get(["sg_enabled", "sg_stats", "sg_history", "sg_sensitivity", "sg_terminal_logs"], (data) => {
    const enabled = data.sg_enabled !== false; // default true
    const stats   = data.sg_stats  || { blocked: 0, warning: 0, safe: 0 };
    const history = data.sg_history || [];
    const sensitivity = data.sg_sensitivity || "balanced";
    const logs = data.sg_terminal_logs || [];

    updateToggle(enabled);
    updateStats(stats);
    updateSensitivityUI(sensitivity);
    updateTerminal(logs);
    updateBreakdown(history);
    updateHistory(history);
  });
}

// ── Toggle Firewall State ──
function updateToggle(enabled) {
  const toggle = document.getElementById("toggle");
  const label = document.getElementById("toggle-label");
  const firewallPill = document.getElementById("firewall-pill");
  const pillText = document.getElementById("pill-text-el");

  if (enabled) {
    toggle.classList.add("active");
    label.textContent = "SYSTEM ACTIVE";
    firewallPill.classList.remove("inactive");
    pillText.innerHTML = `<span class="cyan-text">SHADOW</span>GUARD FIREWALL ARCHITECTURE ACTIVATED`;
  } else {
    toggle.classList.remove("active");
    label.textContent = "SYSTEM DEACTIVATED";
    firewallPill.classList.add("inactive");
    pillText.innerHTML = `FIREWALL ARCHITECTURE STANDBY`;
  }
}

document.getElementById("toggle").addEventListener("click", () => {
  chrome.storage.local.get(["sg_enabled"], (data) => {
    const newVal = data.sg_enabled === false;
    chrome.storage.local.set({ sg_enabled: newVal }, () => {
      updateToggle(newVal);
      // Notify active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "SG_TOGGLE", enabled: newVal });
        }
      });
    });
  });
});

// ── Sensitivity Selector ──
function updateSensitivityUI(val) {
  document.querySelectorAll(".sensitivity-option").forEach(opt => {
    if (opt.getAttribute("data-val") === val) {
      opt.classList.add("active");
    } else {
      opt.classList.remove("active");
    }
  });
}

document.querySelectorAll(".sensitivity-option").forEach(opt => {
  opt.addEventListener("click", () => {
    const val = opt.getAttribute("data-val");
    chrome.storage.local.set({ sg_sensitivity: val }, () => {
      updateSensitivityUI(val);
    });
  });
});

// ── Stats ──
function updateStats(stats) {
  document.getElementById("stat-blocked").textContent = stats.blocked || 0;
  document.getElementById("stat-warning").textContent = stats.warning || 0;
  document.getElementById("stat-safe").textContent    = stats.safe    || 0;
}

// ── Live Terminal Monitor ──
function updateTerminal(logs) {
  const container = document.getElementById("terminal-body");
  if (!logs || logs.length === 0) {
    container.innerHTML = `
      <div class="terminal-line system"><span class="t-time">00:00:00</span>[SYS] Terminal log initialized.</div>
      <div class="terminal-line success"><span class="t-time">00:00:00</span>[SYS] Scanning feed active.<span class="terminal-cursor"></span></div>
    `;
    return;
  }

  const linesHtml = logs.map(log => {
    const cls = log.type || "info";
    const prefix = log.type === "system" ? "[SYS] " 
                 : log.type === "success" ? "[OK] " 
                 : log.type === "warning" ? "[WRN] " 
                 : log.type === "error" ? "[ERR] " 
                 : "[INF] ";
    return `<div class="terminal-line ${cls}"><span class="t-time">${log.timestamp || '00:00:00'}</span>${prefix}${log.message}</div>`;
  }).join("");

  container.innerHTML = linesHtml + `<span class="terminal-cursor"></span>`;
  container.scrollTop = container.scrollHeight;
}

// ── Threat breakdown analytics ──
function updateBreakdown(history) {
  const counts = { pii: 0, secrets: 0, jailbreak: 0, leak: 0 };
  
  history.forEach(item => {
    if (item.verdict === "SAFE") return;
    const reasons = item.topReasons || [];
    reasons.forEach(r => {
      const lower = r.toLowerCase();
      if (lower.includes("pii") || lower.includes("personal") || lower.includes("email") || lower.includes("phone") || lower.includes("address")) {
        counts.pii++;
      } else if (lower.includes("secret") || lower.includes("api") || lower.includes("key") || lower.includes("token") || lower.includes("credential") || lower.includes("password")) {
        counts.secrets++;
      } else if (lower.includes("jailbreak") || lower.includes("injection") || lower.includes("malintent") || lower.includes("intent")) {
        counts.jailbreak++;
      } else {
        counts.leak++;
      }
    });
  });

  const max = Math.max(1, counts.pii, counts.secrets, counts.jailbreak, counts.leak);

  document.getElementById("count-pii").textContent = counts.pii;
  document.getElementById("count-secrets").textContent = counts.secrets;
  document.getElementById("count-jailbreak").textContent = counts.jailbreak;
  document.getElementById("count-leak").textContent = counts.leak;

  document.getElementById("bar-pii").style.width = ((counts.pii / max) * 100) + "%";
  document.getElementById("bar-secrets").style.width = ((counts.secrets / max) * 100) + "%";
  document.getElementById("bar-jailbreak").style.width = ((counts.jailbreak / max) * 100) + "%";
  document.getElementById("bar-leak").style.width = ((counts.leak / max) * 100) + "%";
}

// ── History logs ──
function updateHistory(history) {
  const container = document.getElementById("history-list");
  if (!history || history.length === 0) {
    container.innerHTML = '<div class="empty-state">No intercept activity logged.</div>';
    return;
  }

  container.innerHTML = history.slice(0, 10).map((item, idx) => {
    const v = (item.verdict || "SAFE").toLowerCase();
    const d = new Date(item.time);
    const t = isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const score = item.riskScore || 0;
    const preview = (item.text || "").slice(0, 45) || "–";
    const fullText = item.text || "–";

    const reasonsHtml = item.topReasons && item.topReasons.length > 0 
      ? item.topReasons.map(r => `<span class="threat-badge">${r}</span>`).join("")
      : `<span class="threat-badge">None</span>`;

    return `
      <div class="history-item ${v}" data-idx="${idx}">
        <div class="history-header-row">
          <div class="history-meta">
            <div class="history-indicator"></div>
            <div class="history-desc">${preview}</div>
          </div>
          <span class="history-score">${score}/100</span>
          <span class="history-time">${t}</span>
        </div>
        <div class="history-details" id="details-${idx}">
          <div class="history-details-label">Scanned Input</div>
          <div class="history-details-val">${fullText}</div>
          <div class="history-details-label">Threat Classifications</div>
          <div class="history-threats-badges">
            ${reasonsHtml}
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Accordion details click handler
  document.querySelectorAll(".history-item").forEach(el => {
    el.addEventListener("click", (e) => {
      if (e.target.closest(".history-details")) return;
      
      const idx = el.getAttribute("data-idx");
      const details = document.getElementById(`details-${idx}`);
      const isVisible = details.style.display === "block";

      document.querySelectorAll(".history-details").forEach(d => {
        d.style.display = "none";
      });

      details.style.display = isVisible ? "none" : "block";
    });
  });
}

// ── Buttons ──
document.getElementById("btn-dashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: DASHBOARD_URL });
});

document.getElementById("btn-clear").addEventListener("click", () => {
  chrome.storage.local.set({
    sg_stats: { blocked: 0, warning: 0, safe: 0 },
    sg_history: [],
    sg_terminal_logs: [{
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      message: "Terminal logs and history reset by operator.",
      type: "system"
    }]
  }, () => {
    loadState();
  });
});

document.getElementById("terminal-clear").addEventListener("click", () => {
  chrome.storage.local.set({
    sg_terminal_logs: [{
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      message: "Terminal feed cleared.",
      type: "system"
    }]
  }, () => {
    loadState();
  });
});

// ── Realtime sync on storage updates ──
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    loadState();
  }
});

// ── Init ──
loadState();