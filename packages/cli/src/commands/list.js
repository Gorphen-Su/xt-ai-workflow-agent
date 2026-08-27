// list 子命令：纯本地、不联网
import { MANIFEST, DEFAULT_SOURCE, DEFAULT_REF } from '../manifest.js';
import * as logger from '../logger.js';

export async function list(options) {
  const source = options.source || DEFAULT_SOURCE;
  const tag = options.tag || DEFAULT_REF;

  // --json 双模分支（R-cli-installer-008）：机器可读契约
  // 必须旁路 kleur 着色层——裸写 stdout 保证无 ANSI、可被 jq/CI 直接消费
  if (options.json) {
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
