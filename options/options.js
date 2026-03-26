import { getBlockedPatterns, addPattern, removePattern, updatePattern, onPatternsChanged } from '../lib/storage.js';

const patternInput = document.getElementById('pattern-input');
const addBtn = document.getElementById('add-btn');
const errorMsg = document.getElementById('error-msg');
const patternsList = document.getElementById('patterns-list');
const countBadge = document.getElementById('count-badge');
const timerEnabled = document.getElementById('timer-enabled');
const timerMinutesInput = document.getElementById('timer-minutes');
const timerInputGroup = document.getElementById('timer-input-group');

// Toggle timer input visibility
timerEnabled.addEventListener('change', () => {
  timerInputGroup.classList.toggle('visible', timerEnabled.checked);
});

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

    const info = document.createElement('div');
    info.className = 'pattern-info';

    const text = document.createElement('span');
    text.className = 'pattern-text';
    text.textContent = entry.pattern;

    const mode = document.createElement('span');
    mode.className = 'pattern-mode';
    if (entry.timerMinutes) {
      mode.textContent = `${entry.timerMinutes} min/day`;
      mode.classList.add('mode-timer');
    } else {
      mode.textContent = 'Blocked';
      mode.classList.add('mode-blocked');
    }

    info.appendChild(text);
    info.appendChild(mode);

    const actions = document.createElement('div');
    actions.className = 'pattern-actions';

    // Toggle timer button
    const timerBtn = document.createElement('button');
    timerBtn.className = 'timer-btn';
    timerBtn.title = entry.timerMinutes ? 'Remove timer (fully block)' : 'Set daily timer';
    timerBtn.textContent = entry.timerMinutes ? '\u23F1' : '\u23F0';
    timerBtn.addEventListener('click', () => {
      if (entry.timerMinutes) {
        if (confirm(`Remove timer and fully block "${entry.pattern}"?`)) {
          updatePattern(entry.id, { timerMinutes: undefined });
        }
      } else {
        const mins = prompt(`Set daily time limit for "${entry.pattern}" (minutes):`, '30');
        if (mins !== null) {
          const val = parseInt(mins, 10);
          if (val > 0 && val <= 480) {
            updatePattern(entry.id, { timerMinutes: val });
          }
        }
      }
    });

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

    actions.appendChild(timerBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(info);
    item.appendChild(actions);
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

  if (pattern.length < 3) {
    errorMsg.textContent = 'Pattern is too short.';
    return;
  }

  const existing = await getBlockedPatterns();
  if (existing.some((e) => e.pattern === pattern)) {
    errorMsg.textContent = 'This pattern is already blocked.';
    return;
  }

  const timerMinutes = timerEnabled.checked ? parseInt(timerMinutesInput.value, 10) : null;
  if (timerEnabled.checked && (!timerMinutes || timerMinutes < 1)) {
    errorMsg.textContent = 'Timer must be at least 1 minute.';
    return;
  }

  await addPattern(pattern, timerMinutes);
  patternInput.value = '';
  timerEnabled.checked = false;
  timerInputGroup.classList.remove('visible');
}

addBtn.addEventListener('click', handleAdd);
patternInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleAdd();
});

onPatternsChanged(renderPatterns);

// Initial load
getBlockedPatterns().then(renderPatterns);
