## ADDED Requirements

### Requirement: Propose 阶段记录 Git 基线
系统 SHALL 在 xt-sdd-propose 的步骤 5（初始化 sdd-state.yaml）时，自动获取当前 Git commit SHA 并写入 sdd-state.yaml 的 `metrics.git_baseline.start_sha` 字段。同时记录当前时间戳到 `metrics.git_baseline.start_time`。

#### Scenario: 正常记录基线 SHA
- **WHEN** propose 阶段初始化 sdd-state.yaml 且 Git 仓库处于干净状态
- **THEN** 系统执行 `git rev-parse HEAD` 获取当前 commit SHA，将其写入 `metrics.git_baseline.start_sha`，并将当前 ISO 8601 时间戳写入 `metrics.git_baseline.start_time`

#### Scenario: Git 仓库有未提交更改
- **WHEN** propose 阶段初始化 sdd-state.yaml 但 Git 工作区有未提交更改
- **THEN** 系统仍然记录当前 HEAD SHA 作为基线，但在 `metrics.git_baseline` 中标记 `dirty: true`

### Requirement: Archive 阶段计算文件变更统计
系统 SHALL 在 xt-sdd-archive 阶段执行文件变更统计，使用 `git diff --stat <start_sha>..<end_sha>` 计算新增文件数、编辑文件数和删除文件数，并将结果写入 `metrics.file_stats` 段。

#### Scenario: 计算文件变更统计
- **WHEN** archive 阶段执行且 `metrics.git_baseline.start_sha` 已记录
- **THEN** 系统执行 `git diff --stat <start_sha> HEAD` 和 `git diff --numstat <start_sha> HEAD`，解析输出并填充以下字段：
  - `metrics.file_stats.files_added`：新增文件数
  - `metrics.file_stats.files_modified`：编辑文件数
  - `metrics.file_stats.files_deleted`：删除文件数
  - `metrics.file_stats.total_files_changed`：总变更文件数

#### Scenario: 无文件变更
- **WHEN** archive 阶段执行但 start_sha 与 HEAD 相同（无代码变更）
- **THEN** 所有 file_stats 字段设为 0

#### Scenario: 基线 SHA 不存在
- **WHEN** archive 阶段执行但 `metrics.git_baseline.start_sha` 未记录
- **THEN** 系统在 file_stats 中标记 `baseline_missing: true`，所有统计字段设为 null

### Requirement: Archive 阶段计算代码行数统计
系统 SHALL 在 archive 阶段使用 `git diff --numstat <start_sha>..<end_sha>` 计算新增代码行数和删除代码行数，并将结果写入 `metrics.line_stats` 段。

#### Scenario: 计算代码行数统计
- **WHEN** archive 阶段执行且 `metrics.git_baseline.start_sha` 已记录
- **THEN** 系统执行 `git diff --numstat <start_sha> HEAD`，累加所有文件的新增行数和删除行数，填充：
  - `metrics.line_stats.lines_added`：总新增行数
  - `metrics.line_stats.lines_deleted`：总删除行数

#### Scenario: 区分二进制文件
- **WHEN** diff 结果中包含二进制文件（numstat 显示 `-`）
- **THEN** 系统跳过二进制文件，不纳入行数统计

### Requirement: Metrics 段初始化
系统 SHALL 在 sdd-state.yaml 初始化时包含完整的 metrics 段结构，所有数值字段默认为 0 或 null。

#### Scenario: 初始化 metrics 段
- **WHEN** propose 阶段步骤 5 创建 sdd-state.yaml
- **THEN** 文件中包含以下结构：
  ```yaml
  metrics:
    git_baseline:
      start_sha: null
      start_time: null
      end_sha: null
      end_time: null
      dirty: false
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
      ccusage_available: null
      snapshots: []
  ```
