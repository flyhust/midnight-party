// ===== 暗夜派对 · 界面（单人与联机共用：只负责显示和收集玩家操作，裁判在 Net 的主机里） =====
(() => {
  const E = Engine, Z = E.ZONES;
  const app = document.getElementById('app');
  const ZC = ['var(--z-red)', 'var(--z-blue)', 'var(--z-green)', 'var(--z-purple)', 'var(--z-yellow)'];
  const FACE = {
    red: { lb: '红', name: '红色', txt: '把一个角色移进 红·舞厅' },
    blue: { lb: '蓝', name: '蓝色', txt: '把一个角色移进 蓝·泳池' },
    green: { lb: '绿', name: '绿色', txt: '把一个角色移进 绿·温室' },
    purple: { lb: '紫', name: '紫色', txt: '把一个角色移进 紫·书房' },
    yellow: { lb: '黄', name: '黄色', txt: '移一个角色进控制室，或在控制室监控' },
    black: { lb: '黑', name: '黑色', txt: '杀死你房间里的一个人' },
  };
  const PHASE_TXT = { act: '正在决定：掷骰还是揭穿', move: '正在挑选要移动的人', yellow: '正在控制室做选择', kill: '正在挑选下手目标……', fallback: '身边没人，正在拉人进房间', chaos: '正在考虑要不要制造混乱' };
  const ICON = {
    knife: '<svg viewBox="0 0 24 24"><path d="M3 21 L13 11 L15 13 L5 23Z" fill="#c9a36a"/><path d="M13 11 L21 2 Q23 6 15 13Z" fill="#e8eef2"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M1 12 Q12 2 23 12 Q12 22 1 12Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
  };
  const ICON_DIE = '<svg viewBox="0 0 24 24" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/><circle cx="16" cy="16" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>';
  const GLYPH = [
    '<svg viewBox="0 0 60 60" class="glyph"><path d="M30 0V12M14 18H46M10 18Q30 40 50 18M18 26V36M30 30V44M42 26V36" stroke="#fff" stroke-width="2.5" fill="none"/><circle cx="18" cy="38" r="3" fill="#fff"/><circle cx="30" cy="46" r="3" fill="#fff"/><circle cx="42" cy="38" r="3" fill="#fff"/></svg>',
    '<svg viewBox="0 0 60 60" class="glyph"><path d="M2 20Q10 12 18 20T34 20T50 20T66 20M2 34Q10 26 18 34T34 34T50 34T66 34M2 48Q10 40 18 48T34 48T50 48T66 48" stroke="#fff" stroke-width="3" fill="none"/></svg>',
    '<svg viewBox="0 0 60 60" class="glyph"><path d="M30 58C30 30 40 14 56 4C40 6 22 18 30 58ZM30 58C28 40 18 30 4 26C10 40 18 50 30 58Z" fill="#fff"/></svg>',
    '<svg viewBox="0 0 60 60" class="glyph"><path d="M6 58V20H54V58M14 58V30H46V58M2 20H58V14H2Z" stroke="#fff" stroke-width="2.5" fill="none"/><path d="M24 56Q22 46 30 38Q30 46 36 48Q38 54 34 56Z" fill="#fff"/></svg>',
    '<svg viewBox="0 0 60 60" class="glyph"><rect x="2" y="6" width="25" height="18" stroke="#fff" stroke-width="2.5" fill="none"/><rect x="33" y="6" width="25" height="18" stroke="#fff" stroke-width="2.5" fill="none"/><rect x="2" y="30" width="25" height="18" stroke="#fff" stroke-width="2.5" fill="none"/><rect x="33" y="30" width="25" height="18" stroke="#fff" stroke-width="2.5" fill="none"/><path d="M20 56H40" stroke="#fff" stroke-width="3"/></svg>',
  ];

  // 支持作者（Buy Me a Coffee）：填上链接就会出现在右上角；留空则不显示
  const SUPPORT_URL = '';
  // 教学视频：服务器上有 public/media/howto.mp4 才显示按钮
  let HAS_VIDEO = false;
  const videoReady = window.MP_SERVER ? fetch('media/howto.mp4', { method: 'HEAD' }).then(r => (HAS_VIDEO = r.ok)).catch(() => false) : Promise.resolve(false);
  const supportBtn = cls => SUPPORT_URL ? `<a class="iconbtn support ${cls || ''}" href="${SUPPORT_URL}" target="_blank" rel="noopener" title="喜欢这个游戏？请作者喝杯咖啡">☕ 支持作者</a>` : '';

  // G = 本机看到的局面（公开信息 + 自己的身份），priv = 自己的私密信息
  let G = null, ME = 0, priv = null, conn = null, session = 0;
  let fast = false, catchup = false, tags = {}, tokEls = {}, ui = {}, selecting = null;
  let endIds = null, latest = null, lastSeq = -1, queue = [], playing = false, shownMsgs = new Set(), privQ = [], promptN = 0, drawn = false, inGame = false, resultShown = false;
  const settings = { players: 4, diff: 'normal', name: '' };
  try { Object.assign(settings, JSON.parse(localStorage.getItem('mp_settings') || '{}')); } catch (e) {}
  const motionOn = () => settings.motion !== false;
  const applyMotion = () => { document.documentElement.classList.toggle('no-motion', !motionOn()); Scene.setMotion(motionOn()); };
  const saveSettings = () => { try { localStorage.setItem('mp_settings', JSON.stringify(settings)); } catch (e) {} };

  // ---------- 工具 ----------
  const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const sp = ms => (fast || catchup ? ms * 0.3 : ms * 0.62);
  const sleep = ms => new Promise(r => setTimeout(r, sp(ms)));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const nm = q => (q === ME ? '你' : esc(G.players[q].name));
  const pn = q => (q < 0 ? '' : `<b style="color:${G.players[q].color}">${nm(q)}</b>`);
  const mine = c => !!(priv && priv.ids.includes(c));
  const cn = c => `<b>${G.chars[c].name}</b>${mine(c) ? '<small>（你）</small>' : ''}`;
  const zn = z => `<b style="color:${ZC[z]}">${Z[z].c}·${Z[z].n}</b>`;
  const sfx = n => SFX.play(n);
  const midR = () => (latest && latest.snap.mid) || E.CONFIG.midnightRound;
  const dawnR = () => (latest && latest.snap.dawn) || E.CONFIG.maxRound;
  const isMid = () => G.round >= midR();
  const effFace = f => (f === 'yellow' && isMid() ? 'black' : f);
  const tokenMax = () => (latest && latest.snap.tokens) || E.CONFIG.tokens;
  document.addEventListener('pointerover', e => { const b = e.target.closest && e.target.closest('.btn,.optcard,.chip,.iconbtn'); if (b && !b.disabled && b !== ui.lastHover) { ui.lastHover = b; sfx('uiHover'); } });

  function toast(html, color) {
    const box = document.getElementById('toasts');
    const t = h(`<div class="toast" style="--tc:${color || 'var(--gold)'}">${html}</div>`);
    box.prepend(t);
    while (box.children.length > 4) box.lastElementChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, fast ? 2200 : 3600);
  }
  async function banner(text, ms = 900) {
    const b = document.getElementById('banner');
    b.textContent = text; b.classList.add('show');
    await sleep(ms); b.classList.remove('show'); await sleep(200);
  }

  // ---------- 弹窗 ----------
  function modal({ title = '', body = '', buttons = [], mount, dismiss = null, wide = false, prompt = false }) {
    return new Promise(res => {
      sfx('modalOpen');
      const ov = h(`<div class="overlay ${prompt ? 'is-prompt' : ''}"><div class="modal" role="dialog" aria-modal="true" ${wide ? 'style="width:min(560px,100%)"' : ''}>${title ? `<h2>${title}</h2>` : ''}<div class="body">${body}</div><div class="btns"></div></div></div>`);
      const close = v => { if (!ov.isConnected) return; sfx(v === dismiss ? 'uiCancel' : 'modalClose'); ov.remove(); document.removeEventListener('keydown', onKey); res(v); };
      ov._close = close;
      const onKey = e => { if (e.key === 'Escape' && dismiss !== null) close(dismiss); };
      document.addEventListener('keydown', onKey);
      if (dismiss !== null) ov.addEventListener('click', e => { if (e.target === ov) close(dismiss); });
      const bx = ov.querySelector('.btns');
      buttons.forEach(b => {
        const el = h(`<button class="btn ${b.kind || ''}" ${b.disabled ? 'disabled' : ''}>${b.label}</button>`);
        el.onclick = () => { sfx(b.value === dismiss ? 'uiCancel' : 'uiClick'); close(b.value); };
        bx.append(el);
      });
      if (!buttons.length) bx.remove();
      document.body.append(ov);
      if (mount) mount(ov.querySelector('.modal'), close);
      const f = ov.querySelector('.btn.primary, .btn'); f && f.focus();
    });
  }
  const idFront = (c, stamp = '', kind = '') => `<div class="face front idcard"><div class="pic">${Art.portrait(c)}</div><div class="nm">${E.CHARS[c][0]}</div><div class="alias">${E.CHARS[c][2]}</div><div class="bio">${E.CHARS[c][1]}</div>${stamp ? `<div class="stamp ${kind}">${stamp}</div>` : ''}</div>`;
  const flipCard = (c, stamp, kind) => `<div class="flip"><div class="inner"><div class="face back">${Art.cardBack()}</div>${idFront(c, stamp, kind)}</div></div>`;
  function reveal({ cid, stamp, kind, caption, auto = 0, sound, spotlight = false, delay = 350 }) {
    return new Promise(res => {
      Music.duck(true);
      const ov = h(`<div class="overlay">${spotlight ? '<div class="spot"></div>' : ''}<div class="reveal">${flipCard(cid, stamp, kind)}<div class="cap">${caption || ''}</div><button class="btn primary">继续</button></div></div>`);
      const fl = ov.querySelector('.flip'), st = ov.querySelector('.stamp'), btn = ov.querySelector('button');
      let done = false;
      const close = () => { if (done) return; done = true; sfx('modalClose'); Music.duck(false); ov.remove(); res(); };
      btn.onclick = () => { sfx('uiClick'); close(); };
      ov.addEventListener('click', e => { if (e.target === ov) close(); });
      document.body.append(ov);
      btn.focus();
      setTimeout(() => { fl.classList.add('flipped'); sfx('cardFlip'); }, sp(delay));
      setTimeout(() => { if (st) st.classList.add('show'); if (sound) sfx(sound); }, sp(delay + 650));
      if (auto) setTimeout(close, sp(delay + 650 + auto));
    });
  }

  // ---------- 标题 ----------
  function stopSession() { document.querySelectorAll('.cast-pop').forEach(p => p.remove()); session++; if (conn) { try { conn.stop(); } catch (e) {} } conn = null; inGame = false; document.querySelectorAll('.overlay').forEach(o => o.remove()); }
  function showTitle() { Scene.setMode('full');
    stopSession();
    app.innerHTML = '';
    const s = h(`<section class="screen" id="title">${supportBtn('support-title')}<div class="marquee">
      <div class="eyebrow">一九二七 · 某个下雨的夜晚</div>
      <div class="neon" style="margin-top:14px">Midnight Party</div>
      <div class="title-cn">暗夜派对</div>
      <div class="deco-rule" style="margin:4px auto 18px;max-width:240px"></div>
      <p class="tagline">二十位宾客，几张假面。你是其中一人，你的对手也藏在人群里。在天亮前，成为最后一个活着的玩家。</p>
      <div class="cast-flow" aria-label="今晚的二十位宾客">${[[0, 3, 6, 10, 16, 11, 2, 13, 17, 8], [14, 5, 19, 1, 12, 9, 15, 4, 18, 7]].map((row, r) => `<div class="cast-row ${r ? 'rev' : ''}"><div class="cast-track">${[...row, ...row].map((c, i) => `<div class="mini" data-c="${c}" tabindex="0" style="--d:${((i * 0.37) % 3).toFixed(2)}s"><div class="mini-in">${Art.portrait(c)}</div><span>${E.CHARS[c][0]}</span></div>`).join('')}</div></div>`).join('')}</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn primary" id="solo" style="padding:14px 26px;font-size:16px">单人对战 AI</button><button class="btn" id="online" style="padding:14px 26px;font-size:16px">和朋友联机</button></div>
      <button class="btn ghost howto-btn" id="howto" hidden>▶ 三分钟看懂怎么玩</button>
      <div class="hint" style="margin-top:14px">建议开启声音</div></div></section>`);
    app.append(s);
    wireCast(s.querySelector('.cast-flow'));
    const unlock = () => { SFX.init(); Music.init(); Music.setMode('party'); Music.start(); };
    s.querySelector('#solo').onclick = () => { unlock(); sfx('uiClick'); showSetup(); };
    s.querySelector('#online').onclick = () => { unlock(); sfx('uiClick'); showOnline(); };
    const hb = s.querySelector('#howto');
    hb.onclick = () => { unlock(); sfx('uiClick'); showVideo(); };
    videoReady.then(ok => { if (ok) hb.hidden = false; });
  }

  const WHY = ["女伯爵请他来掌勺晚宴，菜单上有一道没人敢点的汤。", "女伯爵的私人医生，今晚他的药箱里少了一瓶药。", "受邀来唱压轴曲，她打算在今晚宣布一个秘密。", "来表演余兴节目，他的道具箱里刚好藏得下一个人。", "在这栋宅子里服务了三十年，今晚是他最后一班。", "来朗诵献给女伯爵的新诗，诗里藏着一个名字。", "来替孤儿院募捐，却在席上认出了一张旧面孔。", "自称来找灵感，其实是来核对他小说里的结局。", "本该在温室照看兰花，今晚却穿上了借来的礼服。", "混进来追查一桩旧丑闻，线人约他午夜见面。", "这是她的派对，也是她宣读遗嘱的夜晚。", "刚靠岸就收到请柬，他欠女伯爵一条船的人情。", "来为女伯爵画肖像，画布上却多出了一个人影。", "跟着乐队一起来，她要找出寄匿名信的人。", "今晚负责吧台，他知道谁在酒里加了东西。", "以老朋友的身份赴宴，口袋里有一封没拆的电报。", "被请来逗大家笑，可他自己一整晚都没笑过。", "来谈一笔生意，在场一半的人都在等他还钱。", "弹了一整晚的爵士，他只在等一首点歌。", "被雇来当保镖，却没人告诉他要保护谁。"];
  // 封面宾客档案：指着某人时两排都停下，翻出他的档案卡
  function wireCast(flow) {
    if (!flow) return;
    let pop = null, cur = null;
    const hide = () => { flow.classList.remove('paused'); if (pop) { const p = pop; p.classList.add('out'); setTimeout(() => p.remove(), 180); pop = null; } cur = null; };
    const show = el => {
      if (cur === el) return;
      hide(); cur = el; flow.classList.add('paused');
      const c = +el.dataset.c;
      pop = h(`<div class="cast-pop" role="tooltip"><div class="cp-pic">${Art.portrait(c)}</div><div class="cp-txt"><div class="eyebrow">宾客档案 · No.${String(c + 1).padStart(2, '0')}</div><div class="cp-nm">${E.CHARS[c][0]}<span>（${E.CHARS[c][2]}）</span></div><div class="cp-bio">${E.CHARS[c][1]}</div><div class="cp-hint">${WHY[c]}</div></div></div>`);
      document.body.append(pop);
      const r = el.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
      let x = r.left + r.width / 2 - pw / 2, y = r.top - ph - 12;
      if (y < 8) y = r.bottom + 12;
      x = Math.max(8, Math.min(innerWidth - pw - 8, x));
      pop.style.left = x + 'px'; pop.style.top = y + 'px';
      pop.style.setProperty('--ax', (r.left + r.width / 2 - x) + 'px');
      pop.classList.toggle('below', y > r.top);
      sfx('cardFlip');
    };
    flow.querySelectorAll('.mini').forEach(el => {
      el.addEventListener('mouseenter', () => show(el));
      el.addEventListener('focus', () => show(el));
      el.addEventListener('click', () => (cur === el ? hide() : show(el)));
    });
    flow.addEventListener('mouseleave', hide);
    flow.addEventListener('focusout', e => { if (!flow.contains(e.relatedTarget)) hide(); });
    document.addEventListener('pointerdown', e => { if (cur && !flow.contains(e.target)) hide(); });
  }

  // ---------- 单人设置 ----------
  function soundChips() {
    return `<div class="field"><label>声音与画面</label><div class="chips"><button class="chip" id="snd" aria-pressed="${SFX.on}">音效 ${SFX.on ? '开' : '关'}</button><button class="chip" id="mus" aria-pressed="${Music.on}">背景音乐 ${Music.on ? '开' : '关'}</button><button class="chip" id="mot" aria-pressed="${motionOn()}">动态效果 ${motionOn() ? '开' : '关'}</button></div></div>`;
  }
  function wireSound(s) {
    s.querySelector('#snd').onclick = e => { const on = SFX.toggle(); e.target.textContent = `音效 ${on ? '开' : '关'}`; e.target.setAttribute('aria-pressed', on); sfx('uiClick'); };
    s.querySelector('#mus').onclick = e => { const on = Music.toggle(); e.target.textContent = `背景音乐 ${on ? '开' : '关'}`; e.target.setAttribute('aria-pressed', on); sfx('uiClick'); };
    s.querySelector('#mot').onclick = e => { settings.motion = !motionOn(); saveSettings(); applyMotion(); e.target.textContent = `动态效果 ${motionOn() ? '开' : '关'}`; e.target.setAttribute('aria-pressed', motionOn()); sfx('uiClick'); };
  }
  function countChips(id, val, min = 2) { return `<div class="chips" id="${id}">${[2, 3, 4, 5, 6, 7, 8].map(n => `<button class="chip" aria-pressed="${n === val}" data-n="${n}" ${n < min ? 'disabled' : ''}>${n}</button>`).join('')}</div>`; }
  function diffChips(val) { return `<div class="chips" id="df">${[['easy', '新手'], ['normal', '普通'], ['hard', '老狐狸']].map(([k, l]) => `<button class="chip" aria-pressed="${k === val}" data-d="${k}">${l}</button>`).join('')}</div>`; }
  function wireChips(s, sel, attr, cb) { s.querySelectorAll(sel + ' .chip').forEach(b => (b.onclick = () => { if (b.disabled) return; sfx('uiClick'); s.querySelectorAll(sel + ' .chip').forEach(x => x.setAttribute('aria-pressed', x === b)); cb(b.dataset[attr]); })); }
  function showSetup() { Scene.setMode('full');
    stopSession();
    app.innerHTML = '';
    const s = h(`<section class="screen" id="setup"><div class="setup-card">
      <div><div class="eyebrow">单人模式</div><h1 class="h-title" style="margin:6px 0 0;font-size:26px">今晚的派对</h1></div>
      <div class="field"><label>玩家人数（含你）</label>${countChips('np', settings.players)}<div class="hint" id="nphint"></div></div>
      <div class="field"><label>对手难度</label>${diffChips(settings.diff)}<div class="hint">老狐狸会更早动手揭穿，也更少犯错。</div></div>
      ${soundChips()}
      <div class="deco-rule"></div>
      <div class="setup-actions"><button class="btn ghost" id="rules">看规则</button><span style="display:flex;gap:10px"><button class="btn ghost" id="back">返回</button><button class="btn primary" id="go">抽取身份</button></span></div>
    </div></section>`);
    app.append(s);
    const hint = () => (s.querySelector('#nphint').textContent = settings.players <= 3 ? `你和 ${settings.players - 1} 个 AI · 人少，每人抽 2 个身份，两个都死了才出局。` : `你和 ${settings.players - 1} 个 AI · 每人 1 个身份，另外 ${20 - settings.players} 位宾客是 NPC。`);
    hint();
    wireChips(s, '#np', 'n', v => { settings.players = +v; hint(); });
    wireChips(s, '#df', 'd', v => (settings.diff = v));
    wireSound(s);
    s.querySelector('#rules').onclick = () => { sfx('uiClick'); showRules(); };
    s.querySelector('#back').onclick = () => { sfx('uiCancel'); showTitle(); };
    s.querySelector('#go').onclick = () => {
      sfx('uiClick'); saveSettings();
      beginSession();
      const my = session;
      conn = Net.local({ difficulty: settings.diff, players: settings.players, pace: ms => (fast ? ms * 0.35 : ms), onState: st => my === session && onState(st), onPriv: p => my === session && onPriv(p) });
      ME = 0;
    };
  }

  // ---------- 联机大厅 ----------
  async function showOnline() { Scene.setMode('full');
    stopSession();
    app.innerHTML = '';
    const s = h(`<section class="screen" id="setup"><div class="setup-card" id="oc">
      <div><div class="eyebrow">联机</div><h1 class="h-title" style="margin:6px 0 0;font-size:26px">和朋友一起</h1></div>
      <div class="hint">正在连接派对大厅……</div></div></section>`);
    app.append(s);
    const card = s.querySelector('#oc');
    if (Net.isServer()) return serverOnline(card);
    const C = await Net.caps();
    if (!C) {
      card.innerHTML = `<div><div class="eyebrow">联机</div><h1 class="h-title" style="margin:6px 0 0;font-size:26px">这里连不上大厅</h1></div>
        <p>联机需要在 Claude 里打开这个游戏，并且已经登录。</p>
        <ul class="hint" style="margin:0;padding-left:18px;display:grid;gap:6px"><li>房主：在页面右上角的分享菜单里，<b>用邮箱邀请</b>朋友。</li><li>朋友：从邀请邮件打开，登录 Claude 账号后再点“和朋友联机”。</li><li>用公开链接打开的人进不了联机房间。</li></ul>
        <div class="setup-actions"><button class="btn ghost" id="back">返回</button><button class="btn primary" id="solo">先玩单人模式</button></div>`;
      card.querySelector('#back').onclick = () => { sfx('uiCancel'); showTitle(); };
      card.querySelector('#solo').onclick = () => { sfx('uiClick'); showSetup(); };
      return;
    }
    if (!settings.name && C.user) { try { const me = await C.user.me(); settings.name = (me && me.name || '').split(/\s+/)[0].slice(0, 10); } catch (e) {} }
    const nameField = `<div class="field"><label for="nick">你的昵称</label><input id="nick" class="input" maxlength="10" value="${esc(settings.name || '')}" placeholder="例如：阿明"></div>`;
    if (C.owner) {
      card.innerHTML = `<div><div class="eyebrow">联机 · 你是房主</div><h1 class="h-title" style="margin:6px 0 0;font-size:26px">开一个房间</h1></div>
        ${nameField}
        <div class="hint">你的浏览器会担任裁判：负责发牌和判定。游戏进行中请不要关掉这个页面。</div>
        ${soundChips()}
        <div class="setup-actions"><button class="btn ghost" id="back">返回</button><button class="btn primary" id="create">创建房间</button></div>`;
      wireSound(card);
      card.querySelector('#back').onclick = () => { sfx('uiCancel'); showTitle(); };
      card.querySelector('#create').onclick = async () => {
        settings.name = (card.querySelector('#nick').value || '房主').trim().slice(0, 10); saveSettings();
        sfx('uiClick');
        card.querySelector('#create').disabled = true;
        try { await hostLobby(); } catch (e) { console.error(e); toast('创建房间失败，请稍后再试。', 'var(--danger)'); card.querySelector('#create').disabled = false; }
      };
    } else {
      card.innerHTML = `<div><div class="eyebrow">联机</div><h1 class="h-title" style="margin:6px 0 0;font-size:26px">加入朋友的房间</h1></div>
        ${nameField}
        <div class="field"><label>开放中的房间</label><div id="rooms" class="roomlist"><div class="hint">查找中……</div></div></div>
        <div class="setup-actions"><button class="btn ghost" id="back">返回</button><button class="btn" id="refresh">刷新</button></div>`;
      card.querySelector('#back').onclick = () => { sfx('uiCancel'); showTitle(); };
      const load = async () => {
        const box = card.querySelector('#rooms');
        let rooms = [];
        try { rooms = await Net.listRooms(); } catch (e) { box.innerHTML = '<div class="hint">读取房间失败，点“刷新”再试一次。</div>'; return; }
        rooms.sort((a, b) => b.created - a.created);
        box.innerHTML = rooms.length ? rooms.map(r => `<div class="roomrow"><div><b>${esc(r.host || '房主')} 的房间</b><div class="hint">房号 ${esc(r.code)} · ${r.status === 'lobby' ? `等待中 · ${(r.seats || []).length} 人已加入` : r.mine ? '进行中 · 你在这局里' : '进行中'}</div></div>${r.status === 'lobby' || r.mine ? `<button class="btn ${r.status === 'lobby' ? 'primary' : ''} sm" data-code="${esc(r.code)}">${r.status === 'lobby' ? '加入' : '回到游戏'}</button>` : ''}</div>`).join('') : '<div class="hint">现在没有开放的房间。请房主先创建房间，然后点“刷新”。</div>';
        box.querySelectorAll('button[data-code]').forEach(b => (b.onclick = () => {
          settings.name = (card.querySelector('#nick').value || '朋友').trim().slice(0, 10); saveSettings();
          sfx('uiClick'); guestLobby(b.dataset.code);
        }));
      };
      card.querySelector('#refresh').onclick = () => { sfx('uiClick'); load(); };
      load();
    }
  }
  function serverOnline(card) {
    card.innerHTML = `<div><div class="eyebrow">联机</div><h1 class="h-title" style="margin:6px 0 0;font-size:26px">和朋友一起</h1></div>
      <div class="field"><label for="nick">你的昵称</label><input id="nick" class="input" maxlength="10" value="${esc(settings.name || '')}" placeholder="例如：阿明"></div>
      <div class="optcards" style="margin:0">
        <button class="optcard" id="create"><b>开一个房间</b><span>你来选人数和难度，再把房号发给朋友</span></button>
        <div class="optcard" style="cursor:default"><b>输入房号加入</b><div style="display:flex;gap:6px;margin-top:4px"><input id="code" class="input" maxlength="4" placeholder="ABCD" style="text-transform:uppercase;letter-spacing:.2em"><button class="btn sm primary" id="joincode">加入</button></div></div>
      </div>
      <div class="field"><label>开放中的房间</label><div id="rooms" class="roomlist"><div class="hint">查找中……</div></div></div>
      ${soundChips()}
      <div class="setup-actions"><button class="btn ghost" id="back">返回</button><button class="btn" id="refresh">刷新</button></div>`;
    wireSound(card);
    const nick = () => { settings.name = (card.querySelector('#nick').value || '').trim().slice(0, 10); saveSettings(); if (!settings.name) { toast('先填一个昵称吧。', 'var(--danger)'); card.querySelector('#nick').focus(); return false; } return true; };
    card.querySelector('#back').onclick = () => { sfx('uiCancel'); showTitle(); };
    card.querySelector('#create').onclick = async () => { if (!nick()) return; sfx('uiClick'); card.querySelector('#create').disabled = true; try { await hostLobby(); } catch (e) { toast('连不上服务器，请稍后再试。', 'var(--danger)'); card.querySelector('#create').disabled = false; } };
    const joinCode = () => { const c = (card.querySelector('#code').value || '').trim().toUpperCase(); if (!/^[A-Z]{4}$/.test(c)) { sfx('uiDisabled'); toast('房号是 4 个英文字母。', 'var(--danger)'); return; } if (!nick()) return; sfx('uiClick'); guestLobby(c); };
    card.querySelector('#joincode').onclick = joinCode;
    card.querySelector('#code').onkeydown = e => { if (e.key === 'Enter') joinCode(); };
    const load = async () => {
      const box = card.querySelector('#rooms');
      let rooms = [];
      try { rooms = await Net.listRooms(); } catch (e) { box.innerHTML = '<div class="hint">连不上服务器，点“刷新”再试一次。</div>'; return; }
      rooms.sort((a, b) => b.created - a.created);
      box.innerHTML = rooms.length ? rooms.map(r => `<div class="roomrow"><div><b>${esc(r.host || '房主')} 的房间</b><div class="hint">房号 ${esc(r.code)} · ${r.status === 'lobby' ? `等待中 · ${(r.seats || []).length} 人已加入` : '进行中 · 你在这局里'}</div></div><button class="btn ${r.status === 'lobby' ? 'primary' : ''} sm" data-code="${esc(r.code)}">${r.status === 'lobby' ? '加入' : '回到游戏'}</button></div>`).join('') : '<div class="hint">现在没有开放的房间。你可以自己开一个。</div>';
      box.querySelectorAll('button[data-code]').forEach(b => (b.onclick = () => { if (!nick()) return; sfx('uiClick'); guestLobby(b.dataset.code); }));
    };
    card.querySelector('#refresh').onclick = () => { sfx('uiClick'); load(); };
    load();
  }
  async function hostLobby() {
    beginSession(true);
    const my = session;
    const total = Math.max(2, settings.players || 4);
    app.innerHTML = '';
    const s = h(`<section class="screen" id="setup"><div class="setup-card">
      <div><div class="eyebrow">房间已开</div><h1 class="h-title" style="margin:6px 0 0;font-size:26px">房号 <span id="code" style="color:var(--gold-hi);letter-spacing:.2em">····</span></h1></div>
      ${Net.isServer() ? `<div class="hint">把网址发给朋友，让他们点“和朋友联机”，输入房号加入。</div><div class="roomrow"><code style="min-width:0;overflow-wrap:anywhere">${esc(location.origin)}</code><button class="btn sm" id="copy">复制邀请</button></div>` : '<div class="hint">让朋友打开这个游戏 → 点“和朋友联机” → 加入你的房间。朋友需要先被你用邮箱邀请（右上角分享菜单）。</div>'}
      <div class="field"><label>已加入</label><div id="members" class="roomlist"></div></div>
      <div class="field"><label>总人数（不够的位置由 AI 补上）</label>${countChips('np', total)}<div class="hint" id="fill"></div></div>
      <div class="field"><label>AI 难度</label>${diffChips(settings.diff)}</div>
      <div class="setup-actions"><button class="btn ghost" id="back">解散房间</button><button class="btn primary" id="start">开始游戏</button></div>
    </div></section>`);
    app.append(s);
    let room;
    let cur = { total, diff: settings.diff };
    const draw = lobby => {
      if (my !== session) return;
      const seats = lobby.seats || [];
      s.querySelector('#code').textContent = lobby.code;
      s.querySelector('#members').innerHTML = seats.map((x, i) => `<div class="roomrow"><div><i class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${Net.P_COLORS[i]}"></i> <b>${esc(x.name)}</b>${i === 0 ? ' <span class="hint">（你，房主）</span>' : ''}</div></div>`).join('') + (seats.length < 2 ? '<div class="hint">等朋友加入……</div>' : '');
      const min = seats.length;
      s.querySelectorAll('#np .chip').forEach(b => { b.disabled = +b.dataset.n < Math.max(2, min); });
      if (cur.total < min) { cur.total = min; s.querySelectorAll('#np .chip').forEach(b => b.setAttribute('aria-pressed', +b.dataset.n === cur.total)); room && room.setSettings(cur); }
      s.querySelector('#fill').textContent = `${min} 位真人 + ${Math.max(0, cur.total - min)} 个 AI` + (cur.total <= 3 ? ' · 人少，每人 2 个身份' : '');
    };
    room = await Net.hostRoom({ name: settings.name, onLobby: draw });
    if (my !== session) { room.close(); return; }
    ui.room = room;
    room.setSettings(cur);
    const cp = s.querySelector('#copy');
    if (cp) cp.onclick = async () => { const txt = `来玩《暗夜派对》！打开 ${location.origin} → 和朋友联机 → 输入房号 ${room.code}`; try { await navigator.clipboard.writeText(txt); sfx('token'); toast('已复制邀请，发给朋友吧。'); } catch (e) { toast(txt); } };
    wireChips(s, '#np', 'n', v => { cur.total = +v; settings.players = cur.total; saveSettings(); room.setSettings(cur); });
    wireChips(s, '#df', 'd', v => { cur.diff = v; settings.diff = v; saveSettings(); room.setSettings(cur); });
    s.querySelector('#back').onclick = () => { sfx('uiCancel'); room.close(); ui.room = null; showTitle(); };
    s.querySelector('#start').onclick = () => {
      sfx('uiClick');
      conn = room.start({ pace: ms => (fast ? ms * 0.35 : ms), onState: st => my === session && onState(st), onPriv: p => my === session && onPriv(p) });
      ME = 0;
      app.innerHTML = '<section class="screen" style="display:grid;place-items:center"><div class="hint">发牌中……</div></section>';
    };
  }
  async function guestLobby(code) {
    beginSession(true);
    const my = session;
    app.innerHTML = '';
    const s = h(`<section class="screen" id="setup"><div class="setup-card">
      <div><div class="eyebrow">已加入</div><h1 class="h-title" style="margin:6px 0 0;font-size:26px">房号 <span style="color:var(--gold-hi);letter-spacing:.2em">${esc(code)}</span></h1></div>
      <div id="who" class="hint">正在进门……</div>
      <div class="field"><label>房间里的人</label><div id="members" class="roomlist"></div></div>
      <div class="hint" id="wait">等房主开始游戏。</div>
      <div class="setup-actions"><button class="btn ghost" id="back">离开</button></div>
    </div></section>`);
    app.append(s);
    let c;
    s.querySelector('#back').onclick = () => { sfx('uiCancel'); showOnline(); };
    c = await Net.joinRoom({
      code, name: settings.name,
      onError: msg => { if (my !== session) return; toast(msg, 'var(--danger)'); const w = s.querySelector('#wait'); if (w) w.textContent = msg; },
      onLobby: lobby => {
        if (my !== session || inGame) return;
        const seats = lobby.seats || [];
        const meIn = seats.some(x => x.cid === Net.clientId());
        s.querySelector('#who').textContent = `${lobby.host || '房主'} 的房间 · 共 ${lobby.total} 人（不够由 AI 补）`;
        s.querySelector('#members').innerHTML = seats.map((x, i) => `<div class="roomrow"><div><i class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${Net.P_COLORS[i]}"></i> <b>${esc(x.name)}</b>${x.cid === Net.clientId() ? ' <span class="hint">（你）</span>' : ''}</div></div>`).join('');
        s.querySelector('#wait').textContent = lobby.status === 'done' ? '这个房间已经结束了。' : lobby.status === 'playing' && !meIn ? '这局已经开始了，你没赶上。' : meIn ? '你已入座，等房主开始游戏。' : '正在入座……';
      },
      onStart: (client, subscribe) => {
        if (my !== session) return;
        conn = client; ME = client.seat;
        app.innerHTML = '<section class="screen" style="display:grid;place-items:center"><div class="hint">发牌中……</div></section>';
        subscribe(st => my === session && onState(st), p => my === session && onPriv(p));
      },
    });
    if (my !== session) { c.stop(); return; }
    conn = conn || c;
  }

  // ---------- 规则 ----------
  // 三分钟教学视频（服务器版才有：public/media/howto.mp4）
  function showVideo() {
    Music.duck(true);
    const ov = h(`<div class="overlay video-ov"><div class="vbox"><video src="media/howto.mp4" poster="media/howto.jpg" controls playsinline autoplay preload="metadata"></video><button class="btn primary" id="vx">关闭</button></div></div>`);
    const v = ov.querySelector('video');
    const close = () => { if (!ov.isConnected) return; v.pause(); ov.remove(); Music.duck(false); document.removeEventListener('keydown', onKey); sfx('modalClose'); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelector('#vx').onclick = close;
    v.addEventListener('play', () => Music.duck(true));
    document.body.append(ov);
  }
  function showRules() {
    const fc = f => `<span class="facechip" style="background:${f === 'black' ? '#16121c' : `var(--z-${f})`};${f === 'yellow' ? 'color:#3a2a00' : ''}">${FACE[f].lb}</span>`;
    const pages = [
      ['目标', `<p>派对上有 20 位宾客。其中几位是玩家（你、朋友或 AI），每人秘密扮演一位宾客，其余都是 NPC。</p><p><b>当场上只剩你一个玩家活着，你就赢了。</b>NPC 活不活都无所谓，他们是你的掩护。</p><p>2–3 人局每人有 2 个身份，两个都死了才出局。</p>`],
      ['你的回合', `<p>二选一：<b>掷骰子</b>，或花 1 枚代币<b>揭穿</b>。</p><ul><li>${fc('red')} ${fc('blue')} ${fc('green')} ${fc('purple')} 把任意一个角色移进该颜色的房间</li><li>${fc('yellow')} 把一个角色移进控制室；如果你有角色在控制室，也可以改为<b>监控</b>：私下查出一个角色是玩家还是 NPC</li><li>${fc('black')} <b>杀人</b>：杀死和你同房间的一个人。房间里没别人时，改为拉一个人进来</li></ul>`],
      ['杀人会暴露你', `<ul><li>死者的身份卡会翻开：是 NPC，还是哪位玩家。</li><li>大家都知道这次是谁掷的骰子，所以会知道<b>你有角色在那个房间</b>。</li><li>杀人后可以<b>制造混乱</b>：从现场移走一个人，可以是你自己（逃跑），也可以是别人（转移视线）。别人分不清。</li></ul>`],
      ['揭穿', `<ul><li>每人只有 <b>${E.CONFIG.tokens} 枚</b>揭穿代币。</li><li>只能指认<b>和你同房间</b>的角色：“乌鸦，你就是厨师！”</li><li>猜对：那个角色当场死亡。</li><li>猜错：被你指认的玩家会看到你的真实身份。</li></ul>`],
      ['午夜与天亮', `<ul><li>第 ${E.CONFIG.midnightRound} 轮起进入<b>午夜</b>：骰子的黄色面也变成杀人。</li><li>出局的玩家变成<b>幽灵</b>，每轮结束时会把一位宾客拖到别的房间。</li><li>第 ${E.CONFIG.maxRound} 轮天亮，派对结束，平局。</li><li>右侧的推理笔记会根据公开信息帮你算出每个对手可能是谁。</li><li>联机时，轮到某人超过 90 秒没动作，会由 AI 代打一步。</li></ul>`],
    ];
    let i = 0;
    modal({
      title: '规则', wide: true, dismiss: 'x', buttons: [], mount: (m, close) => {
        const box = h(`<div class="rules"><div class="pg"></div><div class="dots">${pages.map(() => '<i></i>').join('')}</div><div class="btns">${HAS_VIDEO ? '<button class="btn ghost" data-a="v" style="margin-right:auto">▶ 看视频</button>' : ''}<button class="btn ghost" data-a="x">关闭</button><button class="btn" data-a="p">上一页</button><button class="btn primary" data-a="n">下一页</button></div></div>`);
        m.querySelector('.body').append(box);
        const draw = () => { box.querySelector('.pg').innerHTML = `<div class="eyebrow">${i + 1} / ${pages.length}</div><h3 class="h-title" style="margin:4px 0 10px;color:var(--gold-hi)">${pages[i][0]}</h3>${pages[i][1]}`; box.querySelectorAll('.dots i').forEach((d, k) => d.classList.toggle('on', k === i)); box.querySelector('[data-a=p]').disabled = i === 0; box.querySelector('[data-a=n]').textContent = i === pages.length - 1 ? '明白了' : '下一页'; };
        draw();
        box.onclick = e => { const a = e.target.dataset.a; if (!a) return; if (a === 'x') return close('x'); if (a === 'v') { close('x'); return showVideo(); } if (a === 'p') { i--; sfx('cardFlip'); draw(); } if (a === 'n') { if (i === pages.length - 1) return close('x'); i++; sfx('cardFlip'); draw(); } };
      },
    });
  }

  // ---------- 接收主机状态 ----------
  function beginSession(keepConn) {
    if (!keepConn) stopSession(); else { session++; document.querySelectorAll('.overlay').forEach(o => o.remove()); }
    G = null; priv = null; latest = null; endIds = null; lastSeq = -1; queue = []; playing = false; shownMsgs = new Set(); privQ = []; promptN = 0; drawn = false; inGame = false; resultShown = false; tags = {}; fast = false; catchup = false;
    Music.setMode('party');
  }
  function viewFromSnap(s) {
    const v = {
      round: s.round, cur: s.cur, start: s.start, per: s.per, over: s.over, winner: s.winner, pending: s.pending, stage: s.stage,
      chars: s.chars.map(([zone, alive, owner], i) => ({ id: i, name: E.CHARS[i][0], bio: E.CHARS[i][1], zone, alive: !!alive, owner })),
      players: s.players.map((p, i) => ({ id: i, name: p.name, color: p.color, tokens: p.tokens, out: p.out, n: p.n, dead: p.dead.slice(), ai: p.ai, ids: i === ME && priv ? priv.ids.slice() : p.dead.slice(), human: i === ME })),
      log: G ? G.log : [],
    };
    return v;
  }
  function onState(st) {
    if (!st || !st.snap) return;
    latest = st;
    if (!G) {
      G = viewFromSnap(st.snap);
      lastSeq = st.seq;
      G.log = st.events.slice();
      const endE = st.events.find(e => e.t === 'end'); if (endE) endIds = endE.ids;
      routeStage();
      return;
    }
    const fresh = st.events.filter(e => e.seq > lastSeq && !queue.some(q => q.seq === e.seq));
    if (fresh.length && fresh[0].seq > lastSeq + 1 + queue.length) { // 掉了太多：直接对齐
      queue = []; lastSeq = st.seq; const log = G.log; G = viewFromSnap(st.snap); G.log = log.concat(fresh);
      if (inGame) { placeTokens(); render(); }
      routeStage(); return;
    }
    queue.push(...fresh);
    routeStage();
    pump();
  }
  function onPriv(p) {
    priv = p;
    if (G) { G.players[ME].ids = p.ids.slice(); }
    for (const m of p.msgs || []) { const k = m.seq + m.t + m.cid; if (!shownMsgs.has(k)) { shownMsgs.add(k); privQ.push(m); } }
    if (!G) return;
    routeStage();
    if (inGame) { render(); pump(); }
  }
  function routeStage() {
    if (!G || !priv) return;
    const stage = latest.snap.stage;
    if (stage === 'draw' && !drawn && !inGame) { if (!document.getElementById('draw')) showDraw(); return; }
    if ((stage === 'play' || stage === 'end' || drawn) && !inGame && (stage !== 'draw')) { startGameScreen(); }
  }
  function reconcile() {
    if (!latest) return;
    const log = G.log;
    G = viewFromSnap(latest.snap);
    G.log = log;
  }
  async function pump() {
    if (playing || !inGame) return;
    playing = true;
    const my = session;
    try {
      for (;;) {
        if (my !== session) return;
        if (queue.length) {
          catchup = queue.length > 4;
          const e = queue.shift();
          applyEvent(e); G.log.push(e); lastSeq = e.seq;
          await play(e);
          if (my !== session) return;
          await drainPriv();
          continue;
        }
        catchup = false;
        await drainPriv();
        break;
      }
      reconcile(); placeTokens(); render();
      if (endIds && latest && latest.snap.stage === 'end') { await sleep(600); if (my === session) showResult(); return; }
      maybePrompt();
    } finally { if (my === session) playing = false; }
  }
  async function drainPriv() {
    while (privQ.length && privQ[0].seq <= lastSeq) {
      const m = privQ.shift();
      if (m.t === 'mon') {
        await reveal({ cid: m.cid, stamp: m.isPlayer ? '玩家' : 'NPC', kind: m.isPlayer ? 'player' : 'npc', sound: m.isPlayer ? 'revealPlayer' : 'revealNpc', caption: m.isPlayer ? `监控画面显示：<b>${G.chars[m.cid].name}</b> 是<b style="color:var(--danger)">某位玩家</b>。已记进你的笔记。` : `<b>${G.chars[m.cid].name}</b> 只是 NPC。已记进你的笔记。` });
      } else if (m.t === 'leak') {
        sfx('secretLeak');
        await modal({ title: '有人冤枉了你', body: `${pn(m.from)} 指认你是 ${G.chars[m.cid].name}，猜错了。<br>作为代价，你看到了 ${pn(m.from)} 的真实身份：`, buttons: [{ label: '记住了', value: 1, kind: 'primary' }], mount: md => { const row = h(`<div class="idhand" style="justify-content:center;margin-top:12px">${m.ids.map(c => `<div class="flip" style="width:110px;height:154px"><div class="inner"><div class="face back">${Art.cardBack()}</div>${idFront(c)}</div></div>`).join('')}</div>`); md.querySelector('.body').append(row); setTimeout(() => { row.querySelectorAll('.flip').forEach(f => f.classList.add('flipped')); sfx('cardFlip'); setTimeout(() => sfx('revealPlayer'), 500); }, 400); } });
      }
      render();
    }
  }
  function applyEvent(e) {
    const kill = (cid, owner, elim) => { const c = G.chars[cid]; c.alive = false; c.owner = owner; if (owner >= 0) { const p = G.players[owner]; if (!p.dead.includes(cid)) p.dead.push(cid); if (owner !== ME && !p.ids.includes(cid)) p.ids.push(cid); } if (elim >= 0) G.players[elim].out = true; };
    switch (e.t) {
      case 'turn': G.cur = e.p; G.pending = null; break;
      case 'move': G.chars[e.cid].zone = e.zone; break;
      case 'kill': kill(e.cid, e.owner, e.elim); break;
      case 'accuse': G.players[e.p].tokens--; if (e.correct) kill(e.cid, e.owner, e.elim); break;
      case 'round': G.round = e.round; break;
      case 'end': G.over = true; G.winner = e.w; endIds = e.ids; break;
    }
  }

  // ---------- 抽身份 ----------
  function showDraw() { Scene.setMode('full');
    const need = priv.ids.length;
    let k = 0;
    app.innerHTML = '';
    const s = h(`<section class="screen" id="draw"><div class="eyebrow">抽取身份${conn && conn.online ? ' · 联机' : ''}</div><h1 class="h-title" style="margin:0;font-size:26px">${need === 2 ? '抽两张宾客卡' : '抽一张宾客卡'}</h1>
      <p class="hint" style="margin:0;max-width:44ch">抽到谁，今晚你就是谁。只有你自己知道，其他人只看得到一位普通宾客。</p>
      <div class="deck shuffling">${Array.from({ length: 20 }, (_, i) => `<button class="dcard" aria-label="第 ${i + 1} 张卡" style="--sx:${(Math.random() * 120 - 60) | 0}px;--sy:${(Math.random() * 60 - 30) | 0}px;--sr:${(Math.random() * 40 - 20) | 0}deg">${Art.cardBack()}</button>`).join('')}</div>
      <button class="btn ghost" id="cancel">退出</button></section>`);
    app.append(s);
    sfx('cardShuffle');
    setTimeout(() => s.querySelector('.deck').classList.remove('shuffling'), 600);
    s.querySelector('#cancel').onclick = () => { sfx('uiCancel'); showTitle(); };
    s.querySelectorAll('.dcard').forEach(b => (b.onclick = async () => {
      if (k >= need) return;
      sfx('selectPick'); b.classList.add('taken');
      const c = priv.ids[k++];
      await reveal({ cid: c, stamp: '你', kind: 'player', sound: 'revealPlayer', caption: `今晚你是 <b>${E.CHARS[c][0]}（${E.CHARS[c][2]}）</b>。${E.CHARS[c][1]}<br><span class="hint">它在棋盘上会有一圈金边，只有你看得到。</span>` });
      if (k >= need) {
        s.querySelectorAll('.dcard').forEach(x => (x.disabled = true));
        const go = h('<button class="btn primary" style="padding:14px 30px;font-size:16px">走进派对大厅</button>');
        s.querySelector('#cancel').replaceWith(go); go.focus();
        go.onclick = async () => {
          sfx('uiClick');
          go.disabled = true;
          let ob = null; try { ob = localStorage.getItem('mp_onboarded'); } catch (e) { ob = '1'; }
          if (!ob) await onboarding();
          drawn = true;
          conn && conn.ready();
          if (latest.snap.stage === 'draw') { go.textContent = '等其他玩家抽完身份……'; }
          routeStage();
        };
      } else toast('再抽一张：你还有第二个身份。');
    }));
  }
  async function onboarding() {
    const steps = [
      ['欢迎来到派对', '右边是<b>你的身份卡</b>，鼠标移上去才会翻开，免得被别人瞄到。棋盘上带金边的就是你。'],
      ['怎么行动', '轮到你时，在下方<b>掷骰子</b>，或者花代币<b>揭穿</b>。弹出提示后，在房间里点选角色。'],
      ['怎么推理', '点任意一位宾客可以查看档案、贴嫌疑标签。右侧的<b>推理笔记</b>会根据公开信息，算出每个对手可能是谁。'],
    ];
    for (let i = 0; i < steps.length; i++) await modal({ title: `${steps[i][0]}　<span class="hint">${i + 1}/3</span>`, body: steps[i][1], buttons: [{ label: i < 2 ? '下一步' : '好', value: 1, kind: 'primary' }] });
    try { localStorage.setItem('mp_onboarded', '1'); } catch (e) {}
  }

  // ---------- 游戏主界面 ----------
  function startGameScreen() {
    Scene.setMode('dim');
    inGame = true;
    app.innerHTML = '';
    const online = conn && conn.online;
    const s = h(`<section class="screen" id="game">
      <div class="topbar"><div class="brand">Midnight Party</div>${online ? `<span class="clock" title="联机房号">房号 ${esc(conn.code || '')}</span>` : ''}
        <div class="clock" id="clock"></div>
        <div class="turnpill" id="turn" aria-live="polite"></div>
        ${SUPPORT_URL ? `<a class="iconbtn support support-mini" href="${SUPPORT_URL}" target="_blank" rel="noopener" aria-label="支持作者">☕</a>` : ''}<button class="iconbtn" id="b-hand" aria-label="看我的身份">身份</button>
        <button class="iconbtn" id="b-menu" aria-label="菜单" aria-expanded="false">☰</button>
        <div class="tools" id="tools"><button class="iconbtn" id="b-log">日志</button><button class="iconbtn" id="b-rules">规则</button>
        <button class="iconbtn" id="b-snd" aria-pressed="${SFX.on}">音效 ${SFX.on ? '开' : '关'}</button><button class="iconbtn" id="b-mus" aria-pressed="${Music.on}">音乐 ${Music.on ? '开' : '关'}</button>
        <button class="iconbtn" id="b-fast" aria-pressed="false">快进</button>
        <button class="iconbtn" id="b-exit">退出</button>${supportBtn()}</div></div>
      <aside class="left"><div class="panel"><h3>宾客名单 <span class="hint" style="letter-spacing:0">玩家</span></h3><div class="plist" id="plist"></div></div></aside>
      <main class="board-wrap"><div class="stage" id="stage"><div id="prompt"></div><div class="board" id="board">${House.svg()}${Z.map((z, i) => `<div class="rlabel" data-z="${i}" style="--zc:${ZC[i]}"><i></i><b>${z.c}·${z.n}</b><span class="cnt"></span></div>`).join('')}</div></div>
</main>
      <div class="actionbar" id="actions"></div>
      <aside class="right"><div class="panel hand-panel"><h3>我的身份 <span class="hint" style="letter-spacing:0">悬停查看</span></h3><div class="idhand" id="hand"></div></div>
        <div class="panel"><h3>推理笔记 <button class="chip nb-glow" id="b-glow" aria-pressed="${settings.glow !== false}">嫌疑光 ${settings.glow !== false ? '开' : '关'}</button></h3><div class="hint sub" style="margin-bottom:4px">根据公开信息推算每个对手可能是谁。棋盘上发光的人就是嫌疑人，越亮越可疑；点对手名字只看他的嫌疑人。</div><div id="notes"></div></div></aside>
    </section>`);
    app.append(s);
    ui.board = s.querySelector('#board'); ui.stage = s.querySelector('#stage'); ui.focus = -1;
    s.style.setProperty('--bar', House.ratio.toFixed(3));
    tokEls = {};
    G.chars.forEach(c => {
      const b = h(`<button class="tok" data-c="${c.id}" aria-label="${c.name}"><div class="body"><div class="ring">${Art.portrait(c.id)}</div><div class="lb">${c.name}</div></div></button>`);
      b.onclick = () => onTokenClick(c.id);
      tokEls[c.id] = b; ui.board.append(b);
    });
    ui.board.querySelectorAll('.house .zone').forEach(g => g.addEventListener('click', () => ui.pickZ && ui.pickZ(+g.dataset.z)));
    const tools = s.querySelector('#tools'), menu = s.querySelector('#b-menu');
    const closeMenu = () => { tools.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); };
    menu.onclick = e => { e.stopPropagation(); sfx('uiClick'); const o = tools.classList.toggle('open'); menu.setAttribute('aria-expanded', o); };
    document.addEventListener('pointerdown', e => { if (!tools.contains(e.target) && e.target !== menu) closeMenu(); });
    tools.addEventListener('click', e => { if (e.target.closest('button')) setTimeout(closeMenu, 120); });
    s.querySelector('#b-hand').onclick = () => { sfx('uiClick'); showHand(); };
    s.querySelector('#b-glow').onclick = e => { settings.glow = settings.glow === false; saveSettings(); e.currentTarget.setAttribute('aria-pressed', settings.glow); e.currentTarget.textContent = `嫌疑光 ${settings.glow ? '开' : '关'}`; sfx('uiClick'); render(); };
    s.querySelector('#b-log').onclick = () => { sfx('uiClick'); showLog(); };
    s.querySelector('#b-rules').onclick = () => { sfx('uiClick'); showRules(); };
    s.querySelector('#b-snd').onclick = e => { const on = SFX.toggle(); e.currentTarget.textContent = `音效 ${on ? '开' : '关'}`; e.currentTarget.setAttribute('aria-pressed', on); sfx('uiClick'); };
    s.querySelector('#b-mus').onclick = e => { const on = Music.toggle(); e.currentTarget.textContent = `音乐 ${on ? '开' : '关'}`; e.currentTarget.setAttribute('aria-pressed', on); sfx('uiClick'); };
    s.querySelector('#b-fast').onclick = e => { fast = !fast; e.currentTarget.setAttribute('aria-pressed', fast); sfx('uiClick'); };
    s.querySelector('#b-exit').onclick = async () => {
      sfx('uiClick');
      const hostOnline = online && !conn.server && ME === 0 && latest && latest.snap.stage !== 'end';
      const v = await modal({ title: '离开派对？', body: hostOnline ? '你是房主。你一离开，这局就会中断，朋友们也玩不下去了。' : '退出会结束你这一局。', dismiss: 'no', buttons: [{ label: '留下', value: 'no', kind: 'ghost' }, { label: '退出', value: 'yes', kind: 'danger' }] });
      if (v === 'yes') showTitle();
    };
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => { if (!ui.stage.isConnected) return ro.disconnect(); layoutBoard(); placeTokens(); }); ro.observe(ui.stage); }
    Music.setMode(isMid() ? 'midnight' : 'party'); Music.start();
    layoutBoard(); placeTokens(); render(); setActions('wait');
    pump();
  }
  // 手机上看身份：弹出两张卡，按住翻开
  function showHand() {
    const ids = priv ? priv.ids : [];
    modal({ title: '我的身份', dismiss: 'x', buttons: [{ label: '收起', value: 'x', kind: 'ghost' }], mount: m => {
      const row = h(`<div class="idhand" style="justify-content:center">${ids.map(c => `<div class="flip ${G.chars[c].alive ? '' : 'flipped'}" style="width:120px;height:168px">${''}<div class="inner"><div class="face back">${Art.cardBack()}</div>${idFront(c, G.chars[c].alive ? '' : '已死', 'player')}</div></div>`).join('')}</div>`);
      m.querySelector('.body').append(row, h('<div class="hint" style="text-align:center;margin-top:10px">点卡片翻开 · 小心别被旁边的人看到</div>'));
      row.querySelectorAll('.flip').forEach((f, i) => { if (!G.chars[ids[i]].alive) { f.querySelector('.stamp').classList.add('show'); return; } f.onclick = () => { f.classList.toggle('flipped'); sfx('cardFlip'); }; });
    } });
  }

  // ---------- 棋盘排版：房子按可用空间缩放，宾客站在各自房间的地板上 ----------
  function layoutBoard() {
    if (!ui.stage || !ui.stage.isConnected) return;
    const r = ui.stage.getBoundingClientRect(), pad = 6;
    const f = House.fit(Math.max(50, r.width - pad * 2), Math.max(50, r.height - pad * 2));
    ui.u = f.u;
    Object.assign(ui.board.style, { width: f.w + 'px', height: f.h + 'px', left: (r.width - f.w) / 2 + 'px', top: (r.height - f.h) / 2 + 'px' });
    ui.board.style.setProperty('--lf', Math.max(10, Math.min(14, f.u * .62)) + 'px');
    ui.board.querySelectorAll('.rlabel').forEach(el => { const [x, y] = House.px(f.u, ...House.labelAt(+el.dataset.z)); el.style.left = x + 'px'; el.style.top = y + 'px'; });
  }
  function placeTokens() {
    if (!ui.board || !ui.board.isConnected || !ui.u) return;
    const u = ui.u;
    const byZone = [[], [], [], [], []];
    [...G.chars].sort((a, b) => (b.alive - a.alive) || a.id - b.id).forEach(c => byZone[c.zone].push(c.id));
    byZone.forEach((ids, z) => {
      if (!ids.length) return;
      const { pos, d } = House.slots(z, ids.length);
      const tk = Math.round(Math.max(22, Math.min(64, u * 2.3, d * u * 1.12)));
      const lbf = Math.max(9, Math.min(13, tk * .3));
      ids.forEach((id, i) => {
        const el = tokEls[id], [x, y] = House.px(u, pos[i][0], pos[i][1]);
        el.style.setProperty('--tk', tk + 'px'); el.style.setProperty('--lbf', lbf + 'px');
        el.style.left = (x - tk / 2) + 'px'; el.style.top = (y - tk + 3) + 'px';
        el.style.zIndex = 10 + Math.round((pos[i][0] + pos[i][1]) * 4) + (G.chars[id].alive ? 0 : -1);
      });
    });
    ui.board.querySelectorAll('.rlabel').forEach(el => { const z = +el.dataset.z; el.querySelector('.cnt').textContent = `${G.chars.filter(c => c.alive && c.zone === z).length} 人`; });
  }
  function flipPlace(focus) {
    const first = {};
    for (const id in tokEls) first[id] = tokEls[id].getBoundingClientRect();
    placeTokens();
    for (const id in tokEls) {
      const l = tokEls[id].getBoundingClientRect(), f = first[id];
      const dx = f.left - l.left, dy = f.top - l.top;
      if (!dx && !dy) continue;
      const isF = +id === focus;
      tokEls[id].animate(isF
        ? [{ transform: `translate(${dx}px,${dy}px)`, zIndex: 20 }, { transform: `translate(${dx / 2}px,${dy / 2 - 46}px) scale(1.3)`, zIndex: 20, offset: 0.5 }, { transform: 'none', zIndex: 20 }]
        : [{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }],
        { duration: sp(isF ? 700 : 380), easing: 'cubic-bezier(.3,.7,.3,1)' });
    }
  }
  const noteFor = q => (priv && priv.notes || []).find(n => n.q === q);
  // 推理笔记 → 每个角色的嫌疑光：取最可能的那位对手的颜色，亮度按百分比
  function suspicion() {
    const out = {};
    if (!priv || settings.glow === false) return out;
    for (const n of priv.notes || []) {
      const q = G.players[n.q]; if (!q || q.out || (ui.focus >= 0 && ui.focus !== n.q)) continue;
      const top = (n.sus[0] || [0, 0])[1];
      if (n.total > 9 && top < 15) continue;   // 线索不足：不乱发光
      for (const [c, pct] of n.sus) { if (pct < 12) continue; if (!out[c] || out[c].pct < pct) out[c] = { q: n.q, pct, color: q.color }; }
    }
    return out;
  }
  function render() {
    if (!G || !document.getElementById('plist')) return;
    const ck = document.getElementById('clock');
    const mid = isMid();
    ck.className = 'clock' + (mid ? ' mid' : '');
    ck.innerHTML = `<b>第 ${G.round} 轮</b><span class="hint">${mid ? `午夜 · 黄色也杀人 · 第 ${dawnR()} 轮天亮` : `距午夜还有 ${midR() - G.round} 轮`}</span>`;
    // 轮到谁：顶栏标签 + 名单高亮 + 棋盘描边，三处一起提示
    const cur = G.players[G.cur], myTurn = G.cur === ME && !G.over;
    const tp = document.getElementById('turn');
    if (tp && cur) {
      const pd = G.pending && G.pending.seat === G.cur ? PHASE_TXT[G.pending.phase] : '';
      tp.className = 'turnpill' + (myTurn ? ' me' : '');
      tp.style.setProperty('--pc', myTurn ? 'var(--gold)' : cur.color);
      tp.innerHTML = G.over ? '<b>派对结束</b>' : `<i class="dot"></i><b>${myTurn ? '轮到你了' : `轮到 ${esc(cur.name)}`}</b><span class="ph">${myTurn ? '' : pd}</span>`;
    }
    if (ui.stage) ui.stage.style.setProperty('--pc', G.over ? 'transparent' : myTurn ? 'var(--gold)' : cur ? cur.color : 'transparent');
    document.getElementById('plist').innerHTML = G.players.map(p => {
      const sub = p.out ? '出局 · 幽灵' : G.per === 2 ? `身份 ${p.n - p.dead.length}/${p.n}` : p.id === ME ? '你' : p.ai ? 'AI · 身份未知' : '身份未知';
      return `<button class="pl ${G.cur === p.id && !G.over ? 'cur' : ''} ${p.out ? 'out' : ''} ${ui.focus === p.id ? 'focus' : ''}" data-q="${p.id}" style="--pc:${p.id === ME ? 'var(--gold)' : p.color}"><span class="turn">${p.id === ME ? '你的回合' : '回合中'}</span><i class="dot" style="background:${p.color}"></i><div><div class="nm">${nm(p.id)}${p.ai && conn && conn.online ? ' <span class="hint">AI</span>' : ''}</div><div class="sub">${sub}</div></div><div class="coins" title="揭穿代币">${Array.from({ length: tokenMax() }, (_, i) => `<i class="coin ${i < p.tokens ? '' : 'used'}"></i>`).join('')}</div></button>`;
    }).join('');
    document.querySelectorAll('#plist .pl').forEach(b => (b.onclick = () => { const q = +b.dataset.q; if (q === ME) { sfx('uiClick'); return showHand(); } focusOpp(q); }));
    const sus = suspicion();
    if (ui.board) ui.board.classList.toggle('focusing', ui.focus >= 0 && settings.glow !== false);
    const myZones = new Set(G.chars.filter(c => c.alive && mine(c.id)).map(c => c.zone));
    if (ui.board) {
      ui.board.querySelectorAll('.house .zone').forEach(g => g.classList.toggle('mine', myZones.has(+g.dataset.z)));
      ui.board.querySelectorAll('.rlabel').forEach(el => el.classList.toggle('here', myZones.has(+el.dataset.z)));
    }
    for (const c of G.chars) {
      const el = tokEls[c.id];
      if (!el) continue;
      const body = el.querySelector('.body');
      el.classList.toggle('dead', !c.alive);
      el.classList.toggle('mine', mine(c.id));
      el.classList.toggle('turnme', myTurn && mine(c.id) && c.alive);
      body.querySelectorAll('.you,.tag,.know,.pct').forEach(x => x.remove());
      if (mine(c.id)) body.prepend(h('<span class="you">你</span>'));
      if (tags[c.id] !== undefined && c.alive) body.append(h(`<span class="tag" style="background:${G.players[tags[c.id]].color}" title="你的标记"></span>`));
      const k = priv && priv.know ? priv.know[c.id] : null;
      if (c.alive && !mine(c.id)) {
        if (k === -1) body.append(h('<span class="know npc">NPC</span>'));
        else if (k === -2) body.append(h('<span class="know pl">玩家</span>'));
        else if (k !== null && k >= 0) body.append(h(`<span class="know pl" style="background:${G.players[k].color};color:#111">${nm(k)}</span>`));
      }
      const sv = c.alive && !mine(c.id) && k !== -1 ? sus[c.id] : null;
      el.classList.toggle('sus', !!sv); el.classList.toggle('hot', !!sv && sv.pct >= 40); el.classList.toggle('sure', !!sv && sv.pct >= 100);
      if (sv) { el.style.setProperty('--sc', sv.color); el.style.setProperty('--sp', Math.min(1, .25 + sv.pct / 80).toFixed(2)); if (sv.pct >= 20) body.append(h(`<span class="pct" title="推理笔记：可能是 ${esc(G.players[sv.q].name)}">${sv.pct >= 100 ? '确定' : sv.pct + '%'}</span>`)); }
      el.setAttribute('aria-label', `${c.name}${c.alive ? '' : '（已死亡）'}${sv ? `，可能是 ${G.players[sv.q].name}（${sv.pct}%）` : ''}`);
    }
    const hand = document.getElementById('hand');
    const ids = priv ? priv.ids : [];
    hand.innerHTML = ids.map(c => `<div class="flip ${G.chars[c].alive ? '' : 'flipped'}" data-c="${c}" tabindex="0" aria-label="我的身份"><div class="inner"><div class="face back">${Art.cardBack()}</div>${idFront(c, G.chars[c].alive ? '' : '已死', 'player')}</div></div>`).join('');
    hand.querySelectorAll('.flip').forEach(f => {
      const c = +f.dataset.c; if (!G.chars[c].alive) { f.querySelector('.stamp').classList.add('show'); return; }
      const show = v => { if (f.classList.contains('flipped') !== v) { f.classList.toggle('flipped', v); sfx('cardFlip'); } };
      f.onmouseenter = () => show(true); f.onmouseleave = () => show(false);
      f.onfocus = () => show(true); f.onblur = () => show(false);
      f.onclick = () => show(!f.classList.contains('flipped'));
    });
    const notes = document.getElementById('notes');
    notes.innerHTML = G.players.filter(q => q.id !== ME).map(q => {
      const dead = q.dead;
      let inner;
      if (q.out) inner = `<div class="hint">出局。曾是 ${dead.map(c => G.chars[c].name).join('、')}</div>`;
      else {
        const n = noteFor(q.id) || { sus: [], total: 0 };
        const sure = n.sus.filter(([, pct]) => pct >= 100);
        const left = q.n - dead.length;
        inner = (dead.length ? `<div class="hint">已死身份：${dead.map(c => G.chars[c].name).join('、')}</div>` : '') +
          (sure.length ? `<div style="color:var(--danger);font-weight:700">确定是：${sure.map(([c]) => G.chars[c].name).join('、')}</div>` : '') +
          (sure.length >= left ? '' : n.total > 9 && (n.sus[0] || [0, 0])[1] < 15 ? `<div class="hint">线索不足：${n.total} 人都有可能</div>` :
            `<div class="nb-sus">${n.sus.slice(0, 6).map(([c, pct]) => `<span class="sus ${pct > 40 ? 'hot' : ''}" data-c="${c}"><span class="mini">${Art.portrait(c)}</span>${G.chars[c].name}<i>${pct}%</i></span>`).join('')}${n.total > 6 ? `<span class="hint">等 ${n.total} 人</span>` : ''}</div>`);
      }
      return `<div class="nb-row"><button class="nb-head" data-q="${q.id}" aria-pressed="${ui.focus === q.id}" title="只看他的嫌疑人"><i class="dot" style="background:${q.color}"></i>${esc(q.name)}${q.out ? ' <span class="hint">（幽灵）</span>' : ''}</button>${inner}</div>`;
    }).join('');
    notes.querySelectorAll('.sus').forEach(s => (s.onclick = () => { sfx('uiClick'); charDetail(+s.dataset.c); }));
    notes.querySelectorAll('.nb-head').forEach(b => (b.onclick = () => focusOpp(+b.dataset.q)));
    if (!ui.prompting) setActions(G.players[ME].out && !G.over ? 'spectate' : 'wait');
  }
  // 点某个对手：棋盘上只亮他的嫌疑人，再点一次恢复
  function focusOpp(q) {
    sfx('uiClick');
    ui.focus = ui.focus === q ? -1 : q;
    if (settings.glow === false && ui.focus >= 0) { settings.glow = true; const b = document.getElementById('b-glow'); if (b) { b.setAttribute('aria-pressed', 'true'); b.textContent = '嫌疑光 开'; } }
    render();
  }

  // ---------- 行动栏 ----------
  function setActions(mode, extra = {}) {
    const bar = document.getElementById('actions');
    if (!bar || !G) return;
    const p = G.players[G.cur];
    bar.classList.toggle('mine', mode === 'human' || (mode === 'busy' && G.cur === ME));
    if (mode === 'human') {
      const tgt = E.accuseTargets(G, ME);
      const why = G.players[ME].tokens <= 0 ? '揭穿代币已经用完' : !tgt.length ? '你的房间里没有别人可以指认' : '指认同房间的某人是某位玩家';
      bar.innerHTML = `<div class="status"><b>你的回合</b><span class="why">掷骰子，或者花代币揭穿同房间的人</span></div>
        <button class="btn primary big" id="a-roll">${ICON_DIE} 掷骰子</button>
        <button class="btn big" id="a-acc" ${tgt.length ? '' : 'aria-disabled="true"'} style="${tgt.length ? '' : 'opacity:.4'}" title="${why}">揭穿 <span class="coins">${Array.from({ length: tokenMax() }, (_, i) => `<i class="coin ${i < G.players[ME].tokens ? '' : 'used'}"></i>`).join('')}</span></button>
        <div class="why" style="flex-basis:100%">${tgt.length ? '' : '揭穿不可用：' + why}</div>`;
      bar.querySelector('#a-roll').onclick = () => { sfx('uiClick'); extra.resolve('roll'); };
      bar.querySelector('#a-acc').onclick = () => { if (!tgt.length) { sfx('uiDisabled'); toast(`不能揭穿：${why}`, 'var(--danger)'); return; } sfx('uiClick'); extra.resolve('accuse'); };
      bar.querySelector('#a-roll').focus({ preventScroll: true });
    } else if (mode === 'busy') {
      bar.innerHTML = `<div class="status"><b>${extra.text || '……'}</b></div>`;
    } else if (mode === 'spectate') {
      bar.innerHTML = `<div class="status"><b>你已出局，正在观战</b><span class="why">你的幽灵仍在派对里游荡</span></div>`;
    } else {
      const pd = G.pending && G.pending.seat === G.cur ? PHASE_TXT[G.pending.phase] : '';
      bar.innerHTML = `<div class="status"><b>${p ? `${nm(p.id)} 的回合` : ''}</b><span class="why">${p && p.id !== ME ? pd || '……' : pd}</span></div>`;
    }
  }

  // ---------- 选择 ----------
  function selectChar({ eligible, prompt, cancel = false }) {
    return new Promise(res => {
      sfx('selectHighlight');
      ui.board.classList.add('selecting');
      eligible.forEach(c => tokEls[c].classList.add('eligible'));
      const pb = document.getElementById('prompt');
      pb.innerHTML = `<div class="promptbar"><span>${prompt}</span>${cancel ? '<button class="btn sm ghost" id="p-cancel">取消</button>' : ''}</div>`;
      setActions('busy', { text: '请在房间里点选一个角色' });
      const done = v => { selecting = null; ui.cancelSel = null; ui.board.classList.remove('selecting'); eligible.forEach(c => tokEls[c] && tokEls[c].classList.remove('eligible')); pb.innerHTML = ''; res(v); };
      selecting = c => { if (eligible.includes(c)) { sfx('selectPick'); done(c); } };
      ui.cancelSel = () => done(null);
      if (cancel) pb.querySelector('#p-cancel').onclick = () => { sfx('uiCancel'); done(null); };
      const first = tokEls[eligible[0]]; first && first.focus({ preventScroll: true });
    });
  }
  function onTokenClick(c) { if (selecting) return selecting(c); sfx('uiClick'); charDetail(c); }
  // 选房间：直接点棋盘上的房间，或点提示条里的按钮
  function pickZone(title, body, exclude) {
    return new Promise(res => {
      sfx('selectHighlight');
      const pb = document.getElementById('prompt');
      const zs = ui.board.querySelectorAll('.house .zone');
      zs.forEach(g => { if (+g.dataset.z !== exclude) g.classList.add('pickable'); });
      pb.innerHTML = `<div class="promptbar" style="flex-wrap:wrap"><span>${title} <span class="hint" style="font-weight:400">${body} 点一个房间</span></span><div class="zonepick" style="margin:0;flex:1 1 100%;grid-template-columns:repeat(5,minmax(0,1fr))">${Z.map((z, i) => `<button style="--zc:${ZC[i]};padding:6px 2px" data-z="${i}" ${i === exclude ? 'disabled' : ''}>${z.n}</button>`).join('')}</div></div>`;
      const done = z => { ui.pickZ = null; ui.cancelSel = null; zs.forEach(g => g.classList.remove('pickable')); pb.innerHTML = ''; res(z); };
      ui.pickZ = z => { if (z === exclude) return sfx('uiDisabled'); sfx('selectPick'); done(z); };
      ui.cancelSel = () => done(undefined);
      pb.querySelectorAll('button[data-z]').forEach(b => (b.onclick = () => ui.pickZ(+b.dataset.z)));
    });
  }

  // ---------- 角色详情 ----------
  function charDetail(c) {
    const ch = G.chars[c];
    const k = priv && priv.know ? priv.know[c] : null;
    const info = mine(c) ? '这是<b>你</b>。' : !ch.alive ? `已死亡，身份是 ${ch.owner >= 0 ? pn(ch.owner) : 'NPC'}。` : k === -1 ? '你确认过：<b>NPC</b>。' : k === -2 ? '你监控过：<b style="color:var(--danger)">是某位玩家</b>。' : k !== null && k >= 0 ? `你确认过：是 ${pn(k)}。` : '你还不知道他的底细。';
    modal({
      title: '', dismiss: 'x', buttons: [{ label: '关闭', value: 'x', kind: 'ghost' }], mount: (m, close) => {
        const box = h(`<div class="detail"><div class="flip" style="width:150px;height:210px"><div class="inner"><div class="face back">${Art.cardBack()}</div>${idFront(c, ch.alive ? '' : '已死', 'player')}</div></div>
          <div style="display:grid;gap:8px;min-width:0"><div class="eyebrow">宾客档案</div><div class="h-title" style="font-size:22px;color:var(--gold-hi)">${ch.name}<span style="font-size:15px;letter-spacing:.05em;color:var(--mute)">（${E.CHARS[c][2]}）</span></div><div>位置：${zn(ch.zone)}</div><div>${info}</div>
          ${!mine(c) && ch.alive ? `<div class="hint">贴上嫌疑标签：</div><div class="chips" id="tagrow">${G.players.filter(q => q.id !== ME && !q.out).map(q => `<button class="chip" data-q="${q.id}" aria-pressed="${tags[c] === q.id}" style="border-color:${q.color}"><i class="dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${q.color}"></i> ${esc(q.name)}</button>`).join('')}<button class="chip" data-q="-1">清除</button></div>` : ''}</div></div>`);
        m.querySelector('.body').append(box);
        setTimeout(() => { box.querySelector('.flip').classList.add('flipped'); sfx('cardFlip'); if (!ch.alive) box.querySelector('.stamp').classList.add('show'); }, 200);
        box.querySelectorAll('#tagrow .chip').forEach(b => (b.onclick = () => { sfx('noteTag'); const q = +b.dataset.q; if (q < 0) delete tags[c]; else tags[c] = q; render(); close('x'); }));
      },
    });
  }

  // ---------- 日志 ----------
  function describe(e) {
    switch (e.t) {
      case 'move': return e.cause === 'ghost' ? `👻 ${pn(e.p)} 的幽灵把 ${cn(e.cid)} 拖进了 ${zn(e.zone)}` : e.cause === 'fallback' ? `${pn(e.p)} 掷出黑色，但身边没人，把 ${cn(e.cid)} 拉进了 ${zn(e.zone)}` : e.cause === 'chaos' ? `${pn(e.p)} 制造混乱：${cn(e.cid)} 离开现场，去了 ${zn(e.zone)}` : `${pn(e.p)} 把 ${cn(e.cid)} 移进了 ${zn(e.zone)}`;
      case 'kill': return `🔪 ${pn(e.p)} 下手了：${cn(e.cid)} 死在 ${zn(e.zone)}，身份是 ${e.owner >= 0 ? '玩家 ' + pn(e.owner) : 'NPC'}`;
      case 'monitor': return `👁 ${pn(e.p)} 在控制室监控了 ${cn(e.cid)}`;
      case 'accuse': return `⚖ ${pn(e.p)} 指认 ${pn(e.q)} 就是 ${cn(e.cid)}：${e.correct ? '<b style="color:var(--ok)">猜对了</b>' : '<b style="color:var(--danger)">猜错了</b>'}`;
      case 'roll': return `🎲 ${pn(e.p)} 掷出 <b style="color:${e.face === 'black' ? '#ff6a7a' : `var(--z-${e.face})`}">${FACE[e.face].name}</b>`;
      case 'skip': return `${pn(e.p)} 没有可移动的人，跳过`;
      case 'midnight': return '🕛 午夜来临：黄色也变成杀人';
    }
    return '';
  }
  function showLog() {
    let only = false;
    const d = h(`<div class="overlay" style="place-items:stretch;padding:0;background:rgba(8,5,12,.5)"><div class="drawer" role="dialog" aria-label="行动日志"><div style="display:flex;justify-content:space-between;align-items:center"><h2 class="h-title" style="margin:0;font-size:18px;color:var(--gold-hi)">行动日志</h2><button class="btn sm ghost" id="lx">关闭</button></div><div class="chips"><button class="chip" aria-pressed="true" data-f="0">全部</button><button class="chip" aria-pressed="false" data-f="1">只看杀人与揭穿</button></div><div class="loglist"></div></div></div>`);
    const list = d.querySelector('.loglist');
    const draw = () => {
      let r = -1, html = '', round = 1;
      const rows = [];
      for (const e of G.log) { if (e.t === 'round') round = e.round; const t = describe(e); if (t && (!only || ['kill', 'accuse'].includes(e.t))) rows.push([round, e, t]); }
      for (const [rd, e, t] of rows.reverse()) { if (rd !== r) { r = rd; html += `<div class="rd">第 ${r} 轮</div>`; } html += `<div class="le ${e.t === 'kill' ? 'k' : ''}">${t}</div>`; }
      list.innerHTML = html || '<div class="hint">还没有发生任何事。</div>';
    };
    draw();
    const close = () => { sfx('modalClose'); d.remove(); };
    d.querySelector('#lx').onclick = close;
    d.addEventListener('click', e => { if (e.target === d) close(); });
    d.querySelectorAll('.chip').forEach(b => (b.onclick = () => { sfx('uiClick'); only = b.dataset.f === '1'; d.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); }));
    sfx('modalOpen');
    document.body.append(d);
  }

  // ---------- 骰子 ----------
  const DFIN = { red: [0, 0], blue: [0, -90], green: [0, -180], purple: [0, 90], yellow: [-90, 0], black: [90, 0] };
  async function rollDice(face, who) {
    const mid = isMid();
    if (catchup) { toast(describe({ t: 'roll', p: who, face })); return; }
    const ov = h(`<div class="overlay dice-ov"><div class="dicebox"><div class="eyebrow">${nm(who)} 掷骰子</div><div class="scene"><div class="cube">${['red', 'blue', 'green', 'purple', 'yellow', 'black'].map(f => `<div class="fc f-${f}">${f === 'black' || (f === 'yellow' && mid) ? ICON.knife : f === 'yellow' ? ICON.eye : FACE[f].lb}</div>`).join('')}</div></div><div class="diceres"></div></div></div>`);
    document.body.append(ov);
    const cube = ov.querySelector('.cube');
    cube.style.transform = `rotateX(${(Math.random() * 360) | 0}deg) rotateY(${(Math.random() * 360) | 0}deg)`;
    cube.getBoundingClientRect();
    sfx('diceShake');
    await sleep(120);
    sfx('diceRoll');
    const [fx, fy] = DFIN[face];
    cube.style.transition = `transform ${sp(1200)}ms cubic-bezier(.15,.65,.25,1)`;
    cube.style.transform = `rotateX(${fx + 720}deg) rotateY(${fy + 1080}deg)`;
    await sleep(1200);
    sfx('diceLand');
    if (effFace(face) === 'black') setTimeout(() => sfx('diceResultKill'), 120);
    ov.querySelector('.diceres').innerHTML = `<b style="color:${face === 'black' ? '#ff6a7a' : `var(--z-${face})`}">${FACE[face].name}</b><span>${face === 'yellow' && mid ? '午夜：黄色也是杀人' : FACE[face].txt}</span>`;
    await sleep(who === ME ? 900 : 700);
    ov.remove();
  }

  // ---------- 事件动画（所有人看到的公开内容） ----------
  async function play(e) {
    if (e.t === 'turn') {
      render();
      if (e.p === ME) { sfx('turnStart'); if (!catchup) await banner('你的回合', 700); }
      else sfx('aiTurn');
    } else if (e.t === 'roll') {
      await rollDice(e.face, e.p);
    } else if (e.t === 'move') {
      if (e.cause === 'ghost') { const g = h('<div class="ghost-fx">👻</div>'); document.body.append(g); sfx('ghost'); await sleep(700); setTimeout(() => g.remove(), 1200); }
      if (e.cause === 'chaos') sfx('chaos');
      flipPlace(e.cid);
      sfx(e.zone === E.CONTROL ? 'enterControl' : 'move');
      flashZone(e.zone);
      toast(describe(e), G.players[e.p].color);
      render();
      await sleep(750);
    } else if (e.t === 'kill') {
      flashZone(e.zone);
      const el = tokEls[e.cid];
      sfx('knifeSwish');
      el.append(h('<i class="slash"></i>'));
      const fx = h('<div class="fx killflash"></div>'); document.body.append(fx); setTimeout(() => fx.remove(), 700);
      await sleep(260); sfx('kill'); sfx('scream');
      setTimeout(() => { const s = el.querySelector('.slash'); s && s.remove(); }, 400);
      flipPlace(-1); render();
      toast(describe(e), 'var(--danger)');
      await sleep(400);
      const isP = e.owner >= 0;
      if (!catchup || e.owner === ME) await reveal({
        cid: e.cid, stamp: !isP ? 'NPC' : e.owner === ME ? '是你' : esc(G.players[e.owner].name), kind: isP ? 'player' : 'npc', sound: isP ? 'revealPlayer' : 'revealNpc',
        caption: `${pn(e.p)} 掷出黑色。<br>${G.chars[e.cid].name} 死在 ${zn(e.zone)}。${isP ? (e.owner === ME ? '<br><b style="color:var(--danger)">那是你。</b>' : `<br>原来是玩家 ${pn(e.owner)}！`) : '<br>只是一位普通宾客。'}${e.p !== ME ? `<br><span class="hint">现在你知道：${nm(e.p)} 有角色在 ${Z[e.zone].c}·${Z[e.zone].n}。</span>` : ''}`,
        auto: e.owner === ME ? 0 : 2200,
      });
      await afterDeath(e.elim);
    } else if (e.t === 'monitor') {
      sfx('monitorScan'); flashZone(E.CONTROL);
      toast(describe(e), G.players[e.p].color);
      await sleep(e.p === ME ? 500 : 900);
    } else if (e.t === 'accuse') {
      sfx('token'); render();
      toast(`⚖ ${pn(e.p)} 站了起来：“${pn(e.q)}，你就是 ${G.chars[e.cid].name}！”`, G.players[e.p].color);
      await sleep(500);
      sfx('accuseDrum');
      await reveal({
        cid: e.cid, spotlight: true, delay: 1300, stamp: e.correct ? '揭穿！' : '错了', kind: e.correct ? 'right' : 'wrong', sound: e.correct ? 'accuseRight' : 'accuseWrong',
        caption: `${pn(e.p)} 指认 ${pn(e.q)} 就是 ${G.chars[e.cid].name}。<br>${e.correct ? `<b style="color:var(--ok)">猜对了！</b>${G.chars[e.cid].name} 当场倒下。` : `<b style="color:var(--danger)">猜错了。</b>${e.q === ME ? '' : `${nm(e.q)} 现在知道了 ${nm(e.p)} 的真实身份。`}`}`,
        auto: e.q === ME && e.correct ? 0 : 2200,
      });
      flipPlace(-1); render();
      if (e.correct) await afterDeath(e.elim);
      else if (e.p === ME) { sfx('secretLeak'); await modal({ title: '你的身份泄露了', body: `${pn(e.q)} 现在知道你是谁了。<br><span class="hint">小心：轮到 ${nm(e.q)} 时，他可能会来找你。</span>`, buttons: [{ label: '我会小心', value: 1, kind: 'primary' }] }); }
    } else if (e.t === 'skip') { toast(describe(e)); await sleep(500); }
    else if (e.t === 'midnight') await midnight();
    else if (e.t === 'round') render();
  }
  function flashZone(z) { const el = ui.board && ui.board.querySelector(`.house .z${z}`); if (!el) return; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), sp(900)); }
  async function afterDeath(elim) {
    if (elim < 0 || elim === undefined) return;
    if (elim === ME) {
      sfx('eliminated');
      if (G.over) return;
      const online = conn && conn.online;
      const v = await modal({ title: '你被杀了', body: `你的最后一个身份倒下了。你变成了幽灵，每轮结束会把一位宾客拖到别的房间。<br>${online ? '你可以继续观战，看谁能活到最后。' : '要看看谁能活到最后吗？'}`, buttons: online ? [{ label: '继续观战', value: 'watch', kind: 'primary' }] : [{ label: '再来一局', value: 'new' }, { label: '观战到结束', value: 'watch', kind: 'primary' }] });
      if (v === 'new') { showSetup(); return; }
      if (!online) { fast = true; const b = document.getElementById('b-fast'); b && b.setAttribute('aria-pressed', 'true'); }
    } else toast(`💀 ${pn(elim)} 出局了，变成了幽灵`, 'var(--danger)');
  }
  async function midnight() {
    Music.duck(true); sfx('midnight'); Music.setMode('midnight');
    if (catchup) { Music.duck(false); toast('🕛 午夜来临：黄色也变成杀人', 'var(--danger)'); return; }
    const ov = h(`<div class="midnight"><div><div class="clockface"></div><div class="neon" style="font-size:42px">Midnight</div><h2 class="h-title" style="color:var(--gold-hi);font-size:28px;margin:10px 0">午夜十二点</h2><p style="max-width:30ch;margin:0 auto 18px;color:var(--ink)">灯熄了。从现在起，骰子的<b style="color:var(--z-yellow)">黄色面</b>也是杀人。</p><button class="btn primary">继续</button></div></div>`);
    document.body.append(ov);
    await new Promise(r => { const t = setTimeout(r, sp(4200)); ov.querySelector('button').onclick = () => { sfx('uiClick'); clearTimeout(t); r(); }; });
    ov.remove(); Music.duck(false); render();
  }

  // ---------- 轮到我：根据主机的提问收集操作 ----------
  function cancelPrompt() {
    ui.prompting = false;
    if (ui.cancelSel) ui.cancelSel();
    document.querySelectorAll('.overlay.is-prompt').forEach(o => o._close ? o._close(undefined) : o.remove());
  }
  function maybePrompt() {
    const pd = G && G.pending;
    if (ui.prompting && (!pd || pd.n !== ui.prompting)) cancelPrompt();
    if (!pd || pd.seat !== ME || G.over || playing && queue.length) return;
    if (pd.n === promptN) return;
    promptN = pd.n;
    ui.prompting = pd.n;
    humanPrompt(pd).catch(err => console.error(err)).finally(() => { if (ui.prompting === pd.n) ui.prompting = false; });
  }
  async function humanPrompt(pd) {
    const n = pd.n, my = session;
    const live = () => my === session && G.pending && G.pending.n === n && ui.prompting === n;
    const send = it => { if (!live()) return; conn.send({ n, ...it }); ui.prompting = false; setActions('busy', { text: '……' }); };
    const confirm = async (title, body, yes = '确认', kind = 'primary') => (await modal({ title, body, prompt: true, dismiss: 'no', buttons: [{ label: '换一个', value: 'no', kind: 'ghost' }, { label: yes, value: 'yes', kind }] })) === 'yes';
    if (pd.phase === 'act') {
      for (;;) {
        const choice = await new Promise(resolve => setActions('human', { resolve }));
        if (!live()) return;
        if (choice === 'roll') return send({ type: 'roll' });
        const t = E.accuseTargets(G, ME);
        const c = await selectChar({ eligible: t, prompt: '揭穿：选择你要指认的角色（必须和你同房间）', cancel: true });
        if (!live()) return;
        if (c === null) continue;
        const opp = E.opponents(G, ME);
        const q = await modal({
          title: `${G.chars[c].name} 是谁？`, body: '你认为这个角色是哪位玩家扮演的？', prompt: true, dismiss: 'x', buttons: [{ label: '取消', value: 'x', kind: 'ghost' }], mount: (m, close) => {
            const g = h(`<div class="playerpick">${opp.map(p => { const nt = noteFor(p.id); const pr = nt ? (nt.sus.find(([x]) => x === c) || [0, 0])[1] : 0; return `<button data-q="${p.id}"><i class="dot" style="width:12px;height:12px;border-radius:50%;background:${p.color}"></i><b>${esc(p.name)}</b><small>笔记推算 ${pr}%</small></button>`; }).join('')}</div>`);
            m.querySelector('.body').append(g);
            g.querySelectorAll('button').forEach(b => (b.onclick = () => { sfx('selectPick'); close(+b.dataset.q); }));
          },
        });
        if (!live()) return;
        if (q === 'x' || q === undefined) continue;
        if (!(await confirm('确认揭穿', `指认 ${pn(q)} 就是 ${cn(c)}？<br><span class="hint">消耗你的揭穿代币。猜错的话，${esc(G.players[q].name)} 会看到你的真实身份。</span>`, '揭穿！', 'danger'))) { if (!live()) return; continue; }
        return send({ type: 'accuse', cid: c, q });
      }
    }
    if (pd.phase === 'move' || pd.phase === 'fallback') {
      const el = E.movableTo(G, pd.z);
      if (pd.phase === 'fallback') toast('你的房间里没有别人。改为：拉一个人进你的房间。', 'var(--danger)');
      for (;;) {
        const c = await selectChar({ eligible: el, prompt: pd.phase === 'fallback' ? `没人可杀。选一个人拉进 ${zn(pd.z)}（别人会知道你在这里）` : `选择一个角色，移进 ${zn(pd.z)}` });
        if (!live() || c === null) return;
        if (pd.phase === 'fallback' || (await confirm('确认移动', `把 ${cn(c)} 移到 ${zn(pd.z)}？`))) return send({ cid: c });
        if (!live()) return;
      }
    }
    if (pd.phase === 'yellow') {
      const canM = E.canMonitor(G, ME);
      const v = await modal({
        title: '黄色：控制室', body: '选择一项：', prompt: true, mount: (m, close) => {
          const g = h(`<div class="optcards"><button class="optcard" data-v="move"><b>移动</b><span>把一个角色移进控制室</span></button><button class="optcard" data-v="mon" ${canM ? '' : 'disabled'}><b>监控</b><span>${canM ? '私下查出一个角色是玩家还是 NPC' : '你的角色不在控制室，不能监控'}</span></button></div>`);
          m.querySelector('.body').append(g);
          g.querySelectorAll('.optcard').forEach(b => (b.onclick = () => { if (b.disabled) return sfx('uiDisabled'); sfx('uiClick'); close(b.dataset.v); }));
        },
      });
      if (!live()) return;
      const el = v === 'mon' ? E.monitorTargets(G, ME) : E.movableTo(G, E.CONTROL);
      for (;;) {
        const c = await selectChar({ eligible: el, prompt: v === 'mon' ? '选择要监控的角色（结果只有你知道）' : `选择一个角色，移进 ${zn(E.CONTROL)}` });
        if (!live() || c === null) return;
        if (await confirm(v === 'mon' ? '确认监控' : '确认移动', v === 'mon' ? `调出 ${cn(c)} 的监控录像？` : `把 ${cn(c)} 移到 ${zn(E.CONTROL)}？`, v === 'mon' ? '监控' : '确认')) return send({ mode: v, cid: c });
        if (!live()) return;
      }
    }
    if (pd.phase === 'kill') {
      const t = E.killTargets(G, ME);
      for (;;) {
        const c = await selectChar({ eligible: t, prompt: '<span style="color:#ff8a96">选择你要杀死的人</span>' });
        if (!live() || c === null) return;
        if (await confirm('确认下手', `杀死 ${cn(c)}？<br><span class="hint">动手之后，所有人都会知道你有角色在 ${Z[G.chars[c].zone].c}·${Z[G.chars[c].zone].n}。</span>`, '动手', 'danger')) return send({ cid: c });
        if (!live()) return;
      }
    }
    if (pd.phase === 'chaos') {
      const inZone = G.chars.filter(x => x.alive && x.zone === pd.zone).map(x => x.id);
      if (!inZone.length) return send({ cid: null });
      const v = await modal({ title: '制造混乱？', body: '你可以从案发现场移走一个人：<br>· 移走<b>自己</b>，就是逃跑；<br>· 移走<b>别人</b>，就是转移视线。<br>别人分不清你是哪一种。', prompt: true, buttons: [{ label: '不动', value: 'no', kind: 'ghost' }, { label: '移走一个人', value: 'yes', kind: 'primary' }] });
      if (!live()) return;
      if (v !== 'yes') return send({ cid: null });
      const who = await selectChar({ eligible: inZone, prompt: '选择要离开现场的人', cancel: true });
      if (!live()) return;
      if (who === null) return send({ cid: null });
      const z = await pickZone('去哪里？', `${cn(who)} 要去：`, pd.zone);
      if (!live()) return;
      return send({ cid: who, zone: z });
    }
  }

  // ---------- 结算 ----------
  function showResult() { Scene.setMode('full');
    if (resultShown) return;
    resultShown = true;
    const w = G.winner;
    const iWon = w === ME;
    sfx(w === null ? 'dawn' : iWon ? 'win' : 'lose'); Music.setMode('party');
    const online = conn && conn.online;
    app.innerHTML = '';
    const deaths = G.chars.filter(c => !c.alive).length;
    const s = h(`<section class="screen" id="result"><div class="eyebrow">派对结束 · 共 ${G.round} 轮 · ${deaths} 人死亡</div>
      <div class="neon" style="font-size:clamp(30px,8vw,54px)">${w === null ? 'Dawn' : iWon ? 'You Survived' : 'Game Over'}</div>
      <h1 class="h-title" style="margin:0;font-size:28px;color:var(--gold-hi)">${w === null ? '天亮了，派对散场，无人胜出' : iWon ? '你是最后的幸存者' : `${esc(G.players[w].name)} 赢了`}</h1>
      <div class="deco-rule" style="width:240px"></div>
      <p class="hint" style="margin:0">揭开所有假面：</p>
      <div class="result-grid">${G.players.map(p => (endIds[p.id] || []).map(c => `<div class="who ${p.id === w ? 'win' : ''}"><div class="crown" ${p.id === w ? '' : 'style="visibility:hidden"'}>👑</div>${flipCard(c, G.chars[c].alive ? '' : '已死', 'player')}<div><b style="color:${p.color}">${nm(p.id)}</b>${p.ai && online ? ' <span class="hint">AI</span>' : ''}</div></div>`).join('')).join('')}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="btn ghost" id="r-log">查看日志</button><button class="btn" id="r-home">回到大厅</button><button class="btn primary" id="r-again">${online ? (ME === 0 ? '再开一个房间' : '回到联机大厅') : '再来一局'}</button></div></section>`);
    app.append(s);
    s.querySelectorAll('.flip').forEach((f, i) => setTimeout(() => { f.classList.add('flipped'); sfx('cardFlip'); const st = f.querySelector('.stamp'); st && setTimeout(() => st.classList.add('show'), 600); }, 700 + i * 450));
    s.querySelector('#r-again').onclick = () => { sfx('uiClick'); if (online) showOnline(); else showSetup(); };
    s.querySelector('#r-home').onclick = () => { sfx('uiClick'); showTitle(); };
    s.querySelector('#r-log').onclick = () => { sfx('uiClick'); showLog(); };
    if (iWon) confetti();
  }
  function confetti() {
    const cv = document.getElementById('confetti'); cv.hidden = false;
    const ctx = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
    const cols = ['#d9b56a', '#f3dca0', '#d04556', '#4a86d8', '#3fa070', '#9562d0', '#e6b43c'];
    const ps = Array.from({ length: 160 }, () => ({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.5, vx: Math.random() * 2 - 1, vy: 2 + Math.random() * 3, r: Math.random() * 6.28, vr: Math.random() * 0.2 - 0.1, c: cols[(Math.random() * cols.length) | 0], s: 5 + Math.random() * 6 }));
    let t = 0;
    (function f() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
      if (++t < 260) requestAnimationFrame(f); else { cv.hidden = true; }
    })();
  }

  window.__mp = { get G() { return G; }, get priv() { return priv; }, setFast: v => (fast = v) };
  Scene.mount();
  applyMotion();
  showTitle();
})();
