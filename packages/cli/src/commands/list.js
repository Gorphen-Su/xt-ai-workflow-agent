// list 子命令：纯本地、不联网
import { MANIFEST, DEFAULT_SOURCE, DEFAULT_REF } from '../manifest.js';
import * as logger from '../logger.js';

export async function list(options) {
  const source = options.source || DEFAULT_SOURCE;
  const tag = options.tag || DEFAULT_REF;

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
