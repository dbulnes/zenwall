const statusEl = document.getElementById('status');
const settingsLink = document.getElementById('settings-link');
const blockBtn = document.getElementById('block-btn');
const blockSection = document.getElementById('block-section');
const choiceDialog = document.getElementById('choice-dialog');
const blockDomainBtn = document.getElementById('block-domain');
const blockUrlBtn = document.getElementById('block-url');
const choiceCancelBtn = document.getElementById('choice-cancel');
const confirmMsg = document.getElementById('confirm-msg');
const totalBlocksEl = document.getElementById('total-blocks');
const topDomainEl = document.getElementById('top-domain');
const domainBarsEl = document.getElementById('domain-bars');

let currentTab = null;

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
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

    // Render top 5 domain bars
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
  } catch { /* stats unavailable */ }
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

blockBtn.addEventListener('click', () => {
  if (!currentTab?.url) return;

  const parsed = new URL(currentTab.url);
  const domain = parsed.hostname.replace(/^www\./, '');
  const fullPath = domain + parsed.pathname;

  blockDomainBtn.textContent = `Entire domain: ${domain}`;
  blockDomainBtn.dataset.pattern = domain;

  if (parsed.pathname && parsed.pathname !== '/') {
    blockUrlBtn.textContent = `This URL: ${fullPath}`;
    blockUrlBtn.dataset.pattern = fullPath;
    blockUrlBtn.classList.remove('hidden');
  } else {
    blockUrlBtn.classList.add('hidden');
  }

  blockSection.classList.add('hidden');
  choiceDialog.classList.remove('hidden');
});

async function doBlock(pattern) {
  await chrome.runtime.sendMessage({ type: 'addPattern', pattern });
  choiceDialog.classList.add('hidden');
  confirmMsg.textContent = `Blocked: ${pattern}`;
  confirmMsg.classList.remove('hidden');
  updateStatus();
}

blockDomainBtn.addEventListener('click', () => doBlock(blockDomainBtn.dataset.pattern));
blockUrlBtn.addEventListener('click', () => doBlock(blockUrlBtn.dataset.pattern));

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
setupBlockButton();
