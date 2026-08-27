# xt-sdd2-skills

[npx](https://docs.npmjs.com/cli/v10/commands/npx) 安装器：把 **xt-sdd2 规格驱动开发流程**装进任意 Claude Code 项目——五命令管线 + 一次性冷启动，OpenSpec 双态结构承载唯一契约。

## 快速开始

```bash
npx xt-sdd2-skills install
```

随后在项目内依序使用：

```
/xt-sdd2:init         # 一次性：反推主规格库骨架 + 初始化 project.md
/xt-sdd2:explore      # 需求挖掘：grilling 追问 + 决策登记册
/xt-sdd2:propose      # 契约起草：delta/proposal/design/tasks + 软锁预警
                    #   ── freeze 门禁（PR 或 solo 确认）──
/xt-sdd2:apply        # TDD 实现（红-绿循环，勘误协议保护冻结契约）
/xt-sdd2:verify       # 三方闭环校验（R-ID ↔ task ↔ commit），判定仅 PASS|FAIL
/xt-sdd2:archive      # 放行三件套核验 → delta 合入主库 → 卷宗归档
```

## 分发内容

- `.claude/skills/xt-sdd2-{explore,propose,apply,verify,archive,init}` — 流程技能
- `.claude/skills/xt-sdd2-shared` — 共享约定与七件卷宗工件模板
- `.claude/commands/xt-sdd2/*` — 六个 slash command 入口
- `openspec/openspec.yaml`、`openspec/project.md` — 配置模板（已存在则跳过）

## 升级

```bash
npx xt-sdd2-skills update            # 自动备份既有技能后覆盖
npx xt-sdd2-skills update --dry-run  # 只预览不落盘
```

## 设计共识

见源仓库 [docs/designs/2026-08-27-xt-sdd2-design.md](https://github.com/Gorphen-Su/xt-ai-workflow-agent/blob/main/docs/designs/2026-08-27-xt-sdd2-design.md)。

## 退出码

0 成功 · 1 用户错误 · 2 网络 · 3 数据 · 4 文件系统
