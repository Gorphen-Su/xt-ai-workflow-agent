# 快速变更提案 - quick-remove-metrics

## 功能描述
从 xt-sdd skills 相关文档中移除统计（metrics）工作流程的内容，包括：
- sdd-state.yaml 中的 metrics 段结构说明
- 归档阶段的 metrics 统计说明
- 归档完成后建议运行 `/xt-metrics` 的提示

## 改动范围
基于 codegraph 探索，受影响文件：
- `.claude/skills/xt-sdd-quick/SKILL.md` — 移除 metrics 段结构说明和相关引用
- `.claude/skills/xt-sdd-archive/SKILL.md` — 移除 metrics 统计说明和基线记录步骤
- `.claude/skills/xt-sdd-fix/SKILL.md` — 移除 metrics 段结构说明

## 验收点
- [ ] xt-sdd-quick/SKILL.md 中不再有 metrics 段结构说明
- [ ] xt-sdd-quick/SKILL.md 中不再有归档完成后建议运行 /xt-metrics 的提示
- [ ] xt-sdd-archive/SKILL.md 中不再有 metrics 统计说明和基线记录步骤
- [ ] xt-sdd-fix/SKILL.md 中不再有 metrics 段结构说明
