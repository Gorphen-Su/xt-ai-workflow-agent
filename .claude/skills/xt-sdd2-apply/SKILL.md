---
name: xt-sdd2-apply
description: Use when 用户说"开始实现"、"执行任务"、"TDD 开发"、"继续实现"，或 propose 冻结通过后的下一阶段触发。按冻结契约做测试驱动实现的入口。
---

# xt-sdd2 · apply — TDD 实现阶段

**REQUIRED SUB-SKILL:** superpowers:test-driven-development —— 红-绿循环全部细节以它为准。
**断言凭证：** superpowers:verification-before-completion（无验证输出不得声称完成）。
**共享约定：** [.claude/skills/xt-sdd2-shared/SKILL.md](../xt-sdd2-shared/SKILL.md)（重点：契约勘误协议）。

## 铁律

1. 驱动源只有 tasks.md/tasks/*.md——禁止实现矩阵之外的任何行为
2. 每个 [TDD] 微步骤 MUST 先写失败测试并亲眼看到红色失败输出，再写实现转绿
3. 冻结 delta 不可编辑：发现契约错误 → 按勘误协议处理，语义错误立即停手回 propose
4. 每组完成后整组回归验证 + 批量提交 `[<卷宗ID>] feat(<分组>): <描述>`
5. 全部任务组完成 MUST 运行 project.md 的 test_command 全量套件，贴出真实结果

## 步骤

### 0. 门禁预检
- freeze 凭证存在：team=PR 已合并（看 merge commit），solo=卷宗内 freeze 确认记录
- 覆盖矩阵满格（快速目检 tasks.md）
- 任一不满足 → 拒绝开工并指路

### 1. 逐组推进
- TodoWrite 跟踪当前组的微步骤
- 红 → 绿 → 重构 循环由 tdd 子技能主持；失败输出保留为证据不重述
- 不跳步、不合并不忽略测试；遇阻当场记录到任务组备注

### 2. 契约错误分流（执行中发现"spec 写错了"）
打开 [shared·契约勘误协议](../xt-sdd2-shared/SKILL.md#契约勘误协议freeze-之后才许动-spec)：
- 笔误（WHEN/THEN 语义零变化）→ 当前分支 `docs(spec-fix):` 修订并在后续 audit 列报
- 语义疑问（哪怕它"明显不合理"）→ **停下**，汇报差异与两种可能的意图解读，请用户裁决后走 MODIFIED delta 回 propose 重冻
- 停手范围 = 受该 Requirement 语义影响的任务组与其下游；与之无依赖的独立组经 AskUserQuestion 确认后方可继续
- 禁止用兼容代码静默绕行——要么契约修正，要么用户裁决，第三选项不存在

### 3. 收尾
- 全组绿 → `test_command` 全量 → 结果原文呈现
- 确认无未提交残留 → 指示 `/xt-sdd2:verify`

## 理性化防御表

| 诱惑 | 现实 |
|------|------|
| "这个要求明显写错了，顺手改两行 spec 再继续" | 冻结的意义就是防止实现期偷换评审者看过的东西；顺手的字面替换恰恰消灭了评审痕迹。"守规矩实现错误行为是表演"成立的前提是走了重冻流程，而不是跳过它 |
| "写兼容代码绕过去更快，spec 之后再说" | 错误契约 + 正确绕道 = 两份互相矛盾的真相同时入库；修源头（契约）才是省事的那条路 |
| "时间紧，先写实现后补测试" | 后补测试 = "这段代码碰巧能过"；红灯先行的价值就在强迫你先陈述预期 |
| "这个函数不用测，很简单" | 由 tdd 子技能裁决豁免与否，不由本次压力感裁决 |

## 红旗

- 改动了 `specs/` 下任何文件却没有对应 `docs(spec-fix):` 或重冻流程
- 绿灯先于红灯出现
- 提交信息缺 `[<卷宗ID>]` 前缀
