# Purpose

xt-sdd-skills 安装器 CLI 的核心行为契约：三条子命令（install/update/list）、项目根探测、模板保护与分发内容边界。

## Requirements

### Requirement: 首次安装命令

- ID: R-cli-installer-001 [SOURCE: 反推]

`install` SHALL 从默认源（Gorphen-Su/xt-ai-workflow-agent@main）下载 tarball，把 MANIFEST 声明的 skills、templates、commands 安装到当前项目的对应位置。

#### Scenario: 全新项目安装

- **WHEN** 在不含任何既有 xt-sdd 技能的项目执行 `install`
- **THEN** `.claude/skills/<skill-name>/SKILL.md` 与 `.claude/commands/*.md` 按清单生成，退出码 0

### Requirement: 升级命令与备份前置

- ID: R-cli-installer-002 [SOURCE: 反推]

`update` SHALL 在覆盖既有 skill 前创建完整备份；`--no-backup` SHALL 允许跳过且 MUST 给出不可逆警告。无既有 skill 时 SHALL 自动降级为全新安装（degradedToInstall）。

#### Scenario: 升级先备份

- **WHEN** 目标已装有 xt-sdd 技能且不带 `--no-backup` 执行 `update`
- **THEN** `.claude/skills/.backup/<时间戳>/` 出现既有技能完整副本后新版本才覆盖

#### Scenario: 显式跳过备份须警告

- **WHEN** 带 `--no-backup` 执行 `update`
- **THEN** stderr 出现不可逆警告文案，文件被直接覆写且无备份目录产生

### Requirement: dry-run 预演模式

- ID: R-cli-installer-003 [SOURCE: 反推]

install/update 的 `--dry-run` SHALL 只列出将要执行的操作而不写任何文件。

#### Scenario: 预演零副作用

- **WHEN** 带 `--dry-run` 执行 install/update
- **THEN** 输出列出将执行的操作清单（含 `[install]/[skip]` 等动作标注），目标目录文件系统无任何改动

### Requirement: 模板跳过保护

- ID: R-cli-installer-004 [SOURCE: 反推]

模板文件在目标已存在时 SHALL 跳过写入以保护用户定制（skip-if-exists），并被计入 skipped 结果。

#### Scenario: 用户定制不被覆写

- **WHEN** 目标项目已有自定义内容的模板文件并执行安装
- **THEN** 该文件内容保持原样，运行结果 skipped 计数包含它

### Requirement: 项目根自动探测

- ID: R-cli-installer-005 [SOURCE: 反推]

CLI SHALL 自 cwd 向上探测项目标记以定位目标根；未找到时 SHALL 回退当前目录并给出 warning。

#### Scenario: 子目录内自动上溯

- **WHEN** 在项目深层子目录（如 packages/cli）中执行命令
- **THEN** 安装锚定到探测出的项目根而非当前子目录

#### Scenario: 无标记回退告警

- **WHEN** 执行目录及其祖先均无项目标记
- **THEN** 以当前目录为目标继续操作，stderr 给出未找到标记的 warning

### Requirement: 清单查看命令

- ID: R-cli-installer-006 [SOURCE: 2026-08-27-gophensu-list-json-output]

不带 `--json` 旗标执行 `list` 时，SHALL 维持现有人类可读文本输出格式不变：依次打印标题、生效 Source 与 Default ref、Skills 列表、Commands 映射路径列表、Templates 目标路径列表及两条使用提示。文本模式为纯本地只读操作，退出码恒为 0。结构化输出的契约由 R-cli-installer-008 单独承载，两种模式互不干扰。

#### Scenario: 默认文本模式零漂移

- **WHEN** 用户不带任何输出类旗标执行 `xt-sdd-skills list`
- **THEN** 输出章节顺序与内容类型与本变更前一致（Skills 名称列表、`.claude/commands/*.md` 映射、Templates dst 列表、tag/source 提示）

### Requirement: 分发内容以 MANIFEST 为准

- ID: R-cli-installer-007 [SOURCE: 反推]

分发的 skills/templates/commands 清单 MUST 与 src/manifest.js 的 MANIFEST 一致；新增或下线技能通过修改该清单完成。

#### Scenario: 清单是唯一事实源

- **WHEN** 向 MANIFEST.skills 增删一个条目后执行安装
- **THEN** 分发结果与该清单严格一致——新增者被安装、删除者不再分发

### Requirement: 清单 JSON 输出模式

- ID: R-cli-installer-008 [SOURCE: 2026-08-27-gophensu-list-json-output]

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
