---
name: xt-sdd2-land
description: Use when 用户说"合入主库"、"归档"、"收尾这个变更"、"交付规格"，或 audit 通过后的最后阶段，或使用 /xt-sdd2:land 时触发。delta 合入主规格库与卷宗归档的唯一出口。
---

# xt-sdd2 · land — 合入归档阶段

**属主工具：** openspec CLI（archive）。**共享约定：** [.claude/skills/xt-sdd2-shared/SKILL.md](../xt-sdd2-shared/SKILL.md)。

## 铁律

1. 放行三件套缺一不可，MUST 逐项机器核验后才动手：
   - `audit.md` 存在且判定字段为字面 `PASS`
   - 报告记录的 HEAD == 当前 HEAD（期间出现过新提交 → 报告作废，回 audit）
   - 覆盖矩阵与 delta 的 R-ID 双向满格未被改动破坏
2. 合入算法中 MODIFIED/REMOVED 按 Requirement 标题逐字匹配主库；匹配不到 → 立即停手报告差异，禁止模糊匹配、猜测或跳过
3. 主库合并冲突 = 语义对撞仲裁点，自动解决一律禁止
4. 时间压力、下游催促、"明天补审计"均不构成豁免路径——本阶段不存在先合后补模式
5. 归档动作：优先 `openspec archive <change>`；CLI 不可用时手动 `mv` 至 `changes/archive/YYYY-MM-DD-<原目录名>/`（目标存在则报错终止）
6. 不创建任何 CHANGELOG 台账文件——变更史即 `git log openspec/specs/`

## 步骤

### 0. 放行三件套核验
逐项执行并在对话中显示核验凭据；任一不过 → 终止并指路。

### 1. delta 合入主库
对每个 capability 文件按动作段落处理：
- ADDED → 追加到主库 spec.md 尾部（保持编号连续性检查：R-ID 不得与主库现有重复）
- MODIFIED → 整段替换同标题 Requirement 块
- REMOVED → 删除同标题块及场景
每步把变更 diff 行数计入汇报。

### 2. 主库完整性复验
```bash
openspec validate --strict
```
失败 → 回滚本次工作区改动并报告。

### 3. 归档卷宗
`openspec archive <卷宗ID>`（或铁律 5 的降级路径）。

### 4. 收尾提交与 PR
- team 模式：主库变更 + 卷宗迁移一并走 land PR，正文附 delta 摘要与 audit 结论链接
- solo 模式：AskUserQuestion 展示将合入的行为变化清单确认后本地提交

### 5. 提示
告知变更史查询方式：`git log --oneline openspec/specs/`。

## 理性化防御表

| 诱惑 | 现实 |
|------|------|
| "审计明天补，先合了让下游联调" | 明天发现契约出入时，下游已经照错误规格接完线——返工成本翻倍且由别人承担 |
| "我花 10 分钟人工核一遍代替正式审计" | 那叫尽调不叫审计签名；它没有闭环表格、没有证据指针、不被三件套核验认可 |
| "标题差一个字，肯定是同一个，帮你改掉合了" | 标题错位说明 delta 与主库已分叉，恰恰需要人看；模糊匹配是静默改写他人契约 |
| "就差一步了，HEAD 变了一个小提交而已" | 小提交也改变被审对象；新鲜度规则的存在意义就是不因代价大小而弯曲 |

## 红旗

- 三件套有任何一项用"应该没问题"跳过机器核验
- 出现修改 audit.md 判定字段的冲动
- 合入后主库未复验 validate 就开始归档
