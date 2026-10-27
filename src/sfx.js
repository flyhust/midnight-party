// ===== 音效：全部 Web Audio 合成，不需要音频文件 =====
const SFX = (() => {
  let ctx = null, master = null, on = true, noiseBuf = null;
  try { on = localStorage.getItem('mp_sound') !== 'off'; } catch (e) {}
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const T = () => ctx.currentTime;
  function env(g, at, a, d, v) {
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(v, at + a);
    g.gain.exponentialRampToValueAtTime(0.0001, at + a + d);
  }
  function tone({ f = 440, to = null, d = 0.15, type = 'sine', v = 0.25, at = 0, a = 0.005, out = master }) {
    const t = T() + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    env(g, t, a, d, v); o.connect(g); g.connect(out); o.start(t); o.stop(t + a + d + 0.05);
  }
  function noise({ d = 0.2, v = 0.25, at = 0, ft = 'bandpass', f = 1200, to = null, q = 1, a = 0.005 }) {
    const t = T() + at, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = ft; fl.Q.value = q; fl.frequency.setValueAtTime(f, t);
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t + d);
    env(g, t, a, d, v); s.connect(fl); fl.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + a + d + 0.05);
  }
  const chord = (fs, o = {}) => fs.forEach((f, i) => tone({ f, ...o, at: (o.at || 0) + (o.arp || 0) * i }));
  const S = {
    uiHover: () => tone({ f: 2100, d: 0.025, v: 0.035, type: 'triangle' }),
    uiClick: () => { tone({ f: 900, to: 600, d: 0.05, v: 0.12, type: 'square' }); noise({ d: 0.03, v: 0.06, f: 3000 }); },
    uiCancel: () => { tone({ f: 600, d: 0.07, v: 0.1, type: 'triangle' }); tone({ f: 420, d: 0.09, v: 0.1, type: 'triangle', at: 0.07 }); },
    uiDisabled: () => tone({ f: 140, d: 0.12, v: 0.15, type: 'square' }),
    modalOpen: () => tone({ f: 380, to: 760, d: 0.14, v: 0.08, type: 'sine' }),
    modalClose: () => tone({ f: 700, to: 350, d: 0.12, v: 0.07, type: 'sine' }),
    turnStart: () => { tone({ f: 1318, d: 0.25, v: 0.12, type: 'triangle' }); tone({ f: 1760, d: 0.35, v: 0.12, type: 'triangle', at: 0.12 }); },
    aiTurn: () => tone({ f: 660, d: 0.2, v: 0.06, type: 'triangle' }),
    diceShake: () => { for (let i = 0; i < 6; i++) noise({ d: 0.04, v: 0.12, f: 2500 + Math.random() * 1500, q: 3, at: i * 0.05 }); },
    diceRoll: () => { let t = 0; for (let i = 0; i < 9; i++) { t += 0.05 + i * 0.012; noise({ d: 0.03, v: 0.18 - i * 0.012, f: 1800, q: 4, at: t }); tone({ f: 300 + Math.random() * 200, d: 0.03, v: 0.05, type: 'square', at: t }); } },
    diceLand: () => { tone({ f: 180, to: 90, d: 0.18, v: 0.35 }); noise({ d: 0.06, v: 0.2, f: 900, q: 2 }); },
    diceResultKill: () => chord([110, 116.5, 164.8], { d: 0.9, v: 0.12, type: 'sawtooth', a: 0.02 }),
    selectHighlight: () => tone({ f: 220, to: 440, d: 0.35, v: 0.05, type: 'sine', a: 0.05 }),
    selectPick: () => { tone({ f: 1568, d: 0.12, v: 0.12, type: 'triangle' }); tone({ f: 2093, d: 0.15, v: 0.06, type: 'sine', at: 0.03 }); },
    move: () => { for (let i = 0; i < 3; i++) { noise({ d: 0.05, v: 0.22, ft: 'lowpass', f: 500, at: i * 0.13 }); tone({ f: 90, d: 0.05, v: 0.12, at: i * 0.13 }); } },
    enterControl: () => { noise({ d: 0.35, v: 0.12, ft: 'highpass', f: 2000, to: 6000 }); tone({ f: 440, to: 880, d: 0.2, v: 0.05, type: 'square', at: 0.2 }); },
    monitorScan: () => { tone({ f: 300, to: 1600, d: 0.7, v: 0.07, type: 'sawtooth', a: 0.05 }); for (let i = 0; i < 4; i++) tone({ f: 1200, d: 0.04, v: 0.06, type: 'square', at: 0.2 + i * 0.15 }); noise({ d: 0.7, v: 0.04, f: 4000, q: 8 }); },
    cardFlip: () => noise({ d: 0.16, v: 0.25, f: 1500, to: 5000, q: 1.2, a: 0.01 }),
    cardShuffle: () => { for (let i = 0; i < 10; i++) noise({ d: 0.05, v: 0.14, f: 2500 + Math.random() * 2000, q: 1.5, at: i * 0.045 }); },
    revealNpc: () => { tone({ f: 220, d: 0.35, v: 0.14, type: 'triangle' }); tone({ f: 196, d: 0.4, v: 0.1, type: 'triangle', at: 0.15 }); },
    revealPlayer: () => { chord([196, 247, 294, 392], { d: 0.9, v: 0.09, type: 'sawtooth', a: 0.01 }); tone({ f: 98, d: 1.0, v: 0.2 }); noise({ d: 0.4, v: 0.12, ft: 'lowpass', f: 300 }); },
    knifeSwish: () => noise({ d: 0.22, v: 0.3, f: 2500, to: 9000, q: 2, a: 0.02 }),
    kill: () => { tone({ f: 120, to: 40, d: 0.45, v: 0.45 }); noise({ d: 0.3, v: 0.25, ft: 'lowpass', f: 600, to: 120 }); },
    scream: () => tone({ f: 700, to: 1300, d: 0.25, v: 0.05, type: 'sawtooth', at: 0.1 }),
    accuseDrum: () => { for (let i = 0; i < 24; i++) noise({ d: 0.05, v: 0.05 + i * 0.008, f: 1800, q: 1.5, at: i * 0.06 }); tone({ f: 80, d: 0.3, v: 0.3, at: 1.45 }); },
    accuseRight: () => chord([523, 659, 784, 1047], { d: 0.6, v: 0.1, type: 'triangle', arp: 0.07 }),
    accuseWrong: () => { tone({ f: 330, to: 300, d: 0.25, v: 0.12, type: 'sawtooth' }); tone({ f: 300, to: 160, d: 0.6, v: 0.12, type: 'sawtooth', at: 0.25 }); },
    secretLeak: () => { for (let i = 0; i < 10; i++) tone({ f: i % 2 ? 466 : 440, d: 0.07, v: 0.07, type: 'triangle', at: i * 0.07 }); },
    token: () => { tone({ f: 1975, d: 0.12, v: 0.1, type: 'triangle' }); tone({ f: 2637, d: 0.25, v: 0.08, type: 'triangle', at: 0.06 }); noise({ d: 0.05, v: 0.06, f: 6000, q: 3, at: 0.15 }); },
    midnight: () => { for (let i = 0; i < 12; i++) { tone({ f: 196, d: 0.9, v: 0.16, type: 'sine', at: i * 0.32, a: 0.003 }); tone({ f: 392.5, d: 0.6, v: 0.06, type: 'sine', at: i * 0.32, a: 0.003 }); tone({ f: 587, d: 0.3, v: 0.03, type: 'sine', at: i * 0.32 }); } },
    ghost: () => { tone({ f: 520, to: 780, d: 1.0, v: 0.06, type: 'sine', a: 0.3 }); tone({ f: 530, to: 760, d: 1.0, v: 0.05, type: 'sine', a: 0.3 }); },
    noteTag: () => noise({ d: 0.12, v: 0.12, f: 3500, to: 2000, q: 2 }),
    eliminated: () => { for (let i = 0; i < 8; i++) noise({ d: 0.08, v: 0.15, ft: 'highpass', f: 4000 + Math.random() * 4000, at: Math.random() * 0.2 }); tone({ f: 440, to: 110, d: 1.0, v: 0.12, type: 'sawtooth', at: 0.2 }); },
    win: () => { chord([523, 659, 784], { d: 0.25, v: 0.1, type: 'square', arp: 0.12 }); chord([1047, 1319, 1568], { d: 0.9, v: 0.08, type: 'triangle', at: 0.45 }); for (let i = 0; i < 6; i++) noise({ d: 0.12, v: 0.1, f: 3000, q: 1, at: 0.5 + i * 0.12 }); },
    lose: () => [392, 349, 311, 262].forEach((f, i) => tone({ f, d: 0.45, v: 0.1, type: 'triangle', at: i * 0.3 })),
    dawn: () => chord([392, 494, 587, 784], { d: 1.4, v: 0.07, type: 'sine', arp: 0.2, a: 0.1 }),
    thunder: () => { noise({ d: 2.6, v: 0.32, ft: 'lowpass', f: 180, to: 60, a: 0.25 }); noise({ d: 1.2, v: 0.14, ft: 'lowpass', f: 400, to: 90, at: 0.15, a: 0.05 }); },
    chaos: () => { noise({ d: 0.25, v: 0.15, f: 800, to: 3000, q: 2 }); tone({ f: 200, to: 500, d: 0.25, v: 0.06, type: 'square' }); },
  };
  return {
    init,
    play(n) { if (!on || !ctx) return; try { S[n] && S[n](); } catch (e) {} },
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('mp_sound', on ? 'on' : 'off'); } catch (e) {} if (on) init(); return on; },
    names: Object.keys(S),
  };
})();
