---
name: sdd:plan
description: SDD 计划阶段 — 基于 proposal 生成 design/specs/tasks，内置 bridge 转换
category: sdd
tags: [sdd, plan, specification]
---

# SDD 计划阶段

进入 SDD 规格驱动开发的计划阶段。

**输入**：变更名称（可选，自动从当前进度推断）

**步骤**：
1. 读取 proposal.md
2. 调用 `sdd-plan` skill 生成规范产物
3. 产出 design.md、specs/、tasks.md、task-status.md
4. 要求用户确认

使用 Skill 工具调用 `sdd-plan` skill，将用户输入的参数传递给 skill。
