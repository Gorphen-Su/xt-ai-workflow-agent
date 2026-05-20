## ADDED Requirements

### Requirement: 文档同步检查
系统 SHALL 在合规验证之前执行文档同步检查：扫描代码变更 → 对比现有 specs/design → 按影响级别更新文档。这是 verify 阶段合规检查的前置步骤。

#### Scenario: 无文档影响
- **WHEN** 代码变更不改变任何外部可观察行为
- **THEN** 跳过文档同步，直接进入合规验证

#### Scenario: specs 影响
- **WHEN** 代码变更改变了 specs 中描述的行为但未改变架构决策
- **THEN** 更新 specs/ 下的对应文件，保持 design.md 不变

#### Scenario: design 影响
- **WHEN** 代码变更改变了 design.md 中的架构决策
- **THEN** 更新 design.md + specs/ 下的对应文件

### Requirement: 代码质量验证
系统 SHALL 运行完整测试套件验证代码质量。Superpowers 可用时调用 `verification-before-completion`，不可用时使用内联验证逻辑。

#### Scenario: Superpowers 可用时
- **WHEN** Superpowers skill 可用
- **THEN** 调用 `superpowers:verification-before-completion`，传入 test_command

#### Scenario: Superpowers 不可用时降级
- **WHEN** Superpowers skill 不可用
- **THEN** 使用 sdd-project-profile.yaml 的 test_command 运行测试，或临时推导测试命令

### Requirement: 规范合规检查
系统 SHALL 执行四项合规检查：场景实现覆盖、架构决策遵循、排除范围违反、主规范兼容。

#### Scenario: 场景未覆盖
- **WHEN** specs 中的某个 Scenario 无对应实现代码或测试用例
- **THEN** 标记为 CRITICAL

#### Scenario: 架构决策偏离
- **WHEN** 实现代码偏离了 design.md 中的 Decision
- **THEN** 标记为 WARNING

#### Scenario: 排除范围违反
- **WHEN** 实现代码包含了 proposal 中排除的功能
- **THEN** 标记为 CRITICAL

### Requirement: 代码审查
系统 SHALL 在 Superpowers 可用时调用 `superpowers:requesting-code-review` 做全局代码审查。发现 Critical/Important 问题需修复后重新验证，审查循环不超过 5 轮。

#### Scenario: 审查通过
- **WHEN** 代码审查无 Critical 或 Important 问题
- **THEN** 更新 sdd-state.yaml checkpoint: code-reviewed

#### Scenario: 审查发现问题需修复
- **WHEN** 审查发现 Critical 或 Important 问题
- **THEN** 逐项修复后重新走文档同步检查 + 验证 + 审查循环

#### Scenario: 审查超限
- **WHEN** 审查循环 >= 5 轮仍有 Critical 问题
- **THEN** 建议回退到 plan 阶段

### Requirement: verify 阶段硬门
系统 SHALL 在 verify 阶段禁止新增功能代码，只允许修复审查发现的问题。

#### Scenario: 检测到新增功能代码
- **WHEN** verify 阶段修复问题时出现了新增功能代码
- **THEN** 系统 MUST 阻止并提示"verify 阶段只允许修复审查问题，不新增功能"

### Requirement: 验证报告生成
系统 SHALL 输出完整的验证报告，包含测试结果摘要、规范合规检查结果（CRITICAL/WARNING/SUGGESTION）、最终评估。

#### Scenario: 全部通过
- **WHEN** 无 CRITICAL 问题
- **THEN** 评估为"通过"，可进入 archive 阶段

#### Scenario: 存在 CRITICAL
- **WHEN** 存在 CRITICAL 级别问题
- **THEN** 评估为"未通过"，MUST 修复

### Requirement: verify 阶段完成确认
系统 SHALL 在 verify 阶段完成后要求用户确认，MUST NOT 自动跳过。

#### Scenario: 用户确认通过
- **WHEN** 验证报告无 CRITICAL 且用户确认通过
- **THEN** 更新 sdd-state.yaml（phase: verify checkpoint: done），提示运行 `/xt-sdd:archive`
