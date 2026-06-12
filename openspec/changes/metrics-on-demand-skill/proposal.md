## Why

xt-sdd 流程中每个阶段（propose/plan/apply/verify/archive/fix）都会执行 `npx ccusage session --json` 进行 Token 快照记录，单次查询耗时 45-60 秒。一个完整需求走完全流程至少触发 5 次查询，累计浪费 4-5 分钟在等待上。这些实时 token 数据对开发决策没有帮助，纯粹是事后统计用途，不应该阻塞开发流程。

## What Changes

- **BREAKING**: 从 xt-sdd 六个阶段 skill 中移除所有 ccusage Token 快照查询逻辑（propose/plan/apply/verify/archive/fix 各阶段开头的 "Metrics Token 快照" 步骤）
- **BREAKING**: 从 xt-sdd-propose 步骤 0 中移除 ccusage 可用性检测和自动安装逻辑
- **BREAKING**: 从 xt-sdd-fix 步骤 2 中移除 ccusage 可用性检测和自动安装逻辑
- **BREAKING**: 从 sdd-state.yaml 结构中移除 `metrics.token_usage` 段（ccusage_available/auto_installed/install_error/snapshots/token_data_unavailable 及汇总字段）
- **BREAKING**: 从 xt-sdd-archive 中移除 Token 数据汇总步骤（步骤 2.6）和 metrics-report.md 中的 Token 相关行
- 创建独立 `/xt-metrics` skill，用户主动调用进行按需统计
- 新 skill 支持增量查询：基于 `openspec/metrics/cutoff.yaml` 截止时间，只查询新数据
- 新 skill 支持成本归因：将 token + 代码统计关联到具体 sdd 变更
- 新 skill 存储历史报告到 `openspec/metrics/history.yaml` 和 `openspec/metrics/reports/`

## Capabilities

### New Capabilities
- `on-demand-metrics`: 独立按需统计 skill，包含增量 Token 查询（ccusage）、增量 Git 代码统计、sdd 变更成本归因、报告生成与历史记录

### Modified Capabilities
- `xt-sdd-workflow-skills`: 从六个阶段 skill 中移除 ccusage 快照查询和自动安装逻辑，精简 sdd-state.yaml 的 metrics 结构（移除 token_usage 段，保留 git_baseline 和 file_stats/line_stats 供 xt-metrics 按需读取）

## Impact

- **受影响 skill 文件**（6 个）：`xt-sdd-propose/SKILL.md`、`xt-sdd-plan/SKILL.md`、`xt-sdd-apply/SKILL.md`、`xt-sdd-verify/SKILL.md`、`xt-sdd-archive/SKILL.md`、`xt-sdd-fix/SKILL.md`
- **新增 skill**（1 个）：`xt-metrics/SKILL.md`
- **新增数据目录**：`openspec/metrics/`（cutoff.yaml + history.yaml + reports/）
- **sdd-state.yaml 结构变更**：移除 `metrics.token_usage` 段，保留 `metrics.git_baseline` 和 `metrics.file_stats`/`metrics.line_stats`
- **CLAUDE.md 更新**：sdd-state.yaml 结构规范段需要同步更新
- **向后兼容**：已有 sdd-state.yaml 中的 token_usage 段将被忽略（不删除，但不再写入新数据）
