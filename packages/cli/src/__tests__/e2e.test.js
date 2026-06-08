import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { create as createTar } from 'tar';
import { extractTarball, cleanup } from '../fetcher.js';
import { installFiles, findProjectRoot } from '../installer.js';

// e2e：用本地 tarball 走通 fetcher → installer → backup 全链路，
// 不依赖真实网络。覆盖 install → update 升级周期。

const MANIFEST = {
  skills: ['xt-sdd-propose', 'xt-sdd-plan'],
  templates: [
    {
      src: 'openspec/sdd-project-profile.yaml',
      dst: 'openspec/sdd-project-profile.yaml',
      mode: 'skip-if-exists',
    },
  ],
  commands: ['xt-sdd-propose', 'xt-sdd-plan'],
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
    '.claude/skills/xt-sdd-propose/SKILL.md': `# propose ${version}\nbody`,
    '.claude/skills/xt-sdd-propose/scripts/run.sh': `# script ${version}`,
    '.claude/skills/xt-sdd-plan/SKILL.md': `# plan ${version}`,
    '.claude/commands/xt-sdd-propose.md': `/propose ${version}`,
    '.claude/commands/xt-sdd-plan.md': `/plan ${version}`,
    'openspec/sdd-project-profile.yaml': `version: 1\nrelease: ${version}\n`,
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
  it('install → 验证 skill/command/template 全部正确写入', async () => {
    const projectRoot = path.join(workdir, 'my-app');
    await fs.mkdir(path.join(projectRoot, '.git'), { recursive: true }); // 项目标识

    const root = findProjectRoot(projectRoot);
    expect(root.autoDetected).toBe(true);
    expect(root.root).toBe(projectRoot);

    const tarPath = await buildFakeRepoTarball('v1');
    const { extractedDir } = await extractTarball(tarPath, MANIFEST);

    const r = await installFiles(extractedDir, projectRoot, MANIFEST, { mode: 'install' });
    expect(r.installed.length).toBeGreaterThan(0);

    // 验证 6 类文件就位
    const propose = await fs.readFile(
      path.join(projectRoot, '.claude/skills/xt-sdd-propose/SKILL.md'),
      'utf-8'
    );
    expect(propose).toContain('# propose v1');

    const script = await fs.readFile(
      path.join(projectRoot, '.claude/skills/xt-sdd-propose/scripts/run.sh'),
      'utf-8'
    );
    expect(script).toContain('script v1');

    const cmd = await fs.readFile(
      path.join(projectRoot, '.claude/commands/xt-sdd-propose.md'),
      'utf-8'
    );
    expect(cmd).toContain('/propose v1');

    const template = await fs.readFile(
      path.join(projectRoot, 'openspec/sdd-project-profile.yaml'),
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

    expect(r.backed_up).toEqual(expect.arrayContaining(['xt-sdd-propose', 'xt-sdd-plan']));
    expect(r.backupDir).toBeTruthy();

    // 新版生效
    const newPropose = await fs.readFile(
      path.join(projectRoot, '.claude/skills/xt-sdd-propose/SKILL.md'),
      'utf-8'
    );
    expect(newPropose).toContain('# propose v2');

    // 旧版仍在备份目录
    const backupPropose = await fs.readFile(
      path.join(r.backupDir, 'xt-sdd-propose/SKILL.md'),
      'utf-8'
    );
    expect(backupPropose).toContain('# propose v1');

    // template 因为 skip-if-exists 没被覆盖（保留 v1）
    const template = await fs.readFile(
      path.join(projectRoot, 'openspec/sdd-project-profile.yaml'),
      'utf-8'
    );
    expect(template).toContain('release: v1');

    // backup meta 完整
    const metaRaw = await fs.readFile(path.join(r.backupDir, '_backup-meta.json'), 'utf-8');
    const meta = JSON.parse(metaRaw);
    expect(meta.fromVersion).toBe('v1');
    expect(meta.toVersion).toBe('v2');
    expect(meta.items).toEqual(expect.arrayContaining(['xt-sdd-propose', 'xt-sdd-plan']));

    await cleanup({ tarballPath: tar2, extractedDir: ext2.extractedDir });
  });
});
