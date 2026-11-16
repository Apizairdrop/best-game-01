// Synthesized sound for Neon Harvest: every effect is built with the Web
// Audio API (oscillators and a noise buffer), so the game needs no audio
// files at all. The context is created lazily on the first user gesture,
// because browsers block audio before one.

export function createAudio() {
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let muted = false;

  /** Build the context on first use (must follow a user gesture). */
  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.45;
      master.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 0.5);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return true;
    } catch {
      return false;
    }
  }

  /** A short tone that slides from f0 to f1. */
  function tone({ type = 'sine', f0 = 440, f1 = null, dur = 0.1, vol = 0.5, at = 0 }) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, f0), t0);
    if (f1 !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** A burst of filtered noise (explosions, hits). */
  function noise({ dur = 0.2, vol = 0.5, freq = 1200, at = 0 }) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.2), t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  return {
    /** Call from any user gesture so later sounds are allowed. */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone({ type: 'square', f0: 920, f1: 420, dur: 0.07, vol: 0.16 });
    },
    enemyHit() {
      tone({ type: 'triangle', f0: 240, f1: 140, dur: 0.06, vol: 0.25 });
    },
    explode() {
      noise({ dur: 0.32, vol: 0.5, freq: 1600 });
      tone({ type: 'sine', f0: 180, f1: 40, dur: 0.3, vol: 0.4 });
    },
    pickup() {
      tone({ type: 'sine', f0: 660, f1: 990, dur: 0.12, vol: 0.3 });
    },
    hurt() {
      tone({ type: 'sawtooth', f0: 220, f1: 70, dur: 0.25, vol: 0.4 });
      noise({ dur: 0.15, vol: 0.3, freq: 900 });
    },
    waveClear() {
      tone({ type: 'sine', f0: 523, dur: 0.12, vol: 0.3, at: 0 });
      tone({ type: 'sine', f0: 659, dur: 0.12, vol: 0.3, at: 0.1 });
      tone({ type: 'sine', f0: 784, dur: 0.2, vol: 0.3, at: 0.2 });
    },
    upgrade() {
      tone({ type: 'triangle', f0: 587, dur: 0.1, vol: 0.3, at: 0 });
      tone({ type: 'triangle', f0: 880, dur: 0.18, vol: 0.3, at: 0.09 });
    },
    gameOver() {
      tone({ type: 'sawtooth', f0: 392, dur: 0.2, vol: 0.3, at: 0 });
      tone({ type: 'sawtooth', f0: 311, dur: 0.2, vol: 0.3, at: 0.18 });
      tone({ type: 'sawtooth', f0: 233, dur: 0.45, vol: 0.3, at: 0.36 });
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) =>
        tone({ type: 'triangle', f0: f, dur: 0.22, vol: 0.3, at: i * 0.12 }),
      );
    },
    click() {
      tone({ type: 'sine', f0: 1200, f1: 900, dur: 0.05, vol: 0.2 });
    },
  };
}
