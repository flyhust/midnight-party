// ===== 联机层：主机裁判 + 端到端加密的私密信息 =====
const Net = (() => {
  const E = Engine;
  const P_COLORS = ['#f2c96d', '#ff8a5c', '#5fd3c4', '#f06bb0', '#b9e35a', '#8ab4ff', '#c49bff', '#e8e2f2'];
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  // ---------- 加密：ECDH P-256 + AES-GCM ----------
  const b64 = buf => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const ALG = { name: 'ECDH', namedCurve: 'P-256' };
  let keysP = null;
  function myKeys() {
    if (keysP) return keysP;
    keysP = (async () => {
      const saved = lsGet('mp_keys');
      if (saved) {
        try {
          const j = JSON.parse(saved);
          const priv = await crypto.subtle.importKey('jwk', j.priv, ALG, true, ['deriveKey']);
          return { priv, pub: { x: j.priv.x, y: j.priv.y } };
        } catch (e) {}
      }
      const kp = await crypto.subtle.generateKey(ALG, true, ['deriveKey']);
      const priv = await crypto.subtle.exportKey('jwk', kp.privateKey);
      lsSet('mp_keys', JSON.stringify({ priv }));
      return { priv: kp.privateKey, pub: { x: priv.x, y: priv.y } };
    })();
    return keysP;
  }
  const keyCache = new Map();
  async function shared(pub) {
    const k = pub.x + pub.y;
    if (keyCache.has(k)) return keyCache.get(k);
    const p = (async () => {
      const { priv } = await myKeys();
      const pk = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y, ext: true }, ALG, true, []);
      return crypto.subtle.deriveKey({ name: 'ECDH', public: pk }, priv, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    })();
    keyCache.set(k, p);
    return p;
  }
  async function seal(pub, obj) {
    const key = await shared(pub);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
    return { iv: b64(iv), ct: b64(ct) };
  }
  async function open(pub, box) {
    const key = await shared(pub);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  function clientId() {
    let id = lsGet('mp_cid');
    if (!id) { id = 'c' + Math.random().toString(36).slice(2, 12); lsSet('mp_cid', id); }
    return id;
  }

  // ---------- 主机：唯一持有完整状态的地方 ----------
  // seats[i] = { kind: 'local' | 'remote' | 'ai', name }
  function createHost({ seats, difficulty, publish, sendPriv, pace: paceFn }) {
    const G = E.newGame({ players: seats.length, human: -1, difficulty, seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0 });
    G.players.forEach((p, i) => { p.color = P_COLORS[i]; if (seats[i].kind !== 'ai') { p.name = seats[i].name; p.human = true; } });
    let seq = 0, stage = 'draw', pending = null, pendN = 0, stopped = false;
    const events = [], msgs = seats.map(() => []), waiters = {}, ready = new Set(), lastPriv = {};
    let readyRes = null;
    const sleep = ms => new Promise(r => setTimeout(r, paceFn(ms)));

    function snap() {
      return {
        stage, round: G.round, cur: G.cur, start: G.start, per: G.per, over: G.over, winner: G.winner, pending,
        mid: E.CONFIG.midnightRound, dawn: E.CONFIG.maxRound, tokens: E.CONFIG.tokens,
        chars: G.chars.map(c => [c.zone, c.alive ? 1 : 0, c.alive ? -1 : c.owner]),
        players: G.players.map((p, i) => ({ name: p.name, color: p.color, tokens: p.tokens, out: p.out, n: p.ids.length, dead: p.ids.filter(c => !G.chars[c].alive), ai: seats[i].kind === 'ai' })),
      };
    }
    function privFor(s) {
      return {
        ids: G.players[s].ids, know: G.know[s],
        notes: G.players.filter(q => q.id !== s && !q.out).map(q => { const sus = E.suspects(G, s, q.id); return { q: q.id, total: sus.length, sus: sus.slice(0, 8).map(x => [x.c, Math.round(x.pr * 100)]) }; }),
        msgs: msgs[s].slice(-12),
      };
    }
    function ev(e) { e.seq = ++seq; events.push(e); if (events.length > 80) events.shift(); }
    function pubEv(e) {
      if (e.t === 'monitor') ev({ t: 'monitor', p: e.p, cid: e.cid });
      else ev({ ...e });
    }
    function flush() {
      if (stopped) return;
      publish({ snap: snap(), events: events.slice(-50), seq });
      seats.forEach((s, i) => {
        if (s.kind === 'ai') return;
        const pv = privFor(i), j = JSON.stringify(pv);
        if (lastPriv[i] === j) return;
        lastPriv[i] = j;
        sendPriv(i, pv);
      });
    }
    function resendPriv(i) { delete lastPriv[i]; flush(); }

    function valid(s, ph, it) {
      if (!it || typeof it !== 'object') return false;
      const isId = c => Number.isInteger(c) && c >= 0 && c < 20;
      switch (ph.phase) {
        case 'act': return it.type === 'roll' || (it.type === 'accuse' && isId(it.cid) && E.accuseTargets(G, s).includes(it.cid) && E.opponents(G, s).some(q => q.id === it.q));
        case 'move': case 'fallback': return isId(it.cid) && E.movableTo(G, ph.z).includes(it.cid);
        case 'yellow': return isId(it.cid) && ((it.mode === 'move' && E.movableTo(G, E.CONTROL).includes(it.cid)) || (it.mode === 'mon' && E.canMonitor(G, s) && E.monitorTargets(G, s).includes(it.cid)));
        case 'kill': return isId(it.cid) && E.killTargets(G, s).includes(it.cid);
        case 'chaos': return it.cid === null || (isId(it.cid) && G.chars[it.cid].alive && G.chars[it.cid].zone === ph.zone && Number.isInteger(it.zone) && it.zone >= 0 && it.zone < 5 && it.zone !== ph.zone);
      }
      return false;
    }
    function receive(s, it) {
      const w = waiters[s];
      if (!w || !it || it.n !== w.n || !valid(s, pending, it)) return false;
      delete waiters[s]; clearTimeout(w.timer); pending = null; w.res(it); return true;
    }
    // 问真人；远程玩家超时就由 AI 代打
    function ask(s, phase, extra = {}) {
      pending = { seat: s, phase, n: ++pendN, ...extra };
      flush();
      return new Promise(res => {
        const w = { n: pendN, res };
        if (seats[s].kind === 'remote') w.timer = setTimeout(() => { if (waiters[s] === w) { delete waiters[s]; pending = null; res(null); } }, phase === 'act' ? 90000 : 60000);
        waiters[s] = w;
      });
    }
    const isAI = p => seats[p].kind === 'ai';

    async function takeTurn(p) {
      ev({ t: 'turn', p }); flush();
      await sleep(isAI(p) ? 1000 : 600);
      let act = isAI(p) ? E.aiPreRoll(G, p) : await ask(p, 'act');
      if (!act) act = E.aiPreRoll(G, p);
      if (act.type === 'accuse') {
        const e = E.doAccuse(G, p, act.cid, act.q);
        pubEv(e);
        if (!e.correct) msgs[e.q].push({ seq, t: 'leak', from: p, cid: e.cid, ids: G.players[p].ids.filter(c => G.chars[c].alive) });
        flush(); await sleep(4300); return;
      }
      const face = E.roll(G);
      ev({ t: 'roll', p, face }); flush();
      await sleep(1700);
      const eff = E.effFace(G, face);
      const aiA = () => E.aiOnFace(G, p, face);
      let a;
      if (eff === 'black') {
        if (E.killTargets(G, p).length) { const r = isAI(p) ? null : await ask(p, 'kill'); a = r ? { type: 'kill', cid: r.cid } : aiA(); }
        else {
          const z = E.fallbackZone(G, p);
          if (!E.movableTo(G, z).length) a = { type: 'skip' };
          else { const r = isAI(p) ? null : await ask(p, 'fallback', { z }); a = r ? { type: 'move', cid: r.cid, zone: z, cause: 'fallback' } : aiA(); }
        }
      } else if (eff === 'yellow') {
        if (!E.movableTo(G, E.CONTROL).length && !E.canMonitor(G, p)) a = { type: 'skip' };
        else { const r = isAI(p) ? null : await ask(p, 'yellow', { z: E.CONTROL }); a = r ? (r.mode === 'mon' ? { type: 'monitor', cid: r.cid } : { type: 'move', cid: r.cid, zone: E.CONTROL }) : aiA(); }
      } else {
        const z = E.ZONES.findIndex(x => x.k === eff);
        if (!E.movableTo(G, z).length) a = { type: 'skip' };
        else { const r = isAI(p) ? null : await ask(p, 'move', { z }); a = r ? { type: 'move', cid: r.cid, zone: z } : aiA(); }
      }
      const e = E.apply(G, p, a);
      pubEv(e);
      if (e.t === 'monitor') msgs[p].push({ seq, t: 'mon', cid: e.cid, isPlayer: e.isPlayer });
      flush();
      await sleep(e.t === 'kill' ? 3600 : e.t === 'monitor' ? 1100 : e.t === 'move' ? 800 : 500);
      if (e.t === 'kill' && !G.over && !G.players[p].out && E.CONFIG.escape) {
        let x;
        if (isAI(p)) x = E.aiEscape(G, p, e.zone);
        else { const r = await ask(p, 'chaos', { zone: e.zone }); x = r ? (r.cid === null ? null : { cid: r.cid, zone: r.zone }) : null; }
        if (x) { pubEv(E.doMove(G, p, x.cid, x.zone, 'chaos')); flush(); await sleep(900); }
      }
    }
    async function run() {
      // 等所有真人抽完身份（最多 90 秒）
      flush();
      await new Promise(r => { readyRes = r; checkReady(); setTimeout(r, 90000); });
      stage = 'play'; flush();
      await sleep(600);
      while (!G.over && !stopped) {
        await takeTurn(G.cur);
        if (G.over || stopped) break;
        const r0 = G.round;
        const evs = E.endTurn(G);
        if (G.round !== r0) ev({ t: 'round', round: G.round });
        evs.forEach(pubEv);
        flush();
        for (const e of evs) await sleep(e.t === 'midnight' ? 3000 : 1100);
      }
      if (stopped) return;
      ev({ t: 'end', w: G.winner, ids: G.players.map(p => p.ids) });
      stage = 'end'; flush();
    }
    function checkReady() { if (readyRes && seats.every((s, i) => s.kind === 'ai' || ready.has(i))) { readyRes(); readyRes = null; } }
    function setReady(i) { ready.add(i); checkReady(); }
    return { run, receive, setReady, resendPriv, stop() { stopped = true; }, get G() { return G; } };
  }

  // ---------- 单人：主机和显示端在同一页 ----------
  function local({ difficulty, players, onState, onPriv, pace }) {
    const seats = [{ kind: 'local', name: '你' }, ...Array.from({ length: players - 1 }, () => ({ kind: 'ai' }))];
    const host = createHost({ seats, difficulty, pace, publish: st => onState(st), sendPriv: (i, p) => i === 0 && onPriv(p) });
    host.run();
    return { seat: 0, send: it => host.receive(0, it), ready: () => host.setReady(0), stop: () => host.stop(), online: false };
  }

  // ---------- 联机能力 ----------
  let capsP = null;
  function caps() {
    if (!capsP) capsP = (async () => {
      if (!window.claude || !window.claude.use) return null;
      try {
        const [db, room, user] = await Promise.all([window.claude.use('db'), window.claude.use('room'), window.claude.use('user')]);
        if (!db || !room) return null;
        return { db, room, user, owner: user ? !!(await user.isOwner()) : false };
      } catch (e) { return null; }
    })();
    return capsP;
  }
  // 单个文档的串行写入：永远只写最新值
  function writer(ref) {
    let busy = false, next = null;
    async function pump() {
      busy = true;
      while (next) { const d = next; next = null; try { await ref.set(d); } catch (e) { console.warn('db write', e && e.code); await new Promise(r => setTimeout(r, 800)); } }
      busy = false;
    }
    return d => { next = d; if (!busy) pump(); };
  }
  const newCode = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ'[(Math.random() * 23) | 0]).join('');

  // 房主：建房、收人、开局
  async function hostRoom({ name, onLobby }) {
    const C = await caps();
    const code = newCode();
    const cid = clientId();
    const keys = await myKeys();
    const rm = await C.room.join('mp-' + code);
    const lobbyRef = C.db.doc('rooms/' + code);
    const writeLobby = writer(lobbyRef);
    let joiners = [], status = 'lobby', settings = { total: 4, diff: 'normal' }, seatsFinal = null, host = null, client = null;
    const peerMap = new Map();
    const pushLobby = () => {
      const lobby = { code, status, host: name, created: Date.now(), total: settings.total, diff: settings.diff, seats: seatsFinal ? seatsFinal.map(s => ({ kind: s.kind, name: s.name || '', cid: s.cid || '' })) : [{ kind: 'local', name, cid }, ...joiners.map(j => ({ kind: 'remote', name: j.name, cid: j.cid }))] };
      writeLobby(lobby); onLobby && onLobby(lobby);
    };
    rm.presence({ g: code, cid, name, host: true, pk: keys.pub });
    rm.onPeers(ch => {
      for (const p of ch.peers) {
        const pr = p.presence || {};
        if (p.isMe || pr.g !== code || !pr.cid || pr.host) continue;
        peerMap.set(pr.cid, pr);
      }
      for (const p of ch.left) { const pr = p.presence || {}; if (status === 'lobby' && pr.cid && !ch.peers.some(x => x.presence && x.presence.cid === pr.cid)) peerMap.delete(pr.cid); }
      if (status === 'lobby') {
        const nj = [...peerMap.values()].filter(pr => pr.join && typeof pr.name === 'string').slice(0, 7).map(pr => ({ cid: pr.cid, name: pr.name.slice(0, 12) || '朋友' }));
        if (JSON.stringify(nj) !== JSON.stringify(joiners)) { joiners = nj; pushLobby(); }
      } else if (host) {
        seatsFinal.forEach((s, i) => {
          if (s.kind !== 'remote') return;
          const pr = peerMap.get(s.cid);
          if (!pr || !pr.pk || typeof pr.pk.x !== 'string') return;
          if (!s.pk || s.pk.x !== pr.pk.x) { s.pk = pr.pk; host.resendPriv(i); }
          if (pr.ready) host.setReady(i);
          if (pr.i && pr.i.n) host.receive(i, pr.i);
        });
      }
    });
    pushLobby();
    return {
      code,
      setSettings(s) { Object.assign(settings, s); pushLobby(); },
      get joiners() { return joiners; },
      start({ onState, onPriv, pace }) {
        const humans = [{ kind: 'local', name, cid }, ...joiners.map(j => ({ kind: 'remote', name: j.name, cid: j.cid, pk: (peerMap.get(j.cid) || {}).pk }))];
        const total = Math.max(settings.total, humans.length, 2);
        seatsFinal = [...humans, ...Array.from({ length: total - humans.length }, () => ({ kind: 'ai' }))];
        status = 'playing'; pushLobby();
        const stateRef = writer(C.db.doc(`rooms/${code}/live/state`));
        const privW = {};
        host = createHost({
          seats: seatsFinal, difficulty: settings.diff, pace,
          publish: st => { onState(st); stateRef(st); },
          sendPriv: async (i, pv) => {
            if (i === 0) return onPriv(pv);
            const s = seatsFinal[i];
            if (!s.pk) return;
            try { const box = await seal(s.pk, pv); (privW[i] = privW[i] || writer(C.db.doc(`rooms/${code}/priv/s${i}`)))({ hp: keys.pub, to: s.pk.x, ...box }); } catch (e) { console.warn('seal', e); }
          },
        });
        host.run().then(() => { status = 'done'; pushLobby(); });
        client = { seat: 0, send: it => host.receive(0, it), ready: () => host.setReady(0), stop: () => { host.stop(); status = 'done'; pushLobby(); rm.leave(); }, online: true, code };
        return client;
      },
      close() { status = 'done'; pushLobby(); rm.leave(); },
    };
  }

  // 朋友：列出房间
  async function listRooms() {
    const C = await caps();
    const snap = await C.db.collection('rooms').where('status', 'in', ['lobby', 'playing']).get();
    const cid = clientId();
    return snap.docs.map(d => d.data()).filter(r => r && Date.now() - (r.created || 0) < 6 * 3600e3).map(r => ({ ...r, mine: Array.isArray(r.seats) && r.seats.some(s => s.cid === cid) }));
  }
  // 朋友：加入房间，收状态，发操作
  async function joinRoom({ code, name, onLobby, onStart }) {
    const C = await caps();
    const cid = clientId();
    const keys = await myKeys();
    const rm = await C.room.join('mp-' + code);
    let pres = { g: code, cid, name, join: true, pk: keys.pub, ready: false, i: null };
    rm.presence(pres);
    let seat = -1, started = false;
    const unsubs = [];
    const client = {
      seat: -1, online: true, code,
      send: it => rm.presence({ i: it }),
      ready: () => rm.presence({ ready: true }),
      stop: () => { unsubs.forEach(u => u()); rm.leave(); },
    };
    unsubs.push(C.db.doc('rooms/' + code).onSnapshot(s => {
      const lobby = s.data();
      if (!lobby) return;
      onLobby && onLobby(lobby);
      if (lobby.status !== 'lobby' && !started) {
        seat = (lobby.seats || []).findIndex(x => x.cid === cid);
        if (seat < 0) return;
        started = true; client.seat = seat;
        onStart(client, (onState, onPriv) => {
          unsubs.push(C.db.doc(`rooms/${code}/live/state`).onSnapshot(s2 => { const d = s2.data(); if (d) onState(d); }, () => {}));
          unsubs.push(C.db.doc(`rooms/${code}/priv/s${seat}`).onSnapshot(async s3 => {
            const d = s3.data(); if (!d || d.to !== keys.pub.x) return;
            try { onPriv(await open(d.hp, d)); } catch (e) { console.warn('open', e); }
          }, () => {}));
        });
      }
    }, () => {}));
    return client;
  }

  // ---------- 独立服务器模式（Zeabur）：WebSocket ----------
  const isServer = () => typeof window !== 'undefined' && !!window.MP_SERVER;
  let sock = null;
  function wsConn() {
    if (sock) return sock;
    const handlers = new Set(), queue = [];
    let ws = null, open = false, backoff = 500, name = '';
    const connect = () => {
      ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
      ws.onopen = () => { open = true; backoff = 500; ws.send(JSON.stringify({ t: 'hello', cid: clientId(), name })); while (queue.length) ws.send(queue.shift()); handlers.forEach(f => f({ t: 'open' })); };
      ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } handlers.forEach(f => f(m)); };
      ws.onclose = () => { open = false; handlers.forEach(f => f({ t: 'closed' })); setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 8000); };
    };
    connect();
    sock = {
      send(m) { const s = JSON.stringify(m); if (open) ws.send(s); else queue.push(s); },
      on(f) { handlers.add(f); return () => handlers.delete(f); },
      setName(n) { name = n; },
    };
    return sock;
  }
  function wsWatch(code, { onLobby, onStart }) {
    const S = wsConn();
    let started = false, stateCb = null, privCb = null, lastSt = null, lastPv = null;
    const client = {
      seat: -1, online: true, code, server: true,
      send: it => S.send({ t: 'intent', it }), ready: () => S.send({ t: 'ready' }),
      stop: () => { off(); S.send({ t: 'leave' }); },
    };
    const off = S.on(m => {
      if (m.t === 'lobby' && m.lobby.code === code) {
        onLobby && onLobby(m.lobby);
        if (m.lobby.status !== 'lobby' && !started) {
          const seat = (m.lobby.seats || []).findIndex(x => x.cid === clientId());
          if (seat < 0) return;
          started = true; client.seat = seat;
          onStart(client, (os, op) => { stateCb = os; privCb = op; if (lastSt) os(lastSt); if (lastPv) op(lastPv); });
        }
      } else if (m.t === 'state') { lastSt = m.st; stateCb && stateCb(m.st); }
      else if (m.t === 'priv') { lastPv = m.p; privCb && privCb(m.p); }
    });
    return client;
  }
  async function wsHostRoom({ name, onLobby }) {
    const S = wsConn(); S.setName(name);
    const code = await new Promise((res, rej) => {
      const off = S.on(m => { if (m.t === 'lobby' && m.lobby.status === 'lobby' && m.lobby.seats[0] && m.lobby.seats[0].cid === clientId()) { off(); res(m.lobby.code); } });
      S.send({ t: 'create', name });
      setTimeout(() => { off(); rej(new Error('timeout')); }, 10000);
    });
    let pend = null, client = null;
    const watch = wsWatch(code, { onLobby, onStart: (c, sub) => { client = c; if (pend) sub(pend.onState, pend.onPriv); else pend = { sub }; } });
    return {
      code,
      setSettings(s) { S.send({ t: 'settings', total: s.total, diff: s.diff }); },
      start({ onState, onPriv }) {
        if (pend && pend.sub) pend.sub(onState, onPriv); else pend = { onState, onPriv };
        S.send({ t: 'start' });
        return { seat: 0, online: true, code, server: true, send: it => S.send({ t: 'intent', it }), ready: () => S.send({ t: 'ready' }), stop: () => watch.stop() };
      },
      close() { watch.stop(); },
    };
  }
  function wsListRooms() {
    const S = wsConn();
    return new Promise((res, rej) => {
      const rid = Math.random().toString(36).slice(2);
      const off = S.on(m => { if (m.t === 'rooms' && m.rid === rid) { off(); res(m.rooms); } });
      S.send({ t: 'list', rid });
      setTimeout(() => { off(); rej(new Error('timeout')); }, 10000);
    });
  }
  async function wsJoinRoom({ code, name, onLobby, onStart, onError }) {
    const S = wsConn(); S.setName(name);
    const offErr = S.on(m => { if (m.t === 'error') onError && onError(m.msg); });
    const c = wsWatch(code, { onLobby, onStart });
    const stop = c.stop; c.stop = () => { offErr(); stop(); };
    S.send({ t: 'join', code, name });
    return c;
  }

  return {
    caps, local, clientId, P_COLORS, isServer, createHostForServer: createHost,
    hostRoom: o => (isServer() ? wsHostRoom(o) : hostRoom(o)),
    listRooms: () => (isServer() ? wsListRooms() : listRooms()),
    joinRoom: o => (isServer() ? wsJoinRoom(o) : joinRoom(o)),
  };
})();
