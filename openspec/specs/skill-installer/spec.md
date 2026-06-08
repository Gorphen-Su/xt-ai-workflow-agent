# skill-installer Specification

## Purpose
TBD - created by archiving change xt-sdd-skills-npx-installer. Update Purpose after archive.
## Requirements
### Requirement: installer 必须识别项目根目录

MUST installer 必须实现 `findProjectRoot(startDir)` 函数，从给定目录向上查找项目根标识。

#### Scenario: 当前目录是 git 仓库

- **WHEN** 在包含 `.git/` 的目录调用 `findProjectRoot(cwd)`
- **THEN** 函数必须返回该目录的绝对路径

#### Scenario: 父目录是 npm 项目

- **WHEN** cwd 为 `/foo/bar/src`，且 `/foo/bar/package.json` 存在
- **THEN** 函数必须返回 `/foo/bar`

#### Scenario: cwd 含 openspec 目录

- **WHEN** cwd 含 `openspec/` 目录但不含 `.git`/`package.json`
- **THEN** 函数必须返回 cwd 本身

#### Scenario: 找不到任何标识

- **WHEN** 从 cwd 一路向上到文件系统根都没找到 `.git`/`package.json`/`openspec/`/`.claude/`
- **THEN** 函数必须返回 `{ root: cwd, autoDetected: false }`，调用方负责让用户确认

### Requirement: installer 必须支持 install 和 update 两种模式

MUST installer 必须实现 `installFiles(extractedDir, projectRoot, manifest, mode)` 函数，根据 mode 选择行为。

#### Scenario: install 模式且项目无已有 skill

- **WHEN** 以 `mode='install'` 调用，且 `<projectRoot>/.claude/skills/xt-sdd-*` 全部不存在
- **THEN** 函数必须将 manifest 中所有 skill 复制到 `<projectRoot>/.claude/skills/`，模板按 skip-if-exists 处理，返回 `{ installed: [<文件清单>], skipped: [], backed_up: [] }`

#### Scenario: install 模式但项目已有 skill

- **WHEN** 以 `mode='install'` 调用，且 `<projectRoot>/.claude/skills/xt-sdd-propose/` 已存在
- **THEN** 函数必须抛出 `InstallerError`，code 为 `'ALREADY_INSTALLED'`，message 建议用户改用 `update`

#### Scenario: update 模式且项目已有 skill

- **WHEN** 以 `mode='update'` 调用，且项目已有至少一个 xt-sdd-* skill
- **THEN** 函数必须先调用 backup 模块备份已有 skill，然后覆盖写入 manifest 中所有 skill，模板按 skip-if-exists 处理，返回 `{ installed: [...], skipped: [...], backed_up: [...] }`

#### Scenario: update 模式但项目无任何 skill

- **WHEN** 以 `mode='update'` 调用，但项目没有任何 xt-sdd-* skill
- **THEN** 函数必须自动退化为 install 行为（不备份、不报错），并在返回值中标记 `degradedToInstall: true`

### Requirement: installer 必须按 manifest 中 mode 字段处理模板文件

MUST manifest 中的 templates 条目带 `mode: 'skip-if-exists'`，installer 必须正确处理。

#### Scenario: 模板文件目标不存在

- **WHEN** 目标项目无 `openspec/sdd-project-profile.yaml`，且 manifest 模板 mode 为 `skip-if-exists`
- **THEN** 函数必须复制该模板到目标位置

#### Scenario: 模板文件目标已存在

- **WHEN** 目标项目已有 `openspec/sdd-project-profile.yaml`，且 manifest 模板 mode 为 `skip-if-exists`
- **THEN** 函数必须跳过复制（不覆盖、不备份），在返回值的 skipped 中记录该文件

### Requirement: installer 必须支持 dry-run 模式

MUST installer 必须接受 `dryRun: true` 选项，仅打印操作而不修改文件系统。

#### Scenario: dry-run 模式下执行 update

- **WHEN** 以 `{ dryRun: true, mode: 'update' }` 调用 installFiles
- **THEN** 函数必须计算所有将要执行的操作（备份路径、覆盖文件列表、跳过文件列表）并返回，但 `fs.copyFile`/`fs.writeFile`/`fs.mkdir` 全程不调用

### Requirement: installer 必须支持跨平台路径处理

MUST installer 必须用 `path.join`/`path.sep` 等 Node API 处理路径，确保 Windows/macOS/Linux 行为一致。

#### Scenario: Windows 下复制 skill

- **WHEN** 在 Windows 上以 `projectRoot='D:\\projects\\my-app'` 调用 installFiles
- **THEN** 函数必须正确构造 `D:\\projects\\my-app\\.claude\\skills\\xt-sdd-propose\\SKILL.md` 等路径，文件复制成功

