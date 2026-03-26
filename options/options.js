import { getBlockedPatterns, addPattern, removePattern, onPatternsChanged } from '../lib/storage.js';

const patternInput = document.getElementById('pattern-input');
const addBtn = document.getElementById('add-btn');
const errorMsg = document.getElementById('error-msg');
const patternsList = document.getElementById('patterns-list');
const countBadge = document.getElementById('count-badge');

function renderPatterns(patterns) {
  countBadge.textContent = patterns.length;

  if (patterns.length === 0) {
    patternsList.innerHTML = '<p class="empty-msg">No sites blocked yet.</p>';
    return;
  }

  patternsList.innerHTML = '';
  patterns.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'pattern-item';

    const text = document.createElement('span');
    text.className = 'pattern-text';
    text.textContent = entry.pattern;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '\u00d7';
    deleteBtn.title = 'Remove pattern';
    deleteBtn.addEventListener('click', () => {
      const confirmed = confirm(
        `Are you sure you want to unblock "${entry.pattern}"?\n\nThis site will no longer be blocked.`
      );
      if (confirmed) {
        removePattern(entry.id);
      }
    });

    item.appendChild(text);
    item.appendChild(deleteBtn);
    patternsList.appendChild(item);
  });
}

async function handleAdd() {
  const pattern = patternInput.value.trim();
  errorMsg.textContent = '';

  if (!pattern) {
    errorMsg.textContent = 'Please enter a URL pattern.';
    return;
  }

  // Basic validation
  if (pattern.length < 3) {
    errorMsg.textContent = 'Pattern is too short.';
    return;
  }

  // Check for duplicates
  const existing = await getBlockedPatterns();
  if (existing.some((e) => e.pattern === pattern)) {
    errorMsg.textContent = 'This pattern is already blocked.';
    return;
  }

  await addPattern(pattern);
  patternInput.value = '';
}

addBtn.addEventListener('click', handleAdd);
patternInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleAdd();
});

onPatternsChanged(renderPatterns);

// Initial load
getBlockedPatterns().then(renderPatterns);
