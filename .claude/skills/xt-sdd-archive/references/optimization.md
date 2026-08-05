# archive 阶段优化说明

本文档说明 `xt-sdd-archive` 阶段的 token 与上下文优化策略。

## 优化项

### 1. archive.md 状态优先生成（核心优化）⭐⭐⭐

**原理**：archive.md 大部分内容可从 sdd-state.yaml 已有字段直接生成，无需读取源文件全文。

→ 模板与字段映射详见 [archive-template.md](archive-template.md)

**生成流程**：
1. 读取 sdd-state.yaml（一次，轻量）
2. 从已有字段（context_summary、tasks、verify_status、cascade）生成 80% 内容
3. 缺失部分摘要式补读（只读关键章节）
4. 填充模板

**收益**：减少 ~2500 tokens（不重复读源文件全文）

---

### 2. 摘要式补读 ⭐⭐

**原理**：必须读源文件时，只读关键章节。

| 源文件 | 读取范围 |
|-------|---------|
| proposal.md | 仅 ## Why + ## What Changes |
| design.md | 仅 ## Decisions |
| specs/ | 仅 ADDED/MODIFIED 场景标题 |
| 验证报告 | 仅摘要章节 |

**实现**：用 grep 提取章节，替代全文 Read。

```bash
grep -A 20 "## Why" openspec/changes/<name>/proposal.md
grep -A 30 "## Decisions" openspec/changes/<name>/design.md
```

**收益**：补读部分减少 ~70% tokens

---

### 3. 文档分层 ⭐⭐

archive SKILL.md 拆分：
- SKILL.md：精简主流程
- references/archive-template.md：完整模板 + 生成策略
- references/optimization.md：优化说明（本文档）

---

### 4. 通用规则引用 ⭐

引用共享模块：
- [xt-sdd-shared/references/context-management.md](../../xt-sdd-shared/references/context-management.md) — 输出精简
- [xt-sdd-shared/references/cli-optimization.md](../../xt-sdd-shared/references/cli-optimization.md) — openspec status 文件检查替代

---

## archive 阶段的上下文特点

archive 是收尾阶段，相对轻量：
- ✅ 线性流程，无循环
- ✅ 无审查循环
- ✅ 上下文累积不严重

**主要 token 消耗点**：archive.md 双源合并读取（已被优化项 1+2 解决）

---

## sdd-state.yaml 字段复用

archive 优先复用已有字段，**无需新增字段**：

| 已有字段 | archive 用途 |
|---------|------------|
| `context_summary.key_decisions` | 技术方案、需求概要 |
| `context_summary.current_objective` | 需求概要 |
| `tasks`（列表） | 实现详情、任务统计 |
| `review_counters` | 审查轮次统计 |
| `cascade` | 级联回退记录 |
| `git_baseline` | 执行时间范围 |
| `verify_status.test_result_summary` | 测试覆盖（如已增强） |
| `verify_status.doc_sync_completed` | 文档同步记录（如已增强） |
| `artifacts_status` | 规格变更（ADDED/MODIFIED） |

> 注：verify_status 字段为 verify 阶段优化时建议增强的字段，若未填充则降级为摘要式补读。

---

## 总体收益

| 优化项 | Token 节省 |
|-------|----------|
| 状态优先生成 | ~2500 |
| 摘要式补读 | ~500（补读部分） |
| 文档分层 | ~200/轮 |
| **合计** | **~3000+** |

---

## 与完整流程的关系

archive 是 xt-sdd 流程的最后阶段，优化后：
- 从 sdd-state.yaml 状态文件快速生成归档
- 不依赖前序对话历史（支持阶段间 /clear）
- 与断点恢复机制兼容
