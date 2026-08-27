---
name: xt-sdd2-shared
description: xt-sdd2 共享约定模块 — 不是独立 skill，不直接触发。定义档案卷宗 Dossier 结构、Requirement 编号规则、commit 追溯格式、openspec/project.md 配置 schema 与全套工件模板路径。各阶段 skill 通过相对路径引用本文档与模板。
---

# xt-sdd2 共享约定

xt-sdd2 规格驱动开发的全局约定。五个阶段命令 explore → propose → apply → verify → archive 与一次性 init 均以本文件为准。

## 流水线全景

```
explore ──▶ propose ──[PR 评审=契约冻结]──▶ apply ──▶ verify ──[PR]──▶ archive
 出证据       delta 起草      人               TDD 实现     闭环校验     合入主库
```

## 卷宗 Dossier 结构

一次变更加一个卷宗目录，全程唯一工作单元：

```
openspec/changes/YYYY-MM-DD-<作者缩写>-<slug>/
├── grill.md      # 挖掘纪要（explore 产出）
├── proposal.md   # 变更提案（propose 产出）
├── specs/        # 需求 delta（propose 产出，freeze 后只读）
├── design.md     # 技术权衡（propose 产出）
├── tasks.md      # 分组索引薄表（propose 产出，兼容 openspec CLI 工件识别）
├── tasks/        # NN-<分组名>.md 微步骤详情（propose 产出）
└── audit.md      # 审计报告（verify 产出）
```

archive 后由 openspec archive 移入 `changes/archive/<归档日期>-<原目录名>/`。

## 铁律

1. 出码前必须有已冻结的契约 delta；main 直推一律禁止
2. delta 冻结后视同只读：实现中发现契约错误 → 回 propose 开勘误流程，禁止直接编辑
3. 无 audit.md 不得 archive
4. 未通过闭环校验的缺口必须整改或在 audit.md 显式登记为已知风险

## ID 与追溯规则

| 对象 | 格式 | 示例 |
|------|------|------|
| 卷宗 ID | `YYYY-MM-DD-<作者缩写>-<slug>` | `2026-08-27-gs-add-login-validation` |
| Requirement | `R-<capability目录名原样>-NNN`，域内递增 | `R-login-api-003` |
| 场景 | 属于所在 Requirement，无需独立 ID | — |
| commit | `[<卷宗ID>] <type>: <描述>`，按任务分组批量提交 | `[2026-08-27-gs-add-login-validation] feat: 登录参数校验` |

- Requirement 编号在该 capability 主规格内取现有最大号 +1；新建 capability 从 001 起
- 并行撞号的唯一防线是合并冲突——冲突即语义对撞仲裁点，人工裁决
- 创建卷宗前必须扫描 `openspec/changes/` 下同名日期+缩写+slug 冲突，重复则微调 slug

## openspec/project.md 配置 schema

项目级唯一配置源，机器约束嵌 YAML frontmatter：

```yaml
---
language: zh-CN          # 工件语言
solo_mode: false         # true=单人降级模式（本地确认代替 PR，门禁产物不减）
authors:                 # 作者缩写登记表
  gs: GorphenSu
test_command: npm test   # apply/verify 的验证命令（必填）
build_command: npm run build   # 可选编译检查
---
<!-- 正文写叙事性项目上下文（架构概述、领域术语），供各阶段读取 -->
```

## 工件模板索引

各阶段创建文件时 MUST 复制对应模板再填充：

| 工件 | 模板 | 产出阶段 |
|------|------|---------|
| grill.md | [templates/grill.md](templates/grill.md) | explore |
| proposal.md | [templates/proposal.md](templates/proposal.md) | propose |
| specs/&lt;cap&gt;/spec.md（delta） | [templates/spec-delta.md](templates/spec-delta.md) | propose |
| design.md | [templates/design.md](templates/design.md) | propose |
| tasks.md | [templates/tasks-index.md](templates/tasks-index.md) | propose |
| tasks/NN-&lt;group&gt;.md | [templates/task-group.md](templates/task-group.md) | propose |
| audit.md | [templates/audit.md](templates/audit.md) | verify |

## 各阶段工具属主（防闭环重复）

| 阶段 | 属主 | 明文禁用 |
|------|------|---------|
| explore | grilling 技能引擎 | 需求侧禁用 openspec-explore / superpowers:brainstorming 自行发问 |
| propose | openspec CLI | 不做自带澄清轮次，输入只来自 grill.md |
| apply | superpowers:test-driven-development | tasks 仅作驱动清单，禁止跳过红-绿循环 |
| audit | superpowers:verification-before-completion + requesting-code-review | 不自造宽松审查逻辑 |
| archive | openspec archive | 合并冲突不当冲突 blindly 自动解决 |

## 单人降级模式

`project.md` 声明 `solo_mode: true` 时：freeze 与 archive 的 PR 以 AskUserQuestion 显式确认对话代替，其余门禁产物与校验一律不减。未声明时默认走 PR。

## 契约勘误协议（freeze 之后才许动 spec）

freeze 后 delta 即冻结基线。实现中发现契约问题时按错误性质二选一，无第三条路：

| 性质 | 判定标准 | 程序 |
|------|---------|------|
| 笔误 | 不改变任何 Scenario 的 WHEN/THEN 行为语义（错别字、编号笔误、标题文字） | 当前分支提交 `docs(spec-fix):` 说明修订，audit 报告「冻结后勘误」节逐条列出 |
| 语义 | 任何 WHEN/THEN 行为变化，包括"明显写错了所以纠正它" | **停止 apply** → 回 propose 在同一卷宗追加 MODIFIED delta（引用原 R-ID）→ 重新过 freeze 门禁（PR 或 solo 确认）→ 再续 apply。禁止"边改代码边顺手改正 spec" |

红线：不动主库 `openspec/specs/`（那是 archive 的专属动作）；不用兼容代码把已知错误的契约"绕过去"——要么勘误契约，要么升级问题让用户裁决行为到底应该是什么。

## 审计判定与新鲜度

- audit.md 的判定字段**只有 PASS 和 FAIL 两个合法值**。"整改后通过 / 基本通过 / 有条件通过"一律视为未判定
- FAIL 缺口修复后必须整体重跑 verify 替换旧报告，禁止旧报告上打补丁
- audit 报告绑定其运行的 HEAD hash；archive 校验口径为「**生产代码路径相对审计 HEAD 的 diff 为空**」——审计报告自身及后续卷宗文档提交会使仓库 HEAD 前移，属预期事实而非新鲜度破坏；若 packages/** 等生产路径出现 diff 则报告作废须重审（2026-08-27 试点修正：原 HEAD 字面等值规则结构性不可行）
- CI 全绿只是行为正确性证据，永远不能替代追溯闭环校验
