<!-- sdd change: xt-sdd-skills-npx-installer -->

# 5. Installer 模块

本地文件写入器，处理 install/update 双模式。位于 `packages/cli/src/installer.js`。

## Steps

### Step 5.1: 实现 findProjectRoot(startDir)

<!-- TODO: 智能识别项目根目录 -->
- [ ] 创建 `packages/cli/src/installer.js`
- [ ] 实现 `findProjectRoot(startDir)`：
  1. 从 `startDir`（默认 `process.cwd()`）开始，向上遍历目录
  2. 在每层检查是否存在 `.git/`（`fs.statSync`）、`package.json`、`openspec/`、`.claude/`
  3. 如果任一存在 → 返回该目录绝对路径（字符串）
  4. 如果到文件系统根都没找到 → 返回 `{ root: startDir, autoDetected: false }`
- [ ] 非 `autoDetected` 时，打印黄色警告并要求用户确认（调用前由 CLI 层用 Ak用户确认，installer 仅返回信号）
- [ ] 编写测试：
  - 创建临时项目结构含 `.git/` → 验证 findBy `cwd` 找到
  - 创建临时项目结构含 `package.json`（无 .git）→ 验证找到
  - 创建临时项目结构含 `.claude/skills/` → 验证找到
  - 在空目录中调用 → 验证 `autoDetected: false`

### Step 5.2: 实现 installFiles 主函数

<!-- TODO: install/update 双模式核心逻辑 -->
- [ ] 实现 `installFiles(extractedDir, projectRoot, manifest, options)`，options 包含 `{ mode: 'install'|'update', dryRun, noBackup, meta }`
- [ ] **install 模式**：
  1. 检查 `<projectRoot>/.claude/skills/` 下是否有 manifest.skills 中的任一目录存在
  2. 如果有 → throw InstallerError('ALREADY_INSTALLED', '...try update')
  3. 否则 → 遍历所有 skill 复制，模板按 skip-if-exists 处理
- [ ] **update 模式**：
  1. 扫描 `<projectRoot>/.claude/skills/` 下是否有 xt-sdd-* skill 存在
  2. 如果全不存在 → 退化为 install（不报错、不备份、标记 `degradedToInstall: true`）
  3. 如果存在 → 
     - 若 `!dryRun && !noBackup`，调 `createBackup(projectRoot, manifest, meta)`
     - 若 `!dryRun && noBackup`，调 `warn('Backup skipped...')`（用 logger）
     - 覆盖所有 skill、命令文件
     - 模板按 skip-if-exists 处理
- [ ] 所有文件复制用 `fs.cp(src, dst, { recursive: true })`（Node 16+ 原生）
- [ ] 返回值：`{ installed: [路径], skipped: [路径], backed_up: [路径], degradedToInstall: true|false }`
- [ ] 编写测试：
  - install 模式：目标无 skill → 验证 skill 被复制到目标
  - install 模式：目标已有 skill → 验证抛出 ALREADY_INSTALLED
  - update 模式：目标已有 skill → 验证备份被调用（mock backup 模块）、skill 被覆盖
  - update 模式：目标无 skill → 验证退化为 install（degradedToInstall: true）

### Step 5.3: 模板 skip-if-exists 处理

<!-- TODO: 不覆盖用户已有的 profile 等自定义模板 -->
- [ ] 实现模板处理逻辑：对 manifest.templates 中的每一项，如果目标文件已存在 → 加入 skipped 返回值，不复制；如果不存在 → 复制
- [ ] 实现时注意 `${sourceDirName}/${template.src}` 解压目录内的路径
- [ ] 编写测试：
  - 目标已存在 openspec/sdd-project-profile.yaml → 验证 skipped 数组包含该文件
  - 目标不存在 → 验证 installed 数组包含该文件

### Step 5.4: dryRun 模式

<!-- TODO: 预览所有操作但不实际写入 -->
- [ ] 实现 dryRun 逻辑：在 installFiles 中，如果 `options.dryRun === true`
  1. 计算所有操作（哪些文件要创建/覆盖/跳过、备份目录在哪里）
  2. 返回 `{ ...ops, dryRun: true }`
  3. 实际文件操作全部跳过（不调 fs.cp、fs.mkdir、createBackup 等）
- [ ] 返回值中 `installOps` 包含 `[{ action: 'copy'|'skip'|'backup', src, dst }]` 数组
- [ ] 编写测试：验证 dryRun 执行后文件系统无变化、返回值含 installOps

### Step 5.5: Windows 路径兼容

<!-- TODO: 确保 path.join 处理的路径在 Windows 上正确 -->
- [ ] 所有文件路径用 `path.join()` 构造而非字符串拼接
- [ ] 测试中验证：传入 `projectRoot: 'D:\\my-project'` → 生成的 `.claude` 路径为 `D:\\my-project\\.claude`
- [ ] 测试中验证：`findProjectRoot('D:\\my-project\\src')` 在 `D:\\my-project` 有 `.git/` 时返回 `D:\\my-project`

### Step 5.6: installer 模块集成测试

- [ ] 在 `packages/cli/src/__tests__/installer.test.js` 中组织所有测试
- [ ] mock backup 模块避免 cross-module 副作用
- [ ] 测试 install、update、degradedToInstall、skip-if-exists、dryRun、Windows 路径 6 个场景
- [ ] 验证 `npx vitest run installer` 全绿