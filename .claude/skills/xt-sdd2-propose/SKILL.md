---
name: xt-sdd2-propose
description: Use when 用户说"起草规格"、"生成 proposal"、"立一个变更"、"进入 propose"，或 explore 完成后的下一阶段触发。契约 delta 的起草与请求评审入口。
---

# xt-sdd2 · propose — 契约起草阶段

**属主工具：** openspec CLI。**共享约定：** 读取 [.claude/skills/xt-sdd2-shared/SKILL.md](../xt-sdd2-shared/SKILL.md)。

## 铁律

1. 输入只有 grill.md。本阶段 MUST NOT 发起新的需求澄清轮——发现 grill 未覆盖的新问题 → 回 explore 补录后再来
2. 任何行为变化 MUST 有对应 Requirement delta——"改动太小"不构成豁免
3. `openspec validate --strict --changes` MUST 通过才能提请评审
4. 软锁扫描 MUST 执行并把结果明示给用户
5. freeze 前禁止编写任何实现代码（tasks 清单不是授权书）

## 步骤

### 0. 前置
卷宗存在且含 grill.md；Git 干净；读 project.md 取 language/authors。

### 1. 能力域盘点
由 proposal 角度列出触碰/新建的 capability 清单（kebab-case 目录名），每个新建域向用户展示命名征求确认。

### 2. 起草四件套 + 任务拆解
按序生成（全部有模板）：
1. `specs/<cap>/spec.md` delta —— 从 [spec-delta.md](../xt-sdd2-shared/references/templates/spec-delta.md)；R-ID 按「主库现有最大号+1」分配；MODIFIED/REMOVED 标题 MUST 与主库现有标题逐字一致；**每条 Requirement MUST ≥1 个 `#### Scenario:`**——strict 校验硬性结构要求，缺失即本步第 3 款 validate 必炸（2026-08-27 实测），起草时一次写全
2. [proposal.md](../xt-sdd2-shared/references/templates/proposal.md) —— Why/What/Impact 影响面表/非目标，论断不许超出登记册
3. [design.md](../xt-sdd2-shared/references/templates/design.md) —— 权衡表必含被否选项死因；codegraph 探查结论必填
4. `tasks.md` 索引 + `tasks/NN-<分组>.md` —— 覆盖矩阵 MUST 双向满格（见 [tasks-index.md](../xt-sdd2-shared/references/templates/tasks-index.md)）
   任务切组原则：每组能独立验证、独立提交

### 3. 校验与软锁
```bash
openspec validate --strict --changes
```
软锁扫描：收集所有其他活动卷宗 `specs/` 的 capability 集合，与本卷宗求交集；有交集 → 向用户报告重叠对象与建议（错峰或先合对方）。软锁是预警不是阻断，用户知情后可选择继续。

### 4. 固化与提交
一次性提交卷宗全部工件：`[<卷宗ID>] docs: propose 契约起草`

### 5. freeze 门禁
- team 模式：推送分支开 PR，正文附 delta 全文摘要 → 明确告知："合并该 PR 即契约冻结"
- solo 模式：展示 delta 全文，AskUserQuestion 显式确认冻结
- **拒签的处理**：拒绝或拖延 = 无 freeze = 不进入 apply。卷宗与 grill.md 照常留档，用户可用现状版本先行交付，散会补签再续——概括性授权（"你看着办"）不构成签署，签署对象是眼前这份 delta 全文
- 冻结成功后提示 `/xt-sdd2:apply`

## 理性化防御表

| 诱惑 | 现实 |
|------|------|
| "口头确认过 spec 了，写盘多余" | 口头确认的是理解，不是契约；没落盘过评审的东西谈不上"冻结" |
| "就一行改动，delta 反而拖慢交付" | 审计成本从来不在起草时的 30 秒，而在三个月后回答"这段代码为什么存在" |
| "评审要等一天，先把代码写了摆着等 freeze" | freeze 前的实现属于无契约行为——你写的会是"评审前的既成事实"，倒逼评审放行 |
| "validate 太严格先绕过去" | strict 校验失败 = 主库合入时必然失败，此刻不过就是延时爆炸 |

## 红旗

- 想创造第四种动作段落（ADDED/MODIFIED/REMOVED 之外）
- R-ID 编号与主库脱节（没有读取主库现状就开始编 001）
- Impact 表空着或写"无影响"
