// Timer state
let timerSeconds = 0;
let remainingSeconds = 0;
let isRunning = false;
let isPaused = false;
let timerInterval = null;
let heartbeatInterval = null;

// DOM elements
const heart = document.getElementById('heart');
const timerInput = document.getElementById('timer');
const pauseBtn = document.getElementById('pauseBtn');
const startStopBtn = document.getElementById('startStopBtn');
const alwaysOnTopCheckbox = document.getElementById('alwaysOnTop');
const alertOverlay = document.getElementById('alertOverlay');

// Heart click - add 5 minutes
heart.addEventListener('click', () => {
  doHeartbeat();
  if (isRunning) {
    remainingSeconds += 5 * 60;
    timerSeconds += 5 * 60;
  } else {
    const current = parseTime(timerInput.value);
    const newTime = current + 5 * 60;
    timerInput.value = formatTime(newTime);
  }
});

// Timer input - Enter to start
timerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (!isRunning) {
      startTimer();
    }
  }
});

// Start/Stop button
startStopBtn.addEventListener('click', () => {
  if (isRunning) {
    stopTimer();
  } else {
    startTimer();
  }
});

// Pause button
pauseBtn.addEventListener('click', () => {
  if (isPaused) {
    resumeTimer();
  } else {
    pauseTimer();
  }
});

// Always on top (Tauri API)
alwaysOnTopCheckbox.addEventListener('change', async () => {
  if (window.__TAURI__) {
    const { getCurrentWindow } = window.__TAURI__.window;
    await getCurrentWindow().setAlwaysOnTop(alwaysOnTopCheckbox.checked);
  }
});

// Timer functions
function startTimer() {
  let seconds = parseTime(timerInput.value);
  if (seconds === 0) seconds = 5 * 60; // Default 5 minutes

  timerSeconds = seconds;
  remainingSeconds = seconds;
  isRunning = true;
  isPaused = false;

  updateUI();
  startHeartbeat();

  timerInterval = setInterval(() => {
    if (!isPaused) {
      remainingSeconds--;
      timerInput.value = formatTime(remainingSeconds);

      if (remainingSeconds <= 0) {
        stopTimer();
        triggerAlert();
      }
    }
  }, 1000);
}

function stopTimer() {
  isRunning = false;
  isPaused = false;
  clearInterval(timerInterval);
  stopHeartbeat();
  timerInput.value = '00:00';
  updateUI();
}

function pauseTimer() {
  isPaused = true;
  pauseBtn.textContent = 'Resume';
}

function resumeTimer() {
  isPaused = false;
  pauseBtn.textContent = 'Pause';
}

function updateUI() {
  pauseBtn.disabled = !isRunning;
  pauseBtn.textContent = 'Pause';
  startStopBtn.textContent = isRunning ? 'Stop' : 'Start';
  timerInput.readOnly = isRunning;
}

// Heartbeat animation
function startHeartbeat() {
  doHeartbeat();
  heartbeatInterval = setInterval(doHeartbeat, 5000);
}

function stopHeartbeat() {
  clearInterval(heartbeatInterval);
}

function doHeartbeat() {
  heart.classList.remove('beating', 'glowing');
  void heart.offsetWidth; // Trigger reflow
  heart.classList.add('beating', 'glowing');
  setTimeout(() => heart.classList.remove('glowing'), 500);
}

// Alert
function triggerAlert() {
  alertOverlay.classList.add('active');
  setTimeout(() => alertOverlay.classList.remove('active'), 1500);

  // Play sound
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1sbZB0c3V0dXN0dHR0dHR0c3R0dHR0dHR0dHR0c3R0dHR0dHRzdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0');
    audio.play().catch(() => { });
  } catch (e) { }
}

// Helpers
function parseTime(str) {
  const parts = str.split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0]) || 0;
    const s = parseInt(parts[1]) || 0;
    return m * 60 + s;
  }
  const num = parseInt(str) || 0;
  return num * 60;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Initialize Tauri features
window.addEventListener('DOMContentLoaded', async () => {
  if (window.__TAURI__) {
    const { getCurrentWindow } = window.__TAURI__.window;
    await getCurrentWindow().setAlwaysOnTop(true);
  }
});
