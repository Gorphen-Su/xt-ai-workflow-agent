---
name: sdd:verify
description: SDD 验证阶段 — 测试套件运行 + 规范合规检查
category: sdd
tags: [sdd, verify, compliance]
---

# SDD 验证阶段

进入 SDD 规格驱动开发的验证阶段。

**输入**：变更名称（可选，自动从当前进度推断）

**步骤**：
1. 读取变更目录下的所有产物
2. 调用 `sdd-verify` skill 执行双重验证
3. 产出验证报告并要求用户确认

使用 Skill 工具调用 `sdd-verify` skill，将用户输入的参数传递给 skill。
