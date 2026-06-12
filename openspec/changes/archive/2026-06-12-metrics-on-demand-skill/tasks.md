## 1. xt-metrics Skill 主体 + 脚本架构

- [ ] 1.1 创建 `.claude/skills/xt-metrics/` 目录结构（SKILL.md + scripts/ + scripts/lib/）
- [ ] 1.2 创建 `scripts/lib/cutoff.js`：cutoff.yaml 读写逻辑（读取、创建、更新、损坏检测与重建）
- [ ] 1.3 创建 `scripts/lib/ccusage.js`：ccusage session 查询 + JSON 解析（含超时处理和不可用降级）
- [ ] 1.4 创建 `scripts/lib/git-stats.js`：git log --numstat + git diff --name-status 增量统计
- [ ] 1.5 创建 `scripts/lib/attributor.js`：扫描 openspec/changes/*/sdd-state.yaml 提取时间窗口 + 归因计算（单一/并发/无活跃变更三种场景）
- [ ] 1.6 创建 `scripts/lib/report-writer.js`：报告 YAML 生成 + history.yaml 更新 + cutoff 更新
- [ ] 1.7 创建 `scripts/report.js`：组装 lib 模块，实现全量/增量查询 + 归因 + 报告生成，输出 JSON 到 stdout
- [ ] 1.8 创建 `scripts/summary.js`：读取 history.yaml 输出摘要 JSON 到 stdout
- [ ] 1.9 编写 `SKILL.md` report 子命令：调用 `node scripts/report.js --project-root <path>`，解析 JSON 输出格式化展示
- [ ] 1.10 编写 `SKILL.md` summary 子命令：调用 `node scripts/summary.js --project-root <path>`，解析 JSON 输出格式化展示

## 2. 增量查询核心机制

- [ ] 2.1 定义 `openspec/metrics/cutoff.yaml` 结构（last_query_time / ccusage_available / ccusage_auto_installed）
- [ ] 2.2 定义 `openspec/metrics/history.yaml` 结构（日期 / 查询范围 / token 汇总 / 变更数）
- [ ] 2.3 定义 `openspec/metrics/reports/<YYYY-MM-DD>.yaml` 报告结构（查询时间范围 / token 汇总 / 代码变更汇总 / 按变更归因明细）
- [ ] 2.4 实现 cutoff.js 首次查询（cutoff 不存在）时的全量查询逻辑
- [ ] 2.5 实现 cutoff.js 增量查询（cutoff 存在）时只查截止时间后数据的逻辑
- [ ] 2.6 实现 cutoff.js cutoff 损坏时退化全量查询并自动重建的逻辑

## 3. 成本归因逻辑

- [ ] 3.1 实现 attributor.js 扫描 openspec/changes/ 下所有 sdd-state.yaml 提取变更时间窗口
- [ ] 3.2 实现 attributor.js 单一活跃变更的 token/代码归因逻辑
- [ ] 3.3 实现 attributor.js 多变更并发时按时间窗口比例分配 + 标记 attribution: shared 的逻辑
- [ ] 3.4 实现 attributor.js 无活跃变更时归因到 _unattributed 分类的逻辑

## 4. xt-sdd 六个阶段 Skill 移除 Metrics

- [ ] 4.1 从 `xt-sdd-propose/SKILL.md` 移除：步骤 0 第 4 条 ccusage 检测和自动安装、步骤 5 的 Token 快照记录、sdd-state.yaml 模板中的 token_usage 段
- [ ] 4.2 从 `xt-sdd-plan/SKILL.md` 移除："Metrics Token 快照" 整段
- [ ] 4.3 从 `xt-sdd-apply/SKILL.md` 移除："Metrics Token 快照" 整段
- [ ] 4.4 从 `xt-sdd-verify/SKILL.md` 移除："Metrics Token 快照" 整段
- [ ] 4.5 从 `xt-sdd-archive/SKILL.md` 移除："Metrics Token 快照" 整段、步骤 2.6 Token 数据汇总、metrics-report.md 中的 Token 相关行（仅保留 git 代码统计）
- [ ] 4.6 从 `xt-sdd-fix/SKILL.md` 移除：步骤 2 第 3 条 ccusage 检测和自动安装、"Metrics Token 快照" 整段、Metrics 汇总段

## 5. sdd-state.yaml 结构精简

- [ ] 5.1 更新 `xt-sdd-propose/SKILL.md` 中 sdd-state.yaml 模板：移除 token_usage 段，保留 git_baseline / file_stats / line_stats
- [ ] 5.2 更新 `xt-sdd-fix/SKILL.md` 中 sdd-state.yaml 模板：移除 token_usage 段
- [ ] 5.3 更新 `CLAUDE.md` 中 sdd-state.yaml 结构规范段：移除 token_usage 相关字段定义

## 6. archive 阶段适配

- [ ] 6.1 在 `xt-sdd-archive/SKILL.md` 阶段完成确认输出中添加 "/xt-metrics report" 提示
- [ ] 6.2 确保 archive 阶段仍执行 git 代码统计（git diff --numstat），写入 file_stats 和 line_stats
- [ ] 6.3 更新 `xt-sdd-archive/SKILL.md` 中 metrics-report.md 模板：移除 Token 相关行，仅保留代码变更统计

## 7. 验证与收尾

- [ ] 7.1 直接运行 `node scripts/report.js --project-root <path>`，验证脚本独立执行和 JSON 输出
- [ ] 7.2 模拟 `/xt-metrics report` 首次调用，验证目录创建和全量查询流程
- [ ] 7.3 模拟 `/xt-metrics report` 增量调用，验证截止时间更新和数据不重复
- [ ] 7.4 验证 `/xt-metrics summary` 输出正确
- [ ] 7.5 模拟 xt-sdd propose 流程，确认不再执行 ccusage 查询
- [ ] 7.6 模拟 xt-sdd archive 流程，确认代码统计正常且提示 /xt-metrics
