const statusEl = document.getElementById('status');
const settingsLink = document.getElementById('settings-link');

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

settingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

updateStatus();
