import { getBlockedPatterns, addPattern, removePattern, updatePattern, getElapsedSeconds, onPatternsChanged } from '../lib/storage.js';

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

async function renderPatterns(patterns) {
  countBadge.textContent = patterns.length;

  if (patterns.length === 0) {
    patternsList.innerHTML = '<p class="empty-msg">No sites blocked yet.</p>';
    return;
  }

  patternsList.innerHTML = '';

  for (const entry of patterns) {
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
      const elapsed = await getElapsedSeconds(entry.id);
      const remaining = Math.max(0, entry.timerMinutes * 60 - elapsed);
      const usedMins = Math.floor(elapsed / 60);
      if (remaining <= 0) {
        mode.textContent = `${entry.timerMinutes} min/day \u2014 expired for today`;
        mode.classList.add('mode-expired');
      } else {
        mode.textContent = `${entry.timerMinutes} min/day \u2014 ${usedMins}m used today`;
        mode.classList.add('mode-timer');
      }
    } else {
      mode.textContent = 'Blocked';
      mode.classList.add('mode-blocked');
    }

    info.appendChild(text);
    info.appendChild(mode);

    const actions = document.createElement('div');
    actions.className = 'pattern-actions';

    // Edit timer button (increase/decrease/set/remove)
    if (entry.timerMinutes) {
      const editBtn = document.createElement('button');
      editBtn.className = 'timer-btn';
      editBtn.title = 'Edit time limit';
      editBtn.textContent = '\u270F';
      editBtn.addEventListener('click', () => showTimerEditor(entry));

      actions.appendChild(editBtn);
    } else {
      const timerBtn = document.createElement('button');
      timerBtn.className = 'timer-btn';
      timerBtn.title = 'Set daily timer';
      timerBtn.textContent = '\u23F0';
      timerBtn.addEventListener('click', () => {
        const mins = prompt(`Set daily time limit for "${entry.pattern}" (minutes):`, '30');
        if (mins !== null) {
          const val = parseInt(mins, 10);
          if (val > 0 && val <= 480) {
            updatePattern(entry.id, { timerMinutes: val });
          }
        }
      });

      actions.appendChild(timerBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '\u00d7';
    deleteBtn.title = 'Remove pattern';
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Are you sure you want to unblock "${entry.pattern}"?\n\nThis site will no longer be blocked.`)) {
        removePattern(entry.id);
      }
    });

    actions.appendChild(deleteBtn);

    item.appendChild(info);
    item.appendChild(actions);

    // Inline timer editor (hidden by default)
    const editor = document.createElement('div');
    editor.className = 'timer-editor hidden';
    editor.id = `editor-${entry.id}`;
    item.appendChild(editor);

    patternsList.appendChild(item);
  }
}

async function showTimerEditor(entry) {
  const editor = document.getElementById(`editor-${entry.id}`);
  if (!editor || !editor.classList.contains('hidden')) {
    // Toggle off if already open
    if (editor) editor.classList.add('hidden');
    return;
  }

  const elapsed = await getElapsedSeconds(entry.id);
  const isExpired = elapsed >= entry.timerMinutes * 60;

  editor.innerHTML = '';
  editor.classList.remove('hidden');

  const label = document.createElement('p');
  label.className = 'editor-label';
  label.textContent = `Current limit: ${entry.timerMinutes} min/day`;
  editor.appendChild(label);

  // New limit input
  const row = document.createElement('div');
  row.className = 'editor-row';

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'editor-input';
  input.min = 1;
  input.max = 480;
  input.value = entry.timerMinutes;

  const unit = document.createElement('span');
  unit.className = 'editor-unit';
  unit.textContent = 'min/day';

  row.appendChild(input);
  row.appendChild(unit);
  editor.appendChild(row);

  const btnRow = document.createElement('div');
  btnRow.className = 'editor-btn-row';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'editor-save';
  saveBtn.textContent = 'Update limit';

  const blockBtn = document.createElement('button');
  blockBtn.className = 'editor-block';
  blockBtn.textContent = 'Fully block instead';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'editor-cancel';
  cancelBtn.textContent = 'Cancel';

  btnRow.appendChild(saveBtn);
  btnRow.appendChild(blockBtn);
  btnRow.appendChild(cancelBtn);
  editor.appendChild(btnRow);

  // Warning area for confirmations
  const warning = document.createElement('div');
  warning.className = 'editor-warning hidden';
  editor.appendChild(warning);

  saveBtn.addEventListener('click', () => {
    const newVal = parseInt(input.value, 10);
    if (!newVal || newVal < 1 || newVal > 480) return;

    const isIncrease = newVal > entry.timerMinutes;

    if (isIncrease) {
      // Make them work for it
      warning.classList.remove('hidden');
      warning.innerHTML = '';

      const msg = document.createElement('p');
      msg.className = 'warning-text';
      if (isExpired) {
        msg.textContent = `You already used all ${entry.timerMinutes} minutes today. Increasing to ${newVal} minutes will unblock the site with ${newVal - Math.floor(elapsed / 60)} minutes remaining. Are you sure you want to give yourself more time?`;
      } else {
        msg.textContent = `You're increasing your limit from ${entry.timerMinutes} to ${newVal} minutes. The whole point was to limit yourself. Are you sure?`;
      }
      warning.appendChild(msg);

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'warning-confirm';
      confirmBtn.textContent = 'Yes, I understand what I\'m doing';
      warning.appendChild(confirmBtn);

      const secondCancel = document.createElement('button');
      secondCancel.className = 'warning-cancel';
      secondCancel.textContent = 'No, keep me disciplined';
      warning.appendChild(secondCancel);

      confirmBtn.addEventListener('click', () => {
        // One more gate
        const reallyMsg = document.createElement('p');
        reallyMsg.className = 'warning-text warning-final';
        reallyMsg.textContent = 'Really? Type the new limit to confirm:';

        const confirmInput = document.createElement('input');
        confirmInput.type = 'number';
        confirmInput.className = 'warning-input';
        confirmInput.placeholder = `Type ${newVal}`;

        const finalBtn = document.createElement('button');
        finalBtn.className = 'warning-confirm';
        finalBtn.textContent = 'Confirm increase';

        // Replace the warning content
        warning.innerHTML = '';
        warning.appendChild(reallyMsg);
        warning.appendChild(confirmInput);
        warning.appendChild(finalBtn);

        finalBtn.addEventListener('click', () => {
          if (parseInt(confirmInput.value, 10) === newVal) {
            updatePattern(entry.id, { timerMinutes: newVal });
          } else {
            confirmInput.classList.add('shake');
            confirmInput.value = '';
            confirmInput.placeholder = 'Wrong number. Try again.';
            setTimeout(() => confirmInput.classList.remove('shake'), 500);
          }
        });
      });

      secondCancel.addEventListener('click', () => {
        editor.classList.add('hidden');
      });
    } else {
      // Decreasing is fine, no friction needed
      updatePattern(entry.id, { timerMinutes: newVal });
    }
  });

  blockBtn.addEventListener('click', () => {
    if (confirm(`Remove timer and fully block "${entry.pattern}"?`)) {
      updatePattern(entry.id, { timerMinutes: undefined });
    }
  });

  cancelBtn.addEventListener('click', () => {
    editor.classList.add('hidden');
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
