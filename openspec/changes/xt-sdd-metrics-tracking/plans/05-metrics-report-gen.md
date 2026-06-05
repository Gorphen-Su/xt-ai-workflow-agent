<!-- sdd change: xt-sdd-metrics-tracking -->

# Metrics Report 生成 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 xt-sdd-archive 的 SKILL.md 中增加 metrics-report.md 生成步骤，自动汇总整个变更过程的统计数据为结构化报告。

**Architecture:** 在步骤 2.6（Token 数据汇总）之后新增步骤 2.7（生成 Metrics Report），使用 Write 工具在变更目录下生成 `metrics-report.md`，包含变更概览、Git 基线、文件变更统计表格、代码行数统计、Token 消费汇总和阶段快照明细表。

**Tech Stack:** Markdown（SKILL.md、metrics-report.md）

---

### Task 1: 在 xt-sdd-archive 步骤 2.6 之后增加报告生成步骤

**Files:**
- Modify: `.claude/skills/xt-sdd-archive/SKILL.md`（步骤 2.6 之后、步骤 3 之前）

- [ ] **Step 1: 在步骤 2.6 结尾和步骤 3 开始之间，插入步骤 2.7（生成 Metrics Report）**

  在 `xt-sdd-archive/SKILL.md` 的步骤 2.6 最后一行之后、`### 步骤 3` 之前，插入：

  ```markdown

  ### 步骤 2.7：生成 Metrics Report

  使用 Write 工具在变更目录下生成 `metrics-report.md`，内容模板如下（根据实际数据填充，缺失数据标记 "数据不可用"）：

  ```markdown
  # Metrics Report: <变更名>

  ## 变更概览

  | 项目 | 值 |
  |------|-----|
  | 变更名称 | <change-name> |
  | 开始时间 | <metrics.git_baseline.start_time 或 "数据不可用"> |
  | 结束时间 | <metrics.git_baseline.end_time 或 "数据不可用"> |
  | 起始 SHA | <metrics.git_baseline.start_sha 或 "N/A"> |
  | 结束 SHA | <metrics.git_baseline.end_sha 或 "N/A"> |

  ## 文件变更统计

  | 指标 | 数值 |
  |------|------|
  | 新增文件 | <metrics.file_stats.files_added 或 "N/A"> |
  | 编辑文件 | <metrics.file_stats.files_modified 或 "N/A"> |
  | 删除文件 | <metrics.file_stats.files_deleted 或 "N/A"> |
  | 总变更文件 | <metrics.file_stats.total_files_changed 或 "N/A"> |

  ## 代码行数统计

  - **新增行数**：<metrics.line_stats.lines_added 或 "N/A">
  - **删除行数**：<metrics.line_stats.lines_deleted 或 "N/A">

  ## Token 消费统计

  | 指标 | 数值 |
  |------|------|
  | 输入 Tokens | <metrics.token_usage.total_input_tokens 或 "数据不可用"> |
  | 输出 Tokens | <metrics.token_usage.total_output_tokens 或 "数据不可用"> |
  | 总 Tokens | <metrics.token_usage.total_tokens 或 "数据不可用"> |
  | 预估费用 (USD) | <metrics.token_usage.estimated_cost_usd 或 "数据不可用"> |

  ### 各阶段 Token 快照明细

  | 阶段 | 时间 | 输入 Tokens | 输出 Tokens | 状态 |
  |------|------|------------|------------|------|
  | <对 metrics.token_usage.snapshots 每条记录生成一行> | <timestamp> | <input_tokens 或 "N/A"> | <output_tokens 或 "N/A"> | <正常/unavailable/error> |
  ```

  **部分数据缺失处理**：
  - 如果整个 metrics 段为初始空值（所有字段为 0 或 null）→ 生成最小报告，说明 "本次变更未收集到指标数据"，列出可能原因（ccusage 未安装、Git 基线未记录等）
  - 如果仅部分数据缺失 → 缺失字段标记 "数据不可用" 或 "N/A"，**不跳过报告生成**

  **报告作为归档产物**：确保 metrics-report.md 与 archive.md 一同保留在变更目录中，不被清理。
  ```

- [ ] **Step 2: 验证步骤 2.7 存在于 archive SKILL.md**

  Run: `grep -n "### 步骤 2.7\|Metrics Report\|metrics-report.md" .claude/skills/xt-sdd-archive/SKILL.md`

  Expected: 输出包含步骤 2.7 标题、Metrics Report 关键字和 metrics-report.md 文件名

- [ ] **Step 3: 提交 Metrics Report 生成步骤**

  Run:
  ```bash
  git add .claude/skills/xt-sdd-archive/SKILL.md
  git commit -m "feat(metrics): 在 archive 步骤 2.7 增加 Metrics Report 生成逻辑"
  ```

---

## 自审清单

**1. Spec 覆盖度：**
- ✅ `metrics-report` spec "生成完整报告" → Step 1（完整报告模板包含所有段落）
- ✅ `metrics-report` spec "部分数据缺失时生成报告" → Step 1（部分数据缺失处理段）
- ✅ `metrics-report` spec "报告文件格式" → Step 1（模板使用 `#` 标题、`##` 段落、Markdown 表格）
- ✅ `metrics-report` spec "归档包含 metrics 报告" → Step 1（报告作为归档产物说明）
- ✅ `metrics-report` spec "无 metrics 数据时的归档" → Step 1（最小报告 + 可能原因列表）

**2. 占位符扫描：** 无 TBD/TODO。报告模板包含完整的 Markdown 结构和字段映射。

**3. 类型一致性：** 报告中引用的所有字段名（`file_stats.files_added`、`line_stats.lines_added`、`token_usage.total_input_tokens` 等）与分组 1 模板和各 spec 中的字段名完全一致。
