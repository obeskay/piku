// Web Audio API Synthesizer for Piku Sound Engine
class PikuAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.unlocked = false;
    this.bgmOscs = [];
    this.bgmInterval = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    
    // Unlock Audio Context on first interaction to bypass browser autoplay policies
    if (!this.unlocked) {
      const unlock = () => {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        this.unlocked = true;
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
      };
      document.addEventListener('click', unlock);
      document.addEventListener('touchstart', unlock);
    }
    
    if (this.ctx.state === 'suspended' && this.unlocked) {
      this.ctx.resume();
    }
  }

  stopBgm() {
    if (this.bgmInterval) clearInterval(this.bgmInterval);
    this.bgmOscs.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
    this.bgmOscs = [];
  }

  // Play upbeat Lobby loop
  playLobbyBgm() {
    this.init();
    if (this.isMuted) return;
    this.stopBgm();

    const notes = [261.63, 329.63, 392.00, 329.63]; // C4, E4, G4, E4
    let noteIdx = 0;

    const playNote = () => {
      if (this.ctx.state === 'suspended') return; // Wait until unlocked
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(notes[noteIdx], now);
      
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
      this.bgmOscs.push(osc);

      noteIdx = (noteIdx + 1) % notes.length;
      // Clean up array
      if (this.bgmOscs.length > 10) this.bgmOscs.shift();
    };

    this.bgmInterval = setInterval(playNote, 400); // 150 BPM
  }

  // Suspenseful Question loop
  playQuestionBgm() {
    this.init();
    if (this.isMuted) return;
    this.stopBgm();

    const playPulse = () => {
      if (this.ctx.state === 'suspended') return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130.81, now); // C3
      osc.frequency.linearRampToValueAtTime(140.00, now + 0.4);
      
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
      this.bgmOscs.push(osc);
      
      if (this.bgmOscs.length > 5) this.bgmOscs.shift();
    };

    this.bgmInterval = setInterval(playPulse, 800);
  }

  // Tick clock sound during countdown
  playTick() {
    this.init();
    if (this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Answer button pop sound
  playPop() {
    this.init();
    if (this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Correct Answer Fanfare / Chime
  playCorrect() {
    this.init();
    if (this.isMuted) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  // Incorrect Answer Thud
  playIncorrect() {
    this.init();
    if (this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Grand Victory Podium Fanfare
  playPodiumFanfare() {
    this.init();
    if (this.isMuted) return;

    const melody = [
      { f: 523.25, d: 0.15 },
      { f: 523.25, d: 0.15 },
      { f: 523.25, d: 0.15 },
      { f: 659.25, d: 0.4 },
      { f: 783.99, d: 0.4 },
      { f: 1046.50, d: 0.8 }
    ];

    let delay = 0;
    melody.forEach((item) => {
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.f, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + item.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + item.d);

      delay += item.d;
    });
  }
}

window.pikuAudio = new PikuAudioEngine();
