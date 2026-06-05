<!-- sdd change: xt-sdd-metrics-tracking -->

# xt-sdd-metrics-tracking 实现计划

## 执行顺序

按编号顺序执行，每个子计划文件对应 tasks.md 中的一个分组。分组 1-2 是基础设施（metrics 段模板 + ccusage/Token 快照），分组 3-5 是归档阶段的统计逻辑，分组 6 是端到端验证。

## 子计划列表

| 编号 | 名称 | 文件 | 描述 | Task 数 | Step 数 |
|------|------|------|------|---------|---------|
| 1 | Metrics 段结构定义 | [01-metrics-structure.md](plans/01-metrics-structure.md) | 扩展 sdd-state.yaml 模板增加 metrics 段，增加 Git 基线记录指令 | 3 | 9 |
| 2 | ccusage 检测与 Token 快照 | [02-ccusage-token-snapshot.md](plans/02-ccusage-token-snapshot.md) | ccusage 环境检测+自动安装，六阶段 Token 快照记录 | 8 | 18 |
| 3 | Git Diff 文件与行数统计 | [03-git-diff-stats.md](plans/03-git-diff-stats.md) | archive 阶段 git diff 统计文件和代码行变更 | 1 | 3 |
| 4 | Token 数据汇总 | [04-token-summary.md](plans/04-token-summary.md) | archive 阶段从 snapshots 汇总 Token 消费总量 | 1 | 3 |
| 5 | Metrics Report 生成 | [05-metrics-report-gen.md](plans/05-metrics-report-gen.md) | archive 阶段自动生成结构化 metrics-report.md | 1 | 3 |
| 6 | 验证与测试 | [06-validation-testing.md](plans/06-validation-testing.md) | 端到端验证 propose 流程和完整 xt-sdd 流程 | 3 | 8 |

**总计**：17 个 Task，44 个 Step
