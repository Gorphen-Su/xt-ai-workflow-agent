<!-- sdd change: xt-sdd-metrics-tracking -->

# 验证与测试 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通过实际运行 xt-sdd-propose 和完整 xt-sdd 流程验证 Metrics Tracking 功能的正确性。

**Architecture:** 创建一个测试变更，走完 propose 流程，验证 sdd-state.yaml 中 metrics 段初始化正确、start_sha 已记录、ccusage 检测结果已写入。然后模拟完整流程验证 metrics-report.md 生成。

**Tech Stack:** Shell（git 命令、ccusage 命令）、YAML（sdd-state.yaml 验证）

---

### Task 1: 验证 propose 阶段 metrics 段初始化

**Files:**
- Verify: `openspec/changes/` 目录（创建测试变更）
- Verify: `sdd-state.yaml`（metrics 段结构）

- [ ] **Step 1: 使用 xt-sdd-propose 启动一个测试变更**

  运行 `/xt-sdd:propose` 并提供测试需求描述（如 "测试 metrics 功能"），完成 propose 流程。

  **验证点：**
  - sdd-state.yaml 包含完整的 `metrics` 顶级段
  - `metrics.git_baseline.start_sha` 非空且为有效的 40 字符 SHA
  - `metrics.git_baseline.start_time` 非空且为 ISO 8601 格式
  - `metrics.file_stats` 所有字段为 0
  - `metrics.line_stats` 所有字段为 0
  - `metrics.token_usage.ccusage_available` 为 true 或 false（非 null）
  - `metrics.token_usage.snapshots` 包含至少一条 propose 阶段快照

- [ ] **Step 2: 验证 start_sha 正确性**

  Run:
  ```bash
  # 获取测试变更目录名
  CHANGE_DIR=$(ls -td openspec/changes/*/ | head -1)
  # 提取 start_sha
  START_SHA=$(grep "start_sha:" "${CHANGE_DIR}sdd-state.yaml" | awk '{print $2}')
  # 验证是否为有效 commit
  git rev-parse --verify "$START_SHA" 2>&1
  ```

  Expected: 输出完整的 40 字符 SHA，与 start_sha 值一致

- [ ] **Step 3: 清理测试变更**

  删除测试变更目录，恢复仓库到测试前状态。

---

### Task 2: 验证 ccusage 可用性检测

**Files:**
- Verify: Shell 命令执行结果

- [ ] **Step 4: 验证 ccusage 已安装场景**

  Run: `npx ccusage --version 2>&1`

  Expected: 输出 ccusage 版本号（如 `ccusage/x.y.z`）

- [ ] **Step 5: 验证 ccusage session 命令输出格式**

  Run: `npx ccusage session --json 2>&1 | head -20`

  Expected: 输出 JSON 格式数据，包含 token 相关字段（input_tokens/output_tokens 或类似命名）

---

### Task 3: 模拟完整 xt-sdd 流程验证 metrics-report.md

**Files:**
- Verify: `metrics-report.md`（归档时生成）

- [ ] **Step 6: 模拟完整 xt-sdd 流程**

  使用已有的测试变更（或在 Task 1 清理后重新创建），完整运行 propose → plan → apply → verify → archive 流程。

  **验证点：**
  - archive 阶段步骤 2.5（Git Diff 统计）正确执行
  - archive 阶段步骤 2.6（Token 汇总）正确执行
  - archive 阶段步骤 2.7（Report 生成）正确执行
  - 变更目录下存在 `metrics-report.md` 文件且内容非空

- [ ] **Step 7: 验证 metrics-report.md 内容完整性**

  Run:
  ```bash
  CHANGE_DIR=$(ls -td openspec/changes/*/ | head -1)
  grep -c "Metrics Report\|变更概览\|文件变更统计\|代码行数统计\|Token 消费统计\|Token 快照明细" "${CHANGE_DIR}metrics-report.md"
  ```

  Expected: 输出 `6`（6 个段落标题均存在）

- [ ] **Step 8: 最终验证提交**

  Run:
  ```bash
  git log --oneline -10
  ```

  Expected: 最近的提交记录包含所有 metrics 相关的 feat 提交

---

## 自审清单

**1. Spec 覆盖度：**
- ✅ `git-diff-metrics` spec "Metrics 段初始化" → Task 1 Step 1
- ✅ `git-diff-metrics` spec "正常记录基线 SHA" → Task 1 Step 2
- ✅ `token-tracking` spec "ccusage 已安装" → Task 2 Step 4
- ✅ `token-tracking` spec "正常记录 Token 快照" → Task 2 Step 5
- ✅ `metrics-report` spec "生成完整报告" → Task 3 Step 7
- ✅ `metrics-report` spec "归档包含 metrics 报告" → Task 3 Step 6

**2. 占位符扫描：** 无 TBD/TODO。验证步骤包含具体的命令和预期输出。

**3. 类型一致性：** 验证命令中引用的字段名和文件名与分组 1-5 中的定义完全一致。
