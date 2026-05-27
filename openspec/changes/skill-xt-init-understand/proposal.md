## Why

开发者在接手旧项目时，往往需要花费大量时间阅读和理解代码结构。目前缺少一个标准化的工具能自动分析项目代码并生成结构化的理解文档，导致每次新人上手或回顾旧代码时都需重复探索。

## What Changes

- 新增项目级 skill `xt-init-understand`，存放于 `.claude/skills/xt-init-understand/`
- 命令入口为 `/xt-init:understand`，作为 xt-init 系列子命令
- 自动检测并安装 Understand-Anything MCP 工具依赖
- 支持全项目分析和指定目录/模块两种分析范围
- 分析结果保存到 `docs/understand/` 目录，生成结构化理解文档
- 支持基于 Git diff 的增量更新，仅重新分析变更部分
- 分析完成后自动将文档路径和查询指引写入项目 CLAUDE.md

## Capabilities

### New Capabilities

- `dependency-check`: 检测和自动安装 Understand-Anything MCP 工具，适配当前 AI 编码平台（Claude/Cursor/Windsurf 等）
- `project-analysis`: 调用 /understand-domain 对项目代码进行结构化分析，支持全量和指定范围两种模式
- `incremental-update`: 基于 Git diff 检测变更文件，仅重新分析受影响的模块并更新文档
- `claude-md-integration`: 将分析结果路径和查询指引自动写入项目 CLAUDE.md，供后续对话自动引用

### Modified Capabilities

（无已有 spec 需要修改）

## Impact

- 新增文件：`.claude/skills/xt-init-understand/SKILL.md`
- 新增目录：`docs/understand/`（分析输出）
- 修改文件：项目根 `CLAUDE.md`（追加理解文档路径引用）
- 外部依赖：Understand-Anything MCP 工具（自动安装）
