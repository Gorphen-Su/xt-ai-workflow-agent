# archive.md 模板与生成指南

本文档定义 `xt-sdd-archive` 阶段生成的 archive.md 模板，以及从 sdd-state.yaml 生成的方式。

## archive.md 完整模板

```markdown
# 归档记录 - <change-name>

## 需求概要
（来自 proposal.md 的 Why 和 What Changes 部分）

## 技术方案
（来自 design.md 的 Decisions 部分）

## 实现详情
（来自 sdd-state.yaml 的任务执行记录：哪些任务走了 TDD，有哪些重构，审查次数）

## 规格变更
（来自 specs/：哪些场景是 ADDED 的，哪些是 MODIFIED 的）

## 测试覆盖
（来自验证报告：测试结果摘要）

## 文档同步记录
（来自 verify 阶段的文档同步检查结果）

## 级联回退记录
（来自 sdd-state.yaml 的 cascade 字段）

## 任务执行统计
- 总任务数：<N>
- 已完成：<M>
- 已失败：<F>
- 审查轮次：<R>
- 执行时间范围：<开始时间> - <结束时间>
```

---

## 生成策略：状态优先（核心优化）

### 原理

archive.md 的内容大部分可从 **sdd-state.yaml 已有字段**直接生成，无需重新读取源文件全文。

### 字段来源映射

| archive.md 章节 | 数据来源（优先级） | 降级方式 |
|---------------|-----------------|---------|
| 需求概要 | `context_summary.key_decisions` + `current_objective` | 摘要式补读 proposal.md 的 ## Why |
| 技术方案 | `context_summary.key_decisions`（架构决策） | 摘要式补读 design.md 的 ## Decisions |
| 实现详情 | `tasks` 列表（status/test_result） | 直接用 sdd-state.yaml |
| 规格变更 | `artifacts_status`（ADDED/MODIFIED） | 摘要式补读 specs/ 的场景标题 |
| 测试覆盖 | `verify_status.test_result_summary` | 摘要式补读验证报告 |
| 文档同步记录 | `verify_status.doc_sync_completed` | 直接用 sdd-state.yaml |
| 级联回退记录 | `cascade` 字段 | 直接用 sdd-state.yaml |
| 任务执行统计 | `tasks` + `review_counters` + `git_baseline` | 直接用 sdd-state.yaml |

### 生成流程

```
1. 读取 sdd-state.yaml（一次）
   ↓
2. 从已有字段生成 80% 内容
   ↓
3. 检查缺失字段（requirement_brief, key_decisions 等）
   ↓
4. 按需摘要式补读（仅缺失部分）
   ↓
5. 填充模板，生成 archive.md
```

---

## 摘要式补读规则

当 sdd-state.yaml 缺失某字段时，按以下规则**只读关键章节**：

| 源文件 | 读取范围 | 禁止 |
|-------|---------|------|
| proposal.md | 仅 `## Why` + `## What Changes` 章节 | ❌ 全文 |
| design.md | 仅 `## Decisions` 章节 | ❌ 全文 |
| specs/ | 仅 ADDED/MODIFIED 标记的 Scenario 标题 | ❌ 全目录 |
| 验证报告 | 仅 `### 摘要` 章节 | ❌ 全文 |

**补读示例**：

```bash
# 用 grep 提取关键章节（替代全文 Read）
grep -A 20 "## Why" openspec/changes/<name>/proposal.md
grep -A 30 "## Decisions" openspec/changes/<name>/design.md
```

---

## 快速变更（quick）的简化模板

quick 流程的 archive.md 用简化模板：

```markdown
# 归档记录 - quick-<简述>

## 功能描述
<简要>

## 改动内容
<改了什么>

## 文档同步
- 影响级别：无/specs/design
- 更新的文档：<文件列表>

## 验证结果
- 聚焦测试（codegraph affected）：<通过数>/<总数>
- 影响范围验证：通过/未通过
```

---

## 预期收益

| 生成方式 | Token 消耗 | 改善 |
|---------|----------|------|
| 原方式（读全文） | ~3000 tokens | - |
| 状态优先（完整） | ~500 tokens | **~83%** |
| 状态优先（降级补读） | ~1000 tokens | **~67%** |
