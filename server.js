// 暗夜派对 · 游戏服务器：服务器当裁判，身份只发给本人
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { WebSocketServer } = require('ws');

global.Engine = require('./game/engine.js');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game/net.js'), 'utf8') + '\n;globalThis.Net = Net;');
const Net = globalThis.Net;

const PORT = process.env.PORT || 8080;
const INDEX = fs.readFileSync(path.join(__dirname, 'public/index.html'));
const server = http.createServer((req, res) => {
  if (req.url === '/healthz') { res.writeHead(200); return res.end('ok'); }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
  res.end(INDEX);
});
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });

const rooms = new Map();          // code -> room
const sockets = new Map();        // ws -> { cid, name }
const newCode = () => { let c; do { c = Array.from({ length: 4 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ'[(Math.random() * 23) | 0]).join(''); } while (rooms.has(c)); return c; };
const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
const clean = (s, n) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n) : '');

function socketsOf(room, cid) { const out = []; for (const [ws, c] of sockets) if (c.code === room.code && (!cid || c.cid === cid)) out.push(ws); return out; }
// 大厅信息：别人的 cid 绝不外发（cid 等同于身份凭证）
function lobbyFor(room, cid) {
  return { code: room.code, status: room.status, host: room.seats[0] ? room.seats[0].name : '', created: room.created, total: room.total, diff: room.diff,
    seats: (room.final || room.seats).map(s => ({ kind: s.kind || 'remote', name: s.name || '', cid: s.cid && s.cid === cid ? cid : '' })) };
}
function pushLobby(room) { for (const ws of socketsOf(room)) send(ws, { t: 'lobby', lobby: lobbyFor(room, sockets.get(ws).cid) }); room.active = Date.now(); }
function seatOf(room, cid) { return (room.final || room.seats).findIndex(s => s.cid === cid); }
function resync(ws, room) {
  const c = sockets.get(ws);
  send(ws, { t: 'lobby', lobby: lobbyFor(room, c.cid) });
  if (room.lastState) send(ws, { t: 'state', st: room.lastState });
  const i = seatOf(room, c.cid);
  if (i >= 0 && room.privs[i]) send(ws, { t: 'priv', p: room.privs[i] });
}
function startRoom(room) {
  const humans = room.seats.map(s => ({ kind: 'remote', name: s.name, cid: s.cid }));
  const total = Math.min(8, Math.max(2, room.total, humans.length));
  room.final = [...humans, ...Array.from({ length: total - humans.length }, () => ({ kind: 'ai' }))];
  room.status = 'playing'; room.privs = {};
  room.host = Net.createHostForServer({
    seats: room.final, difficulty: room.diff, pace: ms => ms,
    publish: st => { room.lastState = st; room.active = Date.now(); const msg = JSON.stringify({ t: 'state', st }); for (const ws of socketsOf(room)) if (ws.readyState === 1) ws.send(msg); },
    sendPriv: (i, p) => { room.privs[i] = p; const cid = room.final[i].cid; for (const ws of socketsOf(room, cid)) send(ws, { t: 'priv', p }); },
  });
  room.host.run().then(() => { room.status = 'done'; room.doneAt = Date.now(); pushLobby(room); });
  pushLobby(room);
}

wss.on('connection', ws => {
  sockets.set(ws, { cid: '', name: '', code: '' });
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
  let msgs = 0; const rl = setInterval(() => (msgs = 0), 1000);
  ws.on('close', () => {
    clearInterval(rl);
    const c = sockets.get(ws); sockets.delete(ws);
    const room = c && rooms.get(c.code);
    if (room && room.status === 'lobby' && !socketsOf(room, c.cid).length) {
      const i = room.seats.findIndex(s => s.cid === c.cid);
      if (i === 0) { room.status = 'done'; room.doneAt = Date.now(); pushLobby(room); }
      else if (i > 0) { room.seats.splice(i, 1); pushLobby(room); }
    }
  });
  ws.on('message', raw => {
    if (++msgs > 30) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const c = sockets.get(ws);
    if (m.t === 'hello') {
      c.cid = clean(m.cid, 40); c.name = clean(m.name, 12);
      for (const room of rooms.values()) if (room.status !== 'done' && seatOf(room, c.cid) >= 0) { c.code = room.code; resync(ws, room); break; }
      return;
    }
    if (!c.cid) return;
    const room = rooms.get(c.code);
    switch (m.t) {
      case 'list': {
        const list = [...rooms.values()].filter(r => r.status === 'lobby' || (r.status === 'playing' && seatOf(r, c.cid) >= 0)).map(r => ({ ...lobbyFor(r, c.cid), mine: seatOf(r, c.cid) >= 0 }));
        return send(ws, { t: 'rooms', rid: m.rid, rooms: list });
      }
      case 'create': {
        const code = newCode();
        const r = { code, status: 'lobby', created: Date.now(), active: Date.now(), total: 4, diff: 'normal', seats: [{ cid: c.cid, name: clean(m.name, 12) || '房主' }], privs: {} };
        rooms.set(code, r); c.code = code; pushLobby(r); return;
      }
      case 'join': {
        const r = rooms.get(clean(m.code, 8).toUpperCase());
        if (!r || r.status === 'done') return send(ws, { t: 'error', msg: '找不到这个房间，或者它已经结束了。' });
        c.code = r.code;
        if (r.status === 'lobby' && seatOf(r, c.cid) < 0) {
          if (r.seats.length >= 8) return send(ws, { t: 'error', msg: '房间已满（最多 8 人）。' });
          r.seats.push({ cid: c.cid, name: clean(m.name, 12) || '朋友' });
        } else if (r.status === 'lobby') r.seats[seatOf(r, c.cid)].name = clean(m.name, 12) || r.seats[seatOf(r, c.cid)].name;
        pushLobby(r); resync(ws, r); return;
      }
      case 'settings':
        if (room && room.status === 'lobby' && room.seats[0].cid === c.cid) {
          if (Number.isInteger(m.total)) room.total = Math.min(8, Math.max(2, m.total));
          if (['easy', 'normal', 'hard'].includes(m.diff)) room.diff = m.diff;
          pushLobby(room);
        }
        return;
      case 'start':
        if (room && room.status === 'lobby' && room.seats[0].cid === c.cid) startRoom(room);
        return;
      case 'ready': if (room && room.host) { const i = seatOf(room, c.cid); if (i >= 0) room.host.setReady(i); } return;
      case 'intent': if (room && room.host) { const i = seatOf(room, c.cid); if (i >= 0) room.host.receive(i, m.it); } return;
      case 'leave':
        if (room && room.status === 'lobby') {
          const i = room.seats.findIndex(s => s.cid === c.cid);
          if (i === 0) { room.status = 'done'; room.doneAt = Date.now(); }
          else if (i > 0) room.seats.splice(i, 1);
          pushLobby(room);
        }
        c.code = ''; return;
    }
  });
});
// 心跳 + 清理
setInterval(() => { for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); } }, 25000);
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) {
    const idle = now - (r.active || r.created);
    if (socketsOf(r).length) r.seen = now;
    if ((r.status === 'done' && now - (r.doneAt || 0) > 30 * 60e3) || (r.status === 'lobby' && idle > 2 * 3600e3) || (r.status === 'playing' && now - (r.seen || r.created) > 20 * 60e3)) {
      if (r.host) r.host.stop();
      rooms.delete(code);
    }
  }
}, 60e3);
server.listen(PORT, () => console.log('暗夜派对 listening on ' + PORT));
