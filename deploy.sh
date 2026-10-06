#!/usr/bin/env bash
# 一键部署 Miaoverse 前端到服务器（构建 -> 同步 -> 重启服务）
# 用法: ./deploy.sh
set -euo pipefail

HOST="${DEPLOY_HOST:-root@103.24.219.216}"
REMOTE_DIR="${REMOTE_DIR:-/opt/miaoverse-frontend}"

cd "$(dirname "$0")"

echo "==> [1/3] 本地构建 nuxt ..."
npm run build

echo "==> [2/3] 同步 .output 到 ${HOST}:${REMOTE_DIR}/.output/ ..."
rsync -az --delete -e ssh .output/ "${HOST}:${REMOTE_DIR}/.output/"

echo "==> [3/3] 重启 miaoverse-frontend 服务 ..."
ssh "${HOST}" 'systemctl restart miaoverse-frontend.service && sleep 2 && systemctl is-active miaoverse-frontend.service'

echo "==> 部署完成: http://103.24.219.216:18080/"
