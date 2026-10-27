// ===== 背景场景：一九二七 · 某个下雨的夜晚，豪宅派对 =====
const Scene = (() => {
  let root = null, cv = null, ctx = null, drops = [], splashes = [], raf = 0, w = 0, h = 0, flashEl = null, mode = 'full', boltT = 0;
  let reduce = false;
  const rnd = (a, b) => a + Math.random() * (b - a);
  // 种子随机：保证每次画出的窗户一样
  let sd = 7; const sr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);

  function windows(x0, x1, y0, y1, cols, rows, ww, wh) {
    let out = '';
    const gx = (x1 - x0) / cols, gy = (y1 - y0) / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = x0 + gx * c + (gx - ww) / 2, y = y0 + gy * r + (gy - wh) / 2;
      const lit = sr() < 0.78;
      const fl = lit && sr() < 0.25 ? ` class="flick" style="animation-delay:${(sr() * 6).toFixed(2)}s"` : '';
      out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${ww}" height="${wh}" rx="${ww / 2}" fill="${lit ? 'url(#win)' : '#241a33'}"${fl}/>`;
      if (lit && sr() < 0.22) { // 窗里跳舞的人影
        const cx = x + ww / 2, by = y + wh;
        out += `<g class="dancer" style="animation-delay:${(sr() * 3).toFixed(2)}s;transform-origin:${cx}px ${by}px"><circle cx="${cx}" cy="${by - wh * 0.62}" r="${ww * 0.16}" fill="#3a2010" opacity=".75"/><path d="M${cx - ww * 0.22} ${by} L${cx} ${by - wh * 0.52} L${cx + ww * 0.22} ${by}Z" fill="#3a2010" opacity=".75"/></g>`;
      }
    }
    return out;
  }
  function mansion() {
    sd = 7;
    const fluting = Array.from({ length: 7 }, (_, i) => `<path d="M${736 + i * 21} 270 V600" stroke="#d9b56a" stroke-width="1" opacity=".22"/>`).join('');
    const sun = Array.from({ length: 13 }, (_, i) => { const a = Math.PI + (i / 12) * Math.PI; return `<path d="M800 258 L${(800 + Math.cos(a) * 70).toFixed(1)} ${(258 + Math.sin(a) * 70).toFixed(1)}" stroke="#d9b56a" stroke-width="1.6" opacity=".55"/>`; }).join('');
    return `
      <g id="house">
        <!-- 外侧亭 -->
        <path d="M370 700 V530 h20 v-14 h50 v14 h20 V700Z" fill="#1d1428"/>
        <path d="M1140 700 V530 h20 v-14 h50 v14 h20 V700Z" fill="#1d1428"/>
        ${windows(378, 452, 545, 690, 2, 3, 16, 30)}${windows(1148, 1222, 545, 690, 2, 3, 16, 30)}
        <!-- 两翼 -->
        <path d="M450 700 V430 h30 v-18 h210 v18 h30 V700Z" fill="#221830"/>
        <path d="M870 700 V430 h30 v-18 h210 v18 h30 V700Z" fill="#221830"/>
        <path d="M450 452 H720 M870 452 H1150" stroke="#d9b56a" stroke-width="1.5" opacity=".35"/>
        ${windows(462, 708, 466, 690, 6, 4, 18, 36)}${windows(882, 1138, 466, 690, 6, 4, 18, 36)}
        <!-- 中央塔楼（阶梯式） -->
        <path d="M720 700 V262 h12 v-30 h20 v-30 h24 v-34 h10 v-70 h28 v70 h10 v34 h24 v30 h20 v30 h12 V700Z" fill="#2a1e3a"/>
        <path d="M797 98 L800 52 L803 98Z" fill="#d9b56a"/><circle cx="800" cy="50" r="3.5" fill="#ffe6a8" class="beacon"/>
        ${sun}${fluting}
        <path d="M720 262 H880" stroke="#d9b56a" stroke-width="2" opacity=".55"/>
        ${windows(738, 862, 300, 590, 3, 5, 16, 40)}
        <!-- 大门 -->
        <path d="M760 700 V632 Q800 596 840 632 V700Z" fill="url(#door)"/>
        <path d="M748 628 H852 L840 612 H760Z" fill="#5a1626"/><path d="M748 628 H852" stroke="#d9b56a" stroke-width="2"/>
        <path d="M740 700 H860 L870 712 H730Z" fill="#2e2240"/>
        <text x="800" y="624" text-anchor="middle" font-family="Limelight, serif" font-size="9" fill="#d9b56a" letter-spacing="2">1927</text>
      </g>`;
  }
  function car(x, flip) {
    const s = flip ? -1 : 1;
    return `<g transform="translate(${x} 700) scale(${s} 1)">
      <path d="M-70 -12 Q-70 -26 -54 -28 L-30 -30 L-22 -52 L18 -52 L28 -30 L58 -26 Q70 -24 70 -12 Z" fill="#0f0b16"/>
      <circle cx="-42" cy="-10" r="11" fill="#0a0810" stroke="#2a2235" stroke-width="2"/><circle cx="42" cy="-10" r="11" fill="#0a0810" stroke="#2a2235" stroke-width="2"/>
      <rect x="-16" y="-48" width="14" height="14" fill="#3a2a1a" opacity=".6"/><rect x="2" y="-48" width="13" height="14" fill="#3a2a1a" opacity=".6"/>
      <circle cx="66" cy="-22" r="4" fill="#fff3c4"/><path d="M68 -24 L180 -40 L180 4 L68 -18Z" fill="url(#beam)" opacity=".5"/>
    </g>`;
  }
  function lamp(x) {
    return `<g><rect x="${x - 2.5}" y="560" width="5" height="140" fill="#0d0a14"/><path d="M${x - 10} 560 H${x + 10} L${x + 6} 544 H${x - 6}Z" fill="#0d0a14"/><circle cx="${x}" cy="552" r="7" fill="#ffe3a0"/><circle cx="${x}" cy="552" r="70" fill="url(#halo)" class="halo"/></g>`;
  }
  function svg() {
    const skyline = Array.from({ length: 22 }, (_, i) => { sd = 100 + i; const bw = 40 + sr() * 50, bh = 80 + sr() * 170, x = i * 75 - 20; let win = ''; for (let k = 0; k < 6; k++) if (sr() < 0.5) win += `<rect x="${(x + 6 + sr() * (bw - 14)).toFixed(0)}" y="${(700 - bh + 10 + sr() * (bh - 30)).toFixed(0)}" width="3" height="5" fill="#c9a060" opacity="${(0.25 + sr() * 0.4).toFixed(2)}"/>`; return `<rect x="${x}" y="${700 - bh}" width="${bw.toFixed(0)}" height="${bh.toFixed(0)}" fill="#160f22"/>${win}`; }).join('');
    return `<svg class="scene-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07050d"/><stop offset=".55" stop-color="#1b1030"/><stop offset="1" stop-color="#3a1a3c"/></linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1226"/><stop offset="1" stop-color="#07050b"/></linearGradient>
        <radialGradient id="win"><stop offset="0" stop-color="#ffe6a6"/><stop offset=".7" stop-color="#f2b252"/><stop offset="1" stop-color="#b8702a"/></radialGradient>
        <radialGradient id="door" cx=".5" cy=".8"><stop offset="0" stop-color="#fff0c4"/><stop offset="1" stop-color="#e09a3a"/></radialGradient>
        <radialGradient id="halo"><stop offset="0" stop-color="#ffd98a" stop-opacity=".35"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>
        <radialGradient id="moonglow"><stop offset="0" stop-color="#f4e7c8" stop-opacity=".5"/><stop offset="1" stop-color="#f4e7c8" stop-opacity="0"/></radialGradient>
        <radialGradient id="houseglow" cx=".5" cy="1"><stop offset="0" stop-color="#ff9f4a" stop-opacity=".28"/><stop offset="1" stop-color="#ff9f4a" stop-opacity="0"/></radialGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff3c4" stop-opacity=".7"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></linearGradient>
        <linearGradient id="search" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff1c8" stop-opacity=".35"/><stop offset="1" stop-color="#fff1c8" stop-opacity="0"/></linearGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
        <filter id="refl"><feGaussianBlur stdDeviation="3 1"/></filter>
      </defs>
      <rect width="1600" height="900" fill="url(#sky)"/>
      <circle cx="1290" cy="150" r="170" fill="url(#moonglow)"/><circle cx="1290" cy="150" r="46" fill="#efe2c2" opacity=".85"/>
      <g class="clouds" filter="url(#soft)"><ellipse cx="1200" cy="170" rx="190" ry="34" fill="#2a1e3a" opacity=".85"/><ellipse cx="380" cy="120" rx="260" ry="40" fill="#1e1530" opacity=".9"/><ellipse cx="900" cy="80" rx="220" ry="30" fill="#241a35" opacity=".8"/></g>
      <g class="searchlights"><path class="sl a" d="M600 700 L540 -80 L640 -80Z" fill="url(#search)"/><path class="sl b" d="M1000 700 L960 -80 L1060 -80Z" fill="url(#search)"/></g>
      ${skyline}
      <ellipse cx="800" cy="700" rx="520" ry="260" fill="url(#houseglow)"/>
      ${mansion()}
      <rect y="700" width="1600" height="200" fill="url(#ground)"/>
      <g class="reflection" transform="translate(0 1400) scale(1 -1)" opacity=".22" filter="url(#refl)"><use href="#house"/></g>
      <path d="M0 760 H1600 M0 800 H1600 M0 850 H1600" stroke="#d9b56a" stroke-width="1" opacity=".05"/>
      ${lamp(300)}${lamp(1300)}
      ${car(170, false)}${car(1430, true)}
    </svg>`;
  }
  function size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = innerWidth; h = innerHeight;
    cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(420, (w * h) / 3600));
    drops = Array.from({ length: n }, () => newDrop(true));
  }
  function newDrop(any) { const z = rnd(0.4, 1); return { x: rnd(-w * 0.2, w * 1.1), y: any ? rnd(-h, h) : rnd(-80, -10), z, len: 10 + z * 18, v: 9 + z * 13 }; }
  function frame(t) {
    raf = requestAnimationFrame(frame);
    ctx.clearRect(0, 0, w, h);
    const ground = h * 0.79;
    ctx.lineCap = 'round';
    for (const d of drops) {
      d.x += d.v * 0.18; d.y += d.v;
      ctx.strokeStyle = `rgba(200,210,255,${0.12 + d.z * 0.28})`;
      ctx.lineWidth = d.z * 1.2;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * 0.18, d.y - d.len); ctx.stroke();
      const floor = ground + (1 - d.z) * -40 + d.z * (h - ground) * 0.9;
      if (d.y > floor) { if (splashes.length < 120 && Math.random() < 0.6) splashes.push({ x: d.x, y: floor, r: 0, a: 0.5 * d.z }); Object.assign(d, newDrop(false)); }
    }
    ctx.lineWidth = 1;
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i]; s.r += 0.6; s.a -= 0.025;
      if (s.a <= 0) { splashes.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(220,225,255,${s.a})`;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 2, s.r * 0.5, 0, Math.PI, 2 * Math.PI); ctx.stroke();
    }
    if (t > boltT) { boltT = t + rnd(9000, 18000); if (boltT > 2000) lightning(); }
  }
  function lightning() {
    if (!flashEl || mode !== 'full') return;
    flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go');
    setTimeout(() => { try { SFX.play('thunder'); } catch (e) {} }, 500 + Math.random() * 900);
  }
  function mount() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'scene';
    root.innerHTML = svg() + '<canvas class="rain"></canvas><div class="flash"></div><div class="vignette"></div>';
    document.body.prepend(root);
    cv = root.querySelector('canvas'); ctx = cv.getContext('2d'); flashEl = root.querySelector('.flash');
    size();
    addEventListener('resize', size);
    boltT = performance.now() + 4000;
    if (!reduce) raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden && !reduce) raf = requestAnimationFrame(frame); });
  }
  function setMode(m) { mode = m; if (root) root.dataset.mode = m; }
  function setMotion(on) { reduce = !on; cancelAnimationFrame(raf); if (on && root) raf = requestAnimationFrame(frame); else if (ctx) ctx.clearRect(0, 0, w, h); }
  return { mount, setMode, setMotion };
})();
