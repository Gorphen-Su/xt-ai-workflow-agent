<!-- sdd change: xt-sdd-skills-npx-installer -->

# Plan: xt-sdd-skills-npx-installer

实现计划索引。按编号顺序执行每个分组，每完成一组确认编译/测试通过后再进入下一组。

## 执行顺序

```
1. 基础设施 → 2. Manifest 与工具函数 → 3. Fetcher → 4. Backup → 5. Installer → 6. CLI 入口 → 7. 端到端验证与发布准备
```

依赖关系：
- 1 是所有后续分组的前提（建立 packages/cli 目录和 npm 依赖）
- 2 是 3-5 的依赖（提供 errors/logger/manifest）
- 3、4、5 可以独立开发（仅都依赖 2）
- 6 依赖 3、4、5 全部完成（CLI 编排所有子模块）
- 7 是发布闸门，所有前置分组完成后才能跑

## 子计划列表

| 编号 | 名称 | 文件 | 简要描述 |
|------|------|------|----------|
| 1 | 基础设施 | [plans/01-infrastructure.md](plans/01-infrastructure.md) | 仓库根 package.json、packages/cli 目录结构、vitest 配置、客户端 README |
| 2 | Manifest 与工具函数 | [plans/02-manifest-and-utils.md](plans/02-manifest-and-utils.md) | manifest.js（分发清单）、errors.js（错误类）、logger.js（彩色输出） |
| 3 | Fetcher 模块 | [plans/03-fetcher.md](plans/03-fetcher.md) | GitHub tarball 拉取、解压、清单校验、临时文件清理 |
| 4 | Backup 模块 | [plans/04-backup.md](plans/04-backup.md) | 备份目录生成（带时间戳）、元数据写入、备份计数检测 |
| 5 | Installer 模块 | [plans/05-installer.md](plans/05-installer.md) | 项目根识别、install/update 双模式、模板 skip-if-exists、dryRun、Windows 路径 |
| 6 | CLI 入口与子命令 | [plans/06-cli-entry.md](plans/06-cli-entry.md) | bin 脚本、argv 解析、install/update/list 三个子命令、统一错误处理、help/usage |
| 7 | 端到端验证与发布准备 | [plans/07-e2e-and-release.md](plans/07-e2e-and-release.md) | e2e 测试、平台手工验证、npm pack 体积、README 更新、发布前核查 |

## 编译/测试节奏

| 分组 | 编译命令 | 测试命令 |
|------|---------|---------|
| 1 | `node -e "require('./packages/cli/package.json')"` | （无测试） |
| 2-6 | `cd packages/cli && npm install` | `cd packages/cli && npx vitest run <module>` |
| 7 | 同上 | `cd packages/cli && npx vitest run` + 手工验证 |

## 注意事项

- 本项目 `compile_constraints: []`，markdown/yaml 项目无传统编译约束
- 但 JavaScript ESM 项目仍需保证 import 路径正确，分组 1 必须先建立 `package.json` 含 `"type": "module"`，否则后续 `.js` 文件 import/export 语法会报错
- 所有模块使用 ES Modules（`import`/`export`），与 `package.json` 的 `"type": "module"` 一致
- 测试隔离：每个模块测试使用 `beforeEach`/`afterEach` 清理临时目录，确保不互相污染
