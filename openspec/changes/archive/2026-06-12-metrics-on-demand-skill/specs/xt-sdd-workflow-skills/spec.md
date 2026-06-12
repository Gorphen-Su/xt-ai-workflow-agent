## REMOVED Requirements

### Requirement: 各阶段 MUST 执行 ccusage Token 快照记录
**Reason**: Token 快照查询（`npx ccusage session --json`）每次耗时 45-60 秒，对开发决策无实时价值。统计功能已迁移到独立 `/xt-metrics` skill 按需执行。
**Migration**: 使用 `/xt-metrics report` 替代。xt-sdd 各阶段不再自动查询 token 数据。

### Requirement: propose/fix 阶段 MUST 检测和自动安装 ccusage
**Reason**: ccusage 安装检测和自动安装仅在 token 快照场景需要，流程内不再查询 token 数据，该检测步骤已无意义。
**Migration**: ccusage 安装检测迁移到 `/xt-metrics` skill 内部，仅在用户主动调用统计时检查。

### Requirement: sdd-state.yaml MUST 包含 token_usage 段
**Reason**: token_usage 段（ccusage_available/auto_installed/install_error/snapshots/token_data_unavailable 及汇总字段）是为流程内 token 追踪设计的，该追踪机制已整体迁移到 xt-metrics。
**Migration**: 已有 sdd-state.yaml 中的 token_usage 段保留但不再更新。新创建的 sdd-state.yaml 不再包含 token_usage 段。

### Requirement: archive 阶段 MUST 执行 Token 数据汇总和生成 metrics-report
**Reason**: Token 数据汇总（从 snapshots 提取、计算 total_tokens/estimated_cost_usd）和 metrics-report.md 生成依赖流程内收集的快照数据，快照机制已移除。
**Migration**: 使用 `/xt-metrics report` 获取跨变更的完整统计报告。archive 阶段仅保留 git 代码统计（git diff --numstat），该统计不依赖 ccusage 且耗时极短。

## ADDED Requirements

### Requirement: archive 完成时 MUST 提示用户运行 /xt-metrics

MUST xt-sdd-archive 阶段完成（用户确认通过）时，MUST 在输出中提示用户可以运行 `/xt-metrics report` 更新项目统计。

#### Scenario: archive 完成提示

- **WHEN** xt-sdd-archive 阶段用户确认通过
- **THEN** 输出中 MUST 包含提示信息："建议运行 `/xt-metrics report` 更新项目统计数据"

### Requirement: sdd-state.yaml MUST 保留 git_baseline 和代码统计段

MUST sdd-state.yaml MUST 保留 `metrics.git_baseline`（start_sha/start_time/end_sha/end_time/dirty）和 `metrics.file_stats`/`metrics.line_stats` 段，供 xt-metrics 按需读取。

#### Scenario: propose 阶段初始化 git_baseline

- **WHEN** propose 阶段创建 sdd-state.yaml
- **THEN** MUST 记录 `metrics.git_baseline.start_sha`、`metrics.git_baseline.start_time`、`metrics.git_baseline.dirty`

#### Scenario: archive 阶段补充 end 信息和代码统计

- **WHEN** archive 阶段执行 git 代码统计
- **THEN** MUST 记录 `metrics.git_baseline.end_sha`、`metrics.git_baseline.end_time`，以及 `metrics.file_stats` 和 `metrics.line_stats` 的汇总值
