# Spec: skill-backup

升级前备份管理。

## ADDED Requirements

### Requirement: backup 必须在 update 前完整复制已有 skill

MUST backup 必须实现 `createBackup(projectRoot, manifest, meta)` 函数，把 manifest 中声明且目标项目已存在的 skill 完整复制到 `.claude/skills/.backup/<timestamp>/`。

#### Scenario: 备份单个已存在的 skill

- **WHEN** 项目根有 `.claude/skills/xt-sdd-propose/SKILL.md` 和 `.claude/skills/xt-sdd-propose/scripts/foo.sh`，调用 `createBackup(projectRoot, MANIFEST, { fromVersion: 'abc123', toVersion: 'def456' })`
- **THEN** 必须创建 `.claude/skills/.backup/<YYYY-MM-DD-HHmmss>/xt-sdd-propose/` 目录，其中包含完整复制的 SKILL.md 和 scripts/foo.sh，文件内容与原文件 byte-for-byte 一致

#### Scenario: 备份目录命名带时间戳

- **WHEN** 在 2026-06-08 15:23:30 调用 `createBackup()`
- **THEN** 创建的备份目录名必须为 `2026-06-08-152330`（本地时间，格式 `YYYY-MM-DD-HHmmss`）

#### Scenario: 同一秒内多次备份

- **WHEN** 同一秒内两次调用 `createBackup()`
- **THEN** 第二次必须使用 `<timestamp>-2` 形式的后缀，避免目录冲突

#### Scenario: 项目无任何已有 skill

- **WHEN** 项目根没有任何 xt-sdd-* skill 目录，调用 `createBackup()`
- **THEN** 函数必须返回 `{ backupDir: null, items: [] }`，不创建任何目录

#### Scenario: 写入备份目录失败

- **WHEN** `.claude/skills/.backup/` 不可写（权限不足）
- **THEN** 函数必须抛出 `BackupError`，code 为 `'BACKUP_WRITE_FAILED'`，message 包含原因和目标路径

### Requirement: backup 必须写入元数据文件

MUST backup 必须在备份目录中写入 `_backup-meta.json`，记录备份时间、源版本、目标版本、备份的清单。

#### Scenario: 元数据格式

- **WHEN** 备份完成后查看 `.claude/skills/.backup/<timestamp>/_backup-meta.json`
- **THEN** 文件必须是合法 JSON，包含字段 `backedUpAt`（ISO 8601）、`fromVersion`（字符串或 null）、`toVersion`（字符串）、`items`（备份的 skill 名数组）

#### Scenario: fromVersion 未知时

- **WHEN** 升级前项目里没有版本记录文件，无法确定 fromVersion
- **THEN** meta 文件中 `fromVersion` 必须为 `null`，不能省略该字段

### Requirement: backup 必须在备份目录数过多时提示用户清理

MUST backup 必须实现 `checkBackupCount(projectRoot)` 函数，扫描 `.claude/skills/.backup/` 子目录数。

#### Scenario: 备份数量正常

- **WHEN** `.claude/skills/.backup/` 下有 ≤ 5 个子目录
- **THEN** 函数必须返回 `{ count: <N>, shouldWarn: false }`

#### Scenario: 备份数量超过阈值

- **WHEN** `.claude/skills/.backup/` 下有 > 5 个子目录
- **THEN** 函数必须返回 `{ count: <N>, shouldWarn: true, oldestDirs: [<最早的 3 个目录名>] }`，调用方据此向用户输出黄色提示
