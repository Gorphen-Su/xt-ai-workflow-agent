# 变更提案：SDD 工作流增强

## Why

当前 SDD 工作流在实际使用中暴露出三个核心缺陷：

1. **缺少项目感知**：每个阶段都不知道项目的技术栈（语言、框架、构建工具、测试命令），导致 sdd-verify 临时推导测试命令、sdd-implement 没有编译检查、plan 阶段缺少编译约束上下文。

2. **状态管理粗粒度**：task-status.md 使用 Markdown 表格跟踪进度，没有 checkpoint 机制，无法精确定位中断位置（只能恢复到任务级别，不能恢复到任务内的 RED/GREEN/REFACTOR 步骤）。也没有级联回退控制——当 verify 发现规范偏离需要回退时，无法系统性地标记哪些后续产物和任务需要失效重做。

3. **缺少循环限制**：sdd-implement 的"单任务完成确认"和"规范偏离处理"理论上可以无限循环，sdd-verify 的 CRITICAL 问题修复也没有上限。

参考 HyperSpec 的设计，采纳其项目分析器、结构化状态管理、审查循环限制三项机制，适配 SDD 的五阶段架构。

## What Changes

### 新增

- **项目分析器（Project Profiler）**：sdd-explore 首次运行时自动探测语言、框架、构建工具、编译/测试命令、项目结构、CI 配置，产出 `openspec/sdd-project-profile.yaml`（全局共享，所有变更共用）
- **结构化状态管理**：用 `openspec/changes/<name>/sdd-state.yaml` 替代 `task-status.md`，实现 checkpoint 机制、断点恢复、级联回退控制
- **审查循环限制**：全局审查 5 轮上限，单任务修改 5 次上限，超限提示回退 sdd:plan 重新设计

### 修改

- **sdd-explore**：增加项目分析器步骤（首次运行时执行），产出 sdd-project-profile.yaml；状态管理从 task-status.md 切换到 sdd-state.yaml
- **sdd-plan**：读取 sdd-project-profile.yaml 获取技术栈上下文和编译约束；状态管理切换到 sdd-state.yaml
- **sdd-implement**：增加审查循环限制（5 次）；使用 sdd-state.yaml 的 checkpoint 实现精确断点恢复（任务内 RED/GREEN/REFACTOR 步骤级）；增加级联回退处理
- **sdd-verify**：增加审查循环限制（5 次）；状态管理切换到 sdd-state.yaml
- **sdd-archive**：状态管理切换到 sdd-state.yaml；归档时 sdd-state.yaml 随变更目录保留作为历史记录

### 移除

- **task-status.md**：功能完全并入 sdd-state.yaml，不再生成

## Capabilities

- **project-profiler**：项目分析器，自动探测技术栈并生成全局 profile
- **structured-state-management**：结构化状态管理，checkpoint + 断点恢复 + 级联回退
- **review-loop-limits**：审查循环限制，防止无限循环

## Impact

- **产物变化**：新增 sdd-project-profile.yaml（全局）、sdd-state.yaml（每变更）；删除 task-status.md
- **向后兼容**：已存在的变更目录中如果有 task-status.md，需要迁移到 sdd-state.yaml 格式或忽略
- **openspec.yaml**：不修改，SDD 全局信息独立存放，不污染 OpenSpec 配置
- **归档行为**：sdd-state.yaml 随变更目录归档，保留作为历史记录
