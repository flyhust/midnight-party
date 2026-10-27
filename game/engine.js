// ===== 暗夜派对 · 规则引擎 + AI（纯逻辑，无 UI）=====
const Engine = (() => {
  const ZONES = [
    { k: 'red', c: '红', n: '舞厅' },
    { k: 'blue', c: '蓝', n: '泳池' },
    { k: 'green', c: '绿', n: '温室' },
    { k: 'purple', c: '紫', n: '书房' },
    { k: 'yellow', c: '黄', n: '控制室' },
  ];
  const CONTROL = 4;
  const FACES = ['red', 'blue', 'green', 'purple', 'yellow', 'black'];
  const CONFIG = { tokens: 1, midnightRound: 20, maxRound: 50, escape: true };
  const CHARS = [
    ['厨师', '据说他的汤能让人说真话。', '皮埃尔·勒布朗'],
    ['医生', '总在观察别人的脸色。', '汉斯·韦伯'],
    ['歌手', '今晚的主角，至少她这么认为。', '白玫瑰'],
    ['魔术师', '最擅长让东西消失。', '拉吉·辛格'],
    ['管家', '知道这栋房子的每一条暗道。', '阿尔弗雷德'],
    ['诗人', '把每个人都写进了诗里。', '阿米尔·哈桑'],
    ['修女', '为所有人祈祷，包括凶手。', '玛丽亚嬷嬷'],
    ['作家', '正在写一本谋杀小说。', '顾墨言'],
    ['园丁', '花园里的每一株毒草他都认识。', '山田健次郎'],
    ['记者', '在找今晚的头条。', '杰克·奥康纳'],
    ['女伯爵', '这场派对的主人。', '薇拉·冯·霍恩'],
    ['船长', '见过比这更大的风浪。', '拉斯·约翰森'],
    ['画家', '画的肖像总是少一个人。', '伊莎贝拉·克鲁兹'],
    ['舞者', '一刻也停不下来。', '娜塔莎'],
    ['调酒师', '记得每个人点了什么。', '托尼·马里诺'],
    ['将军', '退役了，习惯没退。', '秦镇岳'],
    ['小丑', '笑得最大声的那个。', '波波'],
    ['富商', '欠了在场一半人的钱。', '维克多·范德堡'],
    ['钢琴师', '音乐一停，就有人倒下。', '迈尔斯·卡特'],
    ['拳击手', '鼻子断过三次。', '迭戈·拉莫斯'],
  ];
  const AI_NAMES = ['狐狸', '乌鸦', '黑猫', '毒蛇', '猫头鹰', '蝙蝠', '孤狼', '蜘蛛'];
  const P_COLORS = ['#f2c96d', '#ff8a5c', '#5fd3c4', '#f06bb0', '#b9e35a', '#8ab4ff', '#c49bff', '#e8e2f2'];

  function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const shuffle = (r, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  function newGame({ players = 4, human = 0, difficulty = 'normal', seed = Date.now() } = {}) {
    const r = mulberry(seed);
    const per = players <= 3 ? 2 : 1;
    const zoneOrder = shuffle(r, [...Array(20).keys()]);
    const chars = CHARS.map(([name, bio], i) => ({ id: i, name, bio, zone: 0, alive: true, owner: -1 }));
    zoneOrder.forEach((cid, i) => (chars[cid].zone = i % 5));
    const deck = shuffle(r, [...Array(20).keys()]);
    const ps = [];
    let ai = 0;
    for (let i = 0; i < players; i++) {
      const isH = i === human;
      ps.push({ id: i, name: isH ? '你' : AI_NAMES[ai++], human: isH, color: isH ? P_COLORS[0] : P_COLORS[ai], ids: [], tokens: CONFIG.tokens, out: false, diff: difficulty, exposedRound: -9 });
    }
    for (let k = 0; k < per; k++) for (const p of ps) { const c = deck.pop(); p.ids.push(c); chars[c].owner = p.id; }
    // 知识：know[o][c] = null 未知 / -1 NPC / -2 某个玩家 / q 属于玩家 q
    const know = ps.map(p => { const k = Array(20).fill(null); p.ids.forEach(c => (k[c] = p.id)); return k; });
    const cand = ps.map(o => ps.map(q => new Set(q.id === o.id ? [] : [...Array(20).keys()].filter(c => !o.ids.includes(c)))));
    const w = ps.map(() => ps.map(() => Array(20).fill(1)));
    const start = Math.floor(r() * players);
    return { r, seed, per, chars, players: ps, know, cand, w, cur: start, start, round: 1, over: false, winner: null, log: [], turns: 0 };
  }

  // ---------- 查询 ----------
  const alivePlayers = G => G.players.filter(p => !p.out);
  const ownAlive = (G, p) => G.players[p].ids.filter(c => G.chars[c].alive);
  const isMidnight = G => G.round >= CONFIG.midnightRound;
  const effFace = (G, f) => (f === 'yellow' && isMidnight(G) ? 'black' : f);
  const movableTo = (G, z) => G.chars.filter(c => c.alive && c.zone !== z).map(c => c.id);
  const ownZones = (G, p) => [...new Set(ownAlive(G, p).map(c => G.chars[c].zone))];
  function killTargets(G, p) {
    const zs = ownZones(G, p), mine = G.players[p].ids;
    return G.chars.filter(c => c.alive && zs.includes(c.zone) && !mine.includes(c.id)).map(c => c.id);
  }
  const fallbackZone = (G, p) => G.chars[ownAlive(G, p)[0]].zone;
  const canMonitor = (G, p) => ownZones(G, p).includes(CONTROL);
  const monitorTargets = (G, p) => G.chars.filter(c => c.alive && !G.players[p].ids.includes(c.id)).map(c => c.id);
  const accuseTargets = (G, p) => (G.players[p].tokens > 0 ? killTargets(G, p) : []);
  const opponents = (G, p) => G.players.filter(q => !q.out && q.id !== p);

  // ---------- 推理 ----------
  function learn(G, o, c, val) {
    const cur = G.know[o][c];
    if (cur !== null && cur !== -2) return;
    G.know[o][c] = val;
    if (val === -1) G.cand[o].forEach(s => s.delete(c));
    else if (val >= 0) G.cand[o].forEach((s, q) => { if (q !== val) s.delete(c); });
  }
  function evidence(G, q, zone) {
    G.players[q].exposedRound = G.round;
    const aliveIds = ownAlive(G, q).length;
    for (const o of G.players) {
      if (o.id === q) continue;
      const s = G.cand[o.id][q];
      for (const c of G.chars) {
        if (!c.alive) continue;
        if (c.zone === zone) G.w[o.id][q][c.id] += 3;
        else if (aliveIds === 1) s.delete(c.id);
      }
    }
  }
  function prob(G, o, q, c) {
    if (!G.chars[c].alive || o === q) return 0;
    const k = G.know[o][c];
    if (k === q) return 1;
    if (k !== null && k !== -2) return 0;
    const s = G.cand[o][q];
    if (!s.has(c)) return 0;
    let sum = 0, known = 0;
    for (const x of s) if (G.chars[x].alive && (G.know[o][x] === null || G.know[o][x] === -2)) sum += G.w[o][q][x];
    for (const x of G.players[q].ids) if (G.chars[x].alive && G.know[o][x] === q) known++;
    const remain = ownAlive(G, q).length - known;
    if (remain <= 0 || sum <= 0) return 0;
    return Math.min(1, (G.w[o][q][c] / sum) * remain);
  }
  // 给玩家看的“可能是谁”列表
  function suspects(G, o, q) {
    const out = [];
    for (const c of G.chars) { const pr = prob(G, o, q, c.id); if (pr > 0) out.push({ c: c.id, pr }); }
    return out.sort((a, b) => b.pr - a.pr);
  }

  // ---------- 动作 ----------
  function log(G, e) { e.round = G.round; G.log.push(e); return e; }
  function doMove(G, p, cid, zone, cause = 'move') {
    const from = G.chars[cid].zone;
    G.chars[cid].zone = zone;
    if (cause === 'fallback') evidence(G, p, zone);
    return log(G, { t: 'move', p, cid, from, zone, cause });
  }
  function death(G, cid) {
    const ch = G.chars[cid];
    ch.alive = false;
    G.players.forEach(o => learn(G, o.id, cid, ch.owner));
    let elim = -1;
    if (ch.owner >= 0) {
      const q = G.players[ch.owner];
      if (q.ids.every(c => !G.chars[c].alive)) { q.out = true; elim = q.id; }
    }
    return elim;
  }
  function doKill(G, p, cid) {
    const zone = G.chars[cid].zone;
    evidence(G, p, zone);
    const elim = death(G, cid);
    checkWin(G);
    return log(G, { t: 'kill', p, cid, zone, owner: G.chars[cid].owner, elim });
  }
  function doMonitor(G, p, cid) {
    evidence(G, p, CONTROL);
    const isP = G.chars[cid].owner >= 0;
    if (!isP) learn(G, p, cid, -1);
    else { if (G.know[p][cid] === null) G.know[p][cid] = -2; G.w[p].forEach(arr => (arr[cid] *= 4)); }
    return log(G, { t: 'monitor', p, cid, isPlayer: isP });
  }
  function doAccuse(G, p, cid, q) {
    const pl = G.players[p];
    pl.tokens--;
    const zone = G.chars[cid].zone;
    evidence(G, p, zone);
    const correct = G.chars[cid].owner === q;
    let elim = -1;
    if (correct) { elim = death(G, cid); checkWin(G); }
    else {
      pl.ids.forEach(c => G.chars[c].alive && learn(G, q, c, p));
      G.players.forEach(o => { if (o.id !== q && G.know[o.id][cid] !== q) G.cand[o.id][q].delete(cid); });
      G.cand[q][q]; // noop
      // 被指认者自己知道 cid 不是自己的；其他人知道 cid 不属于 q
    }
    return log(G, { t: 'accuse', p, cid, q, correct, zone, owner: correct ? q : null, elim });
  }
  function checkWin(G) {
    const a = alivePlayers(G);
    if (a.length <= 1) { G.over = true; G.winner = a.length ? a[0].id : null; }
  }
  function endTurn(G) {
    const events = [];
    G.turns++;
    const n = G.players.length;
    let i = G.cur, wrapped = false;
    do { i = (i + 1) % n; if (i === G.start) wrapped = true; } while (G.players[i].out);
    G.cur = i;
    if (wrapped) {
      G.round++;
      const ghosts = G.players.filter(p => p.out);
      for (const g of ghosts) {
        const alive = G.chars.filter(c => c.alive);
        if (!alive.length) break;
        const c = pick(G.r, alive);
        const zs = [0, 1, 2, 3, 4].filter(z => z !== c.zone);
        events.push(doMove(G, g.id, c.id, pick(G.r, zs), 'ghost'));
      }
      if (G.round === CONFIG.midnightRound) events.push(log(G, { t: 'midnight' }));
      if (G.round > CONFIG.maxRound) { G.over = true; G.winner = null; }
    }
    return events;
  }

  // ---------- AI ----------
  const DIFF = { easy: { rand: 0.35, thr: 0.8 }, normal: { rand: 0.08, thr: 0.5 }, hard: { rand: 0, thr: 0.38 } };
  const threat = (G, o, c) => opponents(G, o).reduce((s, q) => s + prob(G, o, q.id, c), 0);
  function argmax(G, arr, f) {
    let best = -1, out = [];
    for (const x of arr) { const v = f(x); if (v > best + 1e-9) { best = v; out = [x]; } else if (Math.abs(v - best) < 1e-9) out.push(x); }
    return out.length ? pick(G.r, out) : undefined;
  }
  function aiPreRoll(G, p) {
    const d = DIFF[G.players[p].diff];
    let best = null;
    for (const c of accuseTargets(G, p)) for (const q of opponents(G, p)) {
      const pr = prob(G, p, q.id, c);
      if (!best || pr > best.pr) best = { cid: c, q: q.id, pr };
    }
    if (best && (best.pr >= 0.999 || (best.pr >= d.thr && G.r() > d.rand))) return { type: 'accuse', cid: best.cid, q: best.q };
    return { type: 'roll' };
  }
  function aiOnFace(G, p, face) {
    const d = DIFF[G.players[p].diff];
    const f = effFace(G, face);
    const mine = G.players[p].ids;
    const notMine = arr => arr.filter(c => !mine.includes(c));
    const randomish = G.r() < d.rand;
    if (f === 'black') {
      const t = killTargets(G, p);
      if (t.length) return { type: 'kill', cid: randomish ? pick(G.r, t) : argmax(G, t, c => threat(G, p, c)) };
      const z = fallbackZone(G, p);
      const m = notMine(movableTo(G, z));
      if (!m.length) return { type: 'skip' };
      return { type: 'move', cid: argmax(G, m, c => threat(G, p, c) + G.r() * 0.01), zone: z, cause: 'fallback' };
    }
    if (f === 'yellow') {
      if (canMonitor(G, p) && !randomish) {
        const t = monitorTargets(G, p).filter(c => G.know[p][c] === null);
        if (t.length) return { type: 'monitor', cid: argmax(G, t, c => threat(G, p, c) + G.r() * 0.05) };
      }
      const m = movableTo(G, CONTROL);
      if (!m.length) return { type: 'skip' };
      const myOut = m.filter(c => mine.includes(c));
      if (myOut.length && G.r() < 0.6) return { type: 'move', cid: pick(G.r, myOut), zone: CONTROL };
      return { type: 'move', cid: pick(G.r, m), zone: CONTROL };
    }
    const z = ZONES.findIndex(x => x.k === f);
    const m = movableTo(G, z);
    if (!m.length) return { type: 'skip' };
    if (randomish) return { type: 'move', cid: pick(G.r, m), zone: z };
    const others = notMine(m);
    if (ownZones(G, p).includes(z) && others.length) {
      const c = argmax(G, others, c => threat(G, p, c));
      if (threat(G, p, c) > 0.05) return { type: 'move', cid: c, zone: z };
    }
    const myM = m.filter(c => mine.includes(c));
    if (myM.length && G.players[p].exposedRound >= G.round - 1 && G.r() < 0.65) return { type: 'move', cid: pick(G.r, myM), zone: z };
    // 把最危险的人拉离自己
    const away = others.filter(c => ownZones(G, p).includes(G.chars[c].zone));
    if (away.length && G.r() < 0.5) return { type: 'move', cid: argmax(G, away, c => threat(G, p, c)), zone: z };
    return { type: 'move', cid: pick(G.r, others.length ? others : m), zone: z };
  }
  // 杀人后逃离现场：返回 {cid, zone} 或 null
  function escapeOptions(G, p) {
    if (!CONFIG.escape) return [];
    return ownAlive(G, p);
  }
  function aiEscape(G, p, killZone) {
    if (!CONFIG.escape || G.r() < 0.25) return null;
    const inZone = G.chars.filter(c => c.alive && c.zone === killZone).map(c => c.id);
    const mine = ownAlive(G, p).filter(c => G.chars[c].zone === killZone);
    if (!inZone.length) return null;
    const zs = [0, 1, 2, 3, 4].filter(z => z !== killZone);
    // 优先去威胁最小的区域
    const score = z => G.chars.filter(c => c.alive && c.zone === z && !G.players[p].ids.includes(c.id)).reduce((s, c) => s + threat(G, p, c.id), 0) + G.r() * 0.1;
    const others = inZone.filter(c => !mine.includes(c));
    const cid = mine.length && (G.r() < 0.65 || !others.length) ? mine[0] : pick(G.r, others);
    return { cid, zone: argmax(G, zs, z => -score(z)) };
  }
  function apply(G, p, a) {
    if (a.type === 'move') return doMove(G, p, a.cid, a.zone, a.cause);
    if (a.type === 'kill') return doKill(G, p, a.cid);
    if (a.type === 'monitor') return doMonitor(G, p, a.cid);
    if (a.type === 'accuse') return doAccuse(G, p, a.cid, a.q);
    return log(G, { t: 'skip', p });
  }
  const roll = G => pick(G.r, FACES);

  return { ZONES, CONTROL, FACES, CONFIG, CHARS, newGame, escapeOptions, aiEscape, alivePlayers, ownAlive, isMidnight, effFace, movableTo, killTargets, fallbackZone, canMonitor, monitorTargets, accuseTargets, opponents, prob, suspects, doMove, doKill, doMonitor, doAccuse, endTurn, aiPreRoll, aiOnFace, apply, roll, ownZones };
})();
if (typeof module !== 'undefined') module.exports = Engine;
