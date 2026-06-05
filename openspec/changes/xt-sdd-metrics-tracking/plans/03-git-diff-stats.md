<!-- sdd change: xt-sdd-metrics-tracking -->

# Git Diff 文件与行数统计 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 xt-sdd-archive 的 SKILL.md 中增加归档前的 Git Diff 统计步骤，自动计算文件变更和代码行数统计。

**Architecture:** 在 xt-sdd-archive 的步骤 2（归档前验证）之后新增步骤 2.5（Metrics Git Diff 统计），执行 `git diff --stat` 和 `git diff --numstat` 解析变更数据，写入 sdd-state.yaml 的 `metrics.file_stats` 和 `metrics.line_stats` 段。

**Tech Stack:** Markdown（SKILL.md）、Shell（git diff 命令）

---

### Task 1: 在 xt-sdd-archive 步骤 2 之后增加 Git Diff 统计步骤

**Files:**
- Modify: `.claude/skills/xt-sdd-archive/SKILL.md:37`（步骤 2 和步骤 3 之间）

- [ ] **Step 1: 在步骤 2 结尾和步骤 3 开始之间，插入步骤 2.5（Metrics Git Diff 统计）**

  在 `xt-sdd-archive/SKILL.md` 的步骤 2 最后一行之后、`### 步骤 3` 之前，插入：

  ```markdown

  ### 步骤 2.5：Metrics Git Diff 统计

  1. 读取 sdd-state.yaml 的 `metrics.git_baseline.start_sha`
  2. **基线缺失处理**：如果 `start_sha` 为 null：
     - 在 `metrics.file_stats` 中设置 `baseline_missing: true`
     - 所有统计字段（files_added、files_modified、files_deleted、total_files_changed）设为 null
     - 在 `metrics.line_stats` 中设置 `baseline_missing: true`
     - 所有行数字段（lines_added、lines_deleted）设为 null
     - 跳过后续统计步骤，直接进入步骤 3
  3. **Git 脏状态检查**：执行 `git status --porcelain`
     - 如果有未提交更改 → 提醒用户："当前有未提交更改，建议先提交或 stash 以确保 diff 统计准确。是否继续？"
     - 用户选择提交 → 协助提交后继续统计
     - 用户选择继续 → 标记 `metrics.git_baseline.dirty: true`，继续统计
  4. **文件变更统计**：执行 `git diff --stat <start_sha> HEAD`
     - 解析输出，提取每个文件的变更状态
     - 新增文件（diff 中标记 `create mode` 或路径前缀为 `A`）→ `metrics.file_stats.files_added`
     - 编辑文件 → `metrics.file_stats.files_modified`
     - 删除文件（diff 中标记 `delete mode` 或路径前缀为 `D`）→ `metrics.file_stats.files_deleted`
     - 总变更文件数 → `metrics.file_stats.total_files_changed`
  5. **代码行数统计**：执行 `git diff --numstat <start_sha> HEAD`
     - 逐行解析输出（格式：`<added>\t<deleted>\t<filepath>`）
     - 跳过二进制文件（added 或 deleted 显示为 `-` 的行）
     - 累加所有非二进制文件的 added 列 → `metrics.line_stats.lines_added`
     - 累加所有非二进制文件的 deleted 列 → `metrics.line_stats.lines_deleted`
  6. **无变更处理**：如果 start_sha 与 HEAD 相同，所有 file_stats 字段设为 0，所有 line_stats 字段设为 0
  7. 使用 Edit 工具将统计结果写入 sdd-state.yaml 的 metrics 段
  8. 记录 `metrics.git_baseline.end_sha` ← `git rev-parse HEAD`
  9. 记录 `metrics.git_baseline.end_time` ← 当前 ISO 8601 时间戳
  ```

- [ ] **Step 2: 验证步骤 2.5 存在于 archive SKILL.md**

  Run: `grep -n "### 步骤 2.5\|git diff --stat\|git diff --numstat\|baseline_missing" .claude/skills/xt-sdd-archive/SKILL.md`

  Expected: 输出包含 `步骤 2.5`、`git diff --stat`、`git diff --numstat`、`baseline_missing` 各至少 1 条

- [ ] **Step 3: 提交 Git Diff 统计步骤**

  Run:
  ```bash
  git add .claude/skills/xt-sdd-archive/SKILL.md
  git commit -m "feat(metrics): 在 archive 步骤 2.5 增加 Git Diff 文件与行数统计"
  ```

---

## 自审清单

**1. Spec 覆盖度：**
- ✅ `git-diff-metrics` spec "Archive 文件变更统计 - 计算文件变更统计" → Step 1 第 4 点
- ✅ `git-diff-metrics` spec "Archive 文件变更统计 - 无文件变更" → Step 1 第 6 点
- ✅ `git-diff-metrics` spec "Archive 文件变更统计 - 基线 SHA 不存在" → Step 1 第 2 点
- ✅ `git-diff-metrics` spec "Archive 代码行数统计 - 计算代码行数统计" → Step 1 第 5 点
- ✅ `git-diff-metrics` spec "Archive 代码行数统计 - 区分二进制文件" → Step 1 第 5 点（跳过 `-` 行）

**2. 占位符扫描：** 无 TBD/TODO。所有步骤包含具体 git 命令和字段映射。

**3. 类型一致性：** `file_stats` 字段名（files_added、files_modified、files_deleted、total_files_changed）与分组 1 模板一致。`line_stats` 字段名（lines_added、lines_deleted）与分组 1 模板一致。`baseline_missing` 字段名在 file_stats 和 line_stats 中均有使用，与 spec 一致。
