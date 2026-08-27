---
name: xt-sdd2-audit
description: Use when 用户说"审计"、"出审计报告"、"审查实现"、"验证闭环"，或 execute 完成后的下一阶段，或使用 /xt-sdd2:audit 时触发。三方闭环校验与放行判定的唯一出口。
---

# xt-sdd2 · audit — 审计阶段

**REQUIRED SUB-SKILL:** superpowers:requesting-code-review（代码审查环节）+ superpowers:verification-before-completion（证据纪律）。
**共享约定：** [.claude/skills/xt-sdd2-shared/SKILL.md](../xt-sdd2-shared/SKILL.md)（重点：审计判定与新鲜度）。

## 铁律

1. 判定字段只有 **PASS** 和 **FAIL** 两个合法值——"整改后通过 / 基本通过 / 有条件通过"一律视为未判定，等于 FAIL
2. 三方闭环每一格 MUST 给出证据指针（文件:行 / commit hash）；无指针即该行 FAIL
3. test_command MUST 真实运行并保留输出摘要；引用上一次的结果不算证据
4. 报告头部 MUST 记录当前 HEAD hash
5. CI 全绿只证明行为正确性，永远不能替代追溯闭环
6. FAIL 的缺口修复后 MUST 整体重跑 audit 生成新报告替换旧文件

## 步骤

### 0. 前置
Git 工作区干净（有残留先处置）；`git rev-parse --short HEAD` 记入报告。

### 1. 机械闭环核对（先于一切人工判断）
正向：读 tasks.md 覆盖矩阵 → 对每个 R-ID 找 delta 中对应 Requirement 与承载它的 commit：
```bash
git log --oneline --grep="[<卷宗ID>]"
```
反向：列出全部该前缀 commit 与任务组，找没有任何 R-ID 支撑的多余工作。
产出逐行校验表，每格带指针。

### 2. 测试与编译证据
按 project.md frontmatter 依次执行 `test_command`（必填）与 `build_command`（如有），失败时摘录关键失败输出原文。

### 3. 代码审查
走 requesting-code-review 流程；发现问题：能修的当场列整改项，不能立即处置的登记进已知风险表并给接受理由。

### 4. 出具报告
从 [audit.md 模板](../xt-sdd2-shared/references/templates/audit.md) 填充。判定规则机械套用：
- 闭环全通 + 测试全绿 + lint 过 + 无未分级风险 → **PASS**
- 其余任何状态 → **FAIL** + 缺口清单（每条附修复动作）

### 5. 分流
- PASS → 提示 `/xt-sdd2:land`
- FAIL → 列缺口清单等待整改；整改完成（通常回 execute 局部任务组）后整体重跑本阶段

## 理性化防御表

| 诱惑 | 现实 |
|------|------|
| "CI 绿了，标注缺失就是格式问题" | 追溯链本身是这场审查的审查对象，不是包装纸；断链的报告是替人签了一份不完全属实的合规记录 |
| "我扫了一遍功能大概率是对的，写个通过加脚注吧" | 你签名的是审计报告不是读后感；"大概率正确"进不了判定字段 |
| "补录映射表然后标'整改后通过'，下午要用" | 补录可以（audit 允许整改循环），但结论必须是新一份整体重跑后的 PASS——协商态措辞会让评审会上的人误以为它本来就闭环 |
| "时间不够，测试结果沿用上一轮" | 沿用的数字无法担保当前 HEAD 的行为；引用≠证据 |

## 红旗

- 在旧 FAIL 报告上追加"已整改"小节而不是生成新报告
- 校验表某行写了"人工推断可映射"之类软指针
- 报告没有 HEAD hash 或 HEAD 与实际不符
