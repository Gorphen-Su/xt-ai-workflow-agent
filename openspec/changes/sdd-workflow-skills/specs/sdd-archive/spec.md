## ADDED Requirements

### Requirement: 归档前验证
sdd:archive MUST 在归档前确认所有任务已完成、验证已通过。如果存在未完成的任务或未通过的验证，MUST 警告用户并获得确认后才能继续。

#### Scenario: 所有任务已完成且验证通过
- **WHEN** 用户调用 `/sdd:archive` 且所有任务状态为"已完成"、验证已通过
- **THEN** 直接进入归档流程

#### Scenario: 存在未完成的任务
- **WHEN** 用户调用 `/sdd:archive` 但存在状态为"未开始"或"执行中"的任务
- **THEN** 警告用户存在未完成任务，询问是否确认归档

### Requirement: 双源归档信息合并
sdd:archive MUST 合并 OpenSpec 和 Superpowers 两者的归档信息到 archive.md。

#### Scenario: 生成 archive.md
- **WHEN** sdd:archive 执行归档
- **THEN** 生成 archive.md，包含：需求概要（来自 proposal.md）、技术方案（来自 design.md）、实现详情（来自 task-status.md 的执行记录）、规格变更（来自 specs/ 的 ADDED/MODIFIED/REMOVED 记录）、测试覆盖（来自验证报告）、Git 提交记录

#### Scenario: 规格变更同步
- **WHEN** sdd:archive 执行归档
- **THEN** 调用 opsx:sync 将 delta specs 同步到主规范，然后执行 opsx:archive 归档变更目录

### Requirement: Git 提交提醒
sdd:archive 归档完成后 MUST 提醒用户是否需要立即提交 git。如果用户确认，MUST 将当前需求的所有代码和文档一起提交。

#### Scenario: 用户确认提交
- **WHEN** 用户选择立即提交 git
- **THEN** 将所有变更文件暂存，生成中文 commit message（格式：`feat(<模块>): <功能描述>`），执行 git commit

#### Scenario: 用户选择不提交
- **WHEN** 用户选择暂不提交
- **THEN** 仅完成归档，不执行 git 操作

### Requirement: 阶段完成确认
sdd:archive 完成后 MUST 要求用户确认。MUST NOT 自动跳过确认步骤。

#### Scenario: 用户确认归档完成
- **WHEN** 用户确认归档结果
- **THEN** 工作流结束

#### Scenario: 用户确认不通过
- **WHEN** 用户认为归档信息不完整或不准确
- **THEN** 回到归档阶段补充信息，重新确认
