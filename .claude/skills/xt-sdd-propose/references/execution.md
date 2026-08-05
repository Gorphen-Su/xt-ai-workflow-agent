# xt-sdd-propose 执行规范

本文档包含 `xt-sdd-propose` skill 的详细执行规范，包括状态文件结构、检查点定义和断点恢复逻辑。

## sdd-state.yaml 结构规范

每个变更目录下的 `sdd-state.yaml` 包含以下字段：

```yaml
version: 1
change: <变更名>

# 当前阶段和检查点
phase: propose | plan | apply | verify | archive
checkpoint: <当前阶段的细粒度检查点>

# 每个阶段的检查点记录
phase_checkpoints:
  propose: <检查点或 null>
  plan: <检查点或 null>
  apply: <检查点或 null>
  verify: <检查点或 null>
  archive: <检查点或 null>

# Superpowers 可用性
superpowers_available: true | false

# 任务列表（plan 阶段填充）
tasks:
  - id: 1
    description: <任务描述>
    status: pending | in_progress | completed | failed
    updated: <ISO 8601 时间戳，仅在状态变更时更新>
    test_result: <pass/fail + 一句话，非长描述>
    checkpoint: null | red | green | refactor | complete

# 审查计数器
review_counters:
  global_review_rounds: 0
  task_retries: {}

# 级联回退信息
cascade:
  last_affected_phase: null
  invalidated_from: null
  reason: null
  preserved_tasks: []

# Git 基线追踪
git_baseline:
  start_sha: <propose 阶段的 commit SHA>
  start_time: <ISO 8601 时间戳>
  end_sha: <archive 阶段的 commit SHA>
  end_time: <ISO 8601 时间戳>
  dirty: <true 或 false，propose 时工作区是否干净>

# 上下文摘要（上下文剪裁优化）
context_summary:
  last_action: <最后执行的 action，一句话>
  key_decisions: <关键决策列表>
    - "<决策描述>"
  current_objective: <当前目标，下一步要做什么>
  user_feedback: <用户反馈列表>
    - "<反馈内容>"
  artifacts_created: <已创建的 artifacts>
    - "<artifact 文件名>"
  project_info: <缓存的项目信息>
    languages: <语言列表>
    frameworks: <框架列表>
    build_tool: <构建工具>

# 最后更新时间
last_updated: <ISO 8601 时间戳>

# Artifacts 状态追踪（断点恢复用）
artifacts_status:
  proposal:
    status: <pending | in_progress | completed | failed>
    file: proposal.md
    created_at: <ISO 8601 时间戳或 null>
  design:
    status: <pending | in_progress | completed | failed>
    file: design.md
    created_at: <ISO 8601 时间戳或 null>
  specs:
    status: <pending | in_progress | completed | failed>
    file: specs/
    created_at: <ISO 8601 时间戳或 null>
  tasks:
    status: <pending | in_progress | completed | failed>
    file: tasks.md
    created_at: <ISO 8601 时间戳或 null>
```

### artifacts_status 结构详解

`artifacts_status` 用于追踪每个 artifact 的生成状态，支持断点恢复：

| artifact | file | 依赖 | 说明 |
|----------|------|------|------|
| proposal | proposal.md | 无 | 变更提案（what & why） |
| design | design.md | proposal | 技术方案（how） |
| specs | specs/ | design | 行为规格 |
| tasks | tasks.md | specs | 实现任务清单 |

→ 详见 [checkpoint-split.md](checkpoint-split.md)

### context_summary 结构详解

`context_summary` 用于支持上下文剪裁机制，避免对话历史累积：

| 字段 | 说明 | 更新时机 |
|------|------|---------|
| `last_action` | 上一步做了什么（一句话） | 每个步骤完成后 |
| `key_decisions` | 关键决策列表（方案选择、技术栈等） | 做出决策后 |
| `current_objective` | 当前目标（下一步要做什么） | 步骤切换时 |
| `user_feedback` | 用户反馈（需要记住的反馈） | 收集反馈后 |
| `artifacts_created` | 已创建的 artifacts（用于去重） | 创建 artifact 后 |
| `project_info` | 项目信息缓存（避免重复读取） | 项目分析器完成后 |

→ 详见 [context-trimming.md](context-trimming.md)

## 各阶段 Checkpoint 定义

### propose 阶段
- `entered` — 刚进入
- `git-checked` — Git 状态已检查
- `profiler-done` — 项目分析器完成
- `requirements-confirmed` — 需求已确认
- `proposal-created` — proposal.md 已创建（细粒度，断点恢复用）
- `design-created` — design.md 已创建（细粒度，断点恢复用）
- `specs-created` — specs/ 已创建（细粒度，断点恢复用）
- `tasks-created` — tasks.md 已创建（细粒度，断点恢复用）
- `openspec-generated` — openspec-propose 已完成
- `done` — 用户确认通过

→ 细粒度检查点详见 [checkpoint-split.md](checkpoint-split.md)

### plan 阶段
- `entered` — 刚进入
- `design-generated` — design.md 已生成
- `specs-generated` — specs/ 已生成
- `tasks-generated` — tasks.md 已生成
- `plan-generated` — 实现计划已生成
- `quality-reviewed` — 质量审查完成
- `done` — 用户确认通过

### apply 阶段
- `entered` — 刚进入
- `task-N-complete` — 任务 N 完成
- `all-tasks-complete` — 所有任务完成
- `done` — 用户确认通过

### verify 阶段
- `entered` — 刚进入
- `doc-sync-done` — 文档同步检查完成
- `code-quality-done` — 代码质量验证完成
- `compliance-done` — 规范合规检查完成
- `code-reviewed` — 代码审查完成
- `done` — 用户确认通过

### archive 阶段
- `entered` — 刚进入
- `consistency-verified` — 归档前验证完成
- `specs-synced` — specs 同步完成
- `archived` — 归档完成
- `done` — 用户确认通过

## 断点恢复逻辑

重新运行时，读取 `sdd-state.yaml` 的 checkpoint 和实际文件状态：

| checkpoint | 实际文件状态 | 恢复到 |
|-----------|-------------|--------|
| `entered` | 无活跃变更目录 | 步骤 1（Git 检查） |
| `git-checked` | 无活跃变更目录 | 步骤 3（确定变更名） |
| `profiler-done` | 无活跃变更目录 | 步骤 4（创建变更目录） |
| `requirements-confirmed` | 变更目录存在但 proposal.md 不存在 | 步骤 7（调用 openspec-propose） |
| `proposal-created` | proposal.md 存在 | 步骤 7.2（继续生成 design） |
| `design-created` | design.md 存在 | 步骤 7.3（继续生成 specs） |
| `specs-created` | specs/ 存在 | 步骤 7.4（继续生成 tasks） |
| `tasks-created` | tasks.md 存在 | 步骤 7.5（验证所有） |
| `openspec-generated` | proposal.md 存在 | 步骤 8（阶段完成确认） |
| `done` | proposal.md 存在 | 出口到 plan 阶段 |

**断点恢复脚本**（自动化检查）：

```bash
# 确定恢复点
STATE_FILE="openspec/changes/<变更名>/sdd-state.yaml" \
  bash .claude/skills/xt-sdd-propose/scripts/resume-check.sh check

# 查看所有 artifacts 状态
STATE_FILE="openspec/changes/<变更名>/sdd-state.yaml" \
  bash .claude/skills/xt-sdd-propose/scripts/resume-check.sh status
```

### 状态文件缺失时的降级

如果没有 `sdd-state.yaml`，检查变更目录下是否有 `proposal.md` 来判断进度。

## 并发变更路由

当 `openspec/changes/` 下有多个活跃变更时（**仅扫顶层目录，排除 `openspec/changes/archive/` 归档子目录**）：

1. 扫描各变更目录的 `sdd-state.yaml`
2. 如果有变更的 phase 为 propose → 优先选择（继续当前阶段）
3. 如果有多个 → 使用 AskUserQuestion 让用户选择
4. 如果用户明确指定变更名 → 以用户意图为准

## Checkpoint 更新操作

每个步骤完成后，使用 Edit 工具更新 `sdd-state.yaml` 的 checkpoint 字段：

```yaml
# 示例：完成 Git 检查后
phase: propose
checkpoint: git-checked

phase_checkpoints:
  propose: git-checked  # 更新此行
  # ... 其他阶段保持不变
```
