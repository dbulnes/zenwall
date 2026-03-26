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

const IMAGE_COUNT = 30;

function getRandomMessage() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

function getRandomImageUrl() {
  const idx = Math.floor(Math.random() * IMAGE_COUNT) + 1;
  const num = String(idx).padStart(2, '0');
  return chrome.runtime.getURL(`images/nature-${num}.jpg`);
}

function getBlockedUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('url') || '';
}

function init() {
  const bg = document.getElementById('background');
  const messageEl = document.getElementById('message');
  const urlEl = document.getElementById('blocked-url');
  const backBtn = document.getElementById('go-back');

  // Set random background
  bg.style.backgroundImage = `url('${getRandomImageUrl()}')`;

  // Set random message
  messageEl.textContent = getRandomMessage();

  // Hide blocked URL element
  urlEl.style.display = 'none';

  // Go back button
  backBtn.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  });
}

init();
