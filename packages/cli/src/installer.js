// 本地文件写入器：install / update 双模式 + 模板 skip-if-exists + dryRun
//
// 设计要点：
// - 所有路径用 path.join 处理，跨平台
// - update 模式调 backup 模块；install 模式拒绝在已安装目录运行
// - dryRun 全程不调 fs 写入 API，仅返回 installOps 给调用方打印

import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { InstallerError } from './errors.js';
import { createBackup } from './backup.js';

const ROOT_MARKERS = ['.git', 'package.json', 'openspec', '.claude'];

/**
 * 从 startDir 向上查找项目根标识。
 * @param {string} startDir
 * @returns {{root: string, autoDetected: boolean}}
 */
export function findProjectRoot(startDir) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;
  while (true) {
    for (const marker of ROOT_MARKERS) {
      if (existsSync(path.join(dir, marker))) {
        return { root: dir, autoDetected: true };
      }
    }
    if (dir === root) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return { root: path.resolve(startDir), autoDetected: false };
}

/**
 * 主安装逻辑。
 *
 * @param {string} extractedDir 解压后的源目录（含 .claude/skills/... 等）
 * @param {string} projectRoot 目标项目根
 * @param {{skills:string[], templates:Array, commands:string[]}} manifest
 * @param {{mode:'install'|'update', dryRun?:boolean, noBackup?:boolean, meta?:object}} options
 * @returns {Promise<{installed:string[], skipped:string[], backed_up:string[], degradedToInstall:boolean, dryRun?:boolean, installOps?:Array}>}
 */
export async function installFiles(extractedDir, projectRoot, manifest, options = {}) {
  const { mode, dryRun = false, noBackup = false, meta = {} } = options;
  if (mode !== 'install' && mode !== 'update') {
    throw new InstallerError('BAD_MODE', `installFiles: invalid mode '${mode}'`);
  }

  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  const commandsDir = path.join(projectRoot, '.claude', 'commands');

  // 1. 探测项目里已存在哪些 skill
  const existingSkills = [];
  for (const name of manifest.skills) {
    if (existsSync(path.join(skillsDir, name))) existingSkills.push(name);
  }

  // 2. 模式判定
  let effectiveMode = mode;
  let degradedToInstall = false;
  if (mode === 'install' && existingSkills.length > 0) {
    throw new InstallerError(
      'ALREADY_INSTALLED',
      `target already has ${existingSkills.length} xt-sdd-* skill(s): ${existingSkills.join(', ')}. Use 'update' instead.`
    );
  }
  if (mode === 'update' && existingSkills.length === 0) {
    effectiveMode = 'install';
    degradedToInstall = true;
  }

  // 3. 构造 installOps（所有计划要做的事），dryRun 直接返回
  const installOps = [];
  let backed_up_items = [];

  // backup 阶段（仅 update 且非 noBackup）
  let backupResult = null;
  if (effectiveMode === 'update' && !noBackup) {
    if (dryRun) {
      // dryRun 时只记录到 installOps，不实际备份
      installOps.push({ action: 'backup', source: skillsDir, items: existingSkills });
    } else {
      // 非 dryRun 立即执行备份，结果在最终返回值中提供
      backupResult = await createBackup(projectRoot, manifest, meta);
      backed_up_items = backupResult.items;
    }
  }

  // skill 复制 ops
  for (const name of manifest.skills) {
    const src = path.join(extractedDir, '.claude', 'skills', name);
    const dst = path.join(skillsDir, name);
    if (!existsSync(src)) continue; // 源不存在则跳过（清单校验已在 fetcher 做）
    installOps.push({ action: 'copy-skill', src, dst, name });
  }

  // command 复制 ops
  for (const name of manifest.commands) {
    const src = path.join(extractedDir, '.claude', 'commands', `${name}.md`);
    const dst = path.join(commandsDir, `${name}.md`);
    if (!existsSync(src)) continue; // 源仓还没有该 command 文件就跳过
    installOps.push({ action: 'copy-command', src, dst, name });
  }

  // template ops
  for (const tpl of manifest.templates) {
    const src = path.join(extractedDir, tpl.src);
    const dst = path.join(projectRoot, tpl.dst);
    if (!existsSync(src)) continue;
    if (tpl.mode === 'skip-if-exists' && existsSync(dst)) {
      installOps.push({ action: 'skip-template', dst, reason: 'exists' });
    } else {
      installOps.push({ action: 'copy-template', src, dst });
    }
  }

  // 4. dryRun 不实际写入
  if (dryRun) {
    return {
      installed: [],
      skipped: [],
      backed_up: [],
      degradedToInstall,
      dryRun: true,
      installOps,
    };
  }

  // 5. 实际执行
  const installed = [];
  const skipped = [];

  for (const op of installOps) {
    if (op.action === 'copy-skill' || op.action === 'copy-command') {
      // update 模式覆盖前先删除目标，避免老残留文件
      if (effectiveMode === 'update' && existsSync(op.dst)) {
        await fs.rm(op.dst, { recursive: true, force: true });
      }
      await fs.mkdir(path.dirname(op.dst), { recursive: true });
      await fs.cp(op.src, op.dst, { recursive: true });
      installed.push(op.dst);
    } else if (op.action === 'copy-template') {
      await fs.mkdir(path.dirname(op.dst), { recursive: true });
      await fs.cp(op.src, op.dst, { recursive: true });
      installed.push(op.dst);
    } else if (op.action === 'skip-template') {
      skipped.push(op.dst);
    }
    // 注：op.action === 'backup' 仅出现在 dryRun 路径，本循环只在非 dryRun 执行
  }

  return {
    installed,
    skipped,
    backed_up: backed_up_items,
    degradedToInstall,
    backupDir: backupResult?.backupDir ?? null,
  };
}
