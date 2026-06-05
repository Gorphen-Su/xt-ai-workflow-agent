<!-- sdd change: xt-sdd-metrics-tracking -->

# Token 数据汇总 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 xt-sdd-archive 的 SKILL.md 中增加 Token 数据汇总步骤，从 snapshots 数组提取并计算总 Token 消费数据。

**Architecture:** 在步骤 2.5（Git Diff 统计）之后新增步骤 2.6（Token 数据汇总），读取 `metrics.token_usage.snapshots` 数组，从最后一个有效快照提取累计值，填充 `metrics.token_usage` 汇总字段。

**Tech Stack:** Markdown（SKILL.md）

---

### Task 1: 在 xt-sdd-archive 步骤 2.5 之后增加 Token 数据汇总步骤

**Files:**
- Modify: `.claude/skills/xt-sdd-archive/SKILL.md`（步骤 2.5 之后、步骤 3 之前）

- [ ] **Step 1: 在步骤 2.5 结尾和步骤 3 开始之间，插入步骤 2.6（Metrics Token 数据汇总）**

  在 `xt-sdd-archive/SKILL.md` 的步骤 2.5 最后一行之后、`### 步骤 3` 之前，插入：

  ```markdown

  ### 步骤 2.6：Metrics Token 数据汇总

  1. 读取 sdd-state.yaml 的 `metrics.token_usage.snapshots` 数组
  2. **无数据降级处理**：如果 snapshots 数组为空，或所有快照均标记 `unavailable: true` 或包含 `error` 字段：
     - 设置 `metrics.token_usage.total_input_tokens: null`
     - 设置 `metrics.token_usage.total_output_tokens: null`
     - 设置 `metrics.token_usage.total_tokens: null`
     - 设置 `metrics.token_usage.estimated_cost_usd: null`
     - 设置 `metrics.token_usage.token_data_unavailable: true`
     - 跳过后续步骤
  3. **提取有效数据**：从 snapshots 数组中找到最后一个不包含 `unavailable` 且不包含 `error` 的快照
  4. 从该快照中提取 `input_tokens` 和 `output_tokens`
  5. 填充汇总字段：
     - `metrics.token_usage.total_input_tokens` ← 快照的 `input_tokens`
     - `metrics.token_usage.total_output_tokens` ← 快照的 `output_tokens`
     - `metrics.token_usage.total_tokens` ← `total_input_tokens + total_output_tokens`
     - `metrics.token_usage.estimated_cost_usd` ← 如果 ccusage session 输出包含 cost 字段则使用该值，否则设为 null
  6. 使用 Edit 工具更新 sdd-state.yaml
  ```

- [ ] **Step 2: 验证步骤 2.6 存在于 archive SKILL.md**

  Run: `grep -n "### 步骤 2.6\|token_data_unavailable\|total_input_tokens\|total_output_tokens\|total_tokens" .claude/skills/xt-sdd-archive/SKILL.md`

  Expected: 输出包含步骤 2.6 标题和所有汇总字段名

- [ ] **Step 3: 提交 Token 汇总步骤**

  Run:
  ```bash
  git add .claude/skills/xt-sdd-archive/SKILL.md
  git commit -m "feat(metrics): 在 archive 步骤 2.6 增加 Token 数据汇总逻辑"
  ```

---

## 自审清单

**1. Spec 覆盖度：**
- ✅ `token-tracking` spec "计算 Token 总量" → Step 1 第 3-5 点
- ✅ `token-tracking` spec "无可用 Token 数据" → Step 1 第 2 点

**2. 占位符扫描：** 无 TBD/TODO。所有步骤包含具体字段名和逻辑。

**3. 类型一致性：** `total_input_tokens`、`total_output_tokens`、`total_tokens`、`estimated_cost_usd`、`token_data_unavailable` 字段名与分组 1 模板和 token-tracking spec 完全一致。
