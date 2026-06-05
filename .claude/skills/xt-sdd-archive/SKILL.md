---
name: xt-sdd-archive
description: xt-sdd 归档阶段 — 归档前验证、双源信息合并归档、specs 同步、变更目录归档、Git 提交提示，强制用户确认。当用户说"归档"、"完成需求"、"收尾"、使用 /xt-sdd:archive 时触发。
---

# xt-sdd 归档阶段

xt-sdd 规格驱动开发的第五阶段：归档变更、合并信息、同步规范、提交 Git。

## 铁律

1. **归档前 MUST 确认所有任务已完成、验证已通过**
2. **归档信息 MUST 合并 OpenSpec + Superpowers 双源**
3. **归档后 MUST 提醒用户 Git 提交**
4. **此阶段 MUST NOT 修改代码和规格文档**
5. **阶段完成 MUST 要求用户确认，MUST NOT 自动跳过**

## 执行步骤

### 步骤 1：确定当前变更

1. 读取变更目录下的 `sdd-state.yaml`，获取当前 change 名和 checkpoint
2. 如果 sdd-state.yaml 不存在，扫描 `openspec/changes/` 目录查找进行中的变更
3. 如果有多个 → 使用 AskUserQuestion 让用户选择

**Metrics Token 快照：** 步骤 1 完成后，记录 archive 阶段 Token 快照：
1. 读取当前变更的 sdd-state.yaml，检查 `metrics.token_usage.ccusage_available`
2. 如果为 true，执行 `npx ccusage session --json`，解析并追加快照到 `metrics.token_usage.snapshots`：
   ```yaml
   - phase: archive
     timestamp: <当前 ISO 8601 时间戳>
     input_tokens: <从 ccusage 获取>
     output_tokens: <从 ccusage 获取>
   ```
3. 如果为 false，追加 `unavailable: true` 快照
4. 如果 ccusage 执行失败，追加 `error: "<错误信息>"` 快照
5. 使用 Edit 工具更新 sdd-state.yaml，**不阻塞流程**

### 步骤 2：归档前验证

1. 读取 sdd-state.yaml，检查所有任务状态
2. 检查 verify 阶段是否已完成（sdd-state.yaml 中 phase_checkpoints.verify: done）
3. 如果存在未完成的任务或未通过的验证：
   - 使用 AskUserQuestion 警告用户："存在未完成的任务/未通过的验证，是否确认归档？"
   - 用户确认 → 继续归档
   - 用户取消 → 退出归档

更新 sdd-state.yaml checkpoint: entered

### 步骤 2.5：Metrics Git Diff 统计

1. 读取 sdd-state.yaml 的 `metrics.git_baseline.start_sha`
2. **基线缺失处理**：如果 `start_sha` 为 null：
   - 在 `metrics.file_stats` 中设置 `baseline_missing: true`
   - 所有统计字段（files_added、files_modified、files_deleted、total_files_changed）设为 null
   - 在 `metrics.line_stats` 中设置 `baseline_missing: true`
   - 所有行数字段（lines_added、lines_deleted）设为 null
   - 跳过后续统计步骤，直接进入步骤 2.6
3. **Git 脏状态检查**：执行 `git status --porcelain`
   - 如果有未提交更改 → 提醒用户："当前有未提交更改，建议先提交或 stash 以确保 diff 统计准确。是否继续？"
   - 用户选择提交 → 协助提交后继续统计
   - 用户选择继续 → 标记 `metrics.git_baseline.dirty: true`，继续统计
4. **文件变更统计**：执行 `git diff --stat <start_sha> HEAD`
   - 解析输出，提取每个文件的变更状态
   - 新增文件（diff 中标记 `create mode` 或路径前缀为 `A`）→ `metrics.file_stats.files_added`
   - 编辑文件 → `metrics.file_stats.files_modified`
   - 删除文件（diff 中标记 `delete mode` 或路径前缀为 `D`）→ `metrics.file_stats.files_deleted`
   - 总变更文件数 → `metrics.file_stats.total_files_changed`
5. **代码行数统计**：执行 `git diff --numstat <start_sha> HEAD`
   - 逐行解析输出（格式：`<added>\t<deleted>\t<filepath>`）
   - 跳过二进制文件（added 或 deleted 显示为 `-` 的行）
   - 累加所有非二进制文件的 added 列 → `metrics.line_stats.lines_added`
   - 累加所有非二进制文件的 deleted 列 → `metrics.line_stats.lines_deleted`
6. **无变更处理**：如果 start_sha 与 HEAD 相同，所有 file_stats 字段设为 0，所有 line_stats 字段设为 0
7. 使用 Edit 工具将统计结果写入 sdd-state.yaml 的 metrics 段
8. 记录 `metrics.git_baseline.end_sha` ← `git rev-parse HEAD`
9. 记录 `metrics.git_baseline.end_time` ← 当前 ISO 8601 时间戳

### 步骤 2.6：Metrics Token 数据汇总

1. 读取 sdd-state.yaml 的 `metrics.token_usage.snapshots` 数组
2. **无数据降级处理**：如果 snapshots 数组为空，或所有快照均标记 `unavailable: true` 或包含 `error` 字段：
   - 设置 `metrics.token_usage.total_input_tokens: null`
   - 设置 `metrics.token_usage.total_output_tokens: null`
   - 设置 `metrics.token_usage.total_tokens: null`
   - 设置 `metrics.token_usage.estimated_cost_usd: null`
   - 设置 `metrics.token_usage.token_data_unavailable: true`
   - 跳过后续步骤
3. **提取有效数据**：从 snapshots 数组中找到最后一个不包含 `unavailable` 且不包含 `error` 的快照
4. 从该快照中提取 `input_tokens` 和 `output_tokens`
5. 填充汇总字段：
   - `metrics.token_usage.total_input_tokens` ← 快照的 `input_tokens`
   - `metrics.token_usage.total_output_tokens` ← 快照的 `output_tokens`
   - `metrics.token_usage.total_tokens` ← `total_input_tokens + total_output_tokens`
   - `metrics.token_usage.estimated_cost_usd` ← 如果 ccusage session 输出包含 cost 字段则使用该值，否则设为 null
6. 使用 Edit 工具更新 sdd-state.yaml

### 步骤 2.7：生成 Metrics Report

使用 Write 工具在变更目录下生成 `metrics-report.md`，内容模板如下（根据实际数据填充，缺失数据标记 "数据不可用"）：

```markdown
# Metrics Report: <变更名>

## 变更概览

| 项目 | 值 |
|------|-----|
| 变更名称 | <change-name> |
| 开始时间 | <metrics.git_baseline.start_time 或 "数据不可用"> |
| 结束时间 | <metrics.git_baseline.end_time 或 "数据不可用"> |
| 起始 SHA | <metrics.git_baseline.start_sha 或 "N/A"> |
| 结束 SHA | <metrics.git_baseline.end_sha 或 "N/A"> |

## 文件变更统计

| 指标 | 数值 |
|------|------|
| 新增文件 | <metrics.file_stats.files_added 或 "N/A"> |
| 编辑文件 | <metrics.file_stats.files_modified 或 "N/A"> |
| 删除文件 | <metrics.file_stats.files_deleted 或 "N/A"> |
| 总变更文件 | <metrics.file_stats.total_files_changed 或 "N/A"> |

## 代码行数统计

- **新增行数**：<metrics.line_stats.lines_added 或 "N/A">
- **删除行数**：<metrics.line_stats.lines_deleted 或 "N/A">

## Token 消费统计

| 指标 | 数值 |
|------|------|
| 输入 Tokens | <metrics.token_usage.total_input_tokens 或 "数据不可用"> |
| 输出 Tokens | <metrics.token_usage.total_output_tokens 或 "数据不可用"> |
| 总 Tokens | <metrics.token_usage.total_tokens 或 "数据不可用"> |
| 预估费用 (USD) | <metrics.token_usage.estimated_cost_usd 或 "数据不可用"> |

### 各阶段 Token 快照明细

| 阶段 | 时间 | 输入 Tokens | 输出 Tokens | 状态 |
|------|------|------------|------------|------|
| <对 metrics.token_usage.snapshots 每条记录生成一行> | <timestamp> | <input_tokens 或 "N/A"> | <output_tokens 或 "N/A"> | <正常/unavailable/error> |
```

**部分数据缺失处理**：
- 如果整个 metrics 段为初始空值（所有字段为 0 或 null）→ 生成最小报告，说明 "本次变更未收集到指标数据"，列出可能原因（ccusage 未安装、Git 基线未记录等）
- 如果仅部分数据缺失 → 缺失字段标记 "数据不可用" 或 "N/A"，**不跳过报告生成**

**报告作为归档产物**：确保 metrics-report.md 与 archive.md 一同保留在变更目录中，不被清理。

### 步骤 3：生成 archive.md

在变更目录下生成 archive.md，合并双源信息：

1. 读取 sdd-state.yaml 获取所有任务的最终状态和审查计数
2. 生成 archive.md：

```markdown
# 归档记录 - <change-name>

## 需求概要
（来自 proposal.md 的 Why 和 What Changes 部分）

## 技术方案
（来自 design.md 的 Decisions 部分）

## 实现详情
（来自 sdd-state.yaml 的任务执行记录：哪些任务走了 TDD，有哪些重构，审查次数）

## 规格变更
（来自 specs/：哪些场景是 ADDED 的，哪些是 MODIFIED 的）

## 测试覆盖
（来自验证报告：测试结果摘要）

## 文档同步记录
（来自 verify 阶段的文档同步检查结果）

## 级联回退记录
（来自 sdd-state.yaml 的 cascade 字段：如果有回退事件，记录回退原因、影响范围、保留的任务）

## 任务执行统计
- 总任务数：<N>
- 已完成：<M>
- 已失败：<F>
- 审查轮次：<R>
- 执行时间范围：<开始时间> - <结束时间>
```

更新 sdd-state.yaml checkpoint: consistency-verified

### 步骤 4：同步 specs

1. 运行 `openspec status --change "<name>" --json` 检查 delta specs 状态
2. 如果有未同步的 delta specs → 运行 `openspec sync --change "<name>"`
3. 确认 specs 同步成功

更新 sdd-state.yaml checkpoint: specs-synced

### 步骤 5：归档变更

1. 运行 `openspec archive --change "<name>"`
2. 确认归档成功（变更目录移至 `openspec/changes/archive/` 下）
3. sdd-state.yaml 随变更目录一起保留在归档中（用于历史追溯）

**降级方案**：如果 openspec archive 命令不可用：
1. 运行 `mkdir -p openspec/changes/archive` 确保归档目录存在
2. 运行 `mv openspec/changes/<name> openspec/changes/archive/$(date +%Y-%m-%d)-<name>` 执行归档
3. 确认归档成功

更新 sdd-state.yaml checkpoint: archived

### 步骤 6：Git 提交提示

1. 整理本次变更涉及的所有文件清单（代码 + 文档 + 配置）
2. 向用户展示变更清单
3. 使用 AskUserQuestion 提示用户是否需要提交 Git
4. 用户确认提交 → 执行 `git add`（添加具体文件）和 `git commit`
   - commit message 格式：`feat(<范围>): <变更描述> — 归档完成`
   - 包含归档记录和所有相关文件的变更
5. 用户选择稍后提交 → 提示可以手动提交

更新 sdd-state.yaml checkpoint: done

### 步骤 7：阶段完成确认

使用 AskUserQuestion 展示归档摘要，提供三个选项：
- **A. 确认归档完成**：更新 sdd-state.yaml（phase_checkpoints.archive: done, phase: archive, checkpoint: done），展示变更摘要
- **B. 取消归档**：不修改状态，退出
- **C. 暂停**：保存当前进度，退出

## 断点恢复

重新运行时，读取 sdd-state.yaml 的 phase_checkpoints.archive：

| checkpoint | 恢复动作 |
|-----------|---------|
| `entered` | 从步骤 3（生成 archive.md）开始 |
| `consistency-verified` | 从步骤 4（同步 specs）继续 |
| `specs-synced` | 从步骤 5（归档变更）继续 |
| `archived` | 从步骤 6（Git 提交提示）继续 |
| `done` | 已完成 |

**异常状态检测**：
- 活跃变更目录已删除但 archive 目录不存在 → 归档过程中断，提示用户检查
- sdd-state.yaml 存在但活跃变更目录不存在且未归档 → 可能是手动删除，提示用户确认状态

## 常见问题

- "delta specs 与主规范有冲突"：在步骤 4 处理，展示冲突详情，让用户决定如何合并
- "用户想修改 archive.md"：直接编辑后重新确认
- "Git 提交失败"：展示错误信息，让用户决定是否重试或手动提交
- "归档后 sdd-state.yaml 是否保留"：是的，随归档目录保留作为历史记录
