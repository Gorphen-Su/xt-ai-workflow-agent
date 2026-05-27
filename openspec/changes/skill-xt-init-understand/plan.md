<!-- sdd change: skill-xt-init-understand -->

# skill-xt-init-understand 实现计划

## 执行顺序

按编号顺序执行，每个分组完成后要求用户确认再进入下一分组。分组 1 是基础依赖，必须最先完成。分组 2 和 3 有依赖关系（分析 → 文档整理）。分组 4 和 5 可在分组 2-3 之后并行。

## 子计划列表

| 编号 | 名称 | 文件 | 说明 |
|------|------|------|------|
| 1 | Skill 骨架与依赖检查 | [01-skill-scaffold-dependency-check.md](plans/01-skill-scaffold-dependency-check.md) | SKILL.md 骨架创建、环境检测、插件安装 |
| 2 | 项目分析核心流程 | [02-project-analysis-core.md](plans/02-project-analysis-core.md) | 全量/指定范围分析、参数解析、耗时预估 |
| 3 | 分析结果文档整理 | [03-analysis-doc-compilation.md](plans/03-analysis-doc-compilation.md) | JSON→Markdown 转换、4 个文档生成、元信息记录 |
| 4 | 增量更新 | [04-incremental-update.md](plans/04-incremental-update.md) | Git diff 检测、/understand-diff 调用、局部更新 |
| 5 | CLAUDE.md 集成 | [05-claude-md-integration.md](plans/05-claude-md-integration.md) | 引用区块追加/替换、路径过滤 |
