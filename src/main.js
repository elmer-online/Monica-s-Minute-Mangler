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
const container = document.querySelector('.container');

// Window dragging - works on both Mac and Windows
let isDragging = false;

container.addEventListener('mousedown', async (e) => {
  if (e.target.closest('button, input, .heart, .checkbox')) return;
  isDragging = true;

  // Use Tauri's built-in drag
  if (window.__TAURI__) {
    const { getCurrentWindow } = window.__TAURI__.window;
    await getCurrentWindow().startDragging();
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});

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
  void heart.offsetWidth;
  heart.classList.add('beating', 'glowing');
  setTimeout(() => heart.classList.remove('glowing'), 500);
}

// Alert - flash the app and play sound
async function triggerAlert() {
  // Flash the container
  container.classList.add('alert-flash');
  setTimeout(() => container.classList.remove('alert-flash'), 1000);

  // Request attention (flashes taskbar on Windows)
  if (window.__TAURI__) {
    const { getCurrentWindow } = window.__TAURI__.window;
    await getCurrentWindow().requestUserAttention(2); // 2 = Critical
  }

  // Play sound
  playAlertSound();
}

function playAlertSound() {
  try {
    // Simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.stop(audioContext.currentTime + 0.5);

    // Play 3 beeps
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 880;
      osc2.type = 'sine';
      gain2.gain.value = 0.3;
      osc2.start();
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      osc2.stop(audioContext.currentTime + 0.5);
    }, 300);

    setTimeout(() => {
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.value = 1100;
      osc3.type = 'sine';
      gain3.gain.value = 0.3;
      osc3.start();
      gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.7);
      osc3.stop(audioContext.currentTime + 0.7);
    }, 600);
  } catch (e) {
    console.log('Audio not supported');
  }
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
