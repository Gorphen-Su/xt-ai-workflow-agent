<!-- sdd change: xt-sdd-metrics-tracking -->

# Metrics 段结构定义 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 xt-sdd-propose SKILL.md 的步骤 5 中增加 metrics 段模板和 Git 基线记录指令，为后续 Token 追踪和文件统计奠定数据结构基础。

**Architecture:** 扩展现有 sdd-state.yaml 模板，在 `cascade` 段之后追加 `metrics` 顶级段。metrics 段包含四个子段：git_baseline（Git SHA 快照）、file_stats（文件变更统计）、line_stats（代码行数统计）、token_usage（Token 消费追踪）。同时在步骤 5 的操作指令中增加 `git rev-parse HEAD` 调用，自动填充 start_sha。

**Tech Stack:** Markdown（SKILL.md）、YAML（sdd-state.yaml）

---

### Task 1: 更新 sdd-state.yaml 模板增加 metrics 段

**Files:**
- Modify: `.claude/skills/xt-sdd-propose/SKILL.md:129-156`（步骤 5 的 YAML 模板）

- [x] **Step 1: 在步骤 5 的 YAML 模板中，在 `cascade:` 段之后追加 `metrics:` 段**

  将 `.claude/skills/xt-sdd-propose/SKILL.md` 第 156 行（`preserved_tasks: []`）之后、模板结束的 ` ``` ` 之前，追加以下内容：

  ```yaml

  metrics:
    git_baseline:
      start_sha: null
      start_time: null
      end_sha: null
      end_time: null
      dirty: false
    file_stats:
      files_added: 0
      files_modified: 0
      files_deleted: 0
      total_files_changed: 0
    line_stats:
      lines_added: 0
      lines_deleted: 0
    token_usage:
      total_input_tokens: 0
      total_output_tokens: 0
      total_tokens: 0
      estimated_cost_usd: 0.0
      ccusage_available: null
      auto_installed: null
      install_error: null
      snapshots: []
  ```

- [x] **Step 2: 验证模板 YAML 语法正确**

  Run: `cat .claude/skills/xt-sdd-propose/SKILL.md | sed -n '/^```yaml$/,/^```$/p' | head -n -1 | tail -n +2 | python3 -c "import sys,yaml; yaml.safe_load(sys.stdin); print('YAML valid')" 2>&1 || echo "YAML validation failed"`

  Expected: 输出 `YAML valid`（如果 python3 不可用，手动目视检查缩进一致性：所有段都从行首开始，子段缩进 2 空格）

- [ ] **Step 3: 提交 metrics 段模板变更**

  Run:
  ```bash
  git add .claude/skills/xt-sdd-propose/SKILL.md
  git commit -m "feat(metrics): 在 propose 步骤 5 的 sdd-state.yaml 模板中增加 metrics 段结构"
  ```

---

### Task 2: 在步骤 5 增加 Git 基线记录指令

**Files:**
- Modify: `.claude/skills/xt-sdd-propose/SKILL.md:156-157`（步骤 5 模板之后的操作指令区域）

- [x] **Step 4: 在步骤 5 的 YAML 模板之后、步骤 6 之前，插入 Git 基线记录操作指令**

  在 ` ``` ` （模板结束标记）之后、`### 步骤 6` 之前，插入以下操作指令块：

  ```markdown

  **Metrics 初始化操作：**

  1. 执行 `git rev-parse HEAD` 获取当前 commit SHA
  2. 执行 `git status --porcelain` 检查工作区是否干净
  3. 将获取的数据填入 sdd-state.yaml 的 metrics 段：
     - `metrics.git_baseline.start_sha` ← `git rev-parse HEAD` 的输出
     - `metrics.git_baseline.start_time` ← 当前 ISO 8601 时间戳
     - `metrics.git_baseline.dirty` ← 工作区干净则为 `false`，有未提交更改则为 `true`
  4. 使用 Edit 工具更新 sdd-state.yaml 文件中对应字段
  ```

- [x] **Step 5: 验证步骤 5 结构完整**

  Run: `grep -n "### 步骤 5\|### 步骤 6\|Metrics 初始化操作\|git_baseline.start_sha" .claude/skills/xt-sdd-propose/SKILL.md`

  Expected: 输出包含：
  - `### 步骤 5：初始化 sdd-state.yaml` 行号
  - `Metrics 初始化操作：` 行号（在步骤 5 内）
  - `git_baseline.start_sha` 行号（在 Metrics 初始化操作内）
  - `### 步骤 6` 行号（在 Metrics 初始化操作之后）

- [ ] **Step 6: 提交 Git 基线记录指令**

  Run:
  ```bash
  git add .claude/skills/xt-sdd-propose/SKILL.md
  git commit -m "feat(metrics): 在 propose 步骤 5 增加 Git 基线 SHA 记录操作指令"
  ```

---

### Task 3: 同步更新 sdd-state.yaml 结构规范文档

**Files:**
- Modify: `.claude/skills/xt-sdd-propose/SKILL.md:198-241`（sdd-state.yaml 结构规范段落）

- [x] **Step 7: 在 sdd-state.yaml 结构规范段落中，在 cascade 段之后追加 metrics 段的字段说明**

  在 `preserved_tasks: []` 之后、` ``` ` 结束标记之前，追加：

  ```yaml

  # 指标追踪（metrics tracking）
  metrics:
    git_baseline:
      start_sha: <propose 阶段的 commit SHA>
      start_time: <ISO 8601 时间戳>
      end_sha: <archive 阶段的 commit SHA>
      end_time: <ISO 8601 时间戳>
      dirty: <true 或 false，propose 时工作区是否干净>
    file_stats:
      files_added: 0
      files_modified: 0
      files_deleted: 0
      total_files_changed: 0
    line_stats:
      lines_added: 0
      lines_deleted: 0
    token_usage:
      total_input_tokens: 0
      total_output_tokens: 0
      total_tokens: 0
      estimated_cost_usd: 0.0
      ccusage_available: <true 或 false 或 null>
      auto_installed: <true 或 false 或 null>
      install_error: <错误信息字符串或 null>
      token_data_unavailable: <true 或 null>
      snapshots:
        - phase: <阶段名>
          timestamp: <ISO 8601>
          input_tokens: <数值或 null>
          output_tokens: <数值或 null>
          unavailable: <true 或 omit>
          error: <错误信息或 omit>
  ```

- [x] **Step 8: 验证结构规范文档与模板一致**

  Run: `grep -c "metrics:" .claude/skills/xt-sdd-propose/SKILL.md`

  Expected: 输出 `3` 或以上（表示模板、结构规范文档、以及可能的引用中均包含 metrics 段）

- [ ] **Step 9: 提交结构规范文档更新**

  Run:
  ```bash
  git add .claude/skills/xt-sdd-propose/SKILL.md
  git commit -m "docs(metrics): 在 sdd-state.yaml 结构规范中增加 metrics 段字段说明"
  ```

---

## 自审清单

**1. Spec 覆盖度：**
- ✅ `git-diff-metrics` spec "Metrics 段初始化" scenario → Task 1（模板中包含完整 metrics 结构）
- ✅ `git-diff-metrics` spec "正常记录基线 SHA" scenario → Task 2（步骤 5 增加 git rev-parse HEAD 指令）
- ✅ `git-diff-metrics` spec "Git 仓库有未提交更改" scenario → Task 2（dirty 状态记录）
- ✅ `token-tracking` spec 中 `ccusage_available`、`auto_installed`、`install_error` 字段 → Task 1（模板中已包含）

**2. 占位符扫描：** 无 TBD/TODO/后续补充等占位符。所有步骤包含具体内容和命令。

**3. 类型一致性：** YAML 模板中的字段名（`start_sha`、`ccusage_available`、`auto_installed`、`install_error`、`snapshots`）与 specs/token-tracking/spec.md 和 specs/git-diff-metrics/spec.md 中的字段名完全一致。
