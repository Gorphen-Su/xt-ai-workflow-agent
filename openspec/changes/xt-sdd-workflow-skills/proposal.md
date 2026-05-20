## Why

OpenSpec 和 Superpowers 两个工具在规格管理上存在重叠与差异，直接混用导致规格文档不统一、迭代管理混乱。需要设计一个统一的编排层（xt-sdd），封装两者能力，对外提供一致的 5 阶段工作流和 6 个独立命令，同时新增 Bug 修复专用入口实现轻量级流程。

## What Changes

- 新建 6 个 xt-sdd 命令对应的 skill 文件：`/xt-sdd:propose`、`/xt-sdd:plan`、`/xt-sdd:apply`、`/xt-sdd:verify`、`/xt-sdd:archive`、`/xt-sdd:fix`
- 将 HyperSpec 的 3 阶段（propose/apply/archive）拆分为 5 阶段（propose/plan/apply/verify/archive），每个阶段有独立硬门
- 状态文件 `sdd-state.yaml` 放入变更目录内，支持多需求并发
- 项目级信息提取到 `openspec/sdd-project-profile.yaml`
- 实现计划文件从 `superpowers/plans/` 合并到变更目录内
- verify 阶段内置文档同步检查（作为合规检查前置步骤）
- `/xt-sdd:fix` 命令内置分诊逻辑，根据 Bug 信息清晰度自动路由到合适起点
- 并发变更冲突策略：后者覆盖前者，同步更新文档
- 归档时机：verify 通过 + 用户确认即可归档，后续 Bug 作为新变更

## Capabilities

### New Capabilities

- `propose-stage`: 需求探索与规格生成阶段 — 项目分析、需求澄清、openspec-propose 调用、产出 proposal.md，禁止写代码和实现计划
- `plan-stage`: 方案设计与任务拆分阶段 — 生成 design/specs/tasks、Bridge 转换、writing-plans 调用、产出实现计划，禁止写代码
- `apply-stage`: TDD 实现阶段 — subagent/inline 双模式执行、编译检查、提交纪律，禁止改规格文档
- `verify-stage`: 验证与审查阶段 — 文档同步检查（前置）、合规验证、代码审查、验证报告，禁止新增功能代码
- `archive-stage`: 归档收尾阶段 — 双源信息合并归档、specs 同步、Git 提交提示，禁止改代码和规格
- `fix-command`: Bug 修复专用入口 — 分诊判断（根因明确？修法明确？）自动路由、自动升级机制、简化文档格式、文档同步检查

### Modified Capabilities

（无已有规格需要修改）

## Impact

- `.claude/skills/` 目录：新增 6 个 skill 目录（xt-sdd-propose、xt-sdd-plan、xt-sdd-apply、xt-sdd-verify、xt-sdd-archive、xt-sdd-fix）
- `openspec/` 目录结构：新增 `sdd-project-profile.yaml`，变更目录内新增 `plan.md` 和 `sdd-state.yaml`
- `CLAUDE.md`：更新命令列表，将原 sdd 命令替换为 xt-sdd 命令
- 依赖：OpenSpec CLI（规格管理）、Superpowers skill（TDD/计划/审查），两者不可用时降级为自包含模式
- `superpowers/plans/` 目录：废弃，计划文件合并到变更目录内
