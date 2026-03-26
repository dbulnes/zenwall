const MESSAGES = [
  // Poetic
  "The river does not drink its own water. Neither should you drink from this site.",
  "Like a leaf in autumn, this page has been gently released from your grasp.",
  "A thousand distractions bloom in the garden of the internet. You chose to plant stillness instead.",
  "The wind does not visit every door. Today, it skips this one.",
  "Even the ocean rests between waves. Let this be your rest.",
  "The moon does not chase the sun. You need not chase this page.",
  "In the space between clicks, wisdom grows.",

  // Sarcastic
  "Oh no, wherever will you waste your time now?",
  "This site has been blocked. Your productivity sends its regards.",
  "Plot twist: past-you actually had willpower.",
  "Congratulations, you played yourself. Well, past-you played present-you. Beautifully.",
  "This site is about as available as your motivation was when you blocked it.",
  "You could try typing the URL harder. It won't help, but you could try.",
  "Breaking news: local person blocked from own bad decisions. Story at eleven.",
  "The site you're looking for is in another castle. One you can't get to.",

  // Clever
  "404: Willpower not found. Just kidding — we found it for you.",
  "You asked us to guard this door. We take our job very seriously.",
  "This is your browser's way of saying 'I love you, but no.'",
  "Behind this wall is a website. Behind you is everything else. Choose wisely.",
  "You set a trap for future-you. It worked.",
  "Some doors are meant to stay closed. You welded this one shut yourself.",
  "Think of this as a lock you put on the fridge at midnight.",
  "Your past self sends a message: 'You're welcome.'",

  // Zen
  "Breathe in. Breathe out. This site is not part of your path today.",
  "The best time to not visit this site was yesterday. The second best time is now.",
  "What you seek is not here. Perhaps it was never here.",
  "Stillness is not the absence of motion, but the absence of distraction.",
  "The mountain does not go to the screen. Be the mountain.",
  "Let this moment be an invitation to do nothing at all.",
  "You are exactly where you need to be. And it is not on that website.",
  "Empty your mind. Empty your tabs. Find peace.",
];

const TIMER_MESSAGES = [
  // Poetic
  "Your time flowed like water through cupped hands. Beautiful while it lasted.",
  "The hourglass has spoken. Tomorrow, it turns again.",
  "Every minute was a gift. You unwrapped them all.",
  "The sun sets even on the best of days. Your time here has set.",

  // Sarcastic
  "Time's up! You burned through your minutes like they were going out of style.",
  "Your daily pass has expired. The bouncer says 'maybe tomorrow.'",
  "You speedran your time limit. New personal best?",
  "The meter ran out. No amount of refreshing will feed it more coins.",
  "You had minutes. You spent them. The economy of attention is unforgiving.",
  "And just like that, your free trial for today has ended.",

  // Clever
  "You had a budget of minutes. You spent them all. No credit available.",
  "Timer expired. Your past self was generous, but not THAT generous.",
  "You rationed your time here. The rations have run out.",
  "Your daily allowance has been fully claimed. Receipt available: right here.",
  "The clock doesn't lie. Well, it can't. It's a clock.",

  // Zen
  "The allotted time has passed like clouds across the sky. Let it go.",
  "Your window of time has gently closed. Step away from the screen.",
  "You were given time, and you used it. Now, be present elsewhere.",
  "The timer rings not as punishment, but as a gentle reminder to live.",
  "Minutes are like breaths. You've taken yours. Now exhale and move on.",
];

const IMAGE_COUNT = 30;

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomImageUrl() {
  const idx = Math.floor(Math.random() * IMAGE_COUNT) + 1;
  const num = String(idx).padStart(2, '0');
  return chrome.runtime.getURL(`images/nature-${num}.jpg`);
}

function init() {
  const bg = document.getElementById('background');
  const messageEl = document.getElementById('message');
  const timerInfoEl = document.getElementById('timer-info');
  const backBtn = document.getElementById('go-back');

  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason');
  const blockedUrl = params.get('url') || '';

  // Set random background
  bg.style.backgroundImage = `url('${getRandomImageUrl()}')`;

  // Pick message based on reason
  if (reason === 'timer') {
    messageEl.textContent = getRandom(TIMER_MESSAGES);
    // Show timer info subtitle
    if (timerInfoEl && blockedUrl) {
      try {
        const domain = new URL(blockedUrl).hostname.replace(/^www\./, '');
        timerInfoEl.textContent = `Your daily limit for ${domain} has been reached. Resets tomorrow.`;
        timerInfoEl.style.display = 'block';
      } catch {}
    }
  } else {
    messageEl.textContent = getRandom(MESSAGES);
  }

  const blockPagePrefix = chrome.runtime.getURL('blocked/blocked.html');
  const referrer = document.referrer;
  const canGoBack = referrer && !referrer.startsWith(blockPagePrefix);

  backBtn.textContent = canGoBack ? 'Go Back' : 'Go to DuckDuckGo';
  backBtn.addEventListener('click', () => {
    if (canGoBack) {
      window.history.back();
    } else {
      window.location.href = 'https://duckduckgo.com';
    }
  });
}

init();
