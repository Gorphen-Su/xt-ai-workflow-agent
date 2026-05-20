## ADDED Requirements

### Requirement: 按依赖顺序生成规范产物
系统 SHALL 按依赖顺序依次生成 design.md → specs/ → tasks.md，每生成一个产物后运行 `openspec status` 确认状态。

#### Scenario: 依次生成产物
- **WHEN** plan 阶段开始且 proposal.md 已存在
- **THEN** 系统依次调用 `openspec instructions` 获取指令，按 template 结构生成 design.md、specs/、tasks.md

### Requirement: Bridge 转换
系统 SHALL 在生成 specs 和 tasks 时自动执行 Bridge 转换：specs 场景映射为 TDD 测试用例、design 决策映射为实现任务、粗粒度任务拆分为 TDD 微步骤、compile_constraints 注入任务拆分逻辑。

#### Scenario: specs 场景映射为测试任务
- **WHEN** specs 中的 Scenario 包含 WHEN/THEN 格式
- **THEN** 系统 MUST 在 tasks.md 中确保有对应的测试任务（正常路径、错误路径、边界值）

#### Scenario: compile_constraints 注入
- **WHEN** `sdd-project-profile.yaml` 存在且有 compile_constraints
- **THEN** Bridge 转换时注入约束：任务拆分遵循编译独立性，接口层和实现层在同一 Task 中

### Requirement: 调用 writing-plans 生成实现计划
系统 SHALL 在 Superpowers 可用时调用 `superpowers:writing-plans` 生成实现计划，传入 openspec artifacts + project_profile + API 验证上下文 + 编译约束 + checkbox 唯一性约束。

#### Scenario: 按分组调用 writing-plans
- **WHEN** Bridge 转换完成且 Superpowers 可用
- **THEN** 系统 MUST 按 tasks.md 的二级分组，为每个分组分别准备上下文并调用 `superpowers:writing-plans`，每个分组生成一个子计划文件到 `plans/NN-<分组名>.md`

#### Scenario: writing-plans 降级
- **WHEN** Superpowers 不可用
- **THEN** 跳过 writing-plans，使用 Bridge 转换产出的 tasks.md 作为实现指导（无 checkbox 微步骤），仍按分组拆分到 `plans/` 目录

#### Scenario: 计划质量审查
- **WHEN** 所有子计划文件生成完成后
- **THEN** 系统 MUST 逐文件检查编译约束遵守、import 正确性、无效代码、类型一致性，发现问题直接在对应子计划文件中修复

#### Scenario: 生成索引文件
- **WHEN** 所有子计划文件已生成且质量审查完成
- **THEN** 系统 MUST 生成 `plan.md` 索引文件，列出所有子计划的描述、链接和执行顺序

### Requirement: plan 阶段硬门
系统 SHALL 在 plan 阶段禁止编写任何生产代码。

#### Scenario: 检测到代码编写行为
- **WHEN** plan 阶段执行过程中出现编写生产代码的意图
- **THEN** 系统 MUST 阻止并提示"plan 阶段禁止写代码"

### Requirement: plan 阶段完成确认
系统 SHALL 在 plan 阶段完成后要求用户确认，MUST NOT 自动跳过。

#### Scenario: 用户确认通过
- **WHEN** 所有规范产物和实现计划已生成且用户确认通过
- **THEN** 更新 sdd-state.yaml（phase: plan checkpoint: done），提示运行 `/xt-sdd:apply`
