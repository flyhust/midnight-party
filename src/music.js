// ===== 背景音乐：程序合成的 1920 年代爵士（平时摇摆 / 午夜紧张）=====
const Music = (() => {
  let ctx = null, out = null, timer = null, on = true, mode = 'party', nextT = 0, step = 0, playing = false, noiseBuf = null;
  try { on = localStorage.getItem('mp_music') !== 'off'; } catch (e) {}
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  // 派对：D 小调 ii-V-I-VI 爵士进行；午夜：Dm-Bb-Gm-A7
  const SONGS = {
    party: { bpm: 138, swing: 0.62, chords: [
      { r: 38, v: [53, 57, 60, 64], walk: [38, 41, 45, 44] },
      { r: 43, v: [53, 57, 59, 64], walk: [43, 47, 50, 37] },
      { r: 36, v: [52, 55, 59, 62], walk: [36, 40, 43, 44] },
      { r: 45, v: [55, 58, 61, 65], walk: [45, 49, 52, 39] },
      { r: 38, v: [53, 57, 60, 64], walk: [38, 45, 41, 42] },
      { r: 43, v: [53, 57, 59, 64], walk: [43, 41, 40, 39] },
      { r: 38, v: [50, 53, 57, 60], walk: [38, 40, 41, 43] },
      { r: 45, v: [55, 58, 61, 64], walk: [45, 44, 43, 39] },
    ], scale: [62, 64, 65, 67, 69, 72, 74, 77] },
    midnight: { bpm: 112, swing: 0.5, chords: [
      { r: 38, v: [50, 53, 57, 62], walk: [38, 38, 38, 38] },
      { r: 34, v: [50, 53, 58, 62], walk: [34, 34, 34, 34] },
      { r: 31, v: [50, 55, 58, 62], walk: [31, 31, 31, 31] },
      { r: 33, v: [49, 52, 55, 61], walk: [33, 33, 33, 33] },
    ], scale: [62, 63, 65, 68, 69, 70, 73, 74] },
  };
  function init(c) {
    if (ctx) return;
    ctx = c || new (window.AudioContext || window.webkitAudioContext)();
    out = ctx.createGain(); out.gain.value = 0.0001;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000;
    out.connect(lp); lp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function env(g, t, a, d, v) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function osc(type, f, t, a, d, v, detune = 0, filt = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; o.detune.value = detune;
    let node = o;
    if (filt) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filt; o.connect(fl); node = fl; }
    env(g, t, a, d, v); node.connect(g); g.connect(out); o.start(t); o.stop(t + a + d + 0.05);
  }
  function hit(t, f, q, d, v, type = 'highpass') {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    env(g, t, 0.002, d, v); s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.05);
  }
  const bass = (m, t, d, v = 0.32) => { osc('triangle', mtof(m), t, 0.01, d, v, 0, 900); osc('sine', mtof(m - 12), t, 0.01, d * 0.8, v * 0.5); };
  const piano = (ms, t, d, v = 0.05) => ms.forEach((m, i) => { osc('triangle', mtof(m), t + i * 0.008, 0.004, d, v, (Math.random() - 0.5) * 8, 3200); osc('sine', mtof(m + 12), t + i * 0.008, 0.004, d * 0.5, v * 0.25); });
  function schedule(horizon) {
    const S = SONGS[mode];
    const beat = 60 / S.bpm;
    const end = horizon === undefined ? ctx.currentTime + 0.2 : horizon;
    while (nextT < end) {
      const sub = step % 2, b = Math.floor(step / 2) % 4, bar = Math.floor(step / 8) % S.chords.length;
      const ch = S.chords[bar];
      const t = nextT;
      if (mode === 'party') {
        if (!sub) bass(ch.walk[b], t, beat * 0.9);
        // 鼓刷：叮、叮哒、叮
        if (!sub) hit(t, 7500, 1, 0.12, b % 2 ? 0.05 : 0.035);
        if (sub && (b === 1 || b === 3)) hit(t, 8000, 1, 0.06, 0.028);
        if (!sub && (b === 1 || b === 3)) hit(t, 2500, 0.8, 0.18, 0.04, 'bandpass');
        // 钢琴 Charleston 节奏：第 1 拍 + 第 2 拍后半
        if (!sub && b === 0) piano(ch.v, t, beat * 0.8);
        if (sub && b === 1) piano(ch.v, t, beat * 1.2, 0.04);
        // 稀疏旋律
        if (Math.random() < (sub ? 0.18 : 0.28) && bar % 4 !== 3) { const m = S.scale[(Math.random() * S.scale.length) | 0]; osc('triangle', mtof(m + 12), t, 0.005, beat * 0.5, 0.035, 0, 4000); }
      } else {
        // 午夜：心跳低音 + 时钟滴答 + 持续和弦
        if (!sub && (b === 0)) { osc('sine', 55, t, 0.005, 0.25, 0.4); osc('sine', 55, t + beat * 0.35, 0.005, 0.2, 0.28); }
        if (!sub) bass(ch.r, t, beat * 0.5, 0.18);
        hit(t, 5000, 6, 0.03, sub ? 0.02 : 0.035, 'bandpass');
        if (!sub && b === 0) ch.v.forEach(m => { osc('sawtooth', mtof(m), t, 0.4, beat * 3.6, 0.012, -6, 1200); osc('sawtooth', mtof(m), t, 0.4, beat * 3.6, 0.012, 6, 1200); });
        if (!sub && b === 2 && Math.random() < 0.6) { const m = S.scale[(Math.random() * S.scale.length) | 0]; osc('sine', mtof(m + 12), t, 0.05, beat * 1.5, 0.03); }
      }
      nextT = t + (sub ? beat * (1 - S.swing) : beat * S.swing);
      step++;
    }
  }
  function fade(v, s = 1.2) { if (!ctx) return; const t = ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t); out.gain.exponentialRampToValueAtTime(Math.max(v, 0.0001), t + s); }
  function start() {
    if (!ctx || !on) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!playing) { playing = true; nextT = ctx.currentTime + 0.1; step = 0; timer = setInterval(schedule, 40); }
    fade(0.5);
  }
  function stop() { fade(0.0001, 0.6); setTimeout(() => { if (!on && timer) { clearInterval(timer); timer = null; playing = false; } }, 700); }
  function setMode(m) { if (m === mode) return; mode = m; if (ctx) { step = 0; nextT = ctx.currentTime + 0.1; } }
  function duck(on2) { if (!ctx || !on || !playing) return; fade(on2 ? 0.18 : 0.5, 0.3); }
  return {
    init, start, setMode, duck,
    async _test(m, secs = 6) { const sv = [ctx, out, mode, nextT, step, noiseBuf]; ctx = null; init(new OfflineAudioContext(1, 44100 * secs, 44100)); out.gain.value = 0.5; mode = m; nextT = 0.05; step = 0; schedule(secs - 0.5); const buf = await ctx.startRendering(); [ctx, out, mode, nextT, step, noiseBuf] = sv; const d = buf.getChannelData(0); let pk = 0, ss = 0; for (const x of d) { pk = Math.max(pk, Math.abs(x)); ss += x * x; } return { peak: +pk.toFixed(3), rms: +Math.sqrt(ss / d.length).toFixed(4) }; },
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('mp_music', on ? 'on' : 'off'); } catch (e) {} if (on) start(); else stop(); return on; },
  };
})();
