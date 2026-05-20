## MODIFIED Requirements

### Requirement: 读取计划文件
系统 SHALL 从变更目录下的 `plans/` 目录读取子计划文件，按编号顺序执行，替代原来从单一 `plan.md` 读取的逻辑。

#### Scenario: 遍历 plans 目录
- **WHEN** apply 阶段开始执行任务
- **THEN** 系统 MUST 扫描 `plans/` 目录下所有 `NN-*.md` 文件，按编号排序后依次读取

#### Scenario: 按分组定位子计划
- **WHEN** 需要查找特定分组（如 "2. propose 阶段 skill"）的实现步骤
- **THEN** 系统 MUST 定位到对应的 `plans/02-propose-stage.md` 文件并读取

#### Scenario: 使用索引文件获取全局视图
- **WHEN** apply 阶段需要了解整体执行顺序
- **THEN** 系统 MUST 读取 `plan.md` 索引文件获取子计划列表和执行顺序

#### Scenario: 兼容旧变更目录
- **WHEN** 变更目录中存在旧的单一 `plan.md`（无 plans/ 目录）
- **THEN** 系统 MUST 仍能从单一 plan.md 读取执行步骤，不因缺少 plans/ 目录而报错
