<!-- sdd change: xt-sdd-skills-npx-installer -->

# 2. Manifest 与工具函数

核心数据结构和可复用工具函数。所有模块位于 `packages/cli/src/`。

## Steps

### Step 2.1: 实现 manifest.js

<!-- TODO: 分发清单是本 CLI 的数据核心，硬编码确保可控 -->
- [ ] 创建 `packages/cli/src/manifest.js`（ESM），导出以下内容：
  ```js
  export const DEFAULT_SOURCE = ':owner/:repo';  // 发布时替换为实际
  export const DEFAULT_REF = 'main';

  export const MANIFEST = {
    skills: [
      'xt-sdd-propose', 'xt-sdd-plan', 'xt-sdd-apply',
      'xt-sdd-verify', 'xt-sdd-archive', 'xt-sdd-fix',
    ],
    templates: [
      { src: 'openspec/sdd-project-profile.yaml', dst: 'openspec/sdd-project-profile.yaml', mode: 'skip-if-exists' },
      { src: 'openspec/openspec.yaml',            dst: 'openspec/openspec.yaml',           mode: 'skip-if-exists' },
    ],
    commands: [
      'xt-sdd-propose', 'xt-sdd-plan', 'xt-sdd-apply',
      'xt-sdd-verify', 'xt-sdd-archive', 'xt-sdd-fix',
    ],
  };
  ```
- [ ] 导出一个 `getManifestItems(manifest)` 辅助函数，展开所有清单路径为扁平文件列表（含 skills 内 SKILL.md 和 scripts/* 等所有文件）
- [ ] 编写测试：验证 MANIFEST.skills 长度 = 6、每个 skill 名格式为 `xt-sdd-*`、MANIFEST 结构冻结（Object.freeze 或在测试中断言不应被修改）

### Step 2.2: 实现 errors.js

<!-- TODO: 统一错误类，便于调用方按 code 判断退出码 -->
- [ ] 创建 `packages/cli/src/errors.js`，定义以下错误类：
  - `CliError` — 基类，继承 Error，附加 `code` 属性和 `exitCode`
  - `FetcherError` — `CliError` 子类，默认 `exitCode: 2`
  - `InstallerError` — `CliError` 子类，默认 `exitCode: 1`
  - `BackupError` — `CliError` 子类，默认 `exitCode: 4`
- [ ] 每个构造函数接受 `(code, message, options)`，`code` 为字符串（如 `'REF_NOT_FOUND'`）
- [ ] 编写测试：验证 new FetcherError('NETWORK_ERROR', 'msg') 的 .code = 'NETWORK_ERROR'、.exitCode = 2、.message = 'msg'、instanceof Error 和 instanceof CliError

### Step 2.3: 实现 logger.js

<!-- TODO: 基于 kleur 的终端输出封装，保证一致的颜色语义 -->
- [ ] 创建 `packages/cli/src/logger.js`，导出：
  - `info(msg)` — 白色（默认）
  - `success(msg)` — `kleur.green`
  - `warn(msg)` — `kleur.yellow`
  - `error(msg)` — `kleur.red`
  - `section(title)` — 用 `kleur.bold().cyan()` 打印分段标题
  - `detail(msg)` — `kleur.dim()` 灰色细节
- [ ] 所有函数写入 `process.stdout`（info/success/section/detail）或 `process.stderr`（warn/error）
- [ ] 所有函数后面自动追加 `\n`
- [ ] 编写测试：mock `process.stdout.write` 和 `process.stderr.write`，验证每种输出颜色前缀和流目标

### Step 2.4: 编写组合测试

- [ ] 验证 manifest.js + errors.js + logger.js 可同时 import 无冲突
- [ ] 验证 `npx vitest run` 通过 manifest/errors/logger 全部测试