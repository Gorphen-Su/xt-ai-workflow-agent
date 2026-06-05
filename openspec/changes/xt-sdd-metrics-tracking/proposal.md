## Why

当前 xt-sdd 工作流缺乏对功能需求演进过程的量化度量能力。开发者在完成一个完整的 propose → plan → apply → verify → archive 流程后，无法得知：新增/编辑了多少文件、新增/变更了多少代码行、以及在整个过程中消费了多少 Token。这些数据对于评估开发效率、优化工作流和成本控制至关重要。

## What Changes

- **sdd-state.yaml 新增 metrics 段**：在变更状态文件中增加持久化的指标数据结构，记录 Git SHA 快照、文件变更统计、代码行数统计和 Token 消费数据
- **propose 阶段记录起始 SHA**：在 propose 阶段初始化时记录当前 Git commit SHA 作为变更基线
- **各阶段切换时收集 Token 数据**：集成 ccusage 工具，在 propose → plan → apply → verify → archive 每个阶段切换时，调用 `ccusage session` 获取当前会话 Token 用量并写入 metrics 段
- **archive 阶段生成汇总报告**：在 archive 阶段自动执行 `git diff --stat` 和 `git diff --numstat` 统计文件和代码行变更，汇总 Token 数据，生成 `metrics-report.md`
- **修改 xt-sdd 六个阶段 skill**：在 propose/plan/apply/verify/archive/fix 的 SKILL.md 中增加 metrics 收集检查点指令

## Capabilities

### New Capabilities

- `git-diff-metrics`: 基于 Git Diff 的文件变更和代码行数统计能力——在 propose 阶段记录起始 commit SHA，在 archive 阶段与起始 SHA 做 diff，统计新增文件数、编辑文件数、新增代码行数、变更代码行数
- `token-tracking`: 基于 ccusage 的 Token 消费追踪能力——在各阶段切换时调用 ccusage 获取会话 token 数据，自动写入 sdd-state.yaml metrics 段
- `metrics-report`: 指标汇总报告生成能力——在 archive 阶段自动聚合所有指标数据，生成结构化的 metrics-report.md

### Modified Capabilities

（无已有 spec 需要修改）

## Impact

- **xt-sdd 六个阶段 skill 文件**：propose、plan、apply、verify、archive、fix 的 SKILL.md 需增加 metrics 收集指令
- **sdd-state.yaml 结构**：新增 `metrics` 顶级段，包含 `git_baseline`、`file_stats`、`line_stats`、`token_usage` 子段
- **依赖工具**：需要 ccusage 用于 Token 消费数据获取；propose 阶段会自动检测并安装（`npm install -g ccusage`），安装失败时不阻塞流程但 Token 追踪功能降级
- **归档产物**：archive 阶段新增 `metrics-report.md` 文件作为归档产物之一
