/* Replaces the square-wave blips in ui.js with noise and low sines. Load after ui.js. */
(function () {
  const LW = window.LW;
  let actx = null, drone = null;
  const ac = () => (actx = actx || new (window.AudioContext || window.webkitAudioContext)());
  function noise(dur, type, f0, f1, vol, q = 0.8) {
    const a = ac(), n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
    src.buffer = buf; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(a.destination); src.start();
  }
  function sine(f0, f1, dur, vol, delay = 0) {
    const a = ac(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime + delay;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  const SOUNDS = {
    select: () => noise(0.05, 'bandpass', 2600, 1800, 0.05),
    roll: () => noise(0.03, 'bandpass', 1800, 1400, 0.035),
    page: () => { noise(0.35, 'highpass', 1200, 5200, 0.07); noise(0.12, 'bandpass', 500, 900, 0.04); },
    swing: () => noise(0.24, 'bandpass', 350, 2600, 0.2, 1.4),
    hit: () => { sine(140, 50, 0.22, 0.5); noise(0.14, 'lowpass', 2400, 300, 0.3); },
    hurt: () => { sine(80, 34, 0.5, 0.7); noise(0.25, 'lowpass', 900, 120, 0.35); },
    heal: () => { sine(330, 495, 0.6, 0.08); sine(495, 660, 0.7, 0.05, 0.12); },
    battle: () => { sine(55, 38, 1.6, 0.6); noise(1.2, 'lowpass', 200, 1200, 0.12); },
    win: () => [110, 165, 220, 277].forEach((f, i) => sine(f, f, 2.2, 0.12, i * 0.12)),
    lose: () => { sine(110, 41, 2.6, 0.4); sine(116, 43, 2.6, 0.25); },
  };
  LW.sfx = (name) => { if (LW.sound.on && SOUNDS[name]) try { SOUNDS[name](); } catch (e) { /* no audio */ } };
  LW.drone = () => {
    try {
      if (!LW.sound.on) { if (drone) drone.gain.setTargetAtTime(0.0001, ac().currentTime, 0.3); return; }
      if (!drone) {
        const a = ac(), g = a.createGain(), f = a.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 220; g.gain.value = 0.0001;
        [55, 55.6, 82.2].forEach((hz) => { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.connect(f); o.start(); });
        f.connect(g).connect(a.destination); drone = g;
      }
      drone.gain.setTargetAtTime(0.03, ac().currentTime, 1.5);
    } catch (e) { /* no audio */ }
  };
  window.addEventListener('pointerdown', LW.drone, { once: true });
})();
