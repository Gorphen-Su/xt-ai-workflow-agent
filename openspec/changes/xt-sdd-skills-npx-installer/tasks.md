# Tasks: xt-sdd-skills-npx-installer

实现任务清单。按分组顺序执行，每个分组完成后必须能编译通过且测试全绿。

## 1. 基础设施

- [x] 1.1 在仓库根目录新增 `package.json`（开发态根包，private: true，仅放 cli 相关 npm scripts）
- [x] 1.2 创建 `packages/cli/` 目录结构，初始化 `packages/cli/package.json`（包名 `xt-sdd-skills`、bin、files、engines、dependencies）
- [x] 1.3 配置 `packages/cli/` 的测试框架（vitest）和 `.gitignore`、`.npmignore`
- [x] 1.4 编写 `packages/cli/README.md`，面向最终用户，覆盖三种子命令的用法和参数

## 2. Manifest 与工具函数

- [x] 2.1 实现 `packages/cli/src/manifest.js`，硬编码分发清单（6 个 skill、模板、命令文件、默认 source/ref）
- [x] 2.2 实现 `packages/cli/src/errors.js`，定义 `FetcherError`、`InstallerError`、`BackupError` 等错误类（带 code 字段）
- [x] 2.3 实现 `packages/cli/src/logger.js`，封装彩色输出（基于 kleur），提供 info/warn/error/success 方法
- [x] 2.4 编写 manifest/errors/logger 的单元测试

## 3. Fetcher 模块

- [x] 3.1 实现 `packages/cli/src/fetcher.js` 的 `fetchTarball(source, ref)` 函数：构造 codeload URL、用 fetch 下载到 OS 临时目录、超时 30 秒、失败自动重试一次
- [x] 3.2 实现 `extractTarball(tarballPath, manifest)` 函数：用 tar 包解压、校验 manifest 中必需文件均存在、返回解压根目录
- [x] 3.3 实现 `cleanup({ tarballPath, extractedDir })` 函数：删除临时文件，静默忽略 ENOENT
- [x] 3.4 编写 fetcher 模块测试：mock fetch 验证成功路径、404、超时、网络错误、tarball 校验失败

## 4. Backup 模块

- [x] 4.1 实现 `packages/cli/src/backup.js` 的 `createBackup(projectRoot, manifest, meta)` 函数：扫描已存在的 skill、生成时间戳目录名、完整复制、写入 `_backup-meta.json`
- [x] 4.2 实现时间戳冲突处理：同一秒内多次调用时自动加 `-2`/`-3` 后缀
- [x] 4.3 实现 `checkBackupCount(projectRoot)` 函数：扫描 `.backup/` 子目录数，返回是否需要提示
- [x] 4.4 编写 backup 模块测试：用临时目录验证完整复制、meta 文件格式、时间戳冲突、空备份情况、备份计数提示

## 5. Installer 模块

- [x] 5.1 实现 `packages/cli/src/installer.js` 的 `findProjectRoot(startDir)` 函数：向上查找 `.git`/`package.json`/`openspec/`/`.claude/`，返回根路径或 autoDetected=false
- [x] 5.2 实现 `installFiles(extractedDir, projectRoot, manifest, options)` 函数主体：支持 `mode: 'install'|'update'`、调用 backup、按 manifest 复制 skill 和 commands
- [x] 5.3 实现模板的 `skip-if-exists` 处理逻辑
- [x] 5.4 实现 install 模式的 `ALREADY_INSTALLED` 校验和 update 模式的 `degradedToInstall` 退化
- [x] 5.5 实现 `dryRun` 模式：计算所有操作并返回，但不调用任何写入 API
- [x] 5.6 编写 installer 模块测试：覆盖 install/update 两种模式、ALREADY_INSTALLED、退化、skip-if-exists、dryRun、Windows 路径

## 6. CLI 入口与子命令

- [x] 6.1 实现 `packages/cli/bin/xt-sdd-skills.js`：Node.js 版本检查（< 18 退出 1）、argv 解析（识别子命令和全局参数）、调度到对应子命令
- [x] 6.2 实现 `packages/cli/src/commands/install.js`：findProjectRoot → fetchTarball → extractTarball → installFiles(install) → cleanup → 输出摘要
- [x] 6.3 实现 `packages/cli/src/commands/update.js`：findProjectRoot → fetchTarball → extractTarball → installFiles(update，内部调 backup) → checkBackupCount 提示 → cleanup → 输出摘要
- [x] 6.4 实现 `packages/cli/src/commands/list.js`：直接读取 manifest 输出清单和默认 source/ref，不联网
- [x] 6.5 实现统一错误处理：所有 *Error 转化为对应退出码（1/2/3/4）和彩色 stderr 输出
- [x] 6.6 实现 usage / help 输出（无参数时 stdout 输出，未知子命令时 stderr 输出）
- [x] 6.7 编写 CLI 入口集成测试：用 child_process 执行各子命令，验证退出码、stdout、stderr

## 7. 端到端验证与发布准备

- [ ] 7.1 编写端到端测试：在一个临时空目录跑 install → update → list 全流程，验证文件正确写入和备份生成
- [ ] 7.2 在 Windows、macOS、Linux 至少 1 个平台上手工验证 `npx xt-sdd-skills update` 真实流程（拉本仓 main 分支）
- [ ] 7.3 `npm pack` 检查产物体积 < 200KB、文件清单合理（无测试文件、无 node_modules）
- [ ] 7.4 在本仓 README 顶部新增"用户安装方式"章节，链接到 `packages/cli/README.md`
- [ ] 7.5 准备 `npm publish` 前的清单：检查 `xt-sdd-skills` 包名占用、确认 `.npmignore` 正确、版本号 `0.1.0`
