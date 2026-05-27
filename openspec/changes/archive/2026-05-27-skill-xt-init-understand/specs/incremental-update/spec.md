## ADDED Requirements

### Requirement: 基于 Git diff 的增量更新
Skill SHALL 支持增量更新模式，仅重新分析自上次分析以来发生变更的部分。

#### Scenario: 检测到代码变更
- **WHEN** 用户调用 `/xt-init:understand --update` 且存在 Git 变更（相比上次分析的 commit）
- **THEN** 调用 `/understand-diff` 获取变更影响分析，仅重新整理受影响模块的文档

#### Scenario: 无代码变更
- **WHEN** 用户调用 `/xt-init:understand --update` 且无 Git 变更
- **THEN** 提示 "项目代码未变更，无需更新" 并退出

### Requirement: 增量更新范围控制
Skill SHALL 基于变更影响分析结果，精确控制文档更新范围。

#### Scenario: 变更影响单个模块
- **WHEN** Git diff 显示变更仅影响 `src/auth` 模块
- **THEN** 只重新整理 `docs/understand/` 中与 `src/auth` 相关的文档内容，保留其他模块文档不变

#### Scenario: 变更影响多个模块
- **WHEN** Git diff 显示变更影响多个模块
- **THEN** 逐个模块重新整理受影响的文档内容

### Requirement: 记录分析基准点
Skill SHALL 在每次成功分析后记录当前 Git commit hash 作为下次增量更新的基准。

#### Scenario: 记录基准 commit
- **WHEN** 分析或增量更新成功完成
- **THEN** 在 `docs/understand/.analysis-meta.yaml` 中记录 `last_analyzed_commit` 和 `last_analyzed_at` 时间戳

#### Scenario: 基准 commit 不存在
- **WHEN** 执行增量更新但 `.analysis-meta.yaml` 不存在或无 `last_analyzed_commit` 记录
- **THEN** 降级为全量分析模式并提示用户
