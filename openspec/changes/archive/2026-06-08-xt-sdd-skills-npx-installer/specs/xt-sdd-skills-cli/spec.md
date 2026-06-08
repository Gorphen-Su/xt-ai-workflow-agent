# Spec: xt-sdd-skills-cli

CLI 入口与子命令调度。

## ADDED Requirements

### Requirement: CLI 必须提供 install/update/list 三个子命令

MUST CLI 必须识别 `install`、`update`、`list` 三个子命令，每个子命令有独立的参数解析和职责分工。

#### Scenario: 用户运行 install 子命令

- **WHEN** 用户在目标项目目录执行 `npx xt-sdd-skills install`
- **THEN** CLI 必须调用 install 流程：识别项目根 → 校验该项目尚未安装 xt-sdd skill → 从 GitHub 拉取 → 写入文件 → 输出成功摘要并以退出码 0 退出

#### Scenario: 用户运行 update 子命令

- **WHEN** 用户在已安装 xt-sdd skill 的项目目录执行 `npx xt-sdd-skills update`
- **THEN** CLI 必须调用 update 流程：识别项目根 → 备份已有 skill → 从 GitHub 拉取 → 覆盖写入 → 输出"备份位置 + 升级摘要"并以退出码 0 退出

#### Scenario: 用户运行 list 子命令

- **WHEN** 用户执行 `npx xt-sdd-skills list`
- **THEN** CLI 必须输出当前可分发清单（6 个 xt-sdd-* skill 名 + 模板文件列表 + 命令文件列表）、源仓 owner/repo、默认 ref，并以退出码 0 退出

#### Scenario: 用户运行未知子命令

- **WHEN** 用户执行 `npx xt-sdd-skills foo`
- **THEN** CLI 必须以退出码 1 退出，stderr 输出 "Unknown command: foo. Available: install, update, list"，并打印 usage 摘要

#### Scenario: 用户未提供子命令

- **WHEN** 用户执行 `npx xt-sdd-skills`（无参数）
- **THEN** CLI 必须打印 usage 摘要到 stdout 并以退出码 0 退出（不报错）

### Requirement: CLI 必须支持 --tag/--source/--dry-run/--no-backup 全局参数

MUST CLI 必须解析以下全局参数，对适用的子命令生效。

#### Scenario: 用户用 --tag 指定版本

- **WHEN** 用户执行 `npx xt-sdd-skills update --tag v1.0.0`
- **THEN** CLI 必须从 GitHub 拉取 tag `v1.0.0` 对应的源文件，而非 main 分支

#### Scenario: 用户用 --source 指定 fork 源

- **WHEN** 用户执行 `npx xt-sdd-skills update --source myorg/my-fork`
- **THEN** CLI 必须从 `https://codeload.github.com/myorg/my-fork/tar.gz/<ref>` 下载，而非默认仓库

#### Scenario: 用户用 --dry-run 预览操作

- **WHEN** 用户执行 `npx xt-sdd-skills update --dry-run`
- **THEN** CLI 必须打印"将要执行的操作"清单（备份目录路径、覆盖的文件列表），但不实际写入任何文件，以退出码 0 退出

#### Scenario: 用户用 --no-backup 跳过备份

- **WHEN** 用户在 update 子命令上使用 `--no-backup`
- **THEN** CLI 必须跳过备份步骤直接覆盖，并在 stderr 输出黄色警告 "Backup skipped. Existing files will be overwritten irreversibly."

### Requirement: CLI 必须在 Node.js 版本不足时拒绝启动

MUST CLI 必须在启动时检查 Node.js 版本是否 >= 18。

#### Scenario: 用户在 Node 16 上运行 CLI

- **WHEN** 用户在 Node 16.x 环境执行 `npx xt-sdd-skills update`
- **THEN** CLI 必须立即以退出码 1 退出，stderr 输出 "xt-sdd-skills requires Node.js >= 18 (current: v16.x.x). Please upgrade Node."

### Requirement: CLI 必须提供 --help 和 --version 元命令

MUST CLI 必须支持通用 CLI 惯例：`--help`/`-h` 打印帮助，`--version`/`-v` 打印版本号。这两个 flag 优先级高于子命令。

#### Scenario: 用户用 --help 查看帮助

- **WHEN** 用户执行 `npx xt-sdd-skills --help` 或 `npx xt-sdd-skills -h`
- **THEN** CLI 必须打印 usage 到 stdout（含子命令列表、全局选项、示例、退出码表），以退出码 0 退出

#### Scenario: 用户用 --version 查看版本

- **WHEN** 用户执行 `npx xt-sdd-skills --version` 或 `npx xt-sdd-skills -v`
- **THEN** CLI 必须从 `package.json` 读取并打印 `<major>.<minor>.<patch>` 格式的版本号到 stdout，以退出码 0 退出

#### Scenario: --version 优先级高于其他参数

- **WHEN** 用户执行 `npx xt-sdd-skills install --version`
- **THEN** CLI 必须只打印版本号，不执行 install 命令
