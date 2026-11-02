# AGENTS.md

网页游戏《暗夜派对》。根目录就是可以直接部署到 Zeabur 的 Node.js 服务。

- 改游戏只改 `src/`，然后运行 `sh scripts/build.sh` 重新生成 `public/index.html` 和 `game/`。不要手改这两处。
- `src/engine.js` 规则引擎与 AI；`src/board.js` 等距 3D 豪宅棋盘（房间绘制与宾客站位）；`src/net.js` 裁判流程与联机（服务器复用）；`src/app.js` 界面；`src/art.js` 角色 SVG；`src/sfx.js` 音效；`src/music.js` 背景音乐；`src/shell.html` 样式。
- `node src/sim.js`：每种人数自动跑 1000 局，改规则后先用它对比平衡数据。
- 当前规则：揭穿代币 1 枚；杀人后可“制造混乱”；第 20 轮午夜；第 50 轮天亮平局。
- 界面文字全部用简体中文。玩家只能收到自己的私密信息，服务器绝不能把别人的身份或 cid 发给客户端。
