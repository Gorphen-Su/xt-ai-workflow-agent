<!-- sdd change: xt-sdd-skills-npx-installer -->

# 1. 基础设施

项目当前是 markdown/yaml 纯仓库，首次引入 Node.js 工程。本分组搭建本地开发环境骨架。

## Steps

### Step 1.1: 在仓库根目录新增 package.json

<!-- TODO: 验证当前无 package.json -->
<!-- TODO: 该 package.json 仅作为根包 private: true，管理 cli 相关 npm scripts -->
- [x] 创建 `package.json`，设置 `{ "name": "xt-ai-workflow-agent", "private": true, "scripts": { "test:cli": "cd packages/cli && npm test", "build:cli": "cd packages/cli && npm run build" } }`
- [x] 验证 package.json 合法（jsonlint / JSON.parse）
- [x] 验证根目录 `npm install` 不安装任何依赖（无 dependencies 字段）

### Step 1.2: 创建 packages/cli/ 目录结构并初始化 package.json

<!-- TODO: cli 包是实际发布的 npm 包，通过 bin 字段暴露 xt-sdd-skills 命令 -->
- [x] 创建目录：`packages/cli/bin/`、`packages/cli/src/`、`packages/cli/src/commands/`
- [x] 创建 `packages/cli/package.json`，关键字段：
  ```json
  {
    "name": "xt-sdd-skills",
    "version": "0.1.0",
    "private": true,
    "description": "Install and update xt-sdd workflow skills from xt-ai-workflow-agent repo",
    "type": "module",
    "bin": { "xt-sdd-skills": "./bin/xt-sdd-skills.js" },
    "files": ["bin", "src", "README.md"],
    "engines": { "node": ">=18" },
    "scripts": { "test": "vitest run" },
    "dependencies": {
      "tar": "^7.0.0",
      "kleur": "^4.1.5"
    },
    "devDependencies": {
      "vitest": "^3.0.0"
    }
  }
  ```
- [x] 在 `packages/cli/` 下执行 `npm install` 并确认 node_modules 创建成功
- [x] 执行 `npm test` 触发 vitest（应输出 "No test files found" 或配置后为空运行）

### Step 1.3: 配置 .gitignore 和 .npmignore

<!-- TODO: CLI 包发布时需要排除测试文件和开发依赖 -->
- [x] 创建 `packages/cli/.gitignore`：覆盖 `node_modules/` 和测试缓存
  ```
  node_modules/
  coverage/
  .vitest/
  *.tsbuildinfo
  ```
- [x] 创建 `packages/cli/.npmignore`：发布时排除测试文件
  ```
  test/
  tests/
  __tests__/
  coverage/
  .vitest/
  vitest.config.*
  ```
- [x] 创建 `packages/cli/vitest.config.js`：
  ```js
  import { defineConfig } from 'vitest/config';
  export default defineConfig({ test: { globals: true, restoreMocks: true } });
  ```

### Step 1.4: 编写客户端 README

<!-- TODO: 面向用户的文档，非开发说明 -->
- [x] 创建 `packages/cli/README.md`，内容包含：
  - 工具简介
  - 系统要求（Node >= 18）
  - `install` 用法和参数
  - `update` 用法和参数（含备份说明）
  - `list` 用法
  - 退出码说明表
  - `--tag` / `--source` / `--dry-run` / `--no-backup` 参数说明
  - 常见问题（FAQ）
  - 本仓路径：cli 源 + skill 源
- [x] README 中敏感字段（owner/repo）使用占位符 `:owner/:repo`