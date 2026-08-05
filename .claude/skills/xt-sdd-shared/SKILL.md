---
name: xt-sdd-shared
description: xt-sdd 共享优化模块 — 不是独立 skill，不直接触发。为 propose/plan/apply/verify/quick/archive 各阶段提供通用的上下文管理、小窗口模型适配、CLI 调用优化规则。各阶段 SKILL.md 通过相对路径引用本文档。
---

# xt-sdd 共享优化模块

本目录是 xt-sdd 各阶段共享的优化规则库，**不是独立 skill，不会直接触发**。

## 用途

为 xt-sdd 六个阶段（propose/plan/apply/verify/quick/archive）提供统一的优化规则，避免每个阶段重复定义。

## 引用方式

各阶段 SKILL.md 通过相对路径引用：

```markdown
## 参考文档
- [xt-sdd-shared/context-management.md](../xt-sdd-shared/references/context-management.md) — 通用上下文管理
- [xt-sdd-shared/small-window-adaptation.md](../xt-sdd-shared/references/small-window-adaptation.md) — 小窗口模型适配
- [xt-sdd-shared/cli-optimization.md](../xt-sdd-shared/references/cli-optimization.md) — CLI 调用优化
```

## 文档清单

| 文档 | 内容 | 适用阶段 |
|------|------|---------|
| [context-management.md](references/context-management.md) | 上下文管理规则、状态优先对话、清理触发 | 全部 |
| [context-isolation-strategy.md](references/context-isolation-strategy.md) | **subagent 隔离、/clear 提示、批次划分**（防挤爆） | 全部 |
| [small-window-adaptation.md](references/small-window-adaptation.md) | 模型检测、轻量模式、紧急清空 | 全部 |
| [cli-optimization.md](references/cli-optimization.md) | 状态检查合并、instructions 缓存、文件检查替代 | propose/plan/archive |

## 共享脚本

以下脚本位于 `xt-sdd-propose/scripts/`，各阶段共享使用：

| 脚本 | 用途 | 使用阶段 |
|------|------|---------|
| `instructions-cache.sh` | instructions 缓存管理 | propose, plan |
| `cache-check.sh` | 项目分析缓存检查 | propose |
| `resume-check.sh` | 断点恢复检查 | propose |

## 设计原则

1. **单一职责**：每个文档只关注一个优化维度
2. **跨阶段通用**：规则抽象，不绑定具体阶段
3. **阶段特化**：各阶段 SKILL.md 补充阶段特定的应用要点
4. **路径一致**：统一用相对项目根的路径引用
