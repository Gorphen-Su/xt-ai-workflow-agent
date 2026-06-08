// 参数解析（手写，不依赖 commander/yargs）
//
// 支持：
//   xt-sdd-skills <command> [--tag <v>] [--source <o/r>] [--dry-run] [--no-backup]
//   --tag <v>      / -t <v>
//   --source <o/r> / -s <o/r>
//   --dry-run
//   --no-backup
//   --help / -h
//   --version / -v

import { DEFAULT_SOURCE, DEFAULT_REF } from './manifest.js';

const KNOWN_COMMANDS = new Set(['install', 'update', 'list']);

export function parseArgv(argv) {
  // argv: process.argv.slice(2)
  const result = {
    command: null,
    tag: DEFAULT_REF,
    source: DEFAULT_SOURCE,
    dryRun: false,
    noBackup: false,
    help: false,
    version: false,
    unknownCommand: null,
    error: null,
  };

  if (!argv || argv.length === 0) {
    return result; // 没有子命令 → 打印 usage
  }

  // 先识别第一个非 flag 作为子命令
  let i = 0;
  if (!argv[0].startsWith('-')) {
    if (KNOWN_COMMANDS.has(argv[0])) {
      result.command = argv[0];
    } else {
      result.unknownCommand = argv[0];
    }
    i = 1;
  }

  // 然后解析 flags
  for (; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--tag':
      case '-t': {
        const v = argv[++i];
        if (!v || v.startsWith('-')) {
          result.error = `flag '${arg}' requires a value`;
          return result;
        }
        result.tag = v;
        break;
      }
      case '--source':
      case '-s': {
        const v = argv[++i];
        if (!v || v.startsWith('-')) {
          result.error = `flag '${arg}' requires a value`;
          return result;
        }
        if (!/^[^/]+\/[^/]+$/.test(v)) {
          result.error = `--source must be in the form 'owner/repo' (got: '${v}')`;
          return result;
        }
        result.source = v;
        break;
      }
      case '--dry-run':
        result.dryRun = true;
        break;
      case '--no-backup':
        result.noBackup = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
      case '--version':
      case '-v':
        result.version = true;
        break;
      default:
        result.error = `unknown flag: ${arg}`;
        return result;
    }
  }

  return result;
}
