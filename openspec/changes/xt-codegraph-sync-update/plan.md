<!-- sdd change: xt-codegraph-sync-update -->

# 实现计划 - xt-codegraph-sync-update

## 执行顺序

请按以下顺序执行各分组的任务：

1. **codegraph-init skill 主要修改** — 核心文档增强
2. **xt-sdd 工作流集成** — 在 apply/verify skill 中添加提示
3. **参考文档更新** — 扩展 codegraph-xt-sdd.md
4. **验证和测试** — 确保文档质量和准确性

## 子计划列表

| 编号 | 名称 | 文件 | 描述 |
|------|------|------|------|
| 1 | codegraph-init skill 主要修改 | [01-codegraph-init-skill.md](plans/01-codegraph-init-skill.md) | 在 SKILL.md 中创建"索引维护"章节，涵盖自动同步、手动检测、场景处理和故障排查 |
| 2 | xt-sdd 工作流集成 | [02-xt-sdd-workflow.md](plans/02-xt-sdd-workflow.md) | 在 xt-sdd-apply 和 xt-sdd-verify skill 中添加同步检查提示 |
| 3 | 参考文档更新 | [03-reference-docs.md](plans/03-reference-docs.md) | 扩展 codegraph-xt-sdd.md 参考文档的同步机制说明 |
| 4 | 验证和测试 | [04-validation.md](plans/04-validation.md) | 验证文档引用链接、命令示例和格式 |
