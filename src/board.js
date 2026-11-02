// ===== 等距 3D 豪宅：五个独立房间（红舞厅 蓝泳池 黄控制室 绿温室 紫书房），固定视角，一眼看完 =====
// 世界坐标：x 往右下、y 往左下、z 向上；屏幕 = ((x-y)·cos30, (x+y)·sin30 - z)。房间是 X×Y 的地板加两面后墙。
const House = (() => {
  const C = Math.cos(Math.PI / 6), S = 0.5, X = 8, Y = 5, H = 2.2, BASE = 0.45;
  const COL = ['#d04556', '#4a86d8', '#3fa070', '#9562d0', '#e6b43c'];
  // 摆位：红左上、蓝右上、黄居中、绿左下、紫右下（宣传片同款）
  const ROOM = [[0, 0], [7, -7], [13.4, 13.4], [20.4, 6.4], [10.3, 3.3]];
  const ORDER = [0, 1, 4, 2, 3];   // 画的先后（后面的先画）
  const P = (x, y, z = 0) => [(x - y) * C, (x + y) * S - z];
  // 整栋房子的边界（世界单位）
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  ROOM.forEach(([x0, y0]) => [[x0, y0, H + 1.1], [x0 + X / 2, y0, H + 2.1], [x0 + X, y0, H], [x0 + X, y0 + Y, -BASE], [x0, y0 + Y, H], [x0, y0 + Y, -BASE]].forEach(([x, y, z]) => {
    const [sx, sy] = P(x, y, z); minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
  }));
  const BW = maxX - minX, BH = maxY - minY;

  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
  const pts = arr => arr.map(([x, y, z]) => P(x, y, z).map(v => v.toFixed(3)).join(',')).join(' ');
  const poly = (arr, fill, extra = '') => `<polygon points="${pts(arr)}" fill="${fill}" ${extra}/>`;

  function room(z) {
    const [x0, y0] = ROOM[z], c = COL[z], x1 = x0 + X, y1 = y0 + Y;
    const floorA = mix(c, '#1b1426', 0.62), floorB = mix(c, '#1b1426', 0.74);
    const wallX = mix(c, '#120c1a', 0.38), wallY = mix(c, '#120c1a', 0.56), lip = mix(c, '#ffffff', 0.25);
    let s = `<g class="zone z${z}" data-z="${z}">`;
    // 底座（浮在夜色里的一块地台）
    s += poly([[x0, y1, 0], [x1, y1, 0], [x1, y1, -BASE], [x0, y1, -BASE]], mix(c, '#000000', 0.7));
    s += poly([[x1, y0, 0], [x1, y1, 0], [x1, y1, -BASE], [x1, y0, -BASE]], mix(c, '#000000', 0.55));
    // 地板 + 方格
    s += `<g class="fl">${poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], floorA)}`;
    for (let i = 0; i < X; i++) for (let j = 0; j < Y; j++) if ((i + j) % 2) s += poly([[x0 + i, y0 + j], [x0 + i + 1, y0 + j], [x0 + i + 1, y0 + j + 1], [x0 + i, y0 + j + 1]], floorB);
    s += '</g>';
    // 两面后墙（沿 x 的墙朝向观众更亮）
    s += poly([[x0, y0, 0], [x1, y0, 0], [x1, y0, H], [x0, y0, H]], wallX);
    s += poly([[x0, y0, 0], [x0, y1, 0], [x0, y1, H], [x0, y0, H]], wallY);
    s += `<polyline points="${pts([[x0, y1, H], [x0, y0, H], [x1, y0, H]])}" fill="none" stroke="${lip}" stroke-width=".14" stroke-linejoin="round"/>`;
    s += `<polyline points="${pts([[x0, y0, 0], [x0, y0, H]])}" stroke="${mix(c, '#000000', 0.5)}" stroke-width=".06"/>`;
    s += props(z, x0, y0, c);
    // “你在这”的金边
    s += `<polygon class="glowline" points="${pts([[x0, y0], [x1, y0], [x1, y1], [x0, y1]])}" fill="none" stroke="#f3dca0" stroke-width=".12" stroke-dasharray=".5 .3"/>`;
    // 可点击区域（选房间时用）
    s += `<polygon class="hit" points="${pts([[x0, y0, 0], [x1, y0, 0], [x1, y0, H], [x1, y1, 0], [x0, y1, 0], [x0, y1, H], [x0, y0, H]])}" fill="transparent"/>`;
    return s + '</g>';
  }
  function props(z, x0, y0, c) {
    let s = '';
    if (z === 0) { // 舞厅：吊灯 + 墙上的唱片
      const [cx, cy] = P(x0 + 1.4, y0 + 1.4, H + .2);
      s += `<line x1="${cx}" y1="${P(x0 + 1.4, y0 + 1.4, H + 1)[1]}" x2="${cx}" y2="${cy}" stroke="#d9b56a" stroke-width=".05"/>`;
      s += `<ellipse cx="${cx}" cy="${cy}" rx=".7" ry=".25" fill="#e9be5c"/><ellipse cx="${cx}" cy="${cy - .08}" rx=".5" ry=".14" fill="#fff3c4" opacity=".8"/>`;
      s += `<polyline points="${pts([[x0, y0 + Y, 1.5], [x0, y0, 1.5], [x0 + X, y0, 1.5]])}" fill="none" stroke="#d9b56a" stroke-width=".05" opacity=".6"/>`;
      s += poly([[x0 + 5.2, y0 + .1, 0], [x0 + 7.4, y0 + .1, 0], [x0 + 7.4, y0 + .1, .85], [x0 + 5.2, y0 + .1, .85]], '#1a1016');   // 三角钢琴的背影
      s += poly([[x0 + 5.2, y0 + .1, .85], [x0 + 7.4, y0 + .1, .85], [x0 + 7.4, y0 + 1.1, .85], [x0 + 5.2, y0 + 1.1, .85]], '#2a2228');
    } else if (z === 1) { // 泳池：地板中间一池水
      s += poly([[x0 + 1.2, y0 + 1], [x0 + X - 1.2, y0 + 1], [x0 + X - 1.2, y0 + Y - 1], [x0 + 1.2, y0 + Y - 1]], '#7fc0ea', 'opacity=".55"');
      s += `<polyline points="${pts([[x0 + 1.2, y0 + Y - 1], [x0 + 1.2, y0 + 1], [x0 + X - 1.2, y0 + 1]])}" fill="none" stroke="#e8eef2" stroke-width=".07" opacity=".7"/>`;
      for (let i = 0; i < 3; i++) s += `<polyline points="${pts([[x0 + 2 + i * 1.6, y0 + 2.2], [x0 + 2.8 + i * 1.6, y0 + 2.2]])}" stroke="#e8f6ff" stroke-width=".06" opacity=".7"/>`;
    } else if (z === 2) { // 温室：墙角两盆植物 + 玻璃格
      for (const [a, b] of [[x0 + .6, y0 + .6], [x0 + X - .8, y0 + .6]]) { const [px, py] = P(a, b, 0), [lx, ly] = P(a, b, 1.3); s += `<rect x="${px - .3}" y="${py - .55}" width=".6" height=".55" fill="#b0714a"/><circle cx="${lx}" cy="${ly}" r=".75" fill="#5fa35a"/><circle cx="${lx - .25}" cy="${ly - .3}" r=".3" fill="#8fd08a" opacity=".6"/>`; }
      for (let i = 1; i < 4; i++) s += `<polyline points="${pts([[x0 + i * 2, y0, .3], [x0 + i * 2, y0, H - .1]])}" stroke="#cfead2" stroke-width=".05" opacity=".5"/>`;
    } else if (z === 3) { // 书房：整面书架
      const book = ['#7b4a9e', '#b0743a', '#3f6e9a', '#9e3f4a', '#d9b56a'];
      for (let r = 0; r < 2; r++) for (let i = 0; i < 12; i++) { const a = x0 + .6 + i * .55; s += poly([[a, y0 + .02, .35 + r * .9], [a + .45, y0 + .02, .35 + r * .9], [a + .45, y0 + .02, 1.05 + r * .9], [a, y0 + .02, 1.05 + r * .9]], book[(i * 3 + r) % 5]); }
    } else if (z === 4) { // 控制室：三块发光屏幕
      for (let i = 0; i < 3; i++) { const a = x0 + 1 + i * 2.2; s += poly([[a, y0 + .02, .7], [a + 1.6, y0 + .02, .7], [a + 1.6, y0 + .02, 1.8], [a, y0 + .02, 1.8]], '#2c2a33'); s += poly([[a + .12, y0 + .03, .82], [a + 1.48, y0 + .03, .82], [a + 1.48, y0 + .03, 1.68], [a + .12, y0 + .03, 1.68]], '#f3d98a', 'class="screen"'); }
    }
    return s;
  }
  function svg() {
    return `<svg class="house" viewBox="${minX.toFixed(3)} ${minY.toFixed(3)} ${BW.toFixed(3)} ${BH.toFixed(3)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${ORDER.map(room).join('')}</svg>`;
  }
  // 把世界坐标换成 board 元素里的像素
  function fit(w, h) { const u = Math.min(w / BW, h / BH); return { u, w: BW * u, h: BH * u }; }
  const px = (u, x, y, z = 0) => { const [sx, sy] = P(x, y, z); return [(sx - minX) * u, (sy - minY) * u]; };
  // 房间里的站位：试遍各种行列和错位排法，挑屏幕上头像间距最大的一种（等距下前后排很容易互相挡脸）
  function slots(z, n) {
    const [x0, y0] = ROOM[z], mx = .5, my = .45, uw = X - 2 * mx, uh = Y - 2 * my;
    let best = null;
    for (let c = 1; c <= Math.min(n, 8); c++) {
      const r = Math.ceil(n / c); if (r > 3) continue;
      for (const st of [0, .5]) {
        const dx = uw / (c + (r > 1 ? st : 0)), dy = uh / r, pos = [];
        for (let i = 0; i < n; i++) {
          const row = Math.floor(i / c), col = i % c, inRow = row === r - 1 ? n - row * c : c;
          pos.push([x0 + mx + dx * (col + .5 + (row % 2 ? st : 0) + (c - inRow) / 2), y0 + my + dy * (row + .5)]);
        }
        let d = 1e9;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = P(...pos[i]), b = P(...pos[j]); d = Math.min(d, Math.hypot(a[0] - b[0], (a[1] - b[1]) / 1.45)); }
        if (n === 1) d = 3;
        if (!best || d > best.d + 1e-6) best = { pos, d };
      }
    }
    return best;
  }
  const labelAt = z => { const [x0, y0] = ROOM[z]; return [x0 + X / 2, y0, H + 1.05]; };
  return { svg, fit, px, slots, labelAt, ROOM, X, Y, ratio: BW / BH };
})();
