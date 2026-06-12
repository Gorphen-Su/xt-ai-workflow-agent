<!-- sdd change: metrics-on-demand-skill -->

# 1. xt-metrics Skill 主体 + 脚本架构

- [x] 1.1 创建 `.claude/skills/xt-metrics/` 目录结构（SKILL.md + scripts/ + scripts/lib/）
- [ ] 1.2 创建 `scripts/lib/cutoff.js`：cutoff.yaml 读写逻辑（读取、创建、更新、损坏检测与重建）
- [ ] 1.3 创建 `scripts/lib/ccusage.js`：ccusage session 查询 + JSON 解析（含超时处理和不可用降级）
- [ ] 1.4 创建 `scripts/lib/git-stats.js`：git log --numstat + git diff --name-status 增量统计
- [ ] 1.5 创建 `scripts/lib/attributor.js`：扫描 openspec/changes/*/sdd-state.yaml 提取时间窗口 + 归因计算（单一/并发/无活跃变更三种场景）
- [ ] 1.6 创建 `scripts/lib/report-writer.js`：报告 YAML 生成 + history.yaml 更新 + cutoff 更新
- [ ] 1.7 创建 `scripts/report.js`：组装 lib 模块，实现全量/增量查询 + 归因 + 报告生成，输出 JSON 到 stdout
- [ ] 1.8 创建 `scripts/summary.js`：读取 history.yaml 输出摘要 JSON 到 stdout
- [ ] 1.9 编写 `SKILL.md` report 子命令：调用 `node scripts/report.js --project-root <path>`，解析 JSON 输出格式化展示
- [ ] 1.10 编写 `SKILL.md` summary 子命令：调用 `node scripts/summary.js --project-root <path>`，解析 JSON 输出格式化展示
