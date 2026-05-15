## ADDED Requirements

### Requirement: 进度恢复
sdd:implement 启动时 MUST 读取 task-status.md 判断当前进度。如果存在未完成的任务，MUST 从上次断点继续，而非从头开始。

#### Scenario: 首次启动实现
- **WHEN** 用户调用 `/sdd:implement` 且所有任务状态为"未开始"
- **THEN** 从第一个任务开始执行

#### Scenario: 恢复中断的实现
- **WHEN** 用户调用 `/sdd:implement` 且部分任务已完成
- **THEN** 从第一个"未开始"或"执行中"的任务继续执行

#### Scenario: 所有任务已完成
- **WHEN** 用户调用 `/sdd:implement` 且所有任务状态为"已完成"
- **THEN** 提示用户所有任务已完成，建议进入 sdd:verify

### Requirement: TDD 循环强制执行
sdd:implement 对每个任务 MUST 执行 RED-GREEN-REFACTOR 循环。MUST NOT 在未写失败测试的情况下编写实现代码。

#### Scenario: RED - 编写失败测试
- **WHEN** 开始实现一个新任务
- **THEN** 先编写一个准确描述期望行为的失败测试，确认测试失败

#### Scenario: GREEN - 最小实现
- **WHEN** 失败测试已编写
- **THEN** 编写最少的代码让测试通过，MUST NOT 过度实现

#### Scenario: REFACTOR - 重构
- **WHEN** 测试通过
- **THEN** 在测试保护下清理代码，保持功能不变

#### Scenario: 规范偏离处理
- **WHEN** 实现过程中发现规范需要调整
- **THEN** MUST 暂停实现，回到 sdd:plan 修改对应产物，修改完成后再继续实现

### Requirement: 任务状态自动更新
sdd:implement MUST 在任务执行过程中自动更新 task-status.md 的任务状态。

#### Scenario: 任务开始执行
- **WHEN** 开始实现某个任务
- **THEN** 将该任务状态更新为"执行中"，更新时间

#### Scenario: 任务进入测试
- **WHEN** 任务的实现代码已编写完成，开始运行测试
- **THEN** 将该任务状态更新为"测试中"

#### Scenario: 任务测试通过
- **WHEN** 任务的所有 TDD 测试通过
- **THEN** 将该任务状态更新为"已完成"，记录测试结果

#### Scenario: 任务测试失败
- **WHEN** 任务的 TDD 测试未能通过
- **THEN** 将该任务状态更新为"已失败"，记录失败原因

### Requirement: 任务完成确认
sdd:implement 每个任务完成后 MUST 要求用户确认。MUST NOT 自动跳过确认步骤。

#### Scenario: 单任务确认通过
- **WHEN** 一个任务的 TDD 循环完成且用户确认
- **THEN** 进入下一个未开始的任务

#### Scenario: 单任务确认不通过
- **WHEN** 用户认为当前任务的实现不符合预期
- **THEN** 回到当前任务修改，重新执行 TDD 循环

#### Scenario: 用户选择暂停
- **WHEN** 用户在某个任务确认时选择暂停
- **THEN** 保存当前进度到 task-status.md，退出阶段

### Requirement: 读取规范上下文
sdd:implement 执行任务前 MUST 读取变更目录下的 proposal.md、design.md、specs/ 和 tasks.md，确保实现基于完整的规范上下文。

#### Scenario: 加载规范上下文
- **WHEN** sdd:implement 启动
- **THEN** 读取变更目录下的所有 OpenSpec 产物，作为实现的约束和指导
