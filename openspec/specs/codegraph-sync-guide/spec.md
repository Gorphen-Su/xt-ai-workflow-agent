# codegraph-sync-guide Specification

## Purpose
TBD - created by archiving change xt-codegraph-sync-update. Update Purpose after archive.
## Requirements
### Requirement: 用户了解 MCP daemon 自动同步机制

文档 SHALL 说明 MCP daemon 在后台运行时自动执行 `codegraph sync`，用户无需手动干预。

#### Scenario: 用户阅读文档后了解自动同步
- **WHEN** 用户阅读 codegraph-init skill 中"索引维护"章节
- **THEN** 用户了解 MCP daemon 在后台会自动同步代码变更

### Requirement: 用户能够检测索引是否过期

文档 SHALL 提供 `codegraph status` 命令作为轻量级检测方法，用户可通过时间戳判断索引是否需要更新。

#### Scenario: 用户使用 status 命令检查索引
- **WHEN** 用户执行 `codegraph status`
- **THEN** 显示索引时间戳和符号数量，用户可判断是否过期

#### Scenario: 用户怀疑索引过期时重建
- **WHEN** 用户怀疑查询结果不准确或切换分支后
- **THEN** 用户可执行 `codegraph index --force` 重建全量索引

### Requirement: xt-sdd apply 阶段包含同步检查提示

xt-sdd-apply skill 文档 SHALL 在代码修改步骤后添加简洁的同步检查提示，提醒用户确保索引最新。

#### Scenario: 用户阅读 apply skill 文档看到同步提示
- **WHEN** 用户阅读 xt-sdd-apply skill 中"定位修改点"步骤
- **THEN** 文档包含提示："代码修改后，CodeGraph 会自动同步索引。如查询结果可疑，运行 `codegraph status` 检查时间戳，或 `codegraph index --force` 重建。"

### Requirement: xt-sdd verify 阶段包含同步检查提示

xt-sdd-verify skill 文档 SHALL在回归测试步骤前添加同步检查提示，确保测试基于最新索引。

#### Scenario: 用户阅读 verify skill 文档看到同步提示
- **WHEN** 用户阅读 xt-sdd-verify skill 中"codegraph affected 精准回归"步骤
- **THEN** 文档包含提示："运行 `codegraph affected` 前，确保 CodeGraph 索引最新。代码修改后索引会自动同步，如查询结果可疑，运行 `codegraph index --force` 重建。"

### Requirement: 文档提供常见场景处理指南

codegraph-init skill SHALL 提供常见场景（大改、切换分支、索引异常）的处理步骤。

#### Scenario: 用户遇到索引过期问题查找解决方案
- **WHEN** 用户的 codegraph 查询结果与实际代码不符
- **THEN** 用户可在"索引维护"章节找到对应的处理步骤（检查 status → 必要时重建）

### Requirement: 参考文档增强同步相关说明

codegraph-xt-sdd.md 参考文档 SHALL 扩展"何时更新索引"章节，提供更详细的同步机制说明。

#### Scenario: 用户查看参考文档了解同步时机
- **WHEN** 用户阅读 codegraph-xt-sdd.md
- **THEN** "何时更新索引"章节包含自动同步机制、手动检测方法和工作流集成说明

