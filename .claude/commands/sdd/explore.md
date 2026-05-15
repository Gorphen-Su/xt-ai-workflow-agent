---
name: sdd:explore
description: SDD 探索阶段 — 需求澄清与方案讨论，产出 proposal.md
category: sdd
tags: [sdd, explore, specification]
---

# SDD 探索阶段

进入 SDD 规格驱动开发的探索阶段。

**输入**：用户的需求描述（可选），格式为 `[模块名] 功能描述`

**步骤**：
1. 执行 Git 状态前置检查
2. 调用 `sdd-explore` skill 完成探索与需求澄清
3. 产出 proposal.md 并要求用户确认

使用 Skill 工具调用 `sdd-explore` skill，将用户输入的参数传递给 skill。
