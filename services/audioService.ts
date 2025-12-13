


// Audio Service using Web Audio API for procedural sound generation

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

// Initialize Audio Context (must be called on user interaction)
export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.25; // Master volume
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

// Helper to create a noise buffer (for explosions, shotgun)
const createNoiseBuffer = () => {
    if (!audioCtx) return null;
    const bufferSize = audioCtx.sampleRate * 2; // 2 seconds
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
};

let noiseBuffer: AudioBuffer | null = null;

const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 1, slideTo?: number) => {
    if (!audioCtx || !masterGain) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, audioCtx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(masterGain);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
};

const playNoise = (duration: number, vol: number = 1, filterFreq: number = 1000) => {
    if (!audioCtx || !masterGain) return;
    if (!noiseBuffer) noiseBuffer = createNoiseBuffer();
    if (!noiseBuffer) return;

    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    
    src.start();
    src.stop(audioCtx.currentTime + duration);
};

export const playSound = {
    shootPistol: () => {
        // Short, high pitch drop
        playTone(800, 'triangle', 0.1, 0.1, 100);
    },
    shootShotgun: () => {
        // Noise burst
        playNoise(0.2, 0.15, 2000);
        playTone(150, 'sawtooth', 0.15, 0.1, 50);
    },
    shootOrbital: () => {
        playTone(1200, 'sine', 0.05, 0.05);
    },
    shootBoomerang: () => {
        playTone(600, 'sine', 0.3, 0.1, 300); // Whistle effect
    },
    shootLightning: () => {
        playNoise(0.1, 0.1, 8000); // Crackle
        playTone(1500, 'sawtooth', 0.1, 0.1, 200);
    },
    shootSword: () => {
        // Metal swish
        playNoise(0.15, 0.2, 3000);
        playTone(400, 'sawtooth', 0.15, 0.1, 800);
    },
    explosionMolotov: () => {
        playNoise(1.0, 0.2, 500); // Fire sound
    },
    hit: () => {
        // Very short high tick
        playTone(400, 'square', 0.05, 0.05);
    },
    die: () => {
        // Low crunch
        playNoise(0.3, 0.1, 500);
    },
    dieBoss: () => {
        playNoise(2.0, 0.5, 200);
        playTone(100, 'sawtooth', 2.0, 0.5, 10);
    },
    playerHit: () => {
        // Dissonant low
        playTone(150, 'sawtooth', 0.3, 0.3, 100);
        playTone(110, 'square', 0.3, 0.3, 80);
    },
    dash: () => {
        // Whoosh up
        playTone(200, 'sine', 0.3, 0.2, 800);
        playNoise(0.3, 0.1, 1000);
    },
    shield: () => {
        playTone(400, 'sine', 0.5, 0.2);
        playTone(600, 'sine', 0.5, 0.1);
    },
    nova: () => {
        playNoise(1.0, 0.4, 100); // Deep rumble
        playTone(50, 'square', 1.0, 0.3, 10);
    },
    heal: () => {
        playTone(400, 'sine', 0.1, 0.2);
        setTimeout(() => playTone(600, 'sine', 0.2, 0.2), 100);
    },
    levelUp: () => {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        [440, 554, 659, 880].forEach((freq, i) => {
            setTimeout(() => playTone(freq, 'triangle', 0.4, 0.1), i * 80);
        });
    },
    bossSpawn: () => {
        playTone(80, 'sawtooth', 3.0, 0.4, 20); // Downward siren
        playNoise(3.0, 0.2, 300);
    }
};
