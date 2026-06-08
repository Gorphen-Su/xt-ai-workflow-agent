# xt-ai-workflow-agent

xt-sdd 规格驱动开发工作流的 skill 源仓库。提供 6 个核心 Claude Code skill：

| Command | Phase | Purpose |
|---------|-------|---------|
| `/xt-sdd:propose` | 需求探索 | 项目分析、需求澄清、规格生成 |
| `/xt-sdd:plan` | 方案设计 | 生成 design/specs/tasks、TDD 实现计划 |
| `/xt-sdd:apply` | TDD 实现 | subagent/inline 双模式、测试先行 |
| `/xt-sdd:verify` | 验证审查 | 文档同步、合规验证、代码审查 |
| `/xt-sdd:archive` | 归档收尾 | 双源合并归档、Git 提交 |
| `/xt-sdd:fix` | Bug 修复 | 分诊路由、自动升级、简化流程 |

## Installation

在其他 Claude Code 项目中安装或升级此工作流：

```bash
# 首次安装
npx xt-sdd-skills install

# 升级到最新版本
npx xt-sdd-skills update

# 查看可分发的组件清单
npx xt-sdd-skills list
```

详见 [`packages/cli/README.md`](packages/cli/README.md)。

## Repository Structure

```
├── .claude/
│   ├── skills/          # 6 个 xt-sdd-* skill 目录
│   └── commands/        # slash command 入口文件
├── openspec/
│   ├── openspec.yaml    # OpenSpec 配置
│   ├── sdd-project-profile.yaml
│   ├── changes/         # 每个独立的变更目录
│   └── specs/           # 全局规格定义
├── packages/
│   └── cli/             # npx xt-sdd-skills CLI 工具
├── docs/
│   ├── designs/
│   ├── plans/
│   └── explores/
├── config/
└── CLAUDE.md
```

## License

MIT