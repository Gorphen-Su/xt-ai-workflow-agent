<!-- sdd change: xt-sdd-skills-npx-installer -->

# 6. CLI 入口与子命令

CLI 入口 `bin/xt-sdd-skills.js` 和三个子命令文件。本组依赖所有底层模块就绪。

## Steps

### Step 6.1: CLI 入口与参数解析

<!-- TODO: 入口文件，Node 版本检查 + argv 解析 -->
- [x] 创建可执行脚本 `packages/cli/bin/xt-sdd-skills.js`，第一行 `#!/usr/bin/env node`
- [x] 在入口立即执行 Node.js 版本检查：
  ```js
  if (process.versions.node && parseFloat(process.versions.node) < 18) {
    process.stderr.write(`xt-sdd-skills requires Node.js >= 18 (current: ${process.versions.node}). Please upgrade Node.\n`);
    process.exit(1);
  }
  ```
- [x] 参数解析（手写，不使用 commander/yargs）：
  1. `process.argv.slice(2)` 取子命令
  2. 如果第一个参数以 `-` 开头或为空 → 无子命令，打印 usage
  3. 识别子命令：`install`、`update`、`list`
  4. 未知子命令 → 输出错误 + usage，exit(1)
  5. 全局参数解析（适用于所有子命令）：
     - `--tag <ref>` / `-t <ref>` → 设置 ref
     - `--source <owner/repo>` / `-s <owner/repo>` → 设置 source
     - `--dry-run` → 设置 dryRun = true
     - `--no-backup` → 设置 noBackup = true（仅 update 生效，其他子命令忽略）
- [x] 传递给子命令 handler：`{ command, tag, source, dryRun, noBackup }`
- [x] 编写测试：
  - argv = `['update']` → 验证 command = 'update'
  - argv = `['install', '--tag', 'v1.0.0']` → 验证 command = 'install', tag = 'v1.0.0'
  - argv = `['foo']` → 验证退出码 1、stderr 含 "Unknown command"
  - argv = `[]` → 验证 stdout 含 usage、退出码 0

### Step 6.2: 实现 install 命令

<!-- TODO: install 子命令的完整流程编排 -->
- [x] 创建 `packages/cli/src/commands/install.js`，导出 `async function installCLI(options)`：
  1. `logger.section('Installing xt-sdd skills...')`
  2. `findProjectRoot(cwd)` → 如果 autoDetected=false，logger.warn 并询问用户（或要求 --yes）
  3. logger.info 开始下载
  4. `fetchTarball(options.source || DEFAULT_SOURCE, options.tag || DEFAULT_REF)` 
  5. `extractTarball(tarballPath, MANIFEST)`
  6. `installFiles(extractedDir, projectRoot, MANIFEST, { mode: 'install', dryRun: options.dryRun })`
  7. 输出成功摘要（installed 文件数、skipped 文件数）
  8. `cleanup({ tarballPath, extractedDir })`
  9. process.exit(0)
- [x] 所有步骤用 try/catch 包裹，catch 中统一错误处理

### Step 6.3: 实现 update 命令

<!-- TODO: update 子命令的完整流程编排，含备份 -->
- [x] 创建 `packages/cli/src/commands/update.js`，导出 `async function updateCLI(options)`：
  1. `logger.section('Updating xt-sdd skills...')`
  2. `findProjectRoot(cwd)` → 同 install
  3. logger.info 开始下载
  4. `fetchTarball(...)` + `extractTarball(...)`
  5. 构造 meta 对象：`{ fromVersion: null（暂不实现版本读取）, toVersion: options.ref || DEFAULT_REF }`
  6. `installFiles(extractedDir, projectRoot, MANIFEST, { mode: 'update', dryRun, noBackup, meta })`
  7. 输出摘要：backup 位置（如有）、installed 文件数、skipped 文件数
  8. 调用 `checkBackupCount(projectRoot)` → 如果 shouldWarn，输出黄色提示"已有 N 个备份..."
  9. `cleanup({ tarballPath, extractedDir })`
  10. process.exit(0)
- [x] 所有步骤 try/catch 包裹

### Step 6.4: 实现 list 命令

<!-- TODO: list 子命令是纯本地操作，不联网 -->
- [x] 创建 `packages/cli/src/commands/list.js`，导出 `async function listCLI(options)`：
  1. logger.section('Available xt-sdd skills')
  2. 输出每个 skill 名称（列表）
  3. 输出模板文件列表
  4. 输出命令文件列表
  5. 输出默认 source 和 ref
  6. 输出"Use '--tag <tag>' to pin a version"提示
  7. process.exit(0)

### Step 6.5: 统一错误处理

<!-- TODO: 避免每个 command 重复写 catch 逻辑 -->
- [x] 在 `bin/xt-sdd-skills.js` 层面实现 `async function main()` 并用 `.catch(handleError)` 兜底
- [x] `handleError(err)`：
  1. 如果 err 是 `CliError` 的子类 → `logger.error(err.message)`
  2. 如果 err 是普通 Error → `logger.error('Unexpected error: ' + err.message)`
  3. `process.exit(err.exitCode || 1)`
- [x] 确保 `process.exit(0)` 只在正常路径被调用（不走 catch）

### Step 6.6: help/usage 输出

<!-- TODO: 用户友好帮助信息 -->
- [x] 创建 `packages/cli/src/help.js`，导出 `printUsage()` 和 `printDetailedHelp(command)`：
  - `printUsage()`：输出 "Usage: npx xt-sdd-skills <command> [options]" + 命令列表
  - `printDetailedHelp('install')`：install 的子参数和示例
  - `printDetailedHelp('update')`：update 的参数和备份说明
  - `printDetailedHelp('list')`：list 的简单说明
- [x] 无参数时调 `printUsage()`，未知子命令时 `printUsage()` + 错误

### Step 6.7: CLI 入口集成测试

<!-- TODO: 用 child_process 测试完整 CLI 入口 -->
- [x] 创建 `packages/cli/src/__tests__/cli.test.js`
- [x] 用 `execFile('node', [binPath, ...args])` 测试：
  - `xt-sdd-skills list` → 验证 stdout 含 "Available"、"xt-sdd-propose" 等，退出码 0
  - `xt-sdd-skills unknown` → 验证 stderr 含 "Unknown command"，退出码 1
  - `xt-sdd-skills`（无参数）→ 验证 stdout 含 "Usage"，退出码 0
- [x] install/update 集成测试留到步骤 7（端到端），这里只测 CLI 框架逻辑
- [x] 验证 `npx vitest run cli` 全绿