## ADDED Requirements

### Requirement: xt-metrics skill MUST 提供按需统计报告

MUST `/xt-metrics` skill（SKILL.md）MUST 在用户主动调用时通过执行 Node.js 脚本完成 token 用量 + 代码变更 + 成本归因的增量统计，生成报告并持久化到 `openspec/metrics/` 目录。计算逻辑全部封装在 `.claude/skills/xt-metrics/scripts/` 下的脚本中，SKILL.md 仅负责调用脚本并展示输出结果。

#### Scenario: 用户首次调用 /xt-metrics report

- **WHEN** 用户执行 `/xt-metrics report` 且 `openspec/metrics/cutoff.yaml` 不存在
- **THEN** skill MUST 执行 `node scripts/report.js --project-root <path>`，脚本内部创建 `openspec/metrics/` 目录结构（cutoff.yaml + history.yaml + reports/），执行全量查询（ccusage session + git log + openspec changes），生成首份报告 `reports/<YYYY-MM-DD>.yaml`，更新 history.yaml，将截止时间写入 cutoff.yaml，输出 JSON 结果到 stdout

#### Scenario: 用户增量调用 /xt-metrics report

- **WHEN** 用户执行 `/xt-metrics report` 且 `openspec/metrics/cutoff.yaml` 存在且有截止时间
- **THEN** skill MUST 执行 `node scripts/report.js --project-root <path>`，脚本内部读取 cutoff 只查询截止时间之后的数据：ccusage session（截止时间后的 token 用量）、git log（截止时间后的 commits）、openspec changes（截止时间后活跃的变更），增量追加到 history.yaml，生成新报告，更新截止时间

#### Scenario: ccusage 不可用时降级

- **WHEN** 用户执行 `/xt-metrics report` 且 ccusage 不可用（未安装或执行失败）
- **THEN** skill MUST 在报告中 token 部分标记"数据不可用"，仍然执行 git 代码统计和 openspec 变更归因，不阻塞报告生成

#### Scenario: cutoff.yaml 损坏或丢失

- **WHEN** 用户执行 `/xt-metrics report` 且 cutoff.yaml 文件损坏或格式错误
- **THEN** skill MUST 执行 `node scripts/report.js --project-root <path>`，脚本内部检测到损坏后退化为全量查询，自动重建 cutoff.yaml，并在输出 JSON 中标记 `cutoff_reset: true`

### Requirement: xt-metrics MUST 支持增量查询截止时间管理

MUST `openspec/metrics/cutoff.yaml` MUST 记录上次成功查询的截止时间戳和 ccusage 安装状态，用于增量查询。

#### Scenario: 初始化 cutoff.yaml

- **WHEN** 首次运行 /xt-metrics report 且 cutoff.yaml 不存在
- **THEN** MUST 创建 cutoff.yaml，包含 `last_query_time: null`、`ccusage_available: <检测结果>`、`ccusage_auto_installed: <是否自动安装>`

#### Scenario: 查询成功后更新截止时间

- **WHEN** /xt-metrics report 成功完成一次增量查询
- **THEN** MUST 将 `last_query_time` 更新为本次查询完成时的 ISO 8601 时间戳

#### Scenario: 查询失败不更新截止时间

- **WHEN** /xt-metrics report 执行过程中发生致命错误（如 ccusage 超时且无缓存数据）
- **THEN** MUST NOT 更新 `last_query_time`，保持上次成功的截止时间

### Requirement: xt-metrics MUST 将统计数据归因到 sdd 变更

MUST 报告中 MUST 将 token 用量和代码变更统计关联到具体的 sdd 变更名称，使用 sdd-state.yaml 中的时间窗口进行归因。

#### Scenario: 单一活跃变更的归因

- **WHEN** 截止时间范围内只有 1 个 sdd 变更活跃（sdd-state.yaml 的 start_time 到当前时间内）
- **THEN** 报告 MUST 将该时间窗口内的所有 token 和代码统计归因到该变更名

#### Scenario: 多变更并发时的归因

- **WHEN** 截止时间范围内有多个 sdd 变更活跃
- **THEN** 报告 MUST 按每个变更的时间窗口比例分配 token 用量，并在变更条目中标记 `attribution: "shared"`，注明总参与变更数

#### Scenario: 无活跃变更时的统计

- **WHEN** 截止时间范围内没有匹配的 sdd 变更（非 xt-sdd 流程的 token 使用）
- **THEN** 报告 MUST 将这些统计归因到 `_unattributed` 分类，注明"非 xt-sdd 流程的使用"

### Requirement: xt-metrics MUST 持久化历史报告

MUST 每次查询结果 MUST 保存到 `openspec/metrics/reports/<YYYY-MM-DD>.yaml` 和 `openspec/metrics/history.yaml`。

#### Scenario: 生成报告文件

- **WHEN** /xt-metrics report 查询完成
- **THEN** MUST 在 `openspec/metrics/reports/` 下创建 `<YYYY-MM-DD>.yaml` 文件，包含：查询时间范围、token 汇总（input/output/cost）、代码变更汇总（files/lines）、按变更的成本归因明细

#### Scenario: 更新历史索引

- **WHEN** /xt-metrics report 查询完成
- **THEN** MUST 在 `openspec/metrics/history.yaml` 中追加一条记录：`{date, query_range: {from, to}, total_tokens, total_cost_usd, changes_count}`

#### Scenario: 同一天多次查询

- **WHEN** 同一天内多次执行 /xt-metrics report
- **THEN** 报告文件名 MUST 使用 `YYYY-MM-DD-HHMMSS.yaml` 格式避免覆盖

### Requirement: xt-metrics MUST 在 ccusage 不可用时提示安装

MUST 当 ccusage 未安装时，skill MUST 提示用户安装，但不阻塞代码统计功能。

#### Scenario: ccusage 未安装

- **WHEN** 用户执行 `/xt-metrics report` 且 ccusage 未安装
- **THEN** skill MUST 尝试自动安装 `npm install -g ccusage`，安装失败时提示用户手动安装，token 部分标记不可用，继续执行 git 代码统计

### Requirement: xt-metrics MUST 支持查看统计摘要

MUST `/xt-metrics` skill MUST 支持 `summary` 子命令，通过执行 `node scripts/summary.js --project-root <path>` 展示最近的统计数据摘要。

#### Scenario: 用户查看摘要

- **WHEN** 用户执行 `/xt-metrics summary`
- **THEN** skill MUST 执行 `node scripts/summary.js --project-root <path>`，脚本读取 history.yaml 输出 JSON，skill 展示：最近一次查询时间、累计 token 用量、累计成本、按变更的成本分布排名

#### Scenario: 无历史数据时

- **WHEN** 用户执行 `/xt-metrics summary` 且 history.yaml 不存在
- **THEN** skill MUST 提示"尚无统计数据，请先运行 /xt-metrics report"

### Requirement: xt-metrics 计算逻辑 MUST 封装为 Node.js 脚本

MUST 所有指标计算逻辑（ccusage 查询、git 统计、归因计算、报告生成）MUST 封装在 `.claude/skills/xt-metrics/scripts/` 下的独立 Node.js 脚本中，SKILL.md 仅负责调用脚本并格式化展示输出。

#### Scenario: report 子命令调用脚本

- **WHEN** SKILL.md 执行 report 子命令
- **THEN** MUST 执行 `node .claude/skills/xt-metrics/scripts/report.js --project-root <path>`，解析 stdout JSON 输出，格式化展示给用户

#### Scenario: summary 子命令调用脚本

- **WHEN** SKILL.md 执行 summary 子命令
- **THEN** MUST 执行 `node .claude/skills/xt-metrics/scripts/summary.js --project-root <path>`，解析 stdout JSON 输出，格式化展示给用户

#### Scenario: 脚本执行失败

- **WHEN** 脚本以非零退出码退出
- **THEN** SKILL.md MUST 捕获错误，向用户展示 stderr 内容，不生成部分报告

#### Scenario: 脚本可独立运行

- **WHEN** 用户在终端直接执行 `node .claude/skills/xt-metrics/scripts/report.js --project-root <path>`
- **THEN** 脚本 MUST 正常执行所有计算逻辑并输出 JSON 到 stdout，不依赖 Claude 对话环境
