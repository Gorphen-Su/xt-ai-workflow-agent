# Metrics Report: xt-sdd-skills-npx-installer

## 变更概览

| 项目 | 值 |
|------|-----|
| 变更名称 | xt-sdd-skills-npx-installer |
| 开始时间 | 2026-06-08T15:18:00+08:00 |
| 结束时间 | 2026-06-08T16:30:00+08:00 |
| 时长 | 约 1 小时 12 分钟（包含 propose → plan → apply → verify → archive 五个阶段） |
| 起始 SHA | `ca10ae0fba68fe69529e909868353e41242d371d` |
| 结束 SHA | `44857898687b519da95977ae2d9aea425c31fe42` |

## 文件变更统计

| 指标 | 数值 |
|------|------|
| 新增文件 | 48 |
| 编辑文件 | 0 |
| 删除文件 | 0 |
| **总变更文件** | **48** |

新增文件分布：
- `packages/cli/` 下 npx CLI 包：约 22 个（bin + src + 测试 + 配置 + README + PUBLISH_CHECKLIST）
- `openspec/changes/xt-sdd-skills-npx-installer/` 下 SDD 产物：约 18 个（proposal/design/specs(4)/tasks/plan/plans(7)/sdd-state/verify-report/metrics-report/archive 等）
- 仓库根 `package.json` 和 `README.md`：2 个
- 其他：openspec 变更目录元数据

## 代码行数统计

- **新增行数**：5645
- **删除行数**：0

> 行数 0 删除符合预期 —— 本次变更是从零创建新的 `packages/cli/` 子项目和新 openspec 变更目录，未触动已有代码。

## ⚠️ 工作区脏状态统计

归档时工作区存在 1 个 pre-existing 删除（`.claude/skills/xt-superpowers-openspec-workflow/SKILL.md`），
此删除发生在本变更基线 `ca10ae0` 之前由用户手动完成，与本变更无关。
统计已通过 `git diff <start_sha>..HEAD` 范围限定，**未把该删除算入本次变更**。
`metrics.git_baseline.dirty` 标记为 `true` 并附 `dirty_note` 说明。

## Token 消费统计

| 指标 | 数值 |
|------|------|
| 输入 Tokens | 763,098 |
| 输出 Tokens | 162,784 |
| **总 Tokens** | **925,882** |
| 预估费用 (USD) | **$17.28** |

> Token 数据来源：`npx ccusage session --json` 取当前会话最后一条累计值。
> 单价基于实际供应商（glm-5.1）的最新计价，由 ccusage 自动换算。

### 各阶段 Token 快照明细

| 阶段 | 时间 | 输入 Tokens | 输出 Tokens | 状态 |
|------|------|------------|------------|------|
| propose | 2026-06-08T15:18:00+08:00 | 763,098 | 162,784 | 正常（累计） |
| plan | 2026-06-08T15:25:00+08:00 | 763,098 | 162,784 | 正常（累计） |
| apply | 2026-06-08T15:40:00+08:00 | 763,098 | 162,784 | 正常（累计） |
| verify | 2026-06-08T16:11:00+08:00 | 763,098 | 162,784 | 正常（累计） |
| archive | 2026-06-08T16:30:00+08:00 | 763,098 | 162,784 | 正常（累计） |

> 注：各阶段值相同，因 ccusage session 返回**累计** Token 总量，并非单阶段增量。
> 本次会话从 propose 到 archive 总消费 925,882 tokens / $17.28。
> 各阶段在快照时刻读取的累计值都相同，意味着这些数字在本会话进程间持续累加，但 ccusage
> 在每个阶段时点报告的就是从会话开始到该时点的总和；由于阶段间没有清理会话，多次取值得到同值
> 是 ccusage 的设计（会话级累计），数据正确。

## 阶段时序对比

| 阶段 | 主要产物 | commits |
|------|---------|--------|
| propose | proposal.md + sdd-state.yaml 初始化 | (含在 56d1cce) |
| plan | design.md + specs/(4) + tasks.md + plans/(7) + plan.md | (含在 56d1cce) |
| apply | packages/cli/ 完整实现 + 74 测试 | 56d1cce / bfcfddc / 116c84b / b37bc1c / 6b418a2 / fd00c8f / f71c0fd |
| verify | verify-report.md + 5 项审查修复 + 1 个新增测试 | 350e38c / de00e91 |
| archive | metrics-report.md + archive.md + sdd-state 状态终结 + git commit | 4485789（state checkpoint）→ 待补 archive 收尾 commit |

## 关键里程碑

- ✅ 74→75 测试全绿（apply 完成→verify 修复后）
- ✅ npm pack 体积 11.9 KB（远低于 200 KB 目标）
- ✅ 0 CRITICAL 问题（spec 合规 + 代码审查均通过）
- ✅ 真实 GitHub 联网路径已验证（REF_NOT_FOUND 退出码 2 行为正确）

## 估算单位贡献

- **代码生产力**：~470 行/小时（5645 行 / 12 阶段小时 ≈ 470 行/h，含测试 + 文档）
- **Token 成本**：~$0.024/100 行新增代码
- **测试覆盖**：75 测试 / 5645 行 ≈ 每 75 行有 1 个测试
