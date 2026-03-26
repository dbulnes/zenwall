const statusEl = document.getElementById('status');
const settingsLink = document.getElementById('settings-link');
const blockBtn = document.getElementById('block-btn');
const blockSection = document.getElementById('block-section');
const choiceDialog = document.getElementById('choice-dialog');
const blockDomainBtn = document.getElementById('block-domain');
const blockUrlBtn = document.getElementById('block-url');
const timerDomainBtn = document.getElementById('timer-domain-btn');
const choiceCancelBtn = document.getElementById('choice-cancel');
const confirmMsg = document.getElementById('confirm-msg');
const totalBlocksEl = document.getElementById('total-blocks');
const topDomainEl = document.getElementById('top-domain');
const domainBarsEl = document.getElementById('domain-bars');
const timerStatusEl = document.getElementById('timer-status');
const timerDomainEl = document.getElementById('timer-domain');
const timerBarFill = document.getElementById('timer-bar-fill');
const timerRemainingEl = document.getElementById('timer-remaining');
const timerSetup = document.getElementById('timer-setup');
const timerSetupDomain = document.getElementById('timer-setup-domain');
const timerSetupMinutes = document.getElementById('timer-setup-minutes');
const timerSetupConfirm = document.getElementById('timer-setup-confirm');
const timerSetupCancel = document.getElementById('timer-setup-cancel');

let currentTab = null;
let timerBaseline = null; // { fetchedAt, elapsedSeconds, timerMinutes }

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function formatTime(seconds) {
  if (seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

async function updateStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'getPatternCount' });
    const count = response?.count || 0;
    if (count === 0) {
      statusEl.textContent = 'No sites blocked yet.';
    } else if (count === 1) {
      statusEl.textContent = '1 site blocked.';
    } else {
      statusEl.textContent = `${count} sites blocked.`;
    }
  } catch {
    statusEl.textContent = 'No sites blocked yet.';
  }
}

async function updateStats() {
  try {
    const stats = await chrome.runtime.sendMessage({ type: 'getStats' });
    totalBlocksEl.textContent = stats.totalBlocks || 0;

    const domains = stats.domains || {};
    const sorted = Object.entries(domains).sort((a, b) => b[1] - a[1]);

    if (sorted.length > 0) {
      topDomainEl.textContent = sorted[0][0].replace(/^www\./, '');
    } else {
      topDomainEl.textContent = '-';
    }

    domainBarsEl.innerHTML = '';
    const top5 = sorted.slice(0, 5);
    if (top5.length === 0) return;

    const max = top5[0][1];
    for (const [domain, count] of top5) {
      const row = document.createElement('div');
      row.className = 'domain-bar-row';

      const name = document.createElement('span');
      name.className = 'domain-bar-name';
      name.textContent = domain.replace(/^www\./, '');
      name.title = domain;

      const track = document.createElement('div');
      track.className = 'domain-bar-track';

      const fill = document.createElement('div');
      fill.className = 'domain-bar-fill';
      fill.style.width = `${Math.round((count / max) * 100)}%`;

      track.appendChild(fill);

      const countEl = document.createElement('span');
      countEl.className = 'domain-bar-count';
      countEl.textContent = count;

      row.appendChild(name);
      row.appendChild(track);
      row.appendChild(countEl);
      domainBarsEl.appendChild(row);
    }
  } catch {}
}

async function fetchTimerBaseline() {
  if (!currentTab?.url) return;
  try {
    const status = await chrome.runtime.sendMessage({
      type: 'getTimerStatus',
      url: currentTab.url,
    });
    if (!status?.active) return;

    // Only update baseline if background value is close to our interpolation
    // to prevent jumps in either direction
    if (timerBaseline && !status.expired) {
      const interpolated = timerBaseline.elapsedSeconds + (Date.now() - timerBaseline.fetchedAt) / 1000;
      const drift = Math.abs(status.elapsedSeconds - interpolated);
      if (drift < 3) {
        // Within one alarm tick — keep smooth interpolation, just sync config
        timerBaseline.timerMinutes = status.timerMinutes;
        return;
      }
    }

    timerBaseline = {
      fetchedAt: Date.now(),
      elapsedSeconds: status.elapsedSeconds,
      timerMinutes: status.timerMinutes,
      expired: status.expired,
    };

    timerStatusEl.classList.remove('hidden');
    const domain = new URL(currentTab.url).hostname.replace(/^www\./, '');
    timerDomainEl.textContent = domain;
    blockSection.classList.add('hidden');

    renderTimer();
  } catch {}
}

function renderTimer() {
  if (!timerBaseline) return;

  const limitSeconds = timerBaseline.timerMinutes * 60;

  if (timerBaseline.expired) {
    timerBarFill.style.width = '100%';
    timerBarFill.classList.add('expired');
    timerRemainingEl.textContent = 'Time expired for today';
    return;
  }

  // Interpolate: add seconds since we last fetched from background
  const elapsed = timerBaseline.elapsedSeconds + (Date.now() - timerBaseline.fetchedAt) / 1000;
  const remaining = Math.max(0, limitSeconds - elapsed);
  const pct = Math.min(100, Math.round((elapsed / limitSeconds) * 100));

  timerBarFill.style.width = `${pct}%`;
  timerBarFill.classList.remove('expired');

  if (remaining <= 0) {
    timerBarFill.classList.add('expired');
    timerRemainingEl.textContent = 'Time expired for today';
  } else {
    timerRemainingEl.textContent = `${formatTime(remaining)} remaining today`;
  }
}

async function setupBlockButton() {
  try {
    currentTab = await getCurrentTab();
    if (!currentTab?.url || !currentTab.url.startsWith('http')) {
      blockBtn.disabled = true;
      blockBtn.textContent = 'Cannot block this page';
      return;
    }

    const parsed = new URL(currentTab.url);
    blockBtn.textContent = `Block ${parsed.hostname}`;
  } catch {
    blockBtn.disabled = true;
    blockBtn.textContent = 'Cannot block this page';
  }
}

function hideAll() {
  blockSection.classList.add('hidden');
  choiceDialog.classList.add('hidden');
  timerSetup.classList.add('hidden');
}

function showConfirm(text) {
  hideAll();
  confirmMsg.textContent = text;
  confirmMsg.classList.remove('hidden');
  updateStatus();
}

blockBtn.addEventListener('click', () => {
  if (!currentTab?.url) return;

  const parsed = new URL(currentTab.url);
  const domain = parsed.hostname.replace(/^www\./, '');
  const fullPath = domain + parsed.pathname;

  blockDomainBtn.textContent = `Block entire domain: ${domain}`;
  blockDomainBtn.dataset.pattern = domain;

  if (parsed.pathname && parsed.pathname !== '/') {
    blockUrlBtn.textContent = `Block this URL: ${fullPath}`;
    blockUrlBtn.dataset.pattern = fullPath;
    blockUrlBtn.classList.remove('hidden');
  } else {
    blockUrlBtn.classList.add('hidden');
  }

  timerDomainBtn.textContent = `Set daily time limit for ${domain}`;
  timerDomainBtn.dataset.domain = domain;

  blockSection.classList.add('hidden');
  choiceDialog.classList.remove('hidden');
});

async function doBlock(pattern) {
  await chrome.runtime.sendMessage({ type: 'addPattern', pattern });
  showConfirm(`Blocked: ${pattern}`);
}

blockDomainBtn.addEventListener('click', () => doBlock(blockDomainBtn.dataset.pattern));
blockUrlBtn.addEventListener('click', () => doBlock(blockUrlBtn.dataset.pattern));

// Timer flow
timerDomainBtn.addEventListener('click', () => {
  const domain = timerDomainBtn.dataset.domain;
  timerSetupDomain.textContent = domain;
  timerSetup.dataset.domain = domain;
  choiceDialog.classList.add('hidden');
  timerSetup.classList.remove('hidden');
});

timerSetupConfirm.addEventListener('click', async () => {
  const domain = timerSetup.dataset.domain;
  const minutes = parseInt(timerSetupMinutes.value, 10);
  if (!minutes || minutes < 1) return;
  await chrome.runtime.sendMessage({
    type: 'addPattern',
    pattern: domain,
    timerMinutes: minutes,
  });
  showConfirm(`${domain}: ${minutes} min/day limit set`);
});

timerSetupCancel.addEventListener('click', () => {
  timerSetup.classList.add('hidden');
  blockSection.classList.remove('hidden');
});

choiceCancelBtn.addEventListener('click', () => {
  choiceDialog.classList.add('hidden');
  blockSection.classList.remove('hidden');
});

settingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Init
updateStatus();
updateStats();
setupBlockButton().then(() => {
  fetchTimerBaseline();
  // Re-fetch baseline from background every 2s to stay tightly synced
  setInterval(fetchTimerBaseline, 2000);
  // Interpolate the display every 200ms for smooth countdown
  setInterval(renderTimer, 200);
});
