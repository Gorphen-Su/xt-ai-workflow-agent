# 归档记录 - sdd-workflow-enhancement

## 需求概要

SDD 工作流在实际使用中暴露出三个核心缺陷：缺少项目感知、状态管理粗粒度（无 checkpoint、无级联回退）、缺少循环限制。参考 HyperSpec 的设计，采纳其项目分析器、结构化状态管理、审查循环限制三项机制，适配 SDD 的五阶段架构。

## 技术方案

7 个关键设计决策：
1. 全局项目信息独立文件存放（sdd-project-profile.yaml），不碰 openspec.yaml
2. 状态文件跟变更走（openspec/changes/<name>/sdd-state.yaml）
3. 完全替代 task-status.md，不双写
4. 两级检查点体系（阶段级 + 任务级 red/green/refactor/complete）
5. 级联回退用户选择默认全量重置，执行逻辑归一到 sdd-plan
6. 审查循环限制 5 次（implement 单任务 + verify 全局）
7. 归档保留 sdd-state.yaml 作为历史记录

## 实现详情

修改了 5 个 skill 文件：
- **sdd-explore**：新增项目分析器步骤（探测技术栈、构建命令映射、运行时验证、greenfield 处理、profile 写入）；创建 sdd-state.yaml 替代 task-status.md；断点恢复；向后兼容迁移
- **sdd-plan**：读取 sdd-project-profile.yaml 注入 compile_constraints；新增步骤 1.5 级联重置检查（统一处理来自 implement/verify 的回退意图）；断点恢复
- **sdd-implement**：切换到 sdd-state.yaml 任务级 checkpoint；审查循环限制 5 次；规范偏离时写入回退意图到 cascade 字段（执行归 sdd-plan）；compile_command 编译检查
- **sdd-verify**：使用 sdd-project-profile.yaml 的 test_command；审查循环限制 5 轮；验证发现偏离时写入回退意图到 cascade 字段（执行归 sdd-plan）
- **sdd-archive**：切换到 sdd-state.yaml；归档保留状态文件

## 规格变更

### ADDED

- **project-profiler**：4 个 Requirement，8 个 Scenario
  - 自动探测项目技术栈（首次运行）
  - 编译命令运行时验证
  - 编译约束自动提取
  - profile 信息供后续阶段使用

- **structured-state-management**：6 个 Requirement，10 个 Scenario
  - 创建 sdd-state.yaml 状态文件
  - Checkpoint 推进机制
  - 断点恢复机制
  - 级联回退控制（归一到 sdd-plan 执行）
  - 归档时保留状态文件
  - 向后兼容处理

- **review-loop-limits**：3 个 Requirement，4 个 Scenario
  - 全局审查循环限制 5 轮
  - 单任务修改循环限制 5 次
  - 审查计数器持久化

## 验证报告

- 第一轮验证：0 CRITICAL / 0 WARNING / 1 SUGGESTION（级联规则矩阵建议提取为共享定义）
- 增量验证（级联回退归一改动）：0 CRITICAL / 0 WARNING / 0 SUGGESTION

## 任务执行统计

- 总任务数：35
- 已完成：35
- 已失败：0
- 审查轮次：0（直接通过）
