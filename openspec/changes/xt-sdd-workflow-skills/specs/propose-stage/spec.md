## ADDED Requirements

### Requirement: 项目分析器自动探测技术栈
系统 SHALL 在首次运行或 `openspec/sdd-project-profile.yaml` 不存在时，自动扫描项目生成 project_profile，包含 languages、frameworks、build_tool、compile_command、test_command、structure、has_ci、compile_constraints。

#### Scenario: 首次运行自动探测
- **WHEN** 用户运行 `/xt-sdd:propose` 且 `openspec/sdd-project-profile.yaml` 不存在
- **THEN** 系统自动扫描源码目录和依赖配置文件，生成 project_profile 并写入 `openspec/sdd-project-profile.yaml`

#### Scenario: 已有 profile 时跳过探测
- **WHEN** 用户运行 `/xt-sdd:propose` 且 `openspec/sdd-project-profile.yaml` 已存在
- **THEN** 系统跳过项目分析器，直接读取现有 profile

#### Scenario: 空白项目跳过自动探测
- **WHEN** 项目无源码、无配置文件
- **THEN** 跳过自动探测，在需求确认步骤中一并确认技术栈，确认后补充 profile

#### Scenario: 编译命令运行时验证
- **WHEN** 推导出 compile_command 后
- **THEN** 系统 MUST 实际运行一次验证其可用性；环境问题立即阻塞，代码问题正常继续

### Requirement: 需求澄清与方案讨论
系统 SHALL 通过交互式问答澄清需求，每次只问一个关键问题，提出 2-3 个可行方案并给出推荐。

#### Scenario: 交互式需求澄清
- **WHEN** 用户提供模糊的需求描述
- **THEN** 系统逐个提问澄清目的、约束和成功标准，最终提取变更名（kebab-case）

#### Scenario: 用户确认方案选择
- **WHEN** 系统提出 2-3 个可行方案
- **THEN** 使用 AskUserQuestion 让用户选择方案，确认后写入 proposal.md

### Requirement: 调用 openspec-propose 生成规格文档
系统 SHALL 调用 `openspec-propose` 通过 CLI 创建变更目录并生成所有 artifacts（proposal.md、design.md、specs/、tasks.md）。如果 skill 不可用，降级为手动执行等效 CLI 命令。

#### Scenario: 正常调用 openspec-propose
- **WHEN** 需求确认完成且 Superpowers/OpenSpec 可用
- **THEN** 调用 `openspec-propose`，传入变更名和带 project_profile 上下文前缀的描述

#### Scenario: openspec-propose 降级
- **WHEN** `openspec-propose` skill 不可用
- **THEN** 手动执行 `openspec new change`、`openspec instructions` 等 CLI 命令生成等效产物

### Requirement: propose 阶段硬门
系统 SHALL 在 propose 阶段禁止编写任何生产代码和实现计划。

#### Scenario: 检测到代码编写行为
- **WHEN** propose 阶段执行过程中出现编写生产代码的意图
- **THEN** 系统 MUST 阻止该行为并提示"propose 阶段禁止写代码"

### Requirement: propose 阶段完成确认
系统 SHALL 在 propose 阶段完成后要求用户确认，MUST NOT 自动跳过。

#### Scenario: 用户确认通过
- **WHEN** proposal.md 已生成且用户确认通过
- **THEN** 更新 sdd-state.yaml（phase: propose checkpoint: done），提示运行 `/xt-sdd:plan`

#### Scenario: 用户确认不通过
- **WHEN** 用户认为 proposal 需要修改
- **THEN** 回到需求澄清步骤，根据反馈修改 proposal.md
