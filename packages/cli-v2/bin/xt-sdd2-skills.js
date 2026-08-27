#!/usr/bin/env node
// xt-sdd2-skills CLI 入口
//
// 流程：版本检查 → argv 解析 → 调度到子命令 → 统一错误处理 → 退出码

import { parseArgv } from '../src/argv.js';
import { printUsage } from '../src/help.js';
import { install } from '../src/commands/install.js';
import { update } from '../src/commands/update.js';
import { list } from '../src/commands/list.js';
import { CliError } from '../src/errors.js';
import * as logger from '../src/logger.js';

// Node.js 版本检查
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (Number.isNaN(nodeMajor) || nodeMajor < 18) {
  process.stderr.write(
    `xt-sdd2-skills requires Node.js >= 18 (current: v${process.versions.node}). Please upgrade Node.\n`
  );
  process.exit(1);
}

async function main() {
  const parsed = parseArgv(process.argv.slice(2));

  // --version（优先级高于 help/usage 判定）
  if (parsed.version) {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    process.stdout.write(`${pkg.version}\n`);
    return 0;
  }

  // --help / -h / 无参数
  if (parsed.help || (!parsed.command && !parsed.unknownCommand && !parsed.error)) {
    printUsage(process.stdout);
    return 0;
  }

  // 参数解析错误
  if (parsed.error) {
    logger.error(parsed.error);
    printUsage(process.stderr);
    return 1;
  }

  // 未知子命令
  if (parsed.unknownCommand) {
    logger.error(`Unknown command: ${parsed.unknownCommand}. Available: install, update, list`);
    printUsage(process.stderr);
    return 1;
  }

  // 调度
  switch (parsed.command) {
    case 'install':
      await install(parsed);
      return 0;
    case 'update':
      await update(parsed);
      return 0;
    case 'list':
      await list(parsed);
      return 0;
    default:
      // 不应发生
      logger.error(`Internal error: unhandled command '${parsed.command}'`);
      return 1;
  }
}

main()
  .then((code) => process.exit(code ?? 0))
  .catch((err) => {
    if (err instanceof CliError) {
      logger.error(err.message);
      if (err.code) logger.detail(`  Code: ${err.code}`);
      process.exit(err.exitCode || 1);
    }
    logger.error(`Unexpected error: ${err.message || String(err)}`);
    if (err.stack) logger.detail(err.stack);
    process.exit(1);
  });
