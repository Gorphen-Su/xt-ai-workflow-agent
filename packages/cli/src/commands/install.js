// install 子命令
import { fetchTarball, extractTarball, cleanup } from '../fetcher.js';
import { installFiles, findProjectRoot } from '../installer.js';
import { MANIFEST } from '../manifest.js';
import * as logger from '../logger.js';

export async function install(options) {
  const { tag, source, dryRun } = options;

  logger.section(`Installing xt-sdd skills (from ${source}@${tag})...`);

  // 1. project root
  const root = findProjectRoot(process.cwd());
  if (!root.autoDetected) {
    logger.warn(`No project marker found. Using current directory: ${root.root}`);
  } else {
    logger.detail(`Project root: ${root.root}`);
  }

  // 2. fetch
  logger.info(`Downloading tarball...`);
  const fetched = await fetchTarball(source, tag);
  logger.detail(`Tarball: ${fetched.tarballPath}`);

  // 3. extract
  let extracted;
  try {
    logger.info('Extracting and validating manifest...');
    extracted = await extractTarball(fetched.tarballPath, MANIFEST);
  } catch (err) {
    await cleanup({ tarballPath: fetched.tarballPath });
    throw err;
  }

  // 4. install
  let result;
  try {
    result = await installFiles(extracted.extractedDir, root.root, MANIFEST, {
      mode: 'install',
      dryRun,
    });
  } finally {
    await cleanup({ tarballPath: fetched.tarballPath, extractedDir: extracted?.extractedDir });
  }

  // 5. summary
  if (result.dryRun) {
    logger.section('Dry run — operations that would be performed:');
    for (const op of result.installOps) {
      logger.detail(`  [${op.action}] ${op.dst || op.src || ''}`);
    }
    logger.detail(`(no files were changed)`);
  } else {
    logger.success(`✓ Installed ${result.installed.length} item(s).`);
    if (result.skipped.length > 0) {
      logger.detail(`  Skipped (already exist): ${result.skipped.length}`);
    }
  }
}
