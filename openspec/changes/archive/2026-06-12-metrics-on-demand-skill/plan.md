<!-- sdd change: metrics-on-demand-skill -->

# metrics-on-demand-skill 实现计划

## 执行顺序

按编号顺序执行。分组 1-3 为新增 xt-metrics skill 的核心实现，必须先完成。分组 4-6 为 xt-sdd 现有 skill 的修改，依赖分组 1 的脚本架构确定。分组 7 为验证，最后执行。

**依赖关系**：
- 分组 2-3 依赖分组 1（脚本架构和 lib 模块）
- 分组 4 依赖分组 1（明确 xt-metrics 接口后再移除旧逻辑）
- 分组 5-6 与分组 4 可部分并行（sdd-state 结构精简和 archive 适配不依赖脚本实现）
- 分组 7 依赖所有前置分组

| 编号 | 名称 | 文件 | 简要描述 |
|------|------|------|----------|
| 1 | xt-metrics Skill 主体 + 脚本架构 | [01-skill-scripts.md](plans/01-skill-scripts.md) | 创建 skill 目录、5 个 lib 模块、2 个入口脚本、SKILL.md 两个子命令 |
| 2 | 增量查询核心机制 | [02-incremental-query.md](plans/02-incremental-query.md) | 定义 YAML 数据结构、实现 cutoff 全量/增量/重建逻辑 |
| 3 | 成本归因逻辑 | [03-cost-attribution.md](plans/03-cost-attribution.md) | 实现 sdd 变更时间窗口扫描和三种归因场景 |
| 4 | xt-sdd 六个阶段 Skill 移除 Metrics | [04-remove-metrics.md](plans/04-remove-metrics.md) | 从 6 个 SKILL.md 中移除 ccusage 查询和 token 快照逻辑 |
| 5 | sdd-state.yaml 结构精简 | [05-state-simplify.md](plans/05-state-simplify.md) | 更新 3 个文件中的 sdd-state.yaml 模板，移除 token_usage 段 |
| 6 | archive 阶段适配 | [06-archive-adapt.md](plans/06-archive-adapt.md) | 添加 /xt-metrics 提示、保留 git 代码统计、更新 metrics-report 模板 |
| 7 | 验证与收尾 | [07-verification.md](plans/07-verification.md) | 脚本独立运行验证、skill 调用验证、xt-sdd 流程回归验证 |
