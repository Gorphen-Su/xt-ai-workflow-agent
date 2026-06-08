// 升级前备份管理。
// 完整目录复制 + 时间戳目录 + meta 文件。

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { BackupError } from './errors.js';

const BACKUP_THRESHOLD = 5;
const MAX_SUFFIX_ATTEMPTS = 99;

/**
 * 把目标项目里已存在的 skill 完整复制到带时间戳的备份目录。
 *
 * @param {string} projectRoot
 * @param {{skills: string[]}} manifest
 * @param {{fromVersion: string|null, toVersion: string, _nowFn?: ()=>Date}} meta
 * @returns {Promise<{backupDir: string|null, items: string[]}>}
 */
export async function createBackup(projectRoot, manifest, meta = {}) {
  const skillsDir = path.join(projectRoot, '.claude', 'skills');
  const items = [];
  for (const name of manifest.skills || []) {
    const skillPath = path.join(skillsDir, name);
    try {
      const st = await fs.stat(skillPath);
      if (st.isDirectory()) items.push(name);
    } catch {
      /* 不存在 → 跳过 */
    }
  }

  if (items.length === 0) {
    return { backupDir: null, items: [] };
  }

  const now = (meta._nowFn || (() => new Date()))();
  const stamp = formatStamp(now);
  const backupRoot = path.join(skillsDir, '.backup');
  const backupDir = await pickAvailableDir(backupRoot, stamp);

  try {
    await fs.mkdir(backupDir, { recursive: true });
    for (const name of items) {
      const src = path.join(skillsDir, name);
      const dst = path.join(backupDir, name);
      await fs.cp(src, dst, { recursive: true });
    }
    const metaContent = {
      backedUpAt: now.toISOString(),
      fromVersion: meta.fromVersion ?? null,
      toVersion: meta.toVersion,
      items,
    };
    await fs.writeFile(
      path.join(backupDir, '_backup-meta.json'),
      JSON.stringify(metaContent, null, 2) + '\n',
      'utf-8'
    );
  } catch (err) {
    throw new BackupError(
      'BACKUP_WRITE_FAILED',
      `failed to write backup at ${backupDir}: ${err.message}`,
      { cause: err }
    );
  }

  return { backupDir, items };
}

/**
 * 扫描 .backup/ 下的子目录数。> 5 时返回 shouldWarn=true。
 */
export async function checkBackupCount(projectRoot) {
  const backupRoot = path.join(projectRoot, '.claude/skills/.backup');
  let entries;
  try {
    entries = await fs.readdir(backupRoot, { withFileTypes: true });
  } catch {
    return { count: 0, shouldWarn: false };
  }
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const count = dirs.length;
  if (count > BACKUP_THRESHOLD) {
    return { count, shouldWarn: true, oldestDirs: dirs.slice(0, 3) };
  }
  return { count, shouldWarn: false };
}

// --- helpers ---

function formatStamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

async function pickAvailableDir(parent, base) {
  // 先看 base 本身是否存在；不存在就用它；否则尝试 base-2, base-3 …
  const tryPath = async (name) => {
    const full = path.join(parent, name);
    try {
      await fs.access(full);
      return null; // 已存在
    } catch {
      return full;
    }
  };
  let chosen = await tryPath(base);
  if (chosen) return chosen;
  for (let i = 2; i <= MAX_SUFFIX_ATTEMPTS; i++) {
    chosen = await tryPath(`${base}-${i}`);
    if (chosen) return chosen;
  }
  throw new BackupError(
    'BACKUP_DIR_EXISTS',
    `failed to allocate backup dir under ${parent} (all suffixes 2-${MAX_SUFFIX_ATTEMPTS} taken)`
  );
}
