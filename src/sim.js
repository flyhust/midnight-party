const E = require('./engine.js');
function play(n, seed, diff) {
  const G = E.newGame({ players: n, human: -1, difficulty: diff, seed });
  let guard = 0, acc = 0, accOk = 0, playerDeaths = 0, byAcc = 0;
  const first = G.cur;
  while (!G.over && guard++ < 5000) {
    const p = G.cur;
    const pre = E.aiPreRoll(G, p);
    if (pre.type === 'accuse') {
      const e = E.apply(G, p, pre); acc++; if (e.correct) { accOk++; byAcc++; playerDeaths++; }
    } else {
      const f = E.roll(G);
      const a = E.aiOnFace(G, p, f);
      // 合法性检查
      if (a.type === 'kill' && !E.killTargets(G, p).includes(a.cid)) throw new Error('illegal kill');
      if (a.type === 'kill' && G.players[p].ids.includes(a.cid)) throw new Error('self kill');
      if (a.type === 'monitor' && !E.canMonitor(G, p)) throw new Error('illegal monitor');
      const e = E.apply(G, p, a);
      if (e.t === 'kill' && e.owner >= 0) playerDeaths++;
      if (e.t === 'kill' && !G.over && !G.players[p].out) { const x = E.aiEscape(G, p, e.zone); if (x) E.doMove(G, p, x.cid, x.zone, 'escape'); }
    }
    if (G.over) break;
    E.endTurn(G);
  }
  return { rounds: G.round, stuck: guard >= 5000 || G.winner === null, winnerFirst: G.winner === first, acc, accOk, byAcc, playerDeaths, kills: G.chars.filter(c => !c.alive).length };
}
for (const n of [2, 3, 4, 6, 8]) {
  const N = 1000; let R = 0, stuck = 0, wf = 0, acc = 0, ok = 0, ba = 0, pd = 0, k = 0, rs = [];
  for (let i = 0; i < N; i++) { const s = play(n, i * 7919 + 1, 'normal'); R += s.rounds; rs.push(s.rounds); stuck += s.stuck; wf += s.winnerFirst; acc += s.acc; ok += s.accOk; ba += s.byAcc; pd += s.playerDeaths; k += s.kills; }
  rs.sort((a, b) => a - b);
  console.log(`${n}人: 平均${(R / N).toFixed(1)}轮 中位${rs[N / 2]} 90%=${rs[N * 0.9]} 卡死${stuck} 先手胜${(wf / N * 100).toFixed(0)}%(期望${(100 / n).toFixed(0)}) 揭穿成功率${(ok / acc * 100).toFixed(0)}% 玩家死于揭穿${(ba / pd * 100).toFixed(0)}% 平均死亡${(k / N).toFixed(1)}`);
}
