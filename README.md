# 暗夜派对 Midnight Party

1920 年代豪宅派对里的隐藏身份推理游戏。支持单人对战 AI，以及 2–8 人联机（空位由 AI 补上）。

## 运行
```
npm install
npm start          # 默认端口 8080，可用环境变量 PORT 改
```
打开 http://localhost:8080

## 部署到 Zeabur
直接部署这个文件夹即可：Zeabur 会识别为 Node.js 项目，运行 `npm start`，端口由 Zeabur 通过 `PORT` 提供。

## 结构
- `server.js`：HTTP + WebSocket 服务器。服务器担任裁判，每个玩家只收到自己的身份信息。
- `game/engine.js`：规则引擎与 AI。
- `game/net.js`：裁判流程（服务器复用同一份代码）。
- `public/index.html`：游戏页面，由 `src/` 构建（`sh scripts/build.sh`）。
- `src/`：游戏源码。`PLAN.md`：原始设计文档。

房间保存在服务器内存里，服务器重启后进行中的房间会消失。
