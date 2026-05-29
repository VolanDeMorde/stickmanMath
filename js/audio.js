// --- Web Audio API Synthesizer ---
let audioCtx = null;
let isMuted = false;
let musicState = {
    ready: false,
    padOsc: null,
    pulseOsc: null,
    padGain: null,
    pulseGain: null,
    masterGain: null,
    intensity: 0
};

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (!musicState.ready) {
        setupAdaptiveMusic();
    }
}

function setupAdaptiveMusic() {
    const now = audioCtx.currentTime;
    const masterGain = audioCtx.createGain();
    const padGain = audioCtx.createGain();
    const pulseGain = audioCtx.createGain();
    const padOsc = audioCtx.createOscillator();
    const pulseOsc = audioCtx.createOscillator();

    masterGain.gain.value = 0.11;
    padGain.gain.value = 0.0;
    pulseGain.gain.value = 0.0;

    padOsc.type = 'triangle';
    pulseOsc.type = 'square';
    padOsc.frequency.setValueAtTime(98, now);
    pulseOsc.frequency.setValueAtTime(196, now);

    padOsc.connect(padGain);
    pulseOsc.connect(pulseGain);
    padGain.connect(masterGain);
    pulseGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    padOsc.start(now);
    pulseOsc.start(now);

    musicState = {
        ready: true,
        padOsc,
        pulseOsc,
        padGain,
        pulseGain,
        masterGain,
        intensity: 0
    };
}

function updateMusicIntensity(targetIntensity) {
    if (!musicState.ready || isMuted) return;

    const clamped = Math.max(0, Math.min(1, targetIntensity));
    musicState.intensity += (clamped - musicState.intensity) * 0.08;

    const now = audioCtx.currentTime;
    const padLevel = 0.015 + musicState.intensity * 0.06;
    const pulseLevel = Math.max(0, musicState.intensity - 0.25) * 0.07;

    musicState.padGain.gain.cancelScheduledValues(now);
    musicState.pulseGain.gain.cancelScheduledValues(now);
    musicState.padGain.gain.setTargetAtTime(padLevel, now, 0.08);
    musicState.pulseGain.gain.setTargetAtTime(pulseLevel, now, 0.08);

    const pulseFreq = 176 + musicState.intensity * 70;
    musicState.pulseOsc.frequency.setTargetAtTime(pulseFreq, now, 0.09);
}

function playSound(type) {
    if (isMuted) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'jump') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } 
    else if (type === 'fuse') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(659.25, now + 0.06);
        osc.frequency.setValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
    }
    else if (type === 'strike') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
    }
    else if (type === 'factor') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(200, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    }
    else if (type === 'undo') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    }
    else if (type === 'win') {
        const chord = [523.25, 659.25, 783.99, 1046.50];
        chord.forEach((freq, i) => {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(freq, now + i * 0.05);
            g.gain.setValueAtTime(0.1, now + i * 0.05);
            g.gain.linearRampToValueAtTime(0.001, now + i * 0.05 + 0.3);
            o.connect(g); g.connect(audioCtx.destination);
            o.start(now + i * 0.05); o.stop(now + i * 0.05 + 0.3);
        });
    }
}

function toggleMute() {
    isMuted = !isMuted;
    document.getElementById('soundOnIcon').classList.toggle('hidden', isMuted);
    document.getElementById('soundOffIcon').classList.toggle('hidden', !isMuted);

    if (musicState.ready) {
        const now = audioCtx.currentTime;
        musicState.masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.11, now, 0.05);
    }
}

