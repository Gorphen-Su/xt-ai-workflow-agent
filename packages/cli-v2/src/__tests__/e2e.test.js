import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { create as createTar } from 'tar';
import { extractTarball, cleanup } from '../fetcher.js';
import { installFiles, findProjectRoot } from '../installer.js';

// e2e：用本地 tarball 走通 fetcher → installer → backup 全链路，
// 不依赖真实网络。覆盖 install → update 升级周期。
// v2 特征覆盖：skills 子目录深文件、commands 斜杠子目录路径、project.md 模板。

const MANIFEST = {
  skills: ['xt-sdd2-explore', 'xt-sdd2-propose'],
  templates: [
    {
      src: 'templates/xt-sdd2/project.md',
      dst: 'openspec/project.md',
      mode: 'skip-if-exists',
    },
  ],
  // v2 特征：slash command 带子目录，验证 installer 的递归建目录与清洗
  commands: ['xt-sdd2/explore', 'xt-sdd2/propose'],
};

let workdir;

beforeEach(async () => {
  workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-test-'));
});
afterEach(async () => {
  if (workdir) await fs.rm(workdir, { recursive: true, force: true });
});

async function buildFakeRepoTarball(version) {
  const repoRoot = path.join(workdir, `fake-repo-${version}`);
  const files = {
    '.claude/skills/xt-sdd2-explore/SKILL.md': `# explore ${version}\nbody`,
    '.claude/skills/xt-sdd2-explore/references/deep/note.md': `# deep ${version}`,
    '.claude/skills/xt-sdd2-propose/SKILL.md': `# propose ${version}`,
    '.claude/commands/xt-sdd2/explore.md': `/explore ${version}`,
    '.claude/commands/xt-sdd2/propose.md': `/propose ${version}`,
    'templates/xt-sdd2/project.md': `---\nversion: 1\nrelease: ${version}\n---\n`,
  };
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(repoRoot, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content);
  }
  const tarPath = path.join(workdir, `${version}.tar.gz`);
  await createTar(
    { gzip: true, file: tarPath, cwd: workdir },
    [path.basename(repoRoot)]
  );
  return tarPath;
}

describe('e2e: install → update 完整周期', () => {
  it('install → 验证 skill/command/template 全部正确写入（含子目录命令）', async () => {
    const projectRoot = path.join(workdir, 'my-app');
    await fs.mkdir(path.join(projectRoot, '.git'), { recursive: true }); // 项目标识

    const root = findProjectRoot(projectRoot);
    expect(root.autoDetected).toBe(true);
    expect(root.root).toBe(projectRoot);

    const tarPath = await buildFakeRepoTarball('v1');
    const { extractedDir } = await extractTarball(tarPath, MANIFEST);

    const r = await installFiles(extractedDir, projectRoot, MANIFEST, { mode: 'install' });
    expect(r.installed.length).toBeGreaterThan(0);

    // skill 目录整树就位（含深层引用文件）
    const skill = await fs.readFile(
      path.join(projectRoot, '.claude/skills/xt-sdd2-explore/SKILL.md'),
      'utf-8'
    );
    expect(skill).toContain('# explore v1');

    const deepRef = await fs.readFile(
      path.join(projectRoot, '.claude/skills/xt-sdd2-explore/references/deep/note.md'),
      'utf-8'
    );
    expect(deepRef).toContain('deep v1');

    // 子目录 slash command 就位
    const cmd = await fs.readFile(
      path.join(projectRoot, '.claude/commands/xt-sdd2/explore.md'),
      'utf-8'
    );
    expect(cmd).toContain('/explore v1');

    // project.md 模板落位
    const template = await fs.readFile(
      path.join(projectRoot, 'openspec/project.md'),
      'utf-8'
    );
    expect(template).toContain('release: v1');

    await cleanup({ tarballPath: tarPath, extractedDir });
  });

  it('install → update：第二次拉取覆盖 skill 并备份旧版', async () => {
    const projectRoot = path.join(workdir, 'my-app');
    await fs.mkdir(path.join(projectRoot, '.git'), { recursive: true });

    // 1. install v1
    const tar1 = await buildFakeRepoTarball('v1');
    const ext1 = await extractTarball(tar1, MANIFEST);
    await installFiles(ext1.extractedDir, projectRoot, MANIFEST, { mode: 'install' });
    await cleanup({ tarballPath: tar1, extractedDir: ext1.extractedDir });

    // 2. update to v2
    const tar2 = await buildFakeRepoTarball('v2');
    const ext2 = await extractTarball(tar2, MANIFEST);
    const r = await installFiles(ext2.extractedDir, projectRoot, MANIFEST, {
      mode: 'update',
      meta: { fromVersion: 'v1', toVersion: 'v2' },
    });

    expect(r.backed_up).toEqual(
      expect.arrayContaining(['xt-sdd2-explore', 'xt-sdd2-propose'])
    );
    expect(r.backupDir).toBeTruthy();

    // 新版生效
    const newSkill = await fs.readFile(
      path.join(projectRoot, '.claude/skills/xt-sdd2-explore/SKILL.md'),
      'utf-8'
    );
    expect(newSkill).toContain('# explore v2');

    // 新版子目录命令同步生效且无残留
    const newCmd = await fs.readFile(
      path.join(projectRoot, '.claude/commands/xt-sdd2/explore.md'),
      'utf-8'
    );
    expect(newCmd).toContain('/explore v2');

    // 旧版仍在备份目录
    const backupSkill = await fs.readFile(
      path.join(r.backupDir, 'xt-sdd2-explore/SKILL.md'),
      'utf-8'
    );
    expect(backupSkill).toContain('explore v1');

    // project.md 因 skip-if-exists 没被覆盖（保留 v1）
    const template = await fs.readFile(
      path.join(projectRoot, 'openspec/project.md'),
      'utf-8'
    );
    expect(template).toContain('release: v1');

    // backup meta 完整
    const metaRaw = await fs.readFile(path.join(r.backupDir, '_backup-meta.json'), 'utf-8');
    const meta = JSON.parse(metaRaw);
    expect(meta.fromVersion).toBe('v1');
    expect(meta.toVersion).toBe('v2');
    expect(meta.items).toEqual(
      expect.arrayContaining(['xt-sdd2-explore', 'xt-sdd2-propose'])
    );

    await cleanup({ tarballPath: tar2, extractedDir: ext2.extractedDir });
  });
});
