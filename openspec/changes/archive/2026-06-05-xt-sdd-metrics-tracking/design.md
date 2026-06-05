## Context

xt-sdd 是一套规格驱动开发工作流，包含 propose → plan → apply → verify → archive 五个阶段以及 fix 修复流程。每个阶段通过独立的 SKILL.md 文件定义执行步骤，通过 `sdd-state.yaml` 跟踪状态。

当前工作流缺乏量化度量能力：开发者在完成一个完整需求后，无法得知整个过程中新增/编辑了多少文件、变更了多少代码行、以及消费了多少 Token。

**技术栈约束**：
- 项目以 markdown（SKILL.md）和 yaml（sdd-state.yaml）为主
- 构建工具为 unknown，无编译步骤
- 所有 skill 文件位于 `.claude/skills/xt-sdd-*/SKILL.md`
- 状态文件位于 `openspec/changes/<变更名>/sdd-state.yaml`

## Goals / Non-Goals

**Goals:**
- 在 propose 阶段自动记录 Git commit SHA 作为变更基线
- 在 archive 阶段自动计算文件变更统计（新增/编辑文件数、新增/变更代码行数）
- 在每个阶段切换时自动收集 Token 消费数据（通过 ccusage）
- 所有指标数据持久化到 sdd-state.yaml 的 metrics 段
- archive 阶段自动生成结构化的 metrics-report.md 汇总报告
- 最小化对现有 xt-sdd 工作流的侵入性修改

**Non-Goals:**
- 不实现实时 Token 监控（仅阶段切换时快照）
- 不修改 ccusage 工具本身
- 不实现跨项目的汇总统计
- 不追踪 CPU/内存等系统资源指标
- 不修改 openspec 核心框架

## Decisions

### 决策 1：文件/代码行统计基于 Git Diff

**选择**：在 propose 阶段记录起始 commit SHA，archive 阶段执行 `git diff <start-sha>..<end-sha>` 计算统计

**替代方案**：
- A) 基于 Hook 在每次 Write/Edit 操作时累计统计 → 依赖 hook 稳定性，且无法区分 xt-sdd 相关变更和其他手动变更
- B) 基于 git log 分析每个 commit → 复杂度高，且开发者可能不按阶段提交

**理由**：Git Diff 是最可靠的文件变更来源，与 xt-sdd 的 propose/archive 边界天然对应。`--numstat` 提供精确的行级统计，`--stat` 提供文件级概览。

### 决策 2：Token 统计集成 ccusage（含自动安装）

**选择**：在每个阶段切换时调用 `npx ccusage session --json` 获取当前会话 token 数据。在 propose 阶段前置检测 ccusage 可用性，如果不可用则自动执行 `npm install -g ccusage` 全局安装。

**替代方案**：
- A) 使用 `/usage` 内置命令手动记录 → 依赖手动操作，易遗忘
- B) 基于 Claude Agent SDK 编程集成 → 需要额外开发，复杂度高
- C) 等待 Hook API 暴露 token 数据 → Feature Request #11008 尚未实现
- D) 仅提示用户手动安装 → 体验差，容易遗忘导致整个流程无 Token 数据

**理由**：ccusage 是社区成熟的工具，能按会话粒度提供 token 数据。自动安装确保 Token 追踪功能开箱即用，避免因缺少依赖导致整个 metrics 功能降级。安装失败时降级为仅文件/代码统计，不阻塞主流程。

### 决策 3：sdd-state.yaml 新增 metrics 段

**选择**：在 sdd-state.yaml 中增加 `metrics` 顶级段

**结构设计**：
```yaml
metrics:
  git_baseline:
    start_sha: <propose 阶段的 commit SHA>
    start_time: <ISO 8601 时间戳>
    end_sha: <archive 阶段的 commit SHA>
    end_time: <ISO 8601 时间戳>
  file_stats:
    files_added: 0
    files_modified: 0
    files_deleted: 0
    total_files_changed: 0
  line_stats:
    lines_added: 0
    lines_deleted: 0
  token_usage:
    total_input_tokens: 0
    total_output_tokens: 0
    total_tokens: 0
    estimated_cost_usd: 0.0
    snapshots:
      - phase: propose
        timestamp: <ISO 8601>
        input_tokens: 0
        output_tokens: 0
      - phase: plan
        ...
```

**理由**：直接扩展现有的 sdd-state.yaml 结构，无需额外文件。所有阶段共享同一个 metrics 段，避免数据分散。

### 决策 4：每个阶段 skill 的最小侵入修改

**选择**：在 xt-sdd 各阶段 SKILL.md 中，仅在关键检查点追加 metrics 收集指令

**修改点**：
- `xt-sdd-propose/SKILL.md`：步骤 5（初始化 sdd-state.yaml）时记录 `start_sha`
- `xt-sdd-archive/SKILL.md`：归档前执行 `git diff` 统计 + `ccusage session` 记录 + 生成 `metrics-report.md`
- 其他阶段（plan/apply/verify/fix）：阶段开始时调用 ccusage 记录 token 快照

**理由**：将 metrics 逻辑嵌入各阶段的自然检查点，避免引入额外的 skill 或中间步骤。

## Risks / Trade-offs

- **[ccusage 不可用]** → propose 阶段自动尝试 `npm install -g ccusage` 全局安装；安装成功后正常使用，安装失败则降级处理：Token 相关字段留空或标记 `unavailable`，文件/行数统计不受影响。记录 `install_error` 供排查
- **[Git 仓库有未提交更改时 archive]** → archive 阶段先提醒用户提交或 stash，确保 diff 统计的准确性
- **[跨多个 Claude Code session]** → ccusage 的 session 边界可能不完全对应 xt-sdd 阶段边界。通过累加各阶段快照的增量值来缓解
- **[sdd-state.yaml 膨胀]** → metrics 段数据量极小（几 KB），不影响性能
- **[Windows 兼容性]** → ccusage 和 git 命令在 Windows 环境下需验证路径和编码处理
