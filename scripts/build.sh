#!/bin/sh
# 从 src/ 构建：生成 public/index.html，并把引擎复制给服务器用
set -e
cd "$(dirname "$0")/.."
python3 src/build.py >/dev/null
cp src/engine.js src/net.js game/
python3 - <<'PY'
shell = open('src/dist/midnight-party.html').read()
head = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style><script>window.MP_SERVER=true</script></head><body>'
open('public/index.html', 'w').write(head + shell + '</body></html>')
PY
echo "built public/index.html"
