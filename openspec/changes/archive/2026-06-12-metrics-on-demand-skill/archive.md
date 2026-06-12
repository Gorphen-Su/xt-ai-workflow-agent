# 归档记录 - metrics-on-demand-skill

## 需求概要

**动机**：xt-sdd 流程中每个阶段执行 `npx ccusage session --json` 进行 Token 快照记录，单次耗时 45-60 秒，全流程累计浪费 4-5 分钟。实时 token 数据对开发决策无帮助，应改为按需统计。

**变更范围**：
- **BREAKING**: 从 xt-sdd 六个阶段 skill 中移除所有 ccusage Token 快照查询逻辑
- **BREAKING**: 从 propose/fix 阶段移除 ccusage 检测和自动安装
- **BREAKING**: 从 sdd-state.yaml 结构中移除 token_usage 段
- 创建独立 `/xt-metrics` skill，支持 `report`（增量统计）和 `summary`（摘要查看）
- 增量查询基于 `openspec/metrics/cutoff.yaml` 截止时间
- 成本归因：将 token + 代码统计关联到具体 sdd 变更

## 技术方案

| 决策 | 说明 |
|------|------|
| D1: 独立 skill | 创建 `/xt-metrics` skill，而非嵌入 archive |
| D2: 增量查询基于截止时间 | 使用 cutoff.yaml 的 last_query_time，不重复查询 |
| D3: 时间窗口归因 | 按 sdd-state.yaml 的 start_time/end_time 归属 token 数据 |
| D4: 保留 git_baseline 移除 token_usage | sdd-state.yaml 保留 git_baseline + file_stats + line_stats |
| D5: 项目级数据存储 | openspec/metrics/ 下 cutoff.yaml + history.yaml + reports/ |
| D6: Node.js 脚本架构 | 计算逻辑封装在 scripts/ 下，SKILL.md 仅调用脚本展示结果 |

## 实现详情

- **执行模式**：轻量模式（内联 TDD），串行推进
- **新增文件（8 个）**：
  - `.claude/skills/xt-metrics/SKILL.md` — skill 入口
  - `scripts/report.js` — report 子命令入口
  - `scripts/summary.js` — summary 子命令入口
  - `scripts/lib/cutoff.js` — cutoff.yaml 读写
  - `scripts/lib/ccusage.js` — ccusage 查询 + 降级
  - `scripts/lib/git-stats.js` — git 增量统计
  - `scripts/lib/attributor.js` — sdd 变更成本归因
  - `scripts/lib/report-writer.js` — 报告生成 + 历史更新
- **修改文件（6 个）**：
  - `xt-sdd-propose/SKILL.md` — 移除 ccusage + 快照 + token_usage 模板
  - `xt-sdd-plan/SKILL.md` — 移除 Token 快照
  - `xt-sdd-apply/SKILL.md` — 移除 Token 快照
  - `xt-sdd-verify/SKILL.md` — 移除 Token 快照
  - `xt-sdd-archive/SKILL.md` — 移除 Token 快照 + 汇总 + 添加 /xt-metrics 提示
  - `xt-sdd-fix/SKILL.md` — 移除 ccusage + 快照 + 汇总 + 精简模板 + 添加 /xt-metrics 提示
- **验证修复**：添加 ccusage 格式校验日志 + 归因精确度说明（SUGGESTION 级别）

## 规格变更

### ADDED（on-demand-metrics）
- `xt-metrics skill MUST 提供按需统计报告` — 7 个场景
- `xt-metrics MUST 支持增量查询截止时间管理` — 3 个场景
- `xt-metrics MUST 将统计数据归因到 sdd 变更` — 3 个场景
- `xt-metrics MUST 持久化历史报告` — 3 个场景
- `xt-metrics MUST 在 ccusage 不可用时提示安装` — 1 个场景
- `xt-metrics MUST 支持查看统计摘要` — 2 个场景
- `xt-metrics 计算逻辑 MUST 封装为 Node.js 脚本` — 4 个场景

### REMOVED（xt-sdd-workflow-skills）
- `各阶段 MUST 执行 ccusage Token 快照记录`
- `propose/fix 阶段 MUST 检测和自动安装 ccusage`
- `sdd-state.yaml MUST 包含 token_usage 段`
- `archive 阶段 MUST 执行 Token 数据汇总和生成 metrics-report`

### ADDED（xt-sdd-workflow-skills）
- `archive 完成时 MUST 提示用户运行 /xt-metrics`
- `sdd-state.yaml MUST 保留 git_baseline 和代码统计段`

## 测试覆盖

- 脚本端到端验证：report.js 全量/增量查询通过
- summary.js 输出验证通过
- 所有 lib 模块加载验证通过
- xt-sdd 六阶段无 ccusage 残留验证通过
- 增量查询 cutoff 机制验证通过

## 文档同步记录

- 影响级别：无
- 实现与 specs/design 完全一致，无需文档更新

## 级联回退记录

无回退事件。

## 任务执行统计
- 总任务数：38
- 已完成：38
- 已失败：0
- 审查轮次：1（verify 阶段 2 个 SUGGESTION 已修复）
- 执行时间范围：2026-06-12T10:00:00+08:00 - 2026-06-12T15:05:00+08:00
