#!/bin/bash
# openspec instructions 缓存管理脚本
# 用途：缓存和重用 openspec instructions，减少 CLI 调用次数

set -euo pipefail

# 默认值
CACHE_FILE="${CACHE_FILE:-openspec/.instructions-cache.json}"
CHANGE_NAME="${CHANGE_NAME:-}"
VERBOSE="${VERBOSE:-false}"

# 日志函数
log() {
  if [[ "$VERBOSE" == "true" ]]; then
    echo "[INSTRUCTIONS-CACHE] $*" >&2
  fi
}

# 检查 jq 是否可用
check_jq() {
  if ! command -v jq &>/dev/null; then
    echo "错误: 需要 jq 命令，请先安装"
    echo "  Windows: choco install jq"
    echo "  Linux: sudo apt-get install jq"
    echo "  macOS: brew install jq"
    return 1
  fi
  return 0
}

# 获取当前 schema 版本
get_schema_version() {
  npx @fission-ai/openspec schema current 2>/dev/null || echo "unknown"
}

# 检查缓存文件是否存在
cache_exists() {
  [[ -f "$CACHE_FILE" ]]
}

# 检查缓存是否有效
is_cache_valid() {
  # 1. 缓存不存在
  if ! cache_exists; then
    log "缓存文件不存在"
    return 1
  fi

  # 2. 检查 schema 版本
  local current_schema=$(get_schema_version)
  local cached_schema=$(jq -r '.schema_version // empty' "$CACHE_FILE" 2>/dev/null || echo "")

  if [[ -z "$cached_schema" ]]; then
    log "缓存文件格式无效"
    return 1
  fi

  if [[ "$current_schema" != "$cached_schema" ]]; then
    log "Schema 版本已变更: $cached_schema → $current_schema"
    return 1
  fi

  # 3. 检查缓存时间（默认 7 天）
  local cache_time=$(jq -r '.cached_at // empty' "$CACHE_FILE" 2>/dev/null || echo "")
  if [[ -z "$cache_time" ]]; then
    log "缓存文件缺少时间戳"
    return 1
  fi

  # 计算缓存年龄
  local cache_seconds=0
  if date --version >/dev/null 2>&1; then
    # GNU date (Linux)
    cache_seconds=$(date -d "$cache_time" +%s 2>/dev/null || echo 0)
  else
    # BSD date (macOS)
    cache_seconds=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$cache_time" +%s 2>/dev/null || echo 0)
  fi

  local current_seconds=$(date +%s)
  local cache_age=$((current_seconds - cache_seconds))
  local max_age=$((7 * 24 * 60 * 60))  # 7 天

  if [[ $cache_age -gt $max_age ]]; then
    local cache_days=$((cache_age / 86400))
    log "缓存已过期: $cache_days 天"
    return 1
  fi

  log "缓存有效 (schema: $cached_schema, 年龄: $((cache_age / 3600)) 小时)"
  return 0
}

# 获取并缓存所有 instructions
fetch_and_cache_instructions() {
  local change="$1"

  if [[ -z "$change" ]]; then
    echo "错误: 需要提供 change 名称"
    return 1
  fi

  echo "→ 获取 instructions 并缓存..."

  local schema_version=$(get_schema_version)
  local cached_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  mkdir -p "$(dirname "$CACHE_FILE")"

  # 临时文件用于构建 JSON
  local tmp_file="${CACHE_FILE}.tmp"

  # 开始构建 JSON
  echo "{" > "$tmp_file"
  echo "  \"version\": 1," >> "$tmp_file"
  echo "  \"schema_version\": \"$schema_version\"," >> "$tmp_file"
  echo "  \"cached_at\": \"$cached_at\"," >> "$tmp_file"
  echo "  \"change\": \"$change\"," >> "$tmp_file"
  echo "  \"artifacts\": {" >> "$tmp_file"

  # 定义要获取的 artifacts
  local artifacts=("proposal" "design" "specs" "tasks")
  local first=true

  for artifact in "${artifacts[@]}"; do
    log "获取 $artifact instructions..."

    # 获取 instructions
    local instructions=$(npx @fission-ai/openspec instructions "$artifact" --change "$change" --json 2>/dev/null || echo "{}")

    # 添加逗号（除了第一个）
    if [[ "$first" == "true" ]]; then
      first=false
    else
      echo "," >> "$tmp_file"
    fi

    # 添加到 JSON
    echo -n "    \"$artifact\": $instructions" >> "$tmp_file"
  done

  echo "" >> "$tmp_file"
  echo "  }" >> "$tmp_file"
  echo "}" >> "$tmp_file"

  # 移动到最终位置
  mv "$tmp_file" "$CACHE_FILE"

  echo "✓ instructions 已缓存到 $CACHE_FILE"
}

# 从缓存中读取特定 artifact 的 instructions
get_cached_instruction() {
  local artifact="$1"

  if ! cache_exists; then
    echo "错误: 缓存不存在"
    return 1
  fi

  jq -r ".artifacts.$artifact // empty" "$CACHE_FILE"
}

# 清理缓存
clear_cache() {
  if cache_exists; then
    rm "$CACHE_FILE"
    echo "✓ instructions 缓存已清理"
  else
    echo "✓ 缓存文件不存在，无需清理"
  fi
}

# 显示缓存信息
show_cache_info() {
  if ! cache_exists; then
    echo "缓存文件不存在"
    return 1
  fi

  echo "缓存信息:"
  echo "  文件: $CACHE_FILE"
  echo "  Schema 版本: $(jq -r '.schema_version // "未知"' "$CACHE_FILE")"
  echo "  缓存时间: $(jq -r '.cached_at // "未知"' "$CACHE_FILE")"
  echo "  Change: $(jq -r '.change // "未指定"' "$CACHE_FILE")"
  echo "  Artifacts: $(jq -r '.artifacts | keys[]' "$CACHE_FILE" | tr '\n' ', ' | sed 's/,$//')"
}

# 主函数
main() {
  local command="${1:-check}"

  case "$command" in
    check)
      if is_cache_valid; then
        echo "✓ 缓存有效"
        exit 0
      else
        echo "→ 缓存无效或不存在"
        exit 1
      fi
      ;;
    fetch)
      check_jq || exit 1
      fetch_and_cache_instructions "$2"
      ;;
    get)
      check_jq || exit 1
      if [[ -z "${2:-}" ]]; then
        echo "错误: 需要指定 artifact 名称"
        exit 1
      fi
      get_cached_instruction "$2"
      ;;
    clear)
      clear_cache
      ;;
    info)
      check_jq || exit 1
      show_cache_info
      ;;
    *)
      echo "用法: $0 {check|fetch|get|clear|info}"
      echo ""
      echo "命令:"
      echo "  check              - 检查缓存是否有效（默认）"
      echo "  fetch <change>    - 获取并缓存 instructions"
      echo "  get <artifact>    - 从缓存读取特定 artifact 的 instructions"
      echo "  clear             - 清理缓存"
      echo "  info              - 显示缓存信息"
      echo ""
      echo "环境变量:"
      echo "  CACHE_FILE        - 缓存文件路径（默认: openspec/.instructions-cache.json）"
      echo "  CHANGE_NAME       - change 名称（用于 fetch）"
      echo "  VERBOSE           - 详细输出（默认: false）"
      exit 1
      ;;
  esac
}

main "$@"
