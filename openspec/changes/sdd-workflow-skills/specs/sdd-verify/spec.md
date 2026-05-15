## ADDED Requirements

### Requirement: 双重验证
sdd:verify MUST 执行两层验证：代码质量验证（测试套件运行）和规范合规验证（实现与 specs 对齐检查）。

#### Scenario: 测试套件全部通过且规范合规
- **WHEN** sdd:verify 运行测试套件全部通过，且规范合规检查无 CRITICAL 问题
- **THEN** 验证报告标记为通过，提示用户确认

#### Scenario: 测试套件有失败
- **WHEN** sdd:verify 运行测试套件有失败用例
- **THEN** 验证报告标记为未通过，列出失败用例，建议回到 sdd:implement 修复

#### Scenario: 规范合规检查发现 CRITICAL 问题
- **WHEN** 实现与 specs 中的行为场景不一致
- **THEN** 验证报告标记为未通过，列出具体的场景-实现差异，建议回到 sdd:implement 或 sdd:plan

### Requirement: 规范合规检查
sdd:verify MUST 内置规范合规检查，逐条验证 specs 中的每个场景是否有对应实现覆盖。

#### Scenario: 场景实现覆盖检查
- **WHEN** sdd:verify 检查 specs/ 中的行为场景
- **THEN** 逐条验证每个"假设/当/则"场景是否有对应的实现代码和测试用例

#### Scenario: 架构决策遵循检查
- **WHEN** sdd:verify 检查 design.md 中的架构决策
- **THEN** 验证实现代码是否遵循了 design.md 中记录的技术方案

#### Scenario: 排除范围违反检查
- **WHEN** sdd:verify 检查 proposal.md 的排除范围
- **THEN** 验证实现代码是否违反了 proposal.md 中明确排除的功能范围

#### Scenario: 合规问题分类
- **WHEN** 规范合规检查发现问题
- **THEN** 按严重程度分为 CRITICAL（场景无实现覆盖）、WARNING（架构决策偏离）、SUGGESTION（可优化项）

### Requirement: 验证报告输出
sdd:verify MUST 生成验证报告，包含测试结果和规范合规结果。

#### Scenario: 生成验证报告
- **WHEN** sdd:verify 完成双重验证
- **THEN** 输出包含测试结果摘要、规范合规检查摘要、按严重程度分组的问题列表、最终评估的完整报告

### Requirement: 阶段完成确认
sdd:verify 完成后 MUST 要求用户确认。MUST NOT 自动跳过确认步骤。

#### Scenario: 用户确认验证通过
- **WHEN** 用户确认验证结果
- **THEN** 提示用户是否进入下一阶段（sdd:archive）

#### Scenario: 验证未通过需要修复
- **WHEN** 用户确认需要修复
- **THEN** 根据问题类型建议回到 sdd:implement（代码问题）或 sdd:plan（规范问题）

#### Scenario: 用户选择暂停
- **WHEN** 用户选择暂停
- **THEN** 保存验证报告到变更目录，退出阶段
