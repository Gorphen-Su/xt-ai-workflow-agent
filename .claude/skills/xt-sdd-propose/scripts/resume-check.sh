#!/bin/bash
# 断点恢复检查脚本
# 用途：检查 artifact 完成状态，确定恢复点

set -euo pipefail

# 默认值
STATE_FILE="${STATE_FILE:-}"
VERBOSE="${VERBOSE:-false}"

# 日志函数
log() {
  if [[ "$VERBOSE" == "true" ]]; then
    echo "[RESUME-CHECK] $*" >&2
  fi
}

# 检查 artifact 文件是否存在且非空
verify_artifact_file() {
  local change_dir="$1"
  local artifact="$2"

  local file_path=""
  case "$artifact" in
    proposal)
      file_path="$change_dir/proposal.md"
      ;;
    design)
      file_path="$change_dir/design.md"
      ;;
    specs)
      file_path="$change_dir/specs"
      ;;
    tasks)
      file_path="$change_dir/tasks.md"
      ;;
    *)
      echo "未知 artifact: $artifact" >&2
      return 1
      ;;
  esac

  # 检查存在
  if [[ ! -e "$file_path" ]]; then
    log "$artifact 文件不存在: $file_path"
    return 1
  fi

  # 检查非空（specs 是目录，检查是否有文件）
  if [[ "$artifact" == "specs" ]]; then
    if [[ -z "$(ls -A "$file_path" 2>/dev/null)" ]]; then
      log "$artifact 目录为空: $file_path"
      return 1
    fi
  else
    if [[ ! -s "$file_path" ]]; then
      log "$artifact 文件为空: $file_path"
      return 1
    fi
  fi

  log "$artifact 验证通过: $file_path"
  return 0
}

# 从 sdd-state.yaml 读取 checkpoint
get_checkpoint() {
  if [[ -z "$STATE_FILE" ]] || [[ ! -f "$STATE_FILE" ]]; then
    echo "entered"
    return
  fi

  # 简化解析（实际可用 yq）
  grep -E "^checkpoint:" "$STATE_FILE" 2>/dev/null | \
    sed 's/checkpoint:[[:space:]]*//' | tr -d '"' || echo "entered"
}

# 从 sdd-state.yaml 读取 artifact 状态
get_artifact_status() {
  local artifact="$1"

  if [[ -z "$STATE_FILE" ]] || [[ ! -f "$STATE_FILE" ]]; then
    echo "pending"
    return
  fi

  # 简化解析
  local status=$(grep -A1 "^[[:space:]]*$artifact:" "$STATE_FILE" 2>/dev/null | \
    grep "status:" | sed 's/.*status:[[:space:]]*//' | tr -d '"' | head -1)

  echo "${status:-pending}"
}

# 获取变更目录
get_change_dir() {
  if [[ -z "$STATE_FILE" ]]; then
    echo ""
    return
  fi

  # 从 state file 路径推导 change 目录
  dirname "$STATE_FILE"
}

# 确定恢复点
determine_resume_point() {
  local checkpoint=$(get_checkpoint)
  local change_dir=$(get_change_dir)

  echo "断点状态分析:" >&2
  echo "  checkpoint: $checkpoint" >&2
  echo "  change_dir: $change_dir" >&2
  echo "" >&2

  # 根据检查点确定恢复点
  case "$checkpoint" in
    entered|git-checked|profiler-done)
      echo "step-1"  # 从 Git 检查开始
      echo "恢复点: 从步骤 1 开始（Git 检查）" >&2
      ;;
    requirements-confirmed)
      echo "step-7-1"  # 从 proposal 开始
      echo "恢复点: 从步骤 7.1 开始（生成 proposal）" >&2
      ;;
    proposal-created)
      if verify_artifact_file "$change_dir" "proposal"; then
        echo "step-7-2"  # 从 design 开始
        echo "恢复点: 从步骤 7.2 开始（生成 design）" >&2
      else
        echo "step-7-1"  # proposal 文件缺失，重新生成
        echo "恢复点: proposal 文件缺失，从步骤 7.1 重新生成" >&2
      fi
      ;;
    design-created)
      if verify_artifact_file "$change_dir" "design"; then
        echo "step-7-3"  # 从 specs 开始
        echo "恢复点: 从步骤 7.3 开始（生成 specs）" >&2
      else
        echo "step-7-2"  # design 文件缺失
        echo "恢复点: design 文件缺失，从步骤 7.2 重新生成" >&2
      fi
      ;;
    specs-created)
      if verify_artifact_file "$change_dir" "specs"; then
        echo "step-7-4"  # 从 tasks 开始
        echo "恢复点: 从步骤 7.4 开始（生成 tasks）" >&2
      else
        echo "step-7-3"  # specs 文件缺失
        echo "恢复点: specs 文件缺失，从步骤 7.3 重新生成" >&2
      fi
      ;;
    tasks-created)
      if verify_artifact_file "$change_dir" "tasks"; then
        echo "step-7-5"  # 验证所有
        echo "恢复点: 从步骤 7.5 开始（验证所有 artifacts）" >&2
      else
        echo "step-7-4"  # tasks 文件缺失
        echo "恢复点: tasks 文件缺失，从步骤 7.4 重新生成" >&2
      fi
      ;;
    openspec-generated|done)
      echo "step-8"  # 进入步骤 8
      echo "恢复点: 所有 artifacts 已完成，进入步骤 8" >&2
      ;;
    *)
      echo "unknown"
      echo "恢复点: 未知检查点 $checkpoint" >&2
      ;;
  esac
}

# 检查所有 artifacts 状态
check_all_artifacts() {
  local change_dir=$(get_change_dir)

  echo "Artifacts 状态:"
  echo ""

  local all_completed=true
  local artifacts=("proposal" "design" "specs" "tasks")

  for artifact in "${artifacts[@]}"; do
    local status=$(get_artifact_status "$artifact")
    local file_status="pending"

    if [[ -n "$change_dir" ]]; then
      if verify_artifact_file "$change_dir" "$artifact" 2>/dev/null; then
        file_status="exists"
      else
        file_status="missing"
      fi
    fi

    local display_status
    if [[ "$status" == "completed" && "$file_status" == "exists" ]]; then
      display_status="✓ completed"
    elif [[ "$status" == "completed" && "$file_status" == "missing" ]]; then
      display_status="⚠ status=completed 但文件缺失"
      all_completed=false
    else
      display_status="→ $status"
      all_completed=false
    fi

    printf "  %-12s %s\n" "$artifact:" "$display_status"
  done

  echo ""

  if [[ "$all_completed" == "true" ]]; then
    echo "✓ 所有 artifacts 已完成"
    return 0
  else
    echo "→ 存在未完成的 artifacts"
    return 1
  fi
}

# 验证所有 artifacts
verify_all() {
  local change_dir=$(get_change_dir)
  local artifacts=("proposal" "design" "specs" "tasks")

  for artifact in "${artifacts[@]}"; do
    if ! verify_artifact_file "$change_dir" "$artifact"; then
      echo "✗ $artifact 验证失败"
      return 1
    fi
  done

  echo "✓ 所有 artifacts 验证通过"
  return 0
}

# 主函数
main() {
  local command="${1:-check}"

  case "$command" in
    check)
      determine_resume_point
      ;;
    status)
      check_all_artifacts
      ;;
    verify)
      verify_all
      ;;
    *)
      echo "用法: STATE_FILE=<path> $0 {check|status|verify}"
      echo ""
      echo "命令:"
      echo "  check   - 确定恢复点（默认）"
      echo "  status  - 显示所有 artifacts 状态"
      echo "  verify  - 验证所有 artifacts 文件存在"
      echo ""
      echo "环境变量:"
      echo "  STATE_FILE  - sdd-state.yaml 路径（必填）"
      echo "  VERBOSE     - 详细输出（默认: false）"
      echo ""
      echo "示例:"
      echo "  STATE_FILE=openspec/changes/my-change/sdd-state.yaml \\"
      echo "    bash resume-check.sh check"
      exit 1
      ;;
  esac
}

main "$@"
