## ADDED Requirements

### Requirement: 分诊判断自动路由
系统 SHALL 根据两个维度（根因是否明确、修法是否明确）自动路由到合适的起始阶段：根因不明确 → propose，根因明确但修法不明确 → plan，两者都明确 → apply。

#### Scenario: 根因不明确路由到 propose
- **WHEN** 用户提供 Bug 现象描述但未指出具体原因
- **THEN** 系统路由到 propose 阶段，需要先搞清楚问题是什么

#### Scenario: 根因明确但修法需设计路由到 plan
- **WHEN** 用户指出了 Bug 根因但修复方式需要设计
- **THEN** 系统路由到 plan 阶段，产出修复方案和任务

#### Scenario: 根因和修法都明确路由到 apply
- **WHEN** 用户描述了明确的修复逻辑
- **THEN** 系统路由到 apply 阶段，直接执行修复

### Requirement: 自动升级机制
系统 SHALL 在 apply 执行中发现复杂度超预期时暂停，询问用户是否升级到 plan 阶段。

#### Scenario: 修复复杂度超预期
- **WHEN** apply 中发现修复涉及多处联动或影响范围大于预期
- **THEN** 暂停并提示用户"修复复杂度超预期"，提供"继续 apply"和"升级到 plan"两个选项

### Requirement: 简化文档格式
系统 SHALL 对 fix 流程使用简化文档格式：proposal 只写 Bug 描述/根因/修法/影响范围，plan 只写修复步骤/影响分析，archive 只写 Bug 描述/修复内容/文档同步/验证结果。

#### Scenario: fix propose 使用简化 proposal
- **WHEN** fix 分诊路由到 propose 阶段
- **THEN** 生成的 proposal.md 使用简化格式，不写完整的影响分析和排除范围

#### Scenario: fix plan 使用简化 plan
- **WHEN** fix 分诊路由到 plan 阶段
- **THEN** 生成的 plan.md 只包含修复步骤和影响分析，不写完整的架构决策

### Requirement: 文档同步检查
系统 SHALL 在 fix 流程的 verify 阶段执行文档同步检查：小 Bug 不影响文档则跳过，中等 Bug 更新 specs，大 Bug 更新 design + specs。

#### Scenario: 小 Bug 无文档影响
- **WHEN** Bug 修复不改变外部可观察行为（如空指针、边界检查）
- **THEN** 不更新任何规格文档

#### Scenario: 中等 Bug 影响 specs
- **WHEN** Bug 修复改变了 specs 中描述的行为
- **THEN** 更新 specs/ 下的对应文件

#### Scenario: 大 Bug 影响 design + specs
- **WHEN** Bug 修复改变了 design.md 中的架构决策
- **THEN** 更新 design.md + specs/ 下的对应文件

### Requirement: fix 变更目录命名
系统 SHALL 使用 `fix-<简述>` 格式命名 fix 流程的变更目录。

#### Scenario: 创建 fix 变更目录
- **WHEN** 用户运行 `/xt-sdd:fix <描述>`
- **THEN** 变更目录命名为 `fix-<简述>`（如 `fix-null-pointer-login`）

### Requirement: verify 聚焦验证
系统 SHALL 在 fix 流程的 verify 阶段聚焦验证修复点和影响范围，非全量验证。

#### Scenario: 聚焦验证修复点
- **WHEN** fix 的 apply 完成后进入 verify
- **THEN** 验证范围聚焦在修复点及其直接影响范围，非全量回归
