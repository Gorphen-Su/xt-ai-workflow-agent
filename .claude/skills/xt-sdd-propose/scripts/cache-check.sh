#!/bin/bash
# xt-sdd-propose 项目分析缓存检查脚本
# 用途：检查项目分析缓存是否有效，避免重复读取配置文件

set -euo pipefail

# 默认值
CACHE_FILE="${CACHE_FILE:-openspec/.project-cache.json}"
PROFILE_FILE="${PROFILE_FILE:-openspec/sdd-project-profile.yaml}"
VERBOSE="${VERBOSE:-false}"

# 日志函数
log() {
  if [[ "$VERBOSE" == "true" ]]; then
    echo "[CACHE] $*" >&2
  fi
}

# 检查缓存文件是否存在
cache_exists() {
  [[ -f "$CACHE_FILE" ]]
}

# 检查 profile 文件是否存在
profile_exists() {
  [[ -f "$PROFILE_FILE" ]]
}

# 计算文件 SHA256 哈希
compute_hash() {
  local file="$1"
  if [[ -f "$file" ]]; then
    sha256sum "$file" 2>/dev/null | awk '{print $1}' || echo "missing"
  else
    echo "missing"
  fi
}

# 从缓存中读取特定文件的哈希
get_cached_hash() {
  local file="$1"
  if cache_exists; then
    # 尝试从 JSON 中提取（简化版，实际可用 jq）
    grep -o "\"$file\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$CACHE_FILE" 2>/dev/null | \
      sed 's/.*"\(sha256:[^"]*\)".*/\1/' || echo ""
  else
    echo ""
  fi
}

# 检查关键文件是否变更
check_files_changed() {
  local changed=false

  # 定义可能的关键文件（按优先级）
  local key_files=(
    "package.json"
    "package-lock.json"
    "yarn.lock"
    "pnpm-lock.yaml"
    "pom.xml"
    "build.gradle"
    "build.gradle.kts"
    "gradle.properties"
    "go.mod"
    "go.sum"
    "Cargo.toml"
    "Cargo.lock"
    "pyproject.toml"
    "requirements.txt"
    "Poetry.lock"
  )

  for file in "${key_files[@]}"; do
    if [[ -f "$file" ]]; then
      local current_hash=$(compute_hash "$file")
      local cached_hash=$(get_cached_hash "$file")

      if [[ "$current_hash" != "$cached_hash" && "$cached_hash" != "" ]]; then
        log "文件已变更: $file"
        changed=true
        break
      fi
    fi
  done

  echo "$changed"
}

# 检查缓存是否过期（默认 7 天）
check_cache_expired() {
  local max_age_days="${1:-7}"

  if ! cache_exists; then
    echo "true"
    return
  fi

  # 从缓存中读取 cached_at（简化处理）
  local cache_time=$(grep '"cached_at"' "$CACHE_FILE" 2>/dev/null | \
    sed 's/.*"\([0-9].*\)".*/\1/' || echo "")

  if [[ -z "$cache_time" ]]; then
    echo "true"
    return
  fi

  # 计算时间差（需要 GNU date）
  local cache_seconds=$(date -d "$cache_time" +%s 2>/dev/null || echo 0)
  local current_seconds=$(date +%s)
  local age_seconds=$((current_seconds - cache_seconds))
  local max_age_seconds=$((max_age_days * 86400))

  if [[ $age_seconds -gt $max_age_seconds ]]; then
    log "缓存已过期: $cache_time"
    echo "true"
  else
    echo "false"
  fi
}

# 主检查函数
is_cache_valid() {
  # 1. 缓存文件不存在
  if ! cache_exists; then
    log "缓存文件不存在"
    return 1
  fi

  # 2. profile 文件不存在
  if ! profile_exists; then
    log "profile 文件不存在"
    return 1
  fi

  # 3. 缓存已过期
  if [[ $(check_cache_expired) == "true" ]]; then
    return 1
  fi

  # 4. 关键文件已变更
  if [[ $(check_files_changed) == "true" ]]; then
    return 1
  fi

  log "缓存有效"
  return 0
}

# 更新缓存
update_cache() {
  local languages="$1"
  local frameworks="$2"
  local build_tool="$3"
  local compile_command="$4"
  local test_command="$5"
  local structure="$6"
  local has_ci="$7"

  mkdir -p "$(dirname "$CACHE_FILE")"

  # 构建 file_hashes 部分
  local file_hashes=""
  local key_files=(
    "package.json"
    "pom.xml"
    "build.gradle"
    "build.gradle.kts"
    "go.mod"
    "Cargo.toml"
    "pyproject.toml"
  )

  for file in "${key_files[@]}"; do
    if [[ -f "$file" ]]; then
      file_hashes="${file_hashes}
    \"${file}\": \"sha256:$(compute_hash "$file)\","
    fi
  done

  # 移除末尾逗号
  file_hashes=$(echo "$file_hashes" | sed 's/,$//')

  local cached_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  cat > "$CACHE_FILE" <<EOF
{
  "version": 1,
  "cached_at": "${cached_at}",
  "languages": ${languages},
  "frameworks": ${frameworks},
  "build_tool": "${build_tool}",
  "compile_command": "${compile_command}",
  "test_command": "${test_command}",
  "structure": "${structure}",
  "has_ci": ${has_ci},
  "file_hashes": {${file_hashes}}
}
EOF

  log "缓存已更新: $CACHE_FILE"
}

# 清理缓存
clear_cache() {
  if cache_exists; then
    rm "$CACHE_FILE"
    log "缓存已清理"
    echo "✓ 项目分析缓存已清理"
  else
    echo "✓ 缓存文件不存在，无需清理"
  fi
}

# 命令行接口
case "${1:-check}" in
  check)
    if is_cache_valid; then
      echo "✓ 缓存有效"
      exit 0
    else
      echo "→ 缓存无效或不存在，需要重新分析"
      exit 1
    fi
    ;;
  clear)
    clear_cache
    ;;
  update)
    # update 需要参数，这里仅作示例
    log "update 命令需要通过 skill 内部调用"
    ;;
  *)
    echo "用法: $0 {check|clear}"
    echo "  check   - 检查缓存是否有效（默认）"
    echo "  clear   - 清理缓存"
    exit 1
    ;;
esac
