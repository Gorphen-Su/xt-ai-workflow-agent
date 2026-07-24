# 归档记录 - quick-remove-metrics

## 功能描述
从 xt-sdd skills 相关文档中移除统计（metrics）工作流程的内容。

## 改动内容
- 移除 `metrics.git_baseline` 引用，改为独立 `git_baseline` 字段
- 移除归档完成后建议运行 `/xt-metrics` 的提示
- 移除 metrics 统计说明和相关引用

## 文档同步
- 影响级别：无 specs/design 影响
- 更新的文档：
  - `.claude/skills/xt-sdd-quick/SKILL.md`
  - `.claude/skills/xt-sdd-archive/SKILL.md`
  - `.claude/skills/xt-sdd-fix/SKILL.md`
  - `.claude/skills/xt-sdd-propose/SKILL.md`

## 验证结果
- 聚焦测试：不适用（文档变更）
- 影响范围验证：通过 - 确认所有 `metrics.git_baseline` 引用已移除
