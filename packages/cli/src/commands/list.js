// list 子命令：纯本地、不联网
import { MANIFEST, DEFAULT_SOURCE, DEFAULT_REF } from '../manifest.js';
import * as logger from '../logger.js';

export async function list(options) {
  const source = options.source || DEFAULT_SOURCE;
  const tag = options.tag || DEFAULT_REF;

  // --json 双模分支（R-cli-installer-008）：机器可读契约
  // 必须旁路 kleur 着色层——裸写 stdout 保证无 ANSI、可被 jq/CI 直接消费。
  // 判定与 dryRun/noBackup 保持同款真值风格：CLI 路径经 parseArgv 恒为布尔
  if (options.json) {
    // 浅拷贝而非直引 MANIFEST：防调用方改写 payload 内字段污染冻结清单；
    // 当前条目为单层对象故浅拷贝已足，若未来引入嵌套字段需一并深化
    const payload = {
      source,
      ref: tag,
      skills: [...MANIFEST.skills],
      templates: MANIFEST.templates.map((t) => ({ ...t })),
      commands: [...MANIFEST.commands],
    };
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    return;
  }

  logger.section('Available xt-sdd-skills manifest');
  logger.detail(`Source: ${source}`);
  logger.detail(`Default ref: ${tag}`);

  logger.info('');
  logger.info('Skills:');
  for (const name of MANIFEST.skills) {
    logger.detail(`  - ${name}`);
  }

  logger.info('');
  logger.info('Commands:');
  for (const name of MANIFEST.commands) {
    logger.detail(`  - .claude/commands/${name}.md`);
  }

  logger.info('');
  logger.info('Templates (skip-if-exists):');
  for (const t of MANIFEST.templates) {
    logger.detail(`  - ${t.dst}`);
  }

  logger.info('');
  logger.detail("Use '--tag <ref>' to pin a specific version.");
  logger.detail("Use '--source <owner/repo>' to install from a fork.");
}
