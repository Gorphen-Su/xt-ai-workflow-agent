#!/usr/bin/env bash
# ensure-codegraph.sh — 幂等检测并安装 codegraph CLI，并初始化当前项目的代码索引
#
# 用法:
#   bash ensure-codegraph.sh [project-root]
#
# 行为（全部幂等，可安全重复运行）:
#   1. 检测 Node.js / npm —— 缺失则报错退出并给出安装建议
#   2. 检测 codegraph CLI 是否在 PATH —— 缺失则 `npm install -g @colbymchenry/codegraph`
#   3. 检测项目根的 .codegraph 目录 —— 缺失则 `codegraph init -i`（初始化 + 全量索引）
#   4. 打印 `codegraph status`，报告索引健康度
#
# 注意: 本脚本只负责 CLI 安装与项目索引，不会修改 Claude Code 的全局配置。
#       把 codegraph 注册为 Claude Code 的 MCP server 请在对话中单独执行:
#         codegraph install --target=claude --yes
#
# 退出码: 0=成功  1=依赖缺失(node/npm)  2=安装或索引失败

set -euo pipefail

PROJECT_ROOT="${1:-$PWD}"
cd "$PROJECT_ROOT"

log()  { printf '[codegraph] %s\n' "$*"; }
fail() { printf '[codegraph][错误] %s\n' "$*" >&2; exit "${2:-2}"; }

# --- 步骤 1: 依赖检测 -------------------------------------------------------
command -v node >/dev/null 2>&1 || fail "未检测到 Node.js，请先安装 Node.js (建议 >= 18)" 1
command -v npm  >/dev/null 2>&1 || fail "未检测到 npm，请随 Node.js 一并安装 npm" 1

# --- 步骤 2: codegraph CLI 检测与全局安装 -----------------------------------
if command -v codegraph >/dev/null 2>&1; then
  log "CLI 已安装: $(codegraph --version 2>/dev/null || echo '已就绪')"
else
  log "未检测到 codegraph CLI，开始全局安装 @colbymchenry/codegraph ..."
  # Windows 下若因权限失败，提示用户用管理员终端或配置 npm 前缀
  if ! npm install -g @colbymchenry/codegraph; then
    fail "全局安装失败。Windows 请用管理员终端重试，或先执行 'npm config set prefix ~/.npm-global' 后再将对应 bin 加入 PATH"
  fi
  command -v codegraph >/dev/null 2>&1 || fail "安装完成但仍找不到 codegraph 命令，请重开终端使 PATH 生效后重试" 2
  log "安装完成: $(codegraph --version 2>/dev/null || echo '已就绪')"
fi

# --- 步骤 3: 项目初始化（含全量索引） ---------------------------------------
if [ -d ".codegraph" ]; then
  log "项目已初始化（.codegraph 目录存在），跳过 init。如需重建索引: codegraph index --force"
else
  log "项目尚未初始化，执行 codegraph init -i（初始化 + 全量索引，大项目可能需要数分钟）..."
  codegraph init -i || fail "codegraph init -i 执行失败"
fi

# --- 步骤 4: 索引状态报告 ---------------------------------------------------
log "当前索引状态:"
codegraph status || true

log "完成。若 Claude Code 尚未注册 codegraph MCP，请在对话中执行: codegraph install --target=claude --yes"
