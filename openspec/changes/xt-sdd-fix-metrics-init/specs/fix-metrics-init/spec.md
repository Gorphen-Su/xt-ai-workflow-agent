## ADDED Requirements

### Requirement: fix 流程步骤 2 执行 ccusage 可用性检测
系统 SHALL 在 xt-sdd-fix 的步骤 2（创建变更目录）中，初始化 sdd-state.yaml 之前，执行 ccusage 可用性检测。检测逻辑 SHALL 与 propose 阶段步骤 0 第 4 条一致：先检测，不可用则自动安装，安装失败则降级处理。

#### Scenario: ccusage 已安装
- **WHEN** fix 步骤 2 执行 ccusage 可用性检测且 `npx ccusage --version` 返回成功
- **THEN** `metrics.token_usage.ccusage_available` 设为 `true`，跳过安装步骤

#### Scenario: ccusage 未安装但自动安装成功
- **WHEN** fix 步骤 2 执行 ccusage 可用性检测且 `npx ccusage --version` 返回失败
- **THEN** 系统自动执行 `npm install -g ccusage` 全局安装
- **AND** 安装成功后重新验证，将 `metrics.token_usage.ccusage_available` 设为 `true`、`auto_installed: true`

#### Scenario: ccusage 未安装且自动安装失败
- **WHEN** fix 步骤 2 执行自动安装失败
- **THEN** `metrics.token_usage.ccusage_available` 设为 `false`、`auto_installed: false`、`install_error: "<错误信息>"`，SHALL NOT 阻塞流程

### Requirement: fix 流程步骤 2 记录 Git 基线 SHA
系统 SHALL 在 xt-sdd-fix 的步骤 2 中，创建 sdd-state.yaml 时执行 `git rev-parse HEAD` 获取当前 commit SHA，并写入 `metrics.git_baseline.start_sha`。同时记录当前时间戳到 `metrics.git_baseline.start_time` 和工作区脏状态到 `metrics.git_baseline.dirty`。

#### Scenario: 正常记录基线 SHA
- **WHEN** fix 步骤 2 创建 sdd-state.yaml 且 Git 仓库处于干净状态
- **THEN** 系统执行 `git rev-parse HEAD`，将输出写入 `metrics.git_baseline.start_sha`，当前 ISO 8601 时间戳写入 `metrics.git_baseline.start_time`，`dirty` 设为 `false`

#### Scenario: Git 仓库有未提交更改
- **WHEN** fix 步骤 2 创建 sdd-state.yaml 但 Git 工作区有未提交更改
- **THEN** 系统仍记录当前 HEAD SHA，但 `metrics.git_baseline.dirty` 设为 `true`

### Requirement: fix 流程步骤 2 记录 fix-init Token 快照
系统 SHALL 在 xt-sdd-fix 的步骤 2 中，sdd-state.yaml 创建和 ccusage 检测完成后，记录一个 `phase: fix-init` 的 Token 快照到 `metrics.token_usage.snapshots`。

#### Scenario: ccusage 可用时记录快照
- **WHEN** fix 步骤 2 完成且 `metrics.token_usage.ccusage_available` 为 `true`
- **THEN** 系统执行 `npx ccusage session --json`，将结果追加到 `metrics.token_usage.snapshots`：
  - `phase: fix-init`
  - `timestamp: <ISO 8601>`
  - `input_tokens` 和 `output_tokens` 从 ccusage 获取

#### Scenario: ccusage 不可用时记录降级快照
- **WHEN** fix 步骤 2 完成但 `metrics.token_usage.ccusage_available` 为 `false`
- **THEN** 系统追加一条标记不可用的快照：
  - `phase: fix-init`
  - `timestamp: <ISO 8601>`
  - `input_tokens: null`、`output_tokens: null`、`unavailable: true`

#### Scenario: ccusage 执行失败时记录错误快照
- **WHEN** ccusage 可用但本次执行失败（超时、格式错误等）
- **THEN** 系统追加一条标记错误的快照：
  - `phase: fix-init`
  - `timestamp: <ISO 8601>`
  - `input_tokens: null`、`output_tokens: null`、`error: "<错误信息>"`
- **AND** SHALL NOT 阻塞流程
