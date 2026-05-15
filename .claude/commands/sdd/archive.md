---
name: sdd:archive
description: SDD 归档阶段 — 合并双源信息，归档并提示 Git 提交
category: sdd
tags: [sdd, archive, git]
---

# SDD 归档阶段

进入 SDD 规格驱动开发的归档阶段。

**输入**：变更名称（可选，自动从当前进度推断）

**步骤**：
1. 检查所有任务和验证状态
2. 调用 `sdd-archive` skill 执行归档
3. 产出 archive.md 并提示 Git 提交
4. 要求用户确认

使用 Skill 工具调用 `sdd-archive` skill，将用户输入的参数传递给 skill。
