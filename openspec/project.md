---
language: zh-CN
solo_mode: true
authors:
  gophensu: GorphenSu
test_command: cd packages/cli && npm test
---

# 项目上下文

xt-ai-workflow-agent —— xt-sdd 系列 Claude Code 技能包的源仓库（monorepo）：

- `packages/cli/` — `xt-sdd-skills` 安装器 CLI（npx 分发：install/update/list 三命令，从本 GitHub 仓库拉取 tarball 安装技能到目标项目），vitest 测试位于 `src/__tests__/`
- `.claude/skills/xt-sdd-*/` — 第一代 xt-sdd 规格驱动流程技能（历史证据层）
- `.claude/skills/xt-sdd2-*/` — 现行 xt-sdd2 流程技能（五命令管线 + sow），设计共识见 docs/designs/
- `.claude/skills/xt-metrics/`、`.claude/skills/xt-codegraph-init/` — 辅助工具技能
