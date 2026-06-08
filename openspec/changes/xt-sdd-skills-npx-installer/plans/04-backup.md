<!-- sdd change: xt-sdd-skills-npx-installer -->

# 4. Backup 模块

升级前备份管理，位于 `packages/cli/src/backup.js`。

## Steps

### Step 4.1: 实现 createBackup(projectRoot, manifest, meta)

<!-- TODO: 完整目录复制，保证回滚能力 -->
- [ ] 创建 `packages/cli/src/backup.js`
- [ ] 实现 `createBackup(projectRoot, manifest, meta)`：
  1. 扫描 `manifest.skills` 中哪些 skill 在 `<projectRoot>/.claude/skills/<name>/` 存在
  2. 如果无任何 skill 存在 → 返回 `{ backupDir: null, items: [] }`
  3. 生成时间戳目录名：`YYYY-MM-DD-HHmmss`（本地时间），备份到 `<projectRoot>/.claude/skills/.backup/<timestamp>/`
  4. 对每个存在的 skill：递归复制 `<projectRoot>/.claude/skills/<name>/` → `<backupDir>/<name>/`
  5. 写入 `_backup-meta.json`：
     ```json
     { "backedUpAt": "<ISO 8601>", "fromVersion": meta.fromVersion, "toVersion": meta.toVersion, "items": [<skill 名数组>] }
     ```
  6. 返回 `{ backupDir: <绝对路径>, items: [<skill 名数组>] }`
- [ ] 编写测试（在临时目录 mock 项目结构）：
  - 创建假 `<projectRoot>/.claude/skills/xt-sdd-propose/SKILL.md` + xt-sdd-plan/SKILL.md → 调用 createBackup → 验证备份目录有 xt-sdd-propose/ 和 xt-sdd-plan/，内容与原文件一致
  - 验证 _backup-meta.json 存在、合法 JSON、含 backedUpAt/fromVersion/toVersion/items
  - 项目无 skill → 返回 `{ backupDir: null, items: [] }`

### Step 4.2: 时间戳冲突处理

<!-- TODO: 防止同一秒内多次备份目录碰撞 -->
- [ ] 实现冲突处理逻辑（在 createBackup 内部）：
  1. 构造 `<timestamp>` 目录路径
  2. 如果路径已存在，尝试 `<timestamp>-2`、`<timestamp>-3` 直到不冲突
  3. 最多尝试到 `-99`，如果仍冲突则抛出 BackupError('BACKUP_DIR_EXISTS', ...)
- [ ] 编写测试：
  - 创建一个 `<timestamp>` 目录 → 调用 createBackup → 验证创建的目录名为 `<timestamp>-2`
  - 创建 `<timestamp>` 和 `<timestamp>-2` → 验证创建 `<timestamp>-3`

### Step 4.3: 实现 checkBackupCount(projectRoot)

<!-- TODO: 提示用户清理过多备份 -->
- [ ] 实现 `checkBackupCount(projectRoot)`：
  1. 扫描 `<projectRoot>/.claude/skills/.backup/` 子目录
  2. 如果 count > 5，返回 `{ count, shouldWarn: true, oldestDirs: [前 3 个最旧目录名] }`（按目录名排序取前 3）
  3. 否则返回 `{ count, shouldWarn: false }`
  4. `.backup/` 目录不存在时 count = 0，shouldWarn = false
- [ ] 编写测试：
  - 创建 6 个假备份目录 → 验证 shouldWarn = true
  - 创建 3 个假备份目录 → 验证 shouldWarn = false
  - 无备份目录 → 验证 shouldWarn = false, count = 0

### Step 4.4: backup 模块集成测试

- [ ] 在 `packages/cli/src/__tests__/backup.test.js` 中组织所有测试
- [ ] 每个测试需创建假的 `.claude/skills/` 目录结构（用 `fs.mkdtempSync` 或 `vitest` 的 `beforeEach`/`afterEach` 清理）
- [ ] 验证 `npx vitest run backup` 全绿