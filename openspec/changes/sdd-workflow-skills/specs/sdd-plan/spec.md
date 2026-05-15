## ADDED Requirements

### Requirement: 规范产物生成
sdd:plan MUST 基于 proposal.md 调用 `openspec` CLI 生成 design.md、specs/ 和 tasks.md。此阶段 MUST NOT 编写任何生产代码。

#### Scenario: 基于 proposal 生成完整产物
- **WHEN** 用户确认 proposal.md 后进入 sdd:plan
- **THEN** 读取 proposal.md，按依赖顺序生成 design.md → specs/ → tasks.md

#### Scenario: 产物依赖顺序强制
- **WHEN** sdd:plan 正在生成产物
- **THEN** MUST 按照 proposal → design → specs → tasks 的依赖顺序生成，前一个未完成 MUST NOT 开始下一个

### Requirement: Bridge 转换
sdd:plan MUST 内置 bridge 转换逻辑，将 OpenSpec 产物转换为可执行的实现计划。转换规则对用户透明。

#### Scenario: specs 场景转换为 TDD 测试用例
- **WHEN** sdd:plan 处理 specs/ 中的行为场景
- **THEN** 每个场景 MUST 映射为至少两个测试用例：正常路径测试和错误路径测试；涉及边界值的场景 MUST 额外添加边界值测试

#### Scenario: design.md 转换为实现计划输入
- **WHEN** sdd:plan 处理 design.md
- **THEN** 将 design.md 中的技术方案作为 Superpowers planning 的输入上下文

#### Scenario: tasks.md 任务拆分
- **WHEN** sdd:plan 处理 tasks.md
- **THEN** 将每个任务拆成可执行的 TDD 步骤粒度

### Requirement: 任务状态跟踪初始化
sdd:plan MUST 创建 task-status.md，包含阶段进度和任务明细。所有任务初始状态为"未开始"。

#### Scenario: 创建 task-status.md
- **WHEN** tasks.md 生成完成
- **THEN** 创建 task-status.md，头部记录阶段进度（explore:✓ plan:✓ implement:☐ verify:☐ archive:☐），下方列出所有任务，状态为"未开始"

#### Scenario: 阶段进度自动记录
- **WHEN** sdd:plan 完成所有产物
- **THEN** task-status.md 头部的 plan 阶段标记为完成

### Requirement: 阶段完成确认
sdd:plan 完成所有产物后 MUST 要求用户确认。MUST NOT 自动跳过确认步骤。

#### Scenario: 用户确认通过
- **WHEN** 用户确认 plan 产物内容正确
- **THEN** 提示用户是否进入下一阶段（sdd:implement）

#### Scenario: 用户确认不通过
- **WHEN** 用户认为 plan 产物需要修改
- **THEN** 回到 plan 阶段修改对应产物，重新确认

#### Scenario: 用户选择暂停
- **WHEN** 用户选择暂停
- **THEN** 保存当前进度到 task-status.md，退出阶段
