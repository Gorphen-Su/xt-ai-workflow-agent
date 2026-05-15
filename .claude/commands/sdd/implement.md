---
name: sdd:implement
description: SDD 实现阶段 — 逐任务执行 TDD 循环，自动跟踪任务状态
category: sdd
tags: [sdd, implement, tdd]
---

# SDD 实现阶段

进入 SDD 规格驱动开发的实现阶段。

**输入**：变更名称（可选，自动从当前进度推断）

**步骤**：
1. 读取 task-status.md 恢复进度
2. 调用 `sdd-implement` skill 执行 TDD 循环
3. 每个任务完成后更新 task-status.md 并要求用户确认

使用 Skill 工具调用 `sdd-implement` skill，将用户输入的参数传递给 skill。
