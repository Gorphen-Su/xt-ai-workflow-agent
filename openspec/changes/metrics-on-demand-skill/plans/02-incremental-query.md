<!-- sdd change: metrics-on-demand-skill -->

# 2. 增量查询核心机制

- [ ] 2.1 定义 `openspec/metrics/cutoff.yaml` 结构（last_query_time / ccusage_available / ccusage_auto_installed）
- [ ] 2.2 定义 `openspec/metrics/history.yaml` 结构（日期 / 查询范围 / token 汇总 / 变更数）
- [ ] 2.3 定义 `openspec/metrics/reports/<YYYY-MM-DD>.yaml` 报告结构（查询时间范围 / token 汇总 / 代码变更汇总 / 按变更归因明细）
- [ ] 2.4 实现 cutoff.js 首次查询（cutoff 不存在）时的全量查询逻辑
- [ ] 2.5 实现 cutoff.js 增量查询（cutoff 存在）时只查截止时间后数据的逻辑
- [ ] 2.6 实现 cutoff.js cutoff 损坏时退化全量查询并自动重建的逻辑
