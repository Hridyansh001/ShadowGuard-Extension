const DASHBOARD_URL = "https://shadowguard-dashboard.vercel.app";

// ── Load state from storage ──
function loadState() {
  chrome.storage.local.get(["sg_enabled", "sg_stats", "sg_history"], (data) => {
    const enabled = data.sg_enabled !== false; // default true
    const stats   = data.sg_stats  || { blocked: 0, warning: 0, safe: 0 };
    const history = data.sg_history || [];

    updateToggle(enabled);
    updateStats(stats);
    updateHistory(history);

    if (history.length > 0) {
      updateLastScan(history[0]);
    }
  });
}

// ── Toggle ──
function updateToggle(enabled) {
  const toggle    = document.getElementById("toggle");
  const label     = document.getElementById("toggle-label");
  const dot       = document.getElementById("status-dot");
  const title     = document.getElementById("status-title");
  const sub       = document.getElementById("status-sub");

  if (enabled) {
    toggle.classList.add("active");
    label.textContent  = "ON";
    dot.className      = "status-dot active";
    title.textContent  = "Protection Active";
    sub.textContent    = "Monitoring all inputs in real time";
  } else {
    toggle.classList.remove("active");
    label.textContent  = "OFF";
    dot.className      = "status-dot inactive";
    title.textContent  = "Protection Disabled";
    sub.textContent    = "Click toggle to re-enable scanning";
  }
}

document.getElementById("toggle").addEventListener("click", () => {
  chrome.storage.local.get(["sg_enabled"], (data) => {
    const newVal = data.sg_enabled === false ? true : false;
    chrome.storage.local.set({ sg_enabled: newVal }, () => {
      updateToggle(newVal);
      // Notify content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "SG_TOGGLE", enabled: newVal });
        }
      });
    });
  });
});

// ── Stats ──
function updateStats(stats) {
  document.getElementById("stat-blocked").textContent = stats.blocked || 0;
  document.getElementById("stat-warning").textContent = stats.warning || 0;
  document.getElementById("stat-safe").textContent    = stats.safe    || 0;
}

// ── Last scan ──
function updateLastScan(item) {
  const card    = document.getElementById("last-scan-card");
  const noText  = document.getElementById("no-scan-text");
  const content = document.getElementById("last-scan-content");
  const badge   = document.getElementById("last-verdict-badge");
  const time    = document.getElementById("last-scan-time");
  const text    = document.getElementById("last-scan-text");

  noText.style.display  = "none";
  content.style.display = "block";

  const v = (item.verdict || "SAFE").toLowerCase();
  card.className  = `last-scan ${v}`;
  badge.className = `verdict-badge ${v}`;
  badge.textContent = item.verdict || "SAFE";

  const d = new Date(item.time);
  time.textContent = isNaN(d.getTime()) ? "–" : d.toLocaleTimeString();
  text.textContent = item.text || "–";
}

// ── History ──
function updateHistory(history) {
  const list = document.getElementById("history-list");
  if (!history || history.length === 0) {
    list.innerHTML = '<div class="empty">No scan history yet</div>';
    return;
  }

  list.innerHTML = history.slice(0, 10).map((item) => {
    const v = (item.verdict || "SAFE").toLowerCase();
    const d = new Date(item.time);
    const t = isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const preview = (item.text || "").slice(0, 40) || "–";
    return `
      <div class="history-item ${v}">
        <div class="history-dot ${v}"></div>
        <div class="history-text">${preview}</div>
        <div class="history-time">${t}</div>
      </div>
    `;
  }).join("");
}

// ── Buttons ──
document.getElementById("btn-dashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: DASHBOARD_URL });
});

document.getElementById("btn-clear").addEventListener("click", () => {
  chrome.storage.local.set({
    sg_stats: { blocked: 0, warning: 0, safe: 0 },
    sg_history: [],
  }, () => {
    updateStats({ blocked: 0, warning: 0, safe: 0 });
    updateHistory([]);
    document.getElementById("no-scan-text").style.display = "block";
    document.getElementById("last-scan-content").style.display = "none";
    document.getElementById("last-scan-card").className = "last-scan";
  });
});

// ── Init ──
loadState();