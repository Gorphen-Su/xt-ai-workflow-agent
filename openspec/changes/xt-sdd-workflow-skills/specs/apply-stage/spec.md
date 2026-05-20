## ADDED Requirements

### Requirement: 智能执行模式选择
系统 SHALL 根据任务数量、独立性、跨模块性、项目结构等因子选择完整模式（subagent）或轻量模式（内联 TDD），并向用户展示推荐模式供确认。

#### Scenario: 选择完整模式
- **WHEN** 任务数 >= 6，或修改跨 >= 3 个模块，或 monorepo 且任务数 >= 3，或任务高度独立且任务数 >= 4
- **THEN** 系统推荐完整模式，使用 `superpowers:subagent-driven-development`

#### Scenario: 选择轻量模式
- **WHEN** 任务数 <= 5 且集中在 1-2 个模块，或单模块小功能，或任务有强编译依赖
- **THEN** 系统推荐轻量模式，当前会话内联执行 TDD

#### Scenario: Superpowers 不可用强制轻量模式
- **WHEN** Superpowers skill 不可用
- **THEN** 强制使用轻量模式

### Requirement: TDD 强制循环
系统 SHALL 对每个任务执行 RED（写失败测试）→ GREEN（最小实现）→ REFACTOR（重构）循环，MUST NOT 在未写失败测试的情况下编写实现代码。

#### Scenario: RED 步骤
- **WHEN** 开始执行一个新任务
- **THEN** 先编写一个准确描述期望行为的失败测试，运行确认它失败

#### Scenario: GREEN 步骤
- **WHEN** 失败测试已确认
- **THEN** 编写最少的代码让测试通过，MUST NOT 过度实现

#### Scenario: REFACTOR 步骤
- **WHEN** 测试通过后
- **THEN** 在测试保护下清理代码，运行测试确认功能不变

### Requirement: 每个任务完成后的提交流程
系统 SHALL 在每个 task 完成后执行：编译检查 → 更新 checkbox → 更新 sdd-state.yaml → commit。全程不做 push。

#### Scenario: 正常提交流程
- **WHEN** 一个 task 的 TDD 循环完成且测试通过
- **THEN** 运行 compile_command 验证编译 → 更新 plan.md checkbox → 更新 sdd-state.yaml → commit（格式：`<类型>(<范围>): <task描述>`）

#### Scenario: 编译检查失败
- **WHEN** task 完成后编译检查失败
- **THEN** 不提交，修复编译错误后重新走提交流程

### Requirement: apply 阶段硬门
系统 SHALL 在 apply 阶段禁止修改规格文档（proposal.md、design.md、specs/、tasks.md 的内容）。

#### Scenario: 检测到修改规格的意图
- **WHEN** apply 阶段执行过程中出现修改规格文档的意图
- **THEN** 系统 MUST 暂停并提示"apply 阶段禁止改规格文档"

### Requirement: 规范偏离处理
系统 SHALL 在实现过程中发现规范需要调整时暂停，MUST NOT 在用户未确认的情况下默默偏离规范。用户可选择回到 plan 阶段修改规范或继续实现并记录偏离。

#### Scenario: 发现规范偏离
- **WHEN** 实现过程中发现 specs/design 与实际需要不一致
- **THEN** 暂停当前实现，向用户说明偏离原因，提供"回到 plan 修改规范"和"继续实现记录偏离"两个选项

#### Scenario: 选择回到 plan
- **WHEN** 用户选择回到 plan 阶段
- **THEN** 在 sdd-state.yaml 的 cascade 字段写入回退意图，引导用户运行 `/xt-sdd:plan`

### Requirement: 审查循环限制
系统 SHALL 限制单任务修改不超过 5 次，全局审查不超过 5 轮。超限时提示用户回到 plan 阶段重新审视。

#### Scenario: 单任务修改超限
- **WHEN** 同一任务修改次数 >= 5 仍未通过
- **THEN** 提示用户"任务已修改 5 次仍未通过，可能需要回到 plan 重新审视任务拆分"

#### Scenario: 全局审查超限
- **WHEN** 全局审查循环 >= 5 轮仍有 Critical 问题
- **THEN** 提示用户"审查已循环 5 次仍有 Critical 问题，可能需要回到 plan 重新审视设计方案"
