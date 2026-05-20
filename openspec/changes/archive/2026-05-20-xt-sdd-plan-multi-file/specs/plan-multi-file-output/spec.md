## ADDED Requirements

### Requirement: plans 目录结构
系统 SHALL 在 plan 阶段将实现计划输出到变更目录下的 `plans/` 目录中，替代原来单一 `plan.md` 的内容。

#### Scenario: 创建 plans 目录
- **WHEN** plan 阶段开始生成实现计划
- **THEN** 系统 MUST 在变更目录下创建 `plans/` 目录（如不存在）

#### Scenario: 始终使用 plans 目录
- **WHEN** 无论任务数量多少
- **THEN** 系统 MUST 始终使用 `plans/` 目录结构输出计划，不因任务少而回退到单文件模式

### Requirement: 子计划文件按 tasks.md 分组拆分
系统 SHALL 为 tasks.md 中的每个二级分组（`## N. 分组名`）生成一个对应的子计划文件。

#### Scenario: 生成子计划文件
- **WHEN** tasks.md 包含分组 `## 2. propose 阶段 skill`
- **THEN** 系统 MUST 生成对应的子计划文件 `plans/02-propose-stage.md`

#### Scenario: 分组与文件一一对应
- **WHEN** tasks.md 包含 N 个二级分组
- **THEN** 系统 MUST 生成恰好 N 个子计划文件，每个文件对应一个分组

### Requirement: 子计划文件命名规则
系统 SHALL 采用 `NN-<分组名>.md` 格式命名子计划文件，其中 NN 为 tasks.md 中的分组编号（零填充两位），分组名为英文名 kebab-case 化。

#### Scenario: 命名格式
- **WHEN** tasks.md 包含分组 `## 1. 基础设施`
- **THEN** 系统 MUST 生成文件名为 `plans/01-infrastructure.md`

#### Scenario: 编号排序
- **WHEN** 多个子计划文件存在于 plans/ 目录
- **THEN** 文件按编号排序 MUST 与 tasks.md 中的分组顺序一致

### Requirement: plan.md 作为索引文件
系统 SHALL 保留 `plan.md` 文件作为索引，列出所有子计划的描述、链接和执行顺序，不包含具体实现步骤。

#### Scenario: 索引文件内容
- **WHEN** 所有子计划文件已生成
- **THEN** plan.md MUST 包含：变更名、每个子计划的编号/名称/链接/简要描述、执行顺序说明

#### Scenario: 索引文件不包含实现步骤
- **WHEN** plan.md 作为索引生成后
- **THEN** plan.md MUST NOT 包含任何具体的实现步骤或 checkbox 微步骤

### Requirement: 子计划文件内容格式
每个子计划文件 SHALL 包含对应分组下所有任务的实现步骤（checkbox 微步骤），格式与原 plan.md 中的步骤格式一致。

#### Scenario: 包含 checkbox 微步骤
- **WHEN** tasks.md 分组 `## 3. plan 阶段 skill` 包含任务 3.1 至 3.9
- **THEN** `plans/03-plan-stage.md` MUST 包含这些任务的 TDD 微步骤，每步有 checkbox

#### Scenario: 绑定注释
- **WHEN** 子计划文件生成完成
- **THEN** 每个子计划文件顶部 MUST 包含绑定注释 `<!-- sdd change: <变更名> -->`
