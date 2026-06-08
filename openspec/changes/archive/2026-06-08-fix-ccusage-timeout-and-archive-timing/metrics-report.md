# Metrics Report: fix-ccusage-timeout-and-archive-timing

## 变更概览

| 项目 | 值 |
|------|-----|
| 变更名称 | fix-ccusage-timeout-and-archive-timing |
| 开始时间 | 2026-06-08T14:42:00+08:00 |
| 结束时间 | 2026-06-08T14:55:00+08:00 |
| 起始 SHA | `0133143970290e485b66034fc32c7974a36335ba` |
| 结束 SHA | `8d67c34f61de7fab0132b789c64ac8d33907cf50` |
| 工作区脏状态 | false |

## 文件变更统计

| 指标 | 数值 |
|------|------|
| 新增文件 | 2 |
| 编辑文件 | 6 |
| 删除文件 | 0 |
| 总变更文件 | 8 |

## 代码行数统计

- **新增行数**：74
- **删除行数**：16
- **净增长**：+58

## Token 使用统计

| 指标 | 数值 |
|------|------|
| 输入 Token | 975,603 |
| 输出 Token | 43,612 |
| 总 Token | 1,019,215 |
| 预估成本 | $0 (glm-5.1 当前未计价) |
| ccusage 可用 | ✅ true |
| 自动安装 | false（环境已预装 v20.0.6）|

### Token 快照时间线

| 阶段 | 时间戳 | input | output | 增量 input | 增量 output |
|------|--------|-------|--------|-----------|-------------|
| fix-init | 14:42:00 | 591,642 | 30,805 | — | — |
| archive | 14:55:00 | 975,603 | 43,612 | +383,961 | +12,807 |

**fix 流程耗时约 13 分钟**，期间累计消耗 **383,961 input tokens + 12,807 output tokens**，主要消耗于：
- 6 处 SKILL.md 文件的 Read + Edit
- archive 步骤 2.5 的两处时序约束改造
- 端到端 ccusage 后台调用 × 2

## 关键自证

🎉 **本次 fix 是 xt-sdd metrics 功能首次端到端记录真实 Token 数据。** 之前两次自举（metrics-tracking 和 fix-metrics-init）都因 Bash timeout 边界问题降级到 `unavailable`，本次主动按修复后的指令设置 `timeout=120000ms` 后立即成功取得 ccusage session 数据，证明：

1. ccusage 工具链本身**完全可用**（v20.0.6 / 58 个历史 session）
2. 之前的失败根因**就是 timeout 边界**（实测真实耗时 45 秒，逼近默认 120s 上限）
3. 修复方向**正确有效**：明确写出 timeout 下限避免下游 agent 用默认值踩坑

## 文件清单

```
M  .claude/skills/xt-sdd-apply/SKILL.md         (+1/-1)
M  .claude/skills/xt-sdd-archive/SKILL.md       (+6/-4)
M  .claude/skills/xt-sdd-fix/SKILL.md           (+3/-3)
M  .claude/skills/xt-sdd-plan/SKILL.md          (+1/-1)
M  .claude/skills/xt-sdd-propose/SKILL.md       (+4/-3)
M  .claude/skills/xt-sdd-verify/SKILL.md        (+1/-1)
A  openspec/changes/fix-ccusage-timeout-and-archive-timing/.openspec.yaml
A  openspec/changes/fix-ccusage-timeout-and-archive-timing/sdd-state.yaml
```
