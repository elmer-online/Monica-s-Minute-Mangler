import React, { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

// SVG Icons
const HeartIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
);

const PinIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="17" x2="12" y2="22" />
        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
);

const PlayIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);

const PauseIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
    </svg>
);

const StopIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" />
    </svg>
);

const MusicNoteIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
    </svg>
);

const SOUNDS = [
    { id: "ting", name: "Friendly Ting" },
    { id: "chime", name: "Digital Chime" },
    { id: "gong", name: "Relaxing Gong" },
    { id: "bell", name: "Bright Bell" },
    { id: "beep", name: "Soft Beep" },
];

function App() {
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
    const [isHeartPulsing, setIsHeartPulsing] = useState(false);

    // Alarm Settings
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedSoundId, setSelectedSoundId] = useState(() => localStorage.getItem("selectedSoundId") || "ting");
    const [volume, setVolume] = useState(() => Number(localStorage.getItem("volume")) || 0.5);

    const timerRef = useRef(null);
    const alertIntervalRef = useRef(null);
    const alertTimeoutRef = useRef(null);
    const audioContextRef = useRef(null);
    const activeOscillatorRef = useRef(null);
    // Strict flag to lock audio generation
    const isAlarmingRef = useRef(false);

    useEffect(() => {
        localStorage.setItem("selectedSoundId", selectedSoundId);
    }, [selectedSoundId]);

    useEffect(() => {
        localStorage.setItem("volume", volume.toString());
    }, [volume]);

    useEffect(() => {
        if (window.__TAURI_INTERNALS__) {
            const appWindow = getCurrentWindow();
            appWindow.setAlwaysOnTop(isAlwaysOnTop).catch(console.error);
        }
    }, [isAlwaysOnTop]);

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleTimerEnd();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isRunning, timeLeft]);

    const handleTimerEnd = () => {
        setIsRunning(false);
        isAlarmingRef.current = true; // Unlock audio
        triggerAlarm();
        alertIntervalRef.current = setInterval(triggerAlarm, 10000);
    };

    const triggerAlarm = () => {
        // CRITICAL: Double-check if we are still allowed to alarm
        if (!isAlarmingRef.current) {
            stopAlert(); // Cleanup if we ended up here by mistake
            return;
        }

        playAlarmSound(selectedSoundId, volume);

        // Sync heart pulse
        setIsHeartPulsing(true);
        alertTimeoutRef.current = setTimeout(() => setIsHeartPulsing(false), 2000);
    };

    const getAudioContext = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    };

    const playAlarmSound = (id, vol, isPreview = false) => {
        // If not previewing, enforce strict alarm check
        if (!isPreview && !isAlarmingRef.current) return;

        try {
            const ctx = getAudioContext();

            // Stop current sound if playing
            if (!isPreview && activeOscillatorRef.current) {
                try { activeOscillatorRef.current.stop(); } catch (e) { }
            }

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            let gainVal = vol * 0.2;
            let duration = 1.5;

            switch (id) {
                case "ting":
                    osc.type = "triangle";
                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.05);
                    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
                    break;
                case "chime":
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(660, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
                    osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.2);
                    break;
                case "gong":
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(220, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.5);
                    gainVal = vol * 0.8; // Boosted Gong
                    duration = 4.0;
                    break;
                case "bell":
                    osc.type = "square";
                    osc.frequency.setValueAtTime(1760, ctx.currentTime);
                    gainVal = vol * 0.12;
                    duration = 1.0;
                    break;
                case "beep":
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(440, ctx.currentTime);
                    gainVal = vol * 0.25;
                    duration = 0.5;
                    break;
                default:
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(440, ctx.currentTime);
            }

            gain.gain.setValueAtTime(gainVal, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            if (!isPreview) activeOscillatorRef.current = osc;

            osc.start();
            osc.stop(ctx.currentTime + duration);

            osc.onended = () => {
                if (activeOscillatorRef.current === osc) activeOscillatorRef.current = null;
            };
        } catch (e) {
            console.warn("Audio Context error:", e);
        }
    };

    const handleStart = () => {
        if (timeLeft > 0) {
            setIsRunning(true);
        } else {
            let secs = parseInput(inputValue);
            if (secs === 0 && !inputValue) {
                secs = 25 * 60;
            }
            if (secs > 0) {
                setTimeLeft(secs);
                setIsRunning(true);
                setInputValue("");
            }
        }
        stopAlert();
        setIsSettingsOpen(false);
    };

    const handlePause = () => setIsRunning(false);

    const handleStop = () => {
        setIsRunning(false);
        setTimeLeft(0);
        setInputValue("");
        stopAlert();
        setIsHeartPulsing(false);
    };

    const stopAlert = () => {
        isAlarmingRef.current = false; // LOCK audio generation
        setIsHeartPulsing(false);

        if (alertIntervalRef.current) {
            clearInterval(alertIntervalRef.current);
            alertIntervalRef.current = null;
        }
        if (alertTimeoutRef.current) {
            clearTimeout(alertTimeoutRef.current);
            alertTimeoutRef.current = null;
        }

        // Stop oscillator
        if (activeOscillatorRef.current) {
            try {
                activeOscillatorRef.current.stop();
                activeOscillatorRef.current = null;
            } catch (e) { }
        }

        // Close AudioContext completely to ensure silence
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null; // Reset ensures we create a new one next time
        }
    };

    const addFiveMinutes = () => {
        setTimeLeft((prev) => prev + 300);
        stopAlert();
    };

    const parseInput = (val) => {
        const clean = val.trim();
        if (!clean) return 0;
        if (clean.includes(":")) {
            const parts = clean.split(":");
            const mins = parseInt(parts[0], 10) || 0;
            const secs = parseInt(parts[1], 10) || 0;
            return mins * 60 + secs;
        }
        return parseInt(clean, 10) * 60 || 0;
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        if (/^[0-9:]*$/.test(val)) setInputValue(val);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleStart();
    };

    const toggleAlwaysOnTop = () => setIsAlwaysOnTop(!isAlwaysOnTop);
    const toggleSettings = () => setIsSettingsOpen(!isSettingsOpen);

    const isIdle = !isRunning && timeLeft === 0;

    return (
        <div className="container">
            <div className="top-bar">
                <button
                    className={`icon-button ${isAlwaysOnTop ? "active" : ""}`}
                    onClick={toggleAlwaysOnTop}
                    title="Always on Top"
                >
                    <PinIcon />
                </button>
            </div>

            <div className="heart-section" onClick={addFiveMinutes} title="Add 5 minutes">
                <HeartIcon className={`heart-svg ${isIdle ? "idle" : ""} ${isHeartPulsing ? "alarm-pulse" : ""}`} />
            </div>

            <div className="timer-container">
                {isRunning || (timeLeft > 0 && !isRunning) ? (
                    <div className="timer-input" style={{ cursor: 'pointer' }} onClick={() => setIsRunning(!isRunning)}>
                        {formatTime(timeLeft)}
                    </div>
                ) : (
                    <input
                        type="text"
                        className="timer-input"
                        placeholder="25"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                )}
                <div className="timer-label">{isRunning || timeLeft > 0 ? "Remaining" : "Set Minutes"}</div>
            </div>

            <div className="controls-row">
                {!isRunning ? (
                    <button className="btn primary" onClick={handleStart} title="Start / Resume">
                        <PlayIcon />
                    </button>
                ) : (
                    <button className="btn" onClick={handlePause} title="Pause">
                        <PauseIcon />
                    </button>
                )}
                <button className="btn" onClick={handleStop} title="Stop">
                    <StopIcon />
                </button>
            </div>

            <div className="settings-toggle">
                <button className={`icon-button ${isSettingsOpen ? "active" : ""}`} onClick={toggleSettings}>
                    <MusicNoteIcon />
                </button>
            </div>

            <div className={`settings-panel ${isSettingsOpen ? "open" : ""}`}>
                <div className="settings-title">Alarm Settings</div>
                <div className="sound-list">
                    {SOUNDS.map((sound) => (
                        <div
                            key={sound.id}
                            className={`sound-option ${selectedSoundId === sound.id ? "selected" : ""}`}
                            onClick={() => setSelectedSoundId(sound.id)}
                        >
                            <span>{sound.name}</span>
                            <button
                                className="preview-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    playAlarmSound(sound.id, volume, true);
                                }}
                            >
                                <PlayIcon size={14} />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="volume-row">
                    <div className="volume-header">
                        <span>Volume</span>
                        <span>{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        className="volume-slider"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                    />
                </div>
            </div>
        </div>
    );
}

export default App;
