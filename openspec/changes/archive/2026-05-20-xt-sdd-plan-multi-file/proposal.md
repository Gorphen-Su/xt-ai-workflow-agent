## Why

xt-sdd plan 阶段当前将所有实现计划输出到单一 `plan.md` 文件中。当任务涉及多个模块或功能时，单一文件体积过大、难以维护和查阅，且与 tasks.md 的分组结构脱节。需要将计划输出改为多文件结构，提升可读性和可维护性。

## What Changes

- **BREAKING** 将 plan 阶段的实现计划输出从单一 `plan.md` 改为 `plans/` 目录下的多文件结构
- 新增 `plans/` 目录，每个文件对应 tasks.md 中的一个二级分组
- 文件命名采用 `plans/NN-<分组名>.md` 格式（如 `plans/01-infrastructure.md`、`plans/02-propose-stage.md`）
- `plan.md` 角色变更为索引文件，列出所有子计划的描述、链接和执行顺序，不再包含具体实现步骤
- 始终使用 `plans/` 目录结构，无论任务多少
- 修改 `xt-sdd-plan` SKILL.md 中调用 `writing-plans` 的逻辑，使其按分组生成子计划文件
- 修改 `xt-sdd-apply` SKILL.md 中读取计划文件的逻辑，从单文件读取改为遍历 `plans/` 目录
- 更新 `plan-stage` spec 中关于计划输出路径的描述
- 更新 CLAUDE.md 中目录结构描述

## Capabilities

### New Capabilities

- `plan-multi-file-output`: plan 阶段多文件计划输出 — 将实现计划按 tasks.md 分组拆分为 plans/ 目录下的独立文件，plan.md 作为索引

### Modified Capabilities

- `plan-stage`: 计划输出路径从单一 plan.md 改为 plans/ 多文件目录 + plan.md 索引
- `apply-stage`: 读取计划文件的逻辑从单文件改为遍历 plans/ 目录

## Impact

- `.claude/skills/xt-sdd-plan/SKILL.md`：修改 writing-plans 调用逻辑，按分组生成子计划
- `.claude/skills/xt-sdd-apply/SKILL.md`：修改计划文件读取逻辑，遍历 plans/ 目录
- `openspec/changes/xt-sdd-workflow-skills/specs/plan-stage/spec.md`：更新计划输出路径的规格描述
- `openspec/changes/xt-sdd-workflow-skills/specs/apply-stage/spec.md`：更新读取计划文件的规格描述
- `CLAUDE.md`：更新目录结构描述（plan.md → plans/ + plan.md 索引）
- `openspec/changes/*/` 目录结构：未来所有变更目录中的 plan.md 将被 plans/ 目录替代
