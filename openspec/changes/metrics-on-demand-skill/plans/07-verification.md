<!-- sdd change: metrics-on-demand-skill -->

# 7. 验证与收尾

- [ ] 7.1 直接运行 `node scripts/report.js --project-root <path>`，验证脚本独立执行和 JSON 输出
- [ ] 7.2 模拟 `/xt-metrics report` 首次调用，验证目录创建和全量查询流程
- [ ] 7.3 模拟 `/xt-metrics report` 增量调用，验证截止时间更新和数据不重复
- [ ] 7.4 验证 `/xt-metrics summary` 输出正确
- [ ] 7.5 模拟 xt-sdd propose 流程，确认不再执行 ccusage 查询
- [ ] 7.6 模拟 xt-sdd archive 流程，确认代码统计正常且提示 /xt-metrics
