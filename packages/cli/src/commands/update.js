// update 子命令
import { fetchTarball, extractTarball, cleanup } from '../fetcher.js';
import { installFiles, findProjectRoot } from '../installer.js';
import { checkBackupCount } from '../backup.js';
import { MANIFEST } from '../manifest.js';
import * as logger from '../logger.js';

export async function update(options) {
  const { tag, source, dryRun, noBackup } = options;

  logger.section(`Updating xt-sdd skills (from ${source}@${tag})...`);

  const root = findProjectRoot(process.cwd());
  if (!root.autoDetected) {
    logger.warn(`No project marker found. Using current directory: ${root.root}`);
  } else {
    logger.detail(`Project root: ${root.root}`);
  }

  if (noBackup) {
    logger.warn('--no-backup specified: existing files will be overwritten irreversibly.');
  }

  logger.info('Downloading tarball...');
  const fetched = await fetchTarball(source, tag);
  logger.detail(`Tarball: ${fetched.tarballPath}`);

  let extracted;
  try {
    logger.info('Extracting and validating manifest...');
    extracted = await extractTarball(fetched.tarballPath, MANIFEST);
  } catch (err) {
    await cleanup({ tarballPath: fetched.tarballPath });
    throw err;
  }

  let result;
  try {
    result = await installFiles(extracted.extractedDir, root.root, MANIFEST, {
      mode: 'update',
      dryRun,
      noBackup,
      meta: { fromVersion: null, toVersion: `${tag} (${fetched.sourceCommitSha ?? 'unknown'})` },
    });
  } finally {
    await cleanup({ tarballPath: fetched.tarballPath, extractedDir: extracted.extractedDir });
  }

  if (result.dryRun) {
    logger.section('Dry run — operations that would be performed:');
    for (const op of result.installOps) {
      if (op.action === 'backup') {
        logger.detail(`  [backup] ${op.items.length} skill(s) would be copied to .claude/skills/.backup/<timestamp>/`);
      } else {
        logger.detail(`  [${op.action}] ${op.dst || op.src || ''}`);
      }
    }
    logger.detail(`(no files were changed)`);
    return;
  }

  if (result.degradedToInstall) {
    logger.detail('No existing xt-sdd skills found — installed as fresh.');
  } else if (result.backed_up.length > 0) {
    logger.success(`✓ Backed up ${result.backed_up.length} skill(s) to ${result.backupDir}`);
  }

  logger.success(`✓ Updated ${result.installed.length} item(s).`);
  if (result.skipped.length > 0) {
    logger.detail(`  Templates skipped (already exist): ${result.skipped.length}`);
  }

  // 提示备份过多
  const bc = await checkBackupCount(root.root);
  if (bc.shouldWarn) {
    logger.warn(
      `You have ${bc.count} backup directories under .claude/skills/.backup/. ` +
        `Consider removing old ones (oldest: ${bc.oldestDirs.join(', ')}).`
    );
  }
}
