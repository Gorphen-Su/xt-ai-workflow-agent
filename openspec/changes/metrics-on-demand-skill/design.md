## Context

xt-sdd 是规格驱动开发工作流，包含 propose → plan → apply → verify → archive 五个阶段 + fix 修复流程。当前每个阶段都在阶段入口执行 `npx ccusage session --json` 进行 Token 快照记录，单次耗时 45-60 秒。全流程至少 5 次查询，加上 fix 流程可能更多。

现有 metrics 架构：
- 每个 sdd-state.yaml 内嵌 `metrics.token_usage` 段（含 ccusage_available/auto_installed/install_error/snapshots/token_data_unavailable 及汇总字段）
- propose/fix 阶段额外执行 ccusage 安装检测和自动安装
- archive 阶段执行 Token 数据汇总 + 生成 metrics-report.md
- 数据生命周期与单个变更绑定，无法跨变更聚合

痛点：查询频率远超实际需要，实时 token 数据不影响开发决策，纯粹事后统计用途。

## Goals / Non-Goals

**Goals:**
- 消除 xt-sdd 流程中所有 ccusage 查询等待时间（预计节省 4-5 分钟/需求）
- 提供独立按需统计能力，用户可自主决定统计频率（天/周/月）
- 增量查询机制避免重复数据采集
- 支持 token + 代码变更 + 成本归因到具体 sdd 变更的全面统计
- 统计数据持久化到项目级目录，支持跨变更聚合

**Non-Goals:**
- 不实现实时 token 监控或告警
- 不实现按 sdd 阶段细分的 token 归因（仅按变更级别归因）
- 不实现 token 预算控制或自动限流
- 不修改 ccusage 本身的行为
- 不回填历史 sdd-state.yaml 中的 token 数据（向后兼容：旧数据保留但不写入新数据）

## Decisions

### D1: 独立 skill 而非嵌入 archive

**决策**：创建独立 `/xt-metrics` skill，而非仅在 archive 阶段查询。

**理由**：
- 仅在 archive 查询则未归档的需求永远没有数据
- 用户可能想在工作进行中查看当周统计
- 独立 skill 支持跨变更聚合，archive 只能看单个变更

**替代方案**：
- 在 archive 统一查询：局限大，无法覆盖未归档需求和聚合需求
- 保留当前架构但减少频率（如仅 propose + archive 查询）：仍是阻塞式查询，未根本解决问题

### D2: 增量查询基于截止时间而非快照差异

**决策**：使用 `openspec/metrics/cutoff.yaml` 存储上次查询的截止时间戳，下次查询只处理该时间之后的数据。

**理由**：
- 简单可靠，不需要对比快照差异
- ccusage session 返回的是累计值，快照差异计算复杂且不可靠
- 截止时间天然与 git log/openspec changes 的时间范围匹配

**替代方案**：
- 快照 diff（用本次减上次）：ccusage 返回累计值难以准确差分，跨会话场景复杂
- 全量重查：浪费计算，无增量优势

### D3: 成本归因策略 — 时间窗口匹配

**决策**：通过 sdd-state.yaml 中的 `metrics.git_baseline.start_time` 和 archive 时间，将 ccusage 的 token 数据按时间窗口归属到对应 sdd 变更。

**理由**：
- ccusage session 输出按时间维度组织，与 sdd 变更的生命周期时间窗口可以对齐
- 比按 git commit 归属更准确（一次 commit 可能跨多个阶段）
- 允许部分归因不确定（多变更并发时标记为"共享"）

**替代方案**：
- 按 git commit 关联：粒度太细，一个变更多个 commit 难以聚合
- 按 ccusage 会话关联：会话与变更无直接映射关系

### D4: sdd-state.yaml 保留 git_baseline 和代码统计，移除 token_usage

**决策**：从 sdd-state.yaml 中移除 `metrics.token_usage` 整段，保留 `metrics.git_baseline`、`metrics.file_stats`、`metrics.line_stats`。

**理由**：
- git_baseline 仍需在 propose/fix 初始化时记录，xt-metrics 需要读取 start_sha 来计算代码变更
- file_stats/line_stats 可在 archive 阶段从 git diff 自动计算（无需 ccusage，耗时极短）
- token_usage 段完全由 xt-metrics 接管，sdd-state.yaml 不再承载

**替代方案**：
- 完全移除 metrics 段：xt-metrics 将无法获取 start_sha，失去代码变更归因能力
- 保留空壳结构：增加维护负担，没有实际价值

### D5: 数据存储结构

**决策**：在 `openspec/metrics/` 下存储：
- `cutoff.yaml`：上次查询截止时间 + ccusage 安装状态
- `history.yaml`：历史报告索引（每次查询一条记录）
- `reports/<YYYY-MM-DD>.yaml`：每次查询的详细报告

**理由**：
- 项目级存储进入 git，团队共享统计数据
- YAML 格式与 openspec 生态一致
- 独立报告文件便于查阅和归档，不会无限增长

### D6: 计算逻辑抽取为 Node.js 脚本

**决策**：将 token 查询、git 代码统计、成本归因、报告生成等计算逻辑抽取为独立 Node.js 脚本，放在 `.claude/skills/xt-metrics/scripts/` 目录下。SKILL.md 仅负责调用脚本并展示输出结果。

**理由**：
- 计算逻辑固定（读取 cutoff → 查询 ccusage → 查询 git → 扫描 openspec → 归因 → 生成报告），适合脚本一次性执行
- 脚本执行比对话中多步 Bash 调用高效得多，减少上下文切换开销
- 逻辑可独立运行、可测试、可复用（不依赖 Claude 对话环境）
- SKILL.md 保持精简，仅负责调用脚本和格式化展示

**脚本结构**：
```
.claude/skills/xt-metrics/
  SKILL.md              # skill 入口：调用脚本 → 展示结果
  scripts/
    report.js            # report 子命令：增量查询 + 归因 + 生成报告
    summary.js           # summary 子命令：读取 history → 输出摘要
    lib/
      cutoff.js          # cutoff.yaml 读写
      ccusage.js         # ccusage session 查询 + 解析
      git-stats.js       # git log/diff 统计
      attributor.js      # sdd 变更时间窗口归因计算
      report-writer.js   # 报告 YAML 生成 + history 更新
```

**脚本接口**：
- `node scripts/report.js --project-root <path> [--from <iso-timestamp>]`：输出 JSON 到 stdout
- `node scripts/summary.js --project-root <path>`：输出 JSON 到 stdout
- 脚本内部处理所有文件 I/O（cutoff/history/reports），skill 只需解析 stdout JSON 并展示

**替代方案**：
- 全部逻辑写在 SKILL.md 中：对话中多步 Bash 调用，低效且难以测试
- Shell 脚本：Windows 兼容性差，YAML 解析需要额外工具

## Risks / Trade-offs

- **[多变更并发时归因不精确]** → 多个 sdd 变更在同一时间窗口活跃时，token 归因只能按时间比例估算或标记"共享"。缓解：报告中标明归因方式，不强制精确到 100%
- **[用户忘记查询导致无数据]** → 长期不调用 xt-metrics 则没有统计数据。缓解：在 xt-sdd-archive 完成时提示"建议运行 /xt-metrics report 更新统计"
- **[cutoff.yaml 丢失或损坏]** → 增量查询失效。缓解：cutoff 丢失时退化为全量查询，自动重建截止时间
- **[旧 sdd-state.yaml 兼容性]** → 已有 token_usage 段的数据不再更新但保留。缓解：xt-metrics 忽略旧 token_usage 数据，archive 阶段不再读取 snapshots 生成 metrics-report
- **[ccusage 不可用]** → 与现在行为一致，token 部分标记不可用，代码统计仍可正常工作
