const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
};

const playTone = (freq, type, duration, volume = 0.1) => {
    if (!audioCtx) initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
};

export const sounds = {
    playJoined: () => {
        playTone(440, 'sine', 0.2);
        setTimeout(() => playTone(880, 'sine', 0.2), 100);
    },
    playStart: () => {
        playTone(220, 'square', 0.1);
        setTimeout(() => playTone(440, 'square', 0.1), 100);
        setTimeout(() => playTone(880, 'square', 0.3), 200);
    },
    playWin: () => {
        [440, 554, 659, 880].forEach((f, i) => {
            setTimeout(() => playTone(f, 'triangle', 0.4, 0.2), i * 150);
        });
    },
    playLoss: () => {
        [220, 196, 164].forEach((f, i) => {
            setTimeout(() => playTone(f, 'sawtooth', 0.5, 0.1), i * 200);
        });
    },
    playClick: () => playTone(1200, 'sine', 0.05, 0.05),
    playExplosion: () => {
        const duration = 0.5;
        const node = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < buffer.length; i++) data[i] = Math.random() * 2 - 1;

        node.buffer = buffer;
        const gain = audioCtx.createGain();
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        node.connect(gain);
        gain.connect(audioCtx.destination);
        node.start();
    },
    playCountdown: () => playTone(440, 'sine', 0.1, 0.2)
};
