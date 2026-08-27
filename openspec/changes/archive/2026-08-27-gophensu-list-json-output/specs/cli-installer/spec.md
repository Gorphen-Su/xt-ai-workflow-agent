# 需求 delta：cli-installer

<!--
动作段落仅 ADDED / MODIFIED（本卷宗无 REMOVED）。
MODIFIED 标题与主库 openspec/specs/cli-installer/spec.md 中 "Requirement: 清单查看命令" 逐字一致。
-->

## ADDED Requirements

### Requirement: 清单 JSON 输出模式

- ID: R-cli-installer-008

`list --json` SHALL 向原始 stdout 打印单个 JSON 对象作为机器可读分发清单。对象 SHALL 包含键 `source`、`ref`（当前生效的源仓库与引用）、`skills`（字符串数组）、`templates`（完整条目对象数组，含 src/dst/mode 字段）、`commands`（字符串数组）；payload 序列化 SHALL 使用两空格缩进的多行格式并以换行结尾。JSON 输出 MUST NOT 包含任何 ANSI 色彩转义序列。`--json` 模式为纯本地只读操作，退出码恒为 0。

#### Scenario: 默认消费者解析

- **WHEN** 用户执行 `xt-sdd-skills list --json`
- **THEN** stdout 输出可通过 `JSON.parse` 无损解析，顶层键恰为 source/ref/skills/templates/commands 五个，且无 stderr 错误、退出码 0

#### Scenario: 机器管道纯净性

- **WHEN** 对 `list --json` 的 stdout 执行解析
- **THEN** 内容不含任何 `\x1b[` ANSI 转义序列，可直接被 jq 或 CI 脚本消费

#### Scenario: 明细字段披露

- **WHEN** 消费者读取输出中的 templates 数组
- **THEN** 每个条目包含 src、dst、mode 完整字段（超集于文本模式的 dst-only 列表）

## MODIFIED Requirements

### Requirement: 清单查看命令

- ID: R-cli-installer-006

不带 `--json` 旗标执行 `list` 时，SHALL 维持现有人类可读文本输出格式不变：依次打印标题、生效 Source 与 Default ref、Skills 列表、Commands 映射路径列表、Templates 目标路径列表及两条使用提示。文本模式为纯本地只读操作，退出码恒为 0。结构化输出的契约由 R-cli-installer-008 单独承载，两种模式互不干扰。

#### Scenario: 默认文本模式零漂移

- **WHEN** 用户不带任何输出类旗标执行 `xt-sdd-skills list`
- **THEN** 输出章节顺序与内容类型与本变更前一致（Skills 名称列表、`.claude/commands/*.md` 映射、Templates dst 列表、tag/source 提示）
