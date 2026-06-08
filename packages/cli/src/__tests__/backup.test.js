import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createBackup, checkBackupCount } from '../backup.js';

const MANIFEST = {
  skills: ['xt-sdd-propose', 'xt-sdd-plan', 'xt-sdd-fix'],
  templates: [],
  commands: [],
};

let projectRoot;

beforeEach(async () => {
  projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-test-'));
});
afterEach(async () => {
  if (projectRoot) await fs.rm(projectRoot, { recursive: true, force: true });
});

async function seedSkill(name, files) {
  const skillDir = path.join(projectRoot, '.claude', 'skills', name);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(skillDir, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content);
  }
}

describe('createBackup', () => {
  it('完整复制已存在的 skill 到带时间戳的备份目录', async () => {
    await seedSkill('xt-sdd-propose', { 'SKILL.md': '# propose', 'scripts/foo.sh': '#!/bin/sh' });
    await seedSkill('xt-sdd-plan', { 'SKILL.md': '# plan' });

    const result = await createBackup(projectRoot, MANIFEST, { fromVersion: null, toVersion: 'main@abc123' });
    expect(result.backupDir).toBeTruthy();
    expect(result.items).toEqual(expect.arrayContaining(['xt-sdd-propose', 'xt-sdd-plan']));
    expect(result.items).not.toContain('xt-sdd-fix'); // not present

    // 文件 byte-for-byte 一致
    const copiedSkill = await fs.readFile(path.join(result.backupDir, 'xt-sdd-propose/SKILL.md'), 'utf-8');
    expect(copiedSkill).toBe('# propose');
    const copiedScript = await fs.readFile(path.join(result.backupDir, 'xt-sdd-propose/scripts/foo.sh'), 'utf-8');
    expect(copiedScript).toBe('#!/bin/sh');
  });

  it('备份目录命名格式为 YYYY-MM-DD-HHmmss', async () => {
    await seedSkill('xt-sdd-propose', { 'SKILL.md': 'x' });
    const r = await createBackup(projectRoot, MANIFEST, { fromVersion: null, toVersion: 'x' });
    const dirName = path.basename(r.backupDir);
    expect(dirName).toMatch(/^\d{4}-\d{2}-\d{2}-\d{6}(-\d+)?$/);
  });

  it('同一秒内多次备份会加 -2/-3 后缀避免冲突', async () => {
    await seedSkill('xt-sdd-propose', { 'SKILL.md': 'x' });

    // 手工创建一个会冲突的目录
    const fakeStamp = '2026-06-08-152330';
    const collision = path.join(projectRoot, '.claude/skills/.backup', fakeStamp);
    await fs.mkdir(collision, { recursive: true });

    // 注入固定时间，验证后缀机制
    const r = await createBackup(projectRoot, MANIFEST, {
      fromVersion: null,
      toVersion: 'x',
      _nowFn: () => new Date('2026-06-08T15:23:30+08:00'),
    });
    expect(path.basename(r.backupDir)).toBe(`${fakeStamp}-2`);

    // 再来一次会变 -3
    const r2 = await createBackup(projectRoot, MANIFEST, {
      fromVersion: null,
      toVersion: 'x',
      _nowFn: () => new Date('2026-06-08T15:23:30+08:00'),
    });
    expect(path.basename(r2.backupDir)).toBe(`${fakeStamp}-3`);
  });

  it('项目无任何已有 skill 时返回 { backupDir: null, items: [] }', async () => {
    const r = await createBackup(projectRoot, MANIFEST, { fromVersion: null, toVersion: 'x' });
    expect(r.backupDir).toBeNull();
    expect(r.items).toEqual([]);
  });

  it('写入 _backup-meta.json 含 backedUpAt/fromVersion/toVersion/items', async () => {
    await seedSkill('xt-sdd-propose', { 'SKILL.md': 'x' });
    const r = await createBackup(projectRoot, MANIFEST, { fromVersion: 'old-sha', toVersion: 'new-sha' });
    const metaRaw = await fs.readFile(path.join(r.backupDir, '_backup-meta.json'), 'utf-8');
    const meta = JSON.parse(metaRaw);
    expect(meta.backedUpAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(meta.fromVersion).toBe('old-sha');
    expect(meta.toVersion).toBe('new-sha');
    expect(meta.items).toEqual(['xt-sdd-propose']);
  });

  it('fromVersion 为 null 时仍写入字段不省略', async () => {
    await seedSkill('xt-sdd-propose', { 'SKILL.md': 'x' });
    const r = await createBackup(projectRoot, MANIFEST, { fromVersion: null, toVersion: 'x' });
    const meta = JSON.parse(await fs.readFile(path.join(r.backupDir, '_backup-meta.json'), 'utf-8'));
    expect(meta).toHaveProperty('fromVersion');
    expect(meta.fromVersion).toBeNull();
  });
});

describe('checkBackupCount', () => {
  it('备份数 <= 5 时 shouldWarn=false', async () => {
    const backupRoot = path.join(projectRoot, '.claude/skills/.backup');
    for (const stamp of ['2026-06-01-100000', '2026-06-02-100000', '2026-06-03-100000']) {
      await fs.mkdir(path.join(backupRoot, stamp), { recursive: true });
    }
    const r = await checkBackupCount(projectRoot);
    expect(r.count).toBe(3);
    expect(r.shouldWarn).toBe(false);
  });

  it('备份数 > 5 时 shouldWarn=true 并返回 oldestDirs', async () => {
    const backupRoot = path.join(projectRoot, '.claude/skills/.backup');
    const stamps = ['2026-06-01-100000', '2026-06-02-100000', '2026-06-03-100000', '2026-06-04-100000', '2026-06-05-100000', '2026-06-06-100000'];
    for (const stamp of stamps) {
      await fs.mkdir(path.join(backupRoot, stamp), { recursive: true });
    }
    const r = await checkBackupCount(projectRoot);
    expect(r.count).toBe(6);
    expect(r.shouldWarn).toBe(true);
    expect(r.oldestDirs).toEqual(['2026-06-01-100000', '2026-06-02-100000', '2026-06-03-100000']);
  });

  it('.backup 不存在时 count=0', async () => {
    const r = await checkBackupCount(projectRoot);
    expect(r.count).toBe(0);
    expect(r.shouldWarn).toBe(false);
  });
});
