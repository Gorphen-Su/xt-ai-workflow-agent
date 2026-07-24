# Proposal - CodeGraph 索引同步更新说明补充

## Why

当前 codegraph-init skill 已包含基础的初始化和索引维护说明，但缺少代码修改后的索引同步更新机制说明。用户在开发流程（如 xt-sdd apply/verify 阶段）中不清楚：
1. MCP daemon 是否在后台自动同步索引
2. 如何检测索引是否过期
3. 何时需要手动触发同步
4. 在工作流中如何集成同步检查

这导致用户可能基于过期索引进行代码查询，影响开发效率和准确性。

## What Changes

补充以下四个方面的内容：

1. **工作流集成** — 在 xt-sdd apply/verify 阶段添加 codegraph 同步检查提示，确保代码修改后索引保持最新
2. **后台机制说明** — 详细说明 MCP daemon 后台运行机制和自动同步行为
3. **检测方法** — 添加索引过期检测方法和手动同步步骤
4. **维护章节完善** — 在 codegraph-init skill 中添加完整的"索引维护"章节，涵盖日常维护、故障排查和最佳实践

## Capabilities

### New Capabilities

- `codegraph-sync-guide`: CodeGraph 索引同步更新使用指南，涵盖自动同步机制、手动检测方法和工作流集成

### Modified Capabilities

- 无（纯文档增强，不涉及现有行为规格变更）

## Impact

**影响的文档：**
- [xt-codegraph-init/SKILL.md](.claude/skills/xt-codegraph-init/SKILL.md) — 主要修改目标
- [xt-sdd-apply/SKILL.md](.claude/skills/xt-sdd-apply/SKILL.md) — 添加同步检查提示
- [xt-sdd-verify/SKILL.md](.claude/skills/xt-sdd-verify/SKILL.md) — 添加同步检查提示
- [xt-codegraph-init/references/codegraph-xt-sdd.md](.claude/skills/xt-codegraph-init/references/codegraph-xt-sdd.md) — 增强同步相关说明

**影响的系统行为：**
- 无（纯文档增强）
