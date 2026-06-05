<!-- sdd change: xt-sdd-metrics-tracking -->

# ccusage 可用性检测、自动安装与 Token 快照 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 xt-sdd 各阶段 SKILL.md 中集成 ccusage 环境检测、自动安装和 Token 快照记录功能。

**Architecture:** 在 propose 阶段的步骤 0 之后新增步骤 0.5（ccusage 检测与安装），在所有六个阶段的开始处增加 Token 快照记录指令。Token 快照通过调用 `npx ccusage session --json` 获取数据，降级处理覆盖不可用和执行失败两种场景。

**Tech Stack:** Markdown（SKILL.md）、YAML（sdd-state.yaml metrics 段）、Shell（ccusage CLI）

---

### Task 1: 在 xt-sdd-propose 步骤 0 之后增加 ccusage 检测与自动安装步骤

**Files:**
- Modify: `.claude/skills/xt-sdd-propose/SKILL.md:26-27`（步骤 0 和步骤 1 之间）

- [x] **Step 1: 在步骤 0 结尾（`更新 sdd-state.yaml` 行之前）和步骤 1 之间，插入步骤 0.5**

  在 `.claude/skills/xt-sdd-propose/SKILL.md` 的 `3. 将 superpowers_available 状态写入 sdd-state.yaml（步骤 5 创建时）` 行之后，插入：

  ```markdown

  4. 检查 ccusage 可用性并自动安装（Metrics Tracking 前置依赖）：
     - 执行 `npx ccusage --version` 检测 ccusage 是否可用
     - 可用 → 标记 `ccusage_available: true`，跳过安装
     - 不可用 → 自动执行 `npm install -g ccusage` 全局安装
       - 安装成功 → 重新验证 `npx ccusage --version`，标记 `ccusage_available: true`、`auto_installed: true`
       - 安装失败 → 标记 `ccusage_available: false`、`auto_installed: false`、`install_error: "<错误信息>"`，提示用户手动安装 `npm install -g ccusage`，**不阻塞流程**
     - 将检测结果写入 sdd-state.yaml（步骤 5 创建时填充 `metrics.token_usage.ccusage_available`、`metrics.token_usage.auto_installed`、`metrics.token_usage.install_error`）
  ```

- [x] **Step 2: 验证步骤 0 包含 ccusage 检测**

  Run: `grep -n "ccusage" .claude/skills/xt-sdd-propose/SKILL.md | head -5`

  Expected: 至少包含 `ccusage --version` 和 `npm install -g ccusage` 两个匹配

- [ ] **Step 3: 提交 ccusage 检测指令**

  Run:
  ```bash
  git add .claude/skills/xt-sdd-propose/SKILL.md
  git commit -m "feat(metrics): 在 propose 步骤 0 增加 ccusage 检测与自动安装逻辑"
  ```

---

### Task 2: 在 xt-sdd-propose 中增加 Token 快照记录指令

**Files:**
- Modify: `.claude/skills/xt-sdd-propose/SKILL.md:158-166`（步骤 6 区域）

- [x] **Step 4: 在步骤 5 的 Metrics 初始化操作块末尾追加 Token 快照记录指令**

  在步骤 5 的 `4. 使用 Edit 工具更新 sdd-state.yaml 文件中对应字段` 行之后追加：

  ```markdown
  5. 执行 Token 快照记录（propose 阶段）：
     - 如果 `metrics.token_usage.ccusage_available` 为 true：
       - 执行 `npx ccusage session --json` 获取当前会话 Token 数据
       - 解析 JSON 输出，提取 input_tokens 和 output_tokens
       - 追加一条快照到 `metrics.token_usage.snapshots`：
         ```yaml
         - phase: propose
           timestamp: <当前 ISO 8601 时间戳>
           input_tokens: <从 ccusage 获取>
           output_tokens: <从 ccusage 获取>
         ```
     - 如果 `metrics.token_usage.ccusage_available` 为 false：
       - 追加一条标记不可用的快照：
         ```yaml
         - phase: propose
           timestamp: <当前 ISO 8601 时间戳>
           input_tokens: null
           output_tokens: null
           unavailable: true
         ```
     - 如果 ccusage 命令执行失败（超时、格式错误等）：
       - 追加一条标记错误的快照：
         ```yaml
         - phase: propose
           timestamp: <当前 ISO 8601 时间戳>
           input_tokens: null
           output_tokens: null
           error: "<错误信息>"
         ```
     - **不阻塞流程**：无论快照记录成功与否，继续执行步骤 6
  ```

- [x] **Step 5: 验证 propose 中包含完整 Token 快照逻辑**

  Run: `grep -c "Token 快照记录" .claude/skills/xt-sdd-propose/SKILL.md`

  Expected: 输出 `1`（步骤 5 中有一处 Token 快照记录指令）

- [ ] **Step 6: 提交 propose Token 快照指令**

  Run:
  ```bash
  git add .claude/skills/xt-sdd-propose/SKILL.md
  git commit -m "feat(metrics): 在 propose 步骤 5 增加 Token 快照记录指令"
  ```

---

### Task 3: 在 xt-sdd-plan 中增加 Token 快照记录指令

**Files:**
- Modify: `.claude/skills/xt-sdd-plan/SKILL.md:18-23`（步骤 1 区域）

- [x] **Step 7: 在 xt-sdd-plan 的步骤 1（确定当前变更）末尾追加 Token 快照记录子步骤**

  在 `xt-sdd-plan/SKILL.md` 的步骤 1 最后一个子步骤之后追加：

  ```markdown

  **Metrics Token 快照：** 步骤 1 完成后，记录 plan 阶段 Token 快照：
  1. 读取当前变更的 sdd-state.yaml，检查 `metrics.token_usage.ccusage_available`
  2. 如果为 true，执行 `npx ccusage session --json`，解析并追加快照到 `metrics.token_usage.snapshots`：
     ```yaml
     - phase: plan
       timestamp: <当前 ISO 8601 时间戳>
       input_tokens: <从 ccusage 获取>
       output_tokens: <从 ccusage 获取>
     ```
  3. 如果为 false，追加 `unavailable: true` 快照
  4. 如果 ccusage 执行失败，追加 `error: "<错误信息>"` 快照
  5. 使用 Edit 工具更新 sdd-state.yaml，**不阻塞流程**
  ```

- [ ] **Step 8: 提交 plan Token 快照指令**

  Run:
  ```bash
  git add .claude/skills/xt-sdd-plan/SKILL.md
  git commit -m "feat(metrics): 在 plan 步骤 1 增加 Token 快照记录指令"
  ```

---

### Task 4: 在 xt-sdd-apply 中增加 Token 快照记录指令

**Files:**
- Modify: `.claude/skills/xt-sdd-apply/SKILL.md:20-31`（步骤 1 区域）

- [x] **Step 9: 在 xt-sdd-apply 的步骤 1 末尾追加 Token 快照记录**

  在 `xt-sdd-apply/SKILL.md` 的步骤 1 最后一个子步骤之后追加（与 Task 3 格式一致，仅 `phase: apply`）：

  ```markdown

  **Metrics Token 快照：** 步骤 1 完成后，记录 apply 阶段 Token 快照：
  1. 读取当前变更的 sdd-state.yaml，检查 `metrics.token_usage.ccusage_available`
  2. 如果为 true，执行 `npx ccusage session --json`，解析并追加快照到 `metrics.token_usage.snapshots`（`phase: apply`）
  3. 如果为 false，追加 `unavailable: true` 快照（`phase: apply`）
  4. 如果 ccusage 执行失败，追加 `error: "<错误信息>"` 快照（`phase: apply`）
  5. 使用 Edit 工具更新 sdd-state.yaml，**不阻塞流程**
  ```

- [ ] **Step 10: 提交 apply Token 快照指令**

  Run:
  ```bash
  git add .claude/skills/xt-sdd-apply/SKILL.md
  git commit -m "feat(metrics): 在 apply 步骤 1 增加 Token 快照记录指令"
  ```

---

### Task 5: 在 xt-sdd-verify 中增加 Token 快照记录指令

**Files:**
- Modify: `.claude/skills/xt-sdd-verify/SKILL.md:20-25`（步骤 1 区域）

- [x] **Step 11: 在 xt-sdd-verify 的步骤 1 末尾追加 Token 快照记录**

  在 `xt-sdd-verify/SKILL.md` 的步骤 1 最后一个子步骤之后追加（格式一致，`phase: verify`）：

  ```markdown

  **Metrics Token 快照：** 步骤 1 完成后，记录 verify 阶段 Token 快照：
  1. 读取当前变更的 sdd-state.yaml，检查 `metrics.token_usage.ccusage_available`
  2. 如果为 true，执行 `npx ccusage session --json`，解析并追加快照到 `metrics.token_usage.snapshots`（`phase: verify`）
  3. 如果为 false，追加 `unavailable: true` 快照（`phase: verify`）
  4. 如果 ccusage 执行失败，追加 `error: "<错误信息>"` 快照（`phase: verify`）
  5. 使用 Edit 工具更新 sdd-state.yaml，**不阻塞流程**
  ```

- [ ] **Step 12: 提交 verify Token 快照指令**

  Run:
  ```bash
  git add .claude/skills/xt-sdd-verify/SKILL.md
  git commit -m "feat(metrics): 在 verify 步骤 1 增加 Token 快照记录指令"
  ```

---

### Task 6: 在 xt-sdd-archive 中增加 Token 快照记录指令

**Files:**
- Modify: `.claude/skills/xt-sdd-archive/SKILL.md:20-25`（步骤 1 区域）

- [x] **Step 13: 在 xt-sdd-archive 的步骤 1 末尾追加 Token 快照记录**

  在 `xt-sdd-archive/SKILL.md` 的步骤 1 最后一个子步骤之后追加（格式一致，`phase: archive`）：

  ```markdown

  **Metrics Token 快照：** 步骤 1 完成后，记录 archive 阶段 Token 快照：
  1. 读取当前变更的 sdd-state.yaml，检查 `metrics.token_usage.ccusage_available`
  2. 如果为 true，执行 `npx ccusage session --json`，解析并追加快照到 `metrics.token_usage.snapshots`（`phase: archive`）
  3. 如果为 false，追加 `unavailable: true` 快照（`phase: archive`）
  4. 如果 ccusage 执行失败，追加 `error: "<错误信息>"` 快照（`phase: archive`）
  5. 使用 Edit 工具更新 sdd-state.yaml，**不阻塞流程**
  ```

- [ ] **Step 14: 提交 archive Token 快照指令**

  Run:
  ```bash
  git add .claude/skills/xt-sdd-archive/SKILL.md
  git commit -m "feat(metrics): 在 archive 步骤 1 增加 Token 快照记录指令"
  ```

---

### Task 7: 在 xt-sdd-fix 中增加 Token 快照记录指令

**Files:**
- Modify: `.claude/skills/xt-sdd-fix/SKILL.md:19-52`（步骤 1 区域）

- [x] **Step 15: 在 xt-sdd-fix 的步骤 1 末尾追加 Token 快照记录**

  在 `xt-sdd-fix/SKILL.md` 的步骤 1 最后一个子步骤之后追加（格式一致，`phase: fix`）：

  ```markdown

  **Metrics Token 快照：** 步骤 1 完成后，记录 fix 阶段 Token 快照：
  1. 读取当前变更的 sdd-state.yaml，检查 `metrics.token_usage.ccusage_available`
  2. 如果为 true，执行 `npx ccusage session --json`，解析并追加快照到 `metrics.token_usage.snapshots`（`phase: fix`）
  3. 如果为 false，追加 `unavailable: true` 快照（`phase: fix`）
  4. 如果 ccusage 执行失败，追加 `error: "<错误信息>"` 快照（`phase: fix`）
  5. 使用 Edit 工具更新 sdd-state.yaml，**不阻塞流程**
  ```

- [ ] **Step 16: 提交 fix Token 快照指令**

  Run:
  ```bash
  git add .claude/skills/xt-sdd-fix/SKILL.md
  git commit -m "feat(metrics): 在 fix 步骤 1 增加 Token 快照记录指令"
  ```

---

### Task 8: 在所有阶段增加统一的降级处理说明

**Files:**
- Modify: 所有 6 个 xt-sdd-*.md 文件（已在 Task 2-7 中各自添加，本 Task 做最终验证）

- [x] **Step 17: 验证所有阶段 SKILL.md 均包含 Token 快照记录指令和降级处理**

  Run:
  ```bash
  for f in .claude/skills/xt-sdd-*/SKILL.md; do
    echo "=== $(basename $(dirname $f)) ==="
    grep -c "Token 快照" "$f" || echo "0"
    grep -c "unavailable: true" "$f" || echo "0"
    grep -c "error:" "$f" || echo "0"
  done
  ```

  Expected: 每个文件中 `Token 快照` 至少为 1，`unavailable: true` 至少为 1，`error:` 至少为 1

- [x] **Step 18: 最终提交验证结果**

  Run:
  ```bash
  git diff --stat HEAD
  ```

  Expected: 如果有未提交更改则提交；如果所有更改已提交则输出为空

---

## 自审清单

**1. Spec 覆盖度：**
- ✅ `token-tracking` spec "ccusage 已安装" scenario → Task 1 Step 1（检测 `npx ccusage --version`）
- ✅ `token-tracking` spec "ccusage 未安装但自动安装成功" scenario → Task 1 Step 1（`npm install -g ccusage` + 重新验证）
- ✅ `token-tracking` spec "ccusage 未安装且自动安装失败" scenario → Task 1 Step 1（记录 `install_error`，不阻塞）
- ✅ `token-tracking` spec "正常记录 Token 快照" scenario → Task 2-7（每个阶段的 ccusage session 调用）
- ✅ `token-tracking` spec "ccusage 不可用时跳过" scenario → Task 2-7（unavailable: true 快照）
- ✅ `token-tracking` spec "ccusage 命令执行失败" scenario → Task 2-7（error 快照，不阻塞）

**2. 占位符扫描：** 无 TBD/TODO。所有步骤包含具体命令和 YAML 片段。

**3. 类型一致性：** `phase` 字段在各阶段分别使用 `propose`/`plan`/`apply`/`verify`/`archive`/`fix`，与 sdd-state.yaml 结构规范中的 phase 枚举值一致。`ccusage_available`、`auto_installed`、`install_error` 字段名与分组 1 模板中的字段名一致。
