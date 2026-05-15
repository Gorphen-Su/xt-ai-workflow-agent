## Why

团队同时使用 OpenSpec（规格文档管理）和 Superpowers（代码执行与 TDD）两套 AI 编程框架，但两者在需求澄清、计划拆分、质量验证等环节存在功能重叠和产物格式差异，导致用户混用混乱、文档割裂、交接信息丢失。需要一个统一的工作流入口，对用户隐藏底层工具细节，以"五阶段"方式串通两个框架的能力。

## What Changes

- 新增 5 个 SDD 命令（`/sdd:explore`、`/sdd:plan`、`/sdd:implement`、`/sdd:verify`、`/sdd:archive`），作为用户唯一交互入口
- 新增 5 个对应的 SDD skill（`sdd-explore`、`sdd-plan`、`sdd-implement`、`sdd-verify`、`sdd-archive`），承载各阶段完整逻辑
- 内置 bridge 转换逻辑（OpenSpec 产物 → Superpowers 可消费的计划格式），不对外暴露
- 内置规范合规检查逻辑（spec-compliance-check），不对外暴露
- 新增 `task-status.md` 产物，跟踪任务执行状态（未开始/执行中/测试中/已完成/已失败）和阶段进度
- 归档时合并 OpenSpec + Superpowers 双源信息到 `archive.md`
- 每个阶段完成后强制用户确认，禁止跳过
- 禁用 git worktree，串行推进需求
- 简化主子需求管理：每个需求独立，不支持父子层级

## Capabilities

### New Capabilities

- `sdd-explore`: 探索与需求澄清阶段——调用 opsx:explore 讨论方案，产出 proposal.md，前置 Git 状态检查，强制用户确认
- `sdd-plan`: 计划与衔接阶段——基于 proposal 调用 opsx:propose/ff 产出 design/specs/tasks，内置 bridge 转换，创建 task-status.md，强制用户确认
- `sdd-implement`: 实现阶段——逐任务执行 TDD 循环（RED→GREEN→REFACTOR），自动更新 task-status.md，调用 opsx:apply，强制用户确认
- `sdd-verify`: 验证阶段——运行测试套件 + 内置规范合规检查 + 调用 opsx:verify，输出验证报告，强制用户确认
- `sdd-archive`: 归档阶段——合并双源归档信息，调用 opsx:archive + opsx:sync，提示 git 提交，强制用户确认

### Modified Capabilities

（无现有规格需要修改）

## Impact

- **新增文件**：`.claude/commands/sdd/` 下 5 个命令文件，`.claude/skills/sdd-*/` 下 5 个 skill 目录
- **依赖**：OpenSpec 的 opsx:* 命令和 skill，Superpowers 的 TDD/verification/execute-plan 等能力
- **产物位置**：`openspec/changes/<date>-<module>-<feature>/` 下新增 `task-status.md` 和 `archive.md`
- **CLAUDE.md**：需更新 OpenSpec 指引，替换为 SDD 工作流说明
- **命名规范**：变更目录名使用 `YYYY-MM-DD-<模块>-<子模块(可选)>-<功能>` 格式
