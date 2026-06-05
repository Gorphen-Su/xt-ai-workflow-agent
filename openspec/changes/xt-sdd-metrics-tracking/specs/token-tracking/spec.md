## ADDED Requirements

### Requirement: ccusage 可用性检测与自动安装
系统 SHALL 在 propose 阶段检测 ccusage 工具是否可用。如果不可用，系统 SHALL 自动尝试通过 `npm install -g ccusage` 安装 ccusage，并将最终可用性结果记录到 `metrics.token_usage.ccusage_available` 字段。

#### Scenario: ccusage 已安装
- **WHEN** propose 阶段执行 ccusage 可用性检测且 `npx ccusage --version` 返回成功
- **THEN** `metrics.token_usage.ccusage_available` 设为 `true`，跳过安装步骤

#### Scenario: ccusage 未安装但自动安装成功
- **WHEN** propose 阶段执行 ccusage 可用性检测且 `npx ccusage --version` 返回失败
- **THEN** 系统自动执行 `npm install -g ccusage` 进行全局安装
- **AND** 安装成功后重新验证 `npx ccusage --version`，将 `metrics.token_usage.ccusage_available` 设为 `true`
- **AND** 在 `metrics.token_usage` 中记录 `auto_installed: true`

#### Scenario: ccusage 未安装且自动安装失败
- **WHEN** propose 阶段执行自动安装 `npm install -g ccusage` 失败（权限不足、网络错误等）
- **THEN** `metrics.token_usage.ccusage_available` 设为 `false`，系统提示用户手动安装（`npm install -g ccusage`），但 SHALL NOT 阻塞流程
- **AND** 在 `metrics.token_usage` 中记录 `auto_installed: false`、`install_error: "<错误信息>"`

### Requirement: 阶段切换时记录 Token 快照
系统 SHALL 在 xt-sdd 每个阶段（propose/plan/apply/verify/archive）开始时，调用 ccusage 获取当前会话的 Token 用量，并将快照追加到 `metrics.token_usage.snapshots` 数组。

#### Scenario: 正常记录 Token 快照
- **WHEN** 任一 xt-sdd 阶段开始执行且 ccusage 可用
- **THEN** 系统执行 `npx ccusage session --json`（或等效命令），解析 JSON 输出，将以下数据追加到 snapshots 数组：
  - `phase`：当前阶段名
  - `timestamp`：ISO 8601 时间戳
  - `input_tokens`：输入 token 数
  - `output_tokens`：输出 token 数

#### Scenario: ccusage 不可用时跳过
- **WHEN** 任一 xt-sdd 阶段开始执行但 ccusage 不可用
- **THEN** 系统在 snapshots 数组中追加一条记录，标记 `input_tokens: null`、`output_tokens: null`、`unavailable: true`

#### Scenario: ccusage 命令执行失败
- **WHEN** ccusage 可用但本次执行失败（超时、格式错误等）
- **THEN** 系统在 snapshots 数组中追加一条记录，标记 `error: "<错误信息>"`，SHALL NOT 阻塞当前阶段流程

### Requirement: Archive 阶段汇总 Token 数据
系统 SHALL 在 archive 阶段根据 snapshots 数组计算 Token 消费总量，并填充 `metrics.token_usage` 汇总字段。

#### Scenario: 计算 Token 总量
- **WHEN** archive 阶段执行且 snapshots 数组非空
- **THEN** 系统从最后一个快照中提取总 Token 数据（因为 ccusage session 返回的是累计值），填充：
  - `metrics.token_usage.total_input_tokens`
  - `metrics.token_usage.total_output_tokens`
  - `metrics.token_usage.total_tokens`（input + output 之和）
  - `metrics.token_usage.estimated_cost_usd`（如果 ccusage 提供的话）

#### Scenario: 无可用 Token 数据
- **WHEN** archive 阶段执行但所有快照均标记 unavailable 或 error
- **THEN** 所有汇总字段设为 null，标记 `token_data_unavailable: true`
