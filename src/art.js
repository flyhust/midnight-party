// ===== 20 个角色的 SVG 头像（Art Deco 派对风）=====
const Art = (() => {
  const INK = '#2a1d24';
  const body = f => `<path d="M12 100 C14 80 30 71 50 71 C70 71 86 80 88 100Z" fill="${f}"/>`;
  const neck = s => `<rect x="44" y="60" width="12" height="14" rx="3" fill="${s}"/>`;
  const head = s => `<circle cx="31.5" cy="50" r="4" fill="${s}"/><circle cx="68.5" cy="50" r="4" fill="${s}"/><circle cx="50" cy="48" r="19" fill="${s}"/>`;
  const eyes = (c = INK) => `<circle cx="43" cy="49" r="2.3" fill="${c}"/><circle cx="57" cy="49" r="2.3" fill="${c}"/>`;
  const smile = (c = '#8a3a3a') => `<path d="M44 57 Q50 62 56 57" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  const flat = (c = '#8a3a3a') => `<path d="M45 58 L55 58" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`;
  const cheeks = c => `<circle cx="38" cy="55" r="3" fill="${c}" opacity=".45"/><circle cx="62" cy="55" r="3" fill="${c}" opacity=".45"/>`;
  const vshirt = (c = '#f4efe6') => `<path d="M40 72 L50 90 L60 72Z" fill="${c}"/>`;
  const bow = c => `<path d="M42 75 L50 79 L42 83Z M58 75 L50 79 L58 83Z" fill="${c}"/><circle cx="50" cy="79" r="2" fill="${c}"/>`;

  const P = [
    // 0 厨师
    s => body('#f4f1ea') + `<circle cx="44" cy="86" r="1.6" fill="#c9c2b4"/><circle cx="56" cy="86" r="1.6" fill="#c9c2b4"/><circle cx="44" cy="94" r="1.6" fill="#c9c2b4"/><circle cx="56" cy="94" r="1.6" fill="#c9c2b4"/>` + neck(s) + `<path d="M41 70 L59 70 L50 80Z" fill="#c8424f"/>` + head(s) + eyes() + smile() + cheeks('#e88') +
      `<rect x="35" y="22" width="30" height="12" rx="2" fill="#fbfaf6" stroke="#d8d2c6"/><circle cx="38" cy="18" r="9" fill="#fbfaf6" stroke="#d8d2c6"/><circle cx="62" cy="18" r="9" fill="#fbfaf6" stroke="#d8d2c6"/><circle cx="50" cy="11" r="11" fill="#fbfaf6" stroke="#d8d2c6"/><rect x="36" y="20" width="28" height="12" fill="#fbfaf6"/>`,
    // 1 医生
    s => body('#eef2f4') + `<path d="M38 72 L50 96 L62 72Z" fill="#7fb3d5"/><path d="M36 72 L50 96 L40 100 L30 78Z M64 72 L50 96 L60 100 L70 78Z" fill="#cfd8dc"/><path d="M40 72 Q38 88 48 90" stroke="#333" stroke-width="2" fill="none"/><circle cx="48" cy="91" r="3" fill="#888"/>` + neck(s) + head(s) +
      `<path d="M32 40 Q50 22 68 40 Q66 30 50 28 Q34 30 32 40Z" fill="#a8a8a8"/>` + eyes() + flat() + `<path d="M31 38 Q50 30 69 38" stroke="#555" stroke-width="2.5" fill="none"/><circle cx="50" cy="33" r="7" fill="#e3eaee" stroke="#8b949e" stroke-width="2"/><circle cx="50" cy="33" r="2" fill="${INK}"/>`,
    // 2 歌手
    s => `<path d="M28 46 C24 70 20 82 30 92 L70 92 C80 82 76 70 72 46 C72 26 28 26 28 46Z" fill="#b8323f"/>` + body('#c23a6b') + `<g fill="#f3d27a"><circle cx="30" cy="90" r="1.3"/><circle cx="40" cy="84" r="1.3"/><circle cx="62" cy="88" r="1.3"/><circle cx="72" cy="92" r="1.3"/><circle cx="50" cy="94" r="1.3"/></g>` + neck(s) + head(s) +
      `<path d="M31 46 C30 28 50 22 62 30 C54 30 46 36 38 50Z" fill="#b8323f"/>` + eyes() + `<path d="M40 46 L38 44 M60 46 L62 44" stroke="${INK}" stroke-width="1.5"/>` + `<ellipse cx="50" cy="58" rx="4" ry="2.4" fill="#d22a3c"/>` + cheeks('#f08'),
    // 3 魔术师
    s => body('#1e1a24') + `<path d="M12 100 C14 82 22 74 36 72 L30 100Z M88 100 C86 82 78 74 64 72 L70 100Z" fill="#a3243b"/>` + vshirt() + bow('#111') + neck(s) + head(s) + eyes() +
      `<path d="M42 55 Q46 52 50 55 Q54 52 58 55" stroke="#222" stroke-width="2" fill="none"/><path d="M45 59 Q50 61 55 59" stroke="#8a3a3a" stroke-width="1.8" fill="none"/>` +
      `<ellipse cx="50" cy="31" rx="24" ry="4.5" fill="#111"/><rect x="36" y="3" width="28" height="28" rx="2" fill="#151218"/><rect x="36" y="23" width="28" height="5" fill="#a3243b"/>`,
    // 4 管家
    s => body('#23202a') + vshirt() + bow('#0c0b0e') + neck(s) + head(s) + `<path d="M31 44 C31 26 69 26 69 44 C64 34 54 32 46 33 L44 38 C40 34 34 38 31 44Z" fill="#2b2320"/><path d="M46 33 L44 39" stroke="#6a5a50" stroke-width="1"/>` + eyes() + flat(),
    // 5 诗人
    s => body('#6b4a3a') + neck(s) + `<path d="M36 70 Q50 78 64 70 L64 76 Q50 84 36 76Z" fill="#6a8f5a"/><path d="M58 76 L62 98 L54 98 L54 78Z" fill="#6a8f5a"/>` + head(s) +
      `<path d="M30 46 C26 30 40 22 50 26 C60 20 76 30 70 46 C66 38 64 34 58 34 C54 38 46 36 42 33 C38 36 34 40 30 46Z" fill="#4a3426"/>` + eyes() + smile() +
      `<path d="M68 46 Q80 26 84 10 Q76 20 70 38Z" fill="#f2ead8" stroke="#bfb39a"/><path d="M69 44 L83 12" stroke="#8a7a5a" stroke-width="1"/>`,
    // 6 修女
    s => `<path d="M24 50 C22 30 36 22 50 22 C64 22 78 30 76 50 L82 96 L18 96Z" fill="#141217"/>` + body('#1b1820') + `<path d="M36 72 Q50 82 64 72 L62 80 Q50 88 38 80Z" fill="#f1efe9"/><path d="M50 84 L50 96 M45 88 L55 88" stroke="#d9b56a" stroke-width="2.5"/>` + neck(s) +
      `<circle cx="50" cy="48" r="22" fill="#f1efe9"/><circle cx="50" cy="49" r="17" fill="${s}"/>` + eyes() + smile('#9a5a5a'),
    // 7 作家
    s => body('#2f4a40') + `<rect x="38" y="62" width="24" height="14" rx="6" fill="#3a5a4e"/><path d="M40 66 H60 M40 70 H60" stroke="#2a4239" stroke-width="1.5"/>` + head(s) +
      `<g fill="#3b2a20"><circle cx="36" cy="36" r="7"/><circle cx="44" cy="31" r="7"/><circle cx="53" cy="30" r="7"/><circle cx="62" cy="33" r="7"/><circle cx="67" cy="40" r="5"/></g>` + eyes() +
      `<circle cx="43" cy="49" r="6" fill="none" stroke="#1a1a1a" stroke-width="2"/><circle cx="57" cy="49" r="6" fill="none" stroke="#1a1a1a" stroke-width="2"/><path d="M49 49 H51" stroke="#1a1a1a" stroke-width="2"/>` + flat(),
    // 8 园丁
    s => body('#5f7d4a') + `<rect x="38" y="76" width="24" height="24" fill="#4b6a3a"/><path d="M40 76 L36 72 M60 76 L64 72" stroke="#3a4f2c" stroke-width="3"/>` + neck(s) + head(s) + eyes() + smile() + cheeks('#c55') +
      `<ellipse cx="50" cy="34" rx="31" ry="6" fill="#e0c06a"/><path d="M34 34 C34 18 66 18 66 34Z" fill="#d6b45a"/><rect x="34" y="29" width="32" height="4" fill="#8a5a2b"/>` +
      `<g transform="translate(70 56)"><circle r="3" cx="0" cy="-4" fill="#f78fb3"/><circle r="3" cx="4" cy="0" fill="#f78fb3"/><circle r="3" cx="0" cy="4" fill="#f78fb3"/><circle r="3" cx="-4" cy="0" fill="#f78fb3"/><circle r="2" fill="#ffd54f"/></g>`,
    // 9 记者
    s => body('#b89a6a') + `<path d="M36 72 L44 100 L50 80 L56 100 L64 72 L50 78Z" fill="#a3865a"/>` + neck(s) + head(s) + eyes() + flat() +
      `<ellipse cx="50" cy="33" rx="26" ry="4.5" fill="#4a4038"/><path d="M36 33 C36 16 64 16 64 33Z" fill="#584c43"/><path d="M44 20 Q50 24 56 20" stroke="#3a3029" stroke-width="2" fill="none"/><rect x="36" y="27" width="28" height="5" fill="#2a2420"/>` +
      `<g transform="rotate(-12 60 24)"><rect x="54" y="18" width="13" height="9" fill="#fff" stroke="#999" stroke-width=".5"/><text x="60.5" y="25" font-size="4.5" text-anchor="middle" font-family="sans-serif" font-weight="700" fill="#c8424f">PRESS</text></g>`,
    // 10 女伯爵
    s => body(s) + `<path d="M16 100 C18 86 30 80 50 82 C70 80 82 86 84 100Z" fill="#6b2f7a"/>` + `<g fill="#fdfbf3">${[30, 36, 42, 50, 58, 64, 70].map((x, i) => `<circle cx="${x}" cy="${74 + [3, 6, 8, 9, 8, 6, 3][i]}" r="2"/>`).join('')}</g>` + neck(s) +
      `<circle cx="50" cy="20" r="9" fill="#e8d7a8"/>` + head(s) + `<path d="M31 46 C30 28 70 28 69 46 C64 34 36 34 31 46Z" fill="#e8d7a8"/>` +
      `<path d="M38 30 L41 22 L45 28 L50 18 L55 28 L59 22 L62 30Z" fill="#e8c35a" stroke="#b08a30" stroke-width=".8"/><circle cx="50" cy="24" r="2" fill="#c8424f"/>` + eyes() + `<ellipse cx="50" cy="58" rx="3.5" ry="2" fill="#b5304a"/>`,
    // 11 船长
    s => body('#1f3558') + `<g fill="#e2b33c"><circle cx="44" cy="84" r="2"/><circle cx="56" cy="84" r="2"/><circle cx="44" cy="93" r="2"/><circle cx="56" cy="93" r="2"/></g>` + neck(s) + head(s) +
      `<path d="M32 50 C32 72 68 72 68 50 C64 60 58 62 50 62 C42 62 36 60 32 50Z" fill="#efefef"/><path d="M42 56 Q50 52 58 56 Q50 59 42 56Z" fill="#f7f7f7"/>` + eyes() +
      `<path d="M30 36 C30 22 70 22 70 36Z" fill="#f2f2f2" stroke="#ccc"/><rect x="30" y="34" width="40" height="5" fill="#1c1c22"/><path d="M32 39 Q50 46 68 39 L68 41 Q50 49 32 41Z" fill="#111"/><path d="M50 26 V32 M47 30 Q50 34 53 30" stroke="#d9b56a" stroke-width="1.6" fill="none"/>`,
    // 12 画家
    s => body('#7d8fa8') + `<circle cx="34" cy="88" r="4" fill="#f3c84b"/><circle cx="60" cy="92" r="3" fill="#4caf50"/><circle cx="68" cy="84" r="3.5" fill="#e04b4b"/>` + neck(s) + head(s) +
      `<path d="M31 50 C28 30 72 30 69 50 L69 58 L64 58 C66 44 60 38 50 38 C40 38 34 44 36 58 L31 58Z" fill="#222"/>` + eyes() + smile() + `<circle cx="61" cy="55" r="2.6" fill="#3f7fd0"/>` +
      `<ellipse cx="46" cy="30" rx="20" ry="7" fill="#c0392b" transform="rotate(-10 46 30)"/><rect x="47" y="20" width="3" height="4" fill="#9a2a20"/>`,
    // 13 舞者
    s => body('#f6a5c8') + `<path d="M38 72 L42 100 M62 72 L58 100" stroke="#e57aa8" stroke-width="2"/>` + neck(s) + head(s) + `<circle cx="50" cy="28" r="8" fill="#1d1418"/><path d="M31 48 C30 32 70 32 69 48 C62 38 38 38 31 48Z" fill="#1d1418"/>` +
      `<path d="M50 22 L30 12 L32 30Z M50 22 L70 12 L68 30Z" fill="#ff7eb6" stroke="#e05a97" stroke-width="1"/><circle cx="50" cy="22" r="4" fill="#e05a97"/>` + eyes() + smile() + cheeks('#ff6fa0'),
    // 14 调酒师
    s => body('#f4efe6') + `<path d="M14 100 C16 82 30 74 40 72 L46 100Z M86 100 C84 82 70 74 60 72 L54 100Z" fill="#6d2233"/><path d="M48 74 L52 74 L53 92 L50 96 L47 92Z" fill="#111"/>` + neck(s) + head(s) +
      `<path d="M31 44 C31 26 69 26 69 44 C66 36 56 32 50 34 C44 32 34 36 31 44Z" fill="#3a2a20"/>` + eyes() + `<path d="M38 58 C42 52 48 54 50 56 C52 54 58 52 62 58 C58 56 54 58 50 58 C46 58 42 56 38 58Z" fill="#3a2a20"/>`,
    // 15 将军
    s => body('#4f5a34') + `<rect x="16" y="76" width="14" height="5" rx="2" fill="#e2b33c"/><rect x="70" y="76" width="14" height="5" rx="2" fill="#e2b33c"/><g><rect x="34" y="82" width="5" height="4" fill="#c8424f"/><circle cx="36.5" cy="90" r="2.5" fill="#e2b33c"/><rect x="41" y="82" width="5" height="4" fill="#3f7fd0"/><circle cx="43.5" cy="90" r="2.5" fill="#e2b33c"/></g>` + neck(s) + head(s) + eyes() +
      `<path d="M42 56 Q50 52 58 56 L56 58 Q50 56 44 58Z" fill="#9a9a9a"/>` + flat('#6a2a2a') +
      `<path d="M28 36 C30 18 70 18 72 36Z" fill="#56623a"/><rect x="29" y="33" width="42" height="4" fill="#e2b33c"/><path d="M30 37 Q50 46 70 37 L70 40 Q50 48 30 40Z" fill="#111"/><circle cx="50" cy="28" r="3.5" fill="#e2b33c"/>`,
    // 16 小丑
    s => body('#e8c547') + `<g fill="#c8424f"><circle cx="30" cy="92" r="3"/><circle cx="52" cy="88" r="3"/><circle cx="70" cy="94" r="3"/></g><path d="M30 72 Q36 80 42 72 Q48 80 50 72 Q52 80 58 72 Q64 80 70 72 L70 76 Q50 84 30 76Z" fill="#fbfbfb"/>` + neck(s) +
      `<circle cx="28" cy="40" r="11" fill="#f2a33a"/><circle cx="72" cy="40" r="11" fill="#3fb3e0"/>` + head('#fbf3ec') +
      `<path d="M43 43 L45 49 L43 55 L41 49Z M57 43 L59 49 L57 55 L55 49Z" fill="#3f7fd0" opacity=".7"/>` + eyes() + `<path d="M40 57 Q50 68 60 57" stroke="#d32f2f" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="50" cy="53" r="5" fill="#e53935"/>`,
    // 17 富商
    s => body('#24352c') + `<path d="M24 100 V80 M32 100 V76 M68 100 V76 M76 100 V80" stroke="#355044" stroke-width="1"/>` + vshirt() + `<path d="M48 74 L52 74 L54 94 L50 98 L46 94Z" fill="#d9b56a"/>` + neck(s) + head(s) +
      `<ellipse cx="44" cy="36" rx="6" ry="3" fill="#fff" opacity=".45"/><path d="M31 50 C31 44 33 42 34 46 M69 50 C69 44 67 42 66 46" stroke="#888" stroke-width="3"/>` + eyes() +
      `<circle cx="57" cy="49" r="5.5" fill="none" stroke="#d9b56a" stroke-width="1.8"/><path d="M62 51 Q66 62 62 72" stroke="#d9b56a" stroke-width="1" fill="none"/>` +
      `<path d="M39 56 Q44 51 50 55 Q56 51 61 56 Q56 55 50 57 Q44 55 39 56Z" fill="#9a9a9a"/><rect x="52" y="57" width="16" height="4" rx="1.5" fill="#7a4a2a" transform="rotate(12 52 59)"/><circle cx="67" cy="63" r="2" fill="#ff7043"/>`,
    // 18 钢琴师
    s => `<path d="M28 46 C26 64 28 74 34 76 L66 76 C72 74 74 64 72 46 C70 26 30 26 28 46Z" fill="#1a1418"/>` + body('#121014') + `<path d="M12 100 L22 82 L36 72 L42 100Z" fill="#1d1a22"/>` + vshirt() + bow('#f4efe6') + neck(s) + head(s) +
      `<path d="M31 50 C28 28 72 28 69 50 C62 36 54 34 50 40 C44 34 36 38 31 50Z" fill="#1a1418"/>` + eyes() + flat(),
    // 19 拳击手
    s => `<path d="M6 100 C8 78 28 68 50 68 C72 68 92 78 94 100Z" fill="${s}"/><path d="M24 100 C26 84 34 78 40 76 L60 76 C66 78 74 84 76 100Z" fill="#c62828"/>` + neck(s) + head(s) +
      `<path d="M32 40 C34 28 66 28 68 40 C60 34 40 34 32 40Z" fill="#2a1d18"/><rect x="30" y="36" width="40" height="6" rx="2" fill="#d32f2f"/><path d="M70 39 L80 46 L74 36Z" fill="#d32f2f"/>` + eyes() +
      `<path d="M46 50 L54 56 M54 50 L46 56" stroke="#fafafa" stroke-width="3"/>` + flat() + `<circle cx="16" cy="92" r="9" fill="#c62828"/><circle cx="84" cy="92" r="9" fill="#c62828"/>`,
  ];
  const SKIN = ['#f1c9a5', '#e9b98f', '#f5d0b5', '#f0c39e', '#e8b892', '#f2cfae', '#f3d4ba', '#d9a27c', '#c98e62', '#eac09a', '#f6dcc6', '#e3ae86', '#f0c7a2', '#f7d6c3', '#d8a07a', '#e2a982', '#fbf3ec', '#f0c09a', '#ecc4a3', '#b9784f'];
  const portrait = id => `<svg viewBox="0 0 100 100" aria-hidden="true" class="pt">${P[id](SKIN[id])}</svg>`;
  const cardBack = () => `<svg viewBox="0 0 100 140" class="cb" aria-hidden="true" preserveAspectRatio="none">
    <rect width="100" height="140" fill="#5a1626"/><rect x="5" y="5" width="90" height="130" fill="none" stroke="#d9b56a" stroke-width="1.2"/><rect x="9" y="9" width="82" height="122" fill="none" stroke="#d9b56a" stroke-width=".5"/>
    <g stroke="#d9b56a" stroke-width=".6" fill="none" opacity=".75">${Array.from({ length: 9 }, (_, i) => `<path d="M50 104 L${10 + i * 10} 30"/>`).join('')}<path d="M10 30 Q50 10 90 30"/><path d="M20 44 Q50 28 80 44"/></g>
    <path d="M30 76 Q50 62 70 76 Q66 88 56 86 Q50 80 44 86 Q34 88 30 76Z" fill="#d9b56a"/><circle cx="41" cy="77" r="3.2" fill="#5a1626"/><circle cx="59" cy="77" r="3.2" fill="#5a1626"/>
    <path d="M50 104 L44 116 L50 128 L56 116Z" fill="#d9b56a"/></svg>`;
  return { portrait, cardBack };
})();
