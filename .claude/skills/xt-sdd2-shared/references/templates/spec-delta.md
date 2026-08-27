<!--
需求 delta 模板 — 遵循 OpenSpec 官方 delta 格式。
一个卷宗可含多个 capability 文件：specs/<capability>/spec.md 每个 capability 一个文件。
动作段落只允许三种：ADDED / MODIFIED / REMOVED Requirements。
MODIFIED/REMOVED 的 Requirement 标题 MUST 与主库现有标题逐字一致，否则 openspec validate 失败。

⚠️ 硬性结构（2026-08-27 实测）：每一条 Requirement MUST 至少有一个 #### Scenario，
否则 `openspec validate --specs --strict` 直接 ERROR："Requirement must have at least one scenario"。
没有可写场景的需求说明它还不是一个行为契约——回 grill 把行为问清楚再起草。
-->

## ADDED Requirements

### Requirement: <能力名称一句话>

- ID: R-<capability>-NNN  <!-- 域内现有最大号+1；新建 capability 从 001 起 -->

系统 SHALL <可验收的行为陈述，避免"合理地""适当地"等不可验收修饰词>。

#### Scenario: <场景名>

- **WHEN** <触发条件>
- **THE** <系统行为>

#### Scenario: <异常分支场景>

- **WHEN** <非法输入/边界条件>
- **THEN** <系统行为>

## MODIFIED Requirements

### Requirement: <与主库逐字一致的标题>

- ID: R-<capability>-NNN

<修改后的完整 Requirement 陈述与场景（整段替换语义，非 diff 片段）>

#### Scenario: <场景>

- **WHEN** <…>
- **THEN** <…>

## REMOVED Requirements

### Requirement: <被移除的标题>

**Reason**: <为何删除>
