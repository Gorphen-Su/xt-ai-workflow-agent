import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { findProjectRoot, installFiles } from '../installer.js';

const MANIFEST = {
  skills: ['xt-sdd-propose', 'xt-sdd-plan'],
  templates: [
    { src: 'openspec/sdd-project-profile.yaml', dst: 'openspec/sdd-project-profile.yaml', mode: 'skip-if-exists' },
  ],
  commands: ['xt-sdd-propose', 'xt-sdd-plan'],
};

let workdir;
beforeEach(async () => {
  workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'installer-test-'));
});
afterEach(async () => {
  if (workdir) await fs.rm(workdir, { recursive: true, force: true });
});

// 帮助函数：模拟"源仓"解压后的目录结构
async function seedExtractedDir(extractedDir) {
  const layout = {
    '.claude/skills/xt-sdd-propose/SKILL.md': '# propose v2',
    '.claude/skills/xt-sdd-plan/SKILL.md': '# plan v2',
    '.claude/commands/xt-sdd-propose.md': '/xt-sdd-propose v2',
    '.claude/commands/xt-sdd-plan.md': '/xt-sdd-plan v2',
    'openspec/sdd-project-profile.yaml': 'version: 1\nfresh-template: true\n',
  };
  for (const [rel, content] of Object.entries(layout)) {
    const full = path.join(extractedDir, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content);
  }
}

// ============= findProjectRoot =============

describe('findProjectRoot', () => {
  it('当前目录含 .git 时返回当前目录', async () => {
    await fs.mkdir(path.join(workdir, '.git'));
    const r = findProjectRoot(workdir);
    expect(r.root).toBe(workdir);
    expect(r.autoDetected).toBe(true);
  });

  it('父目录含 package.json 时向上返回父目录', async () => {
    await fs.writeFile(path.join(workdir, 'package.json'), '{}');
    const sub = path.join(workdir, 'src', 'inner');
    await fs.mkdir(sub, { recursive: true });
    const r = findProjectRoot(sub);
    expect(r.root).toBe(workdir);
    expect(r.autoDetected).toBe(true);
  });

  it('当前目录含 .claude 时返回当前目录', async () => {
    await fs.mkdir(path.join(workdir, '.claude'));
    const r = findProjectRoot(workdir);
    expect(r.root).toBe(workdir);
    expect(r.autoDetected).toBe(true);
  });

  it('当前目录含 openspec 时返回当前目录', async () => {
    await fs.mkdir(path.join(workdir, 'openspec'));
    const r = findProjectRoot(workdir);
    expect(r.root).toBe(workdir);
    expect(r.autoDetected).toBe(true);
  });

  it('找不到任何标识时 autoDetected=false（在 OS 临时目录可能因 home 上层有标识而 true，本测试只验证 root 字段一定有值不无限循环）', async () => {
    // 创建很深的目录，每层都没有任何标识
    const deep = path.join(workdir, 'a', 'b', 'c');
    await fs.mkdir(deep, { recursive: true });
    const r = findProjectRoot(deep);
    // 在隔离环境无法保证 autoDetected=false（向上爬可能命中真实仓库），
    // 这里只断言函数返回结构正确、不无限循环
    expect(typeof r.root).toBe('string');
    expect(typeof r.autoDetected).toBe('boolean');
  });
});

// ============= installFiles install mode =============

describe('installFiles - install mode', () => {
  it('目标无 skill 时正常安装', async () => {
    const extractedDir = path.join(workdir, 'extracted');
    const projectRoot = path.join(workdir, 'project');
    await fs.mkdir(projectRoot);
    await seedExtractedDir(extractedDir);

    const r = await installFiles(extractedDir, projectRoot, MANIFEST, { mode: 'install' });
    expect(r.degradedToInstall).toBe(false);
    expect(r.backed_up).toEqual([]);
    expect(r.installed.length).toBeGreaterThan(0);

    const skillContent = await fs.readFile(
      path.join(projectRoot, '.claude/skills/xt-sdd-propose/SKILL.md'),
      'utf-8'
    );
    expect(skillContent).toBe('# propose v2');
  });

  it('目标已有 skill 时抛出 ALREADY_INSTALLED', async () => {
    const extractedDir = path.join(workdir, 'extracted');
    const projectRoot = path.join(workdir, 'project');
    await seedExtractedDir(extractedDir);
    const existing = path.join(projectRoot, '.claude/skills/xt-sdd-propose');
    await fs.mkdir(existing, { recursive: true });
    await fs.writeFile(path.join(existing, 'SKILL.md'), '# old');

    await expect(
      installFiles(extractedDir, projectRoot, MANIFEST, { mode: 'install' })
    ).rejects.toMatchObject({ name: 'InstallerError', code: 'ALREADY_INSTALLED' });
  });
});

// ============= installFiles update mode =============

describe('installFiles - update mode', () => {
  it('目标已有 skill 时备份并覆盖', async () => {
    const extractedDir = path.join(workdir, 'extracted');
    const projectRoot = path.join(workdir, 'project');
    await seedExtractedDir(extractedDir);

    const existing = path.join(projectRoot, '.claude/skills/xt-sdd-propose');
    await fs.mkdir(existing, { recursive: true });
    await fs.writeFile(path.join(existing, 'SKILL.md'), '# old v1');

    const r = await installFiles(extractedDir, projectRoot, MANIFEST, {
      mode: 'update',
      meta: { fromVersion: null, toVersion: 'main' },
    });

    expect(r.degradedToInstall).toBe(false);
    expect(r.backed_up).toContain('xt-sdd-propose');

    const updated = await fs.readFile(
      path.join(projectRoot, '.claude/skills/xt-sdd-propose/SKILL.md'),
      'utf-8'
    );
    expect(updated).toBe('# propose v2');

    // 备份目录应存在且含旧内容
    const backupParent = path.join(projectRoot, '.claude/skills/.backup');
    const backupDirs = await fs.readdir(backupParent);
    expect(backupDirs.length).toBe(1);
    const oldBackup = await fs.readFile(
      path.join(backupParent, backupDirs[0], 'xt-sdd-propose/SKILL.md'),
      'utf-8'
    );
    expect(oldBackup).toBe('# old v1');
  });

  it('目标无任何 skill 时退化为 install', async () => {
    const extractedDir = path.join(workdir, 'extracted');
    const projectRoot = path.join(workdir, 'project');
    await fs.mkdir(projectRoot);
    await seedExtractedDir(extractedDir);

    const r = await installFiles(extractedDir, projectRoot, MANIFEST, {
      mode: 'update',
      meta: { fromVersion: null, toVersion: 'main' },
    });

    expect(r.degradedToInstall).toBe(true);
    expect(r.backed_up).toEqual([]);
    expect(r.installed.length).toBeGreaterThan(0);
  });

  it('noBackup=true 时跳过备份', async () => {
    const extractedDir = path.join(workdir, 'extracted');
    const projectRoot = path.join(workdir, 'project');
    await seedExtractedDir(extractedDir);
    await fs.mkdir(path.join(projectRoot, '.claude/skills/xt-sdd-propose'), { recursive: true });
    await fs.writeFile(path.join(projectRoot, '.claude/skills/xt-sdd-propose/SKILL.md'), 'old');

    const r = await installFiles(extractedDir, projectRoot, MANIFEST, {
      mode: 'update',
      noBackup: true,
      meta: { fromVersion: null, toVersion: 'main' },
    });

    expect(r.backed_up).toEqual([]);
    // .backup 不应被创建
    await expect(fs.access(path.join(projectRoot, '.claude/skills/.backup'))).rejects.toThrow();
  });
});

// ============= installFiles - 模板 skip-if-exists =============

describe('installFiles - templates skip-if-exists', () => {
  it('目标无模板时复制', async () => {
    const extractedDir = path.join(workdir, 'extracted');
    const projectRoot = path.join(workdir, 'project');
    await fs.mkdir(projectRoot);
    await seedExtractedDir(extractedDir);

    const r = await installFiles(extractedDir, projectRoot, MANIFEST, { mode: 'install' });
    expect(r.installed).toEqual(
      expect.arrayContaining([expect.stringContaining('sdd-project-profile.yaml')])
    );
    const content = await fs.readFile(
      path.join(projectRoot, 'openspec/sdd-project-profile.yaml'),
      'utf-8'
    );
    expect(content).toContain('fresh-template');
  });

  it('目标已有模板时跳过', async () => {
    const extractedDir = path.join(workdir, 'extracted');
    const projectRoot = path.join(workdir, 'project');
    await seedExtractedDir(extractedDir);
    await fs.mkdir(path.join(projectRoot, 'openspec'), { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'openspec/sdd-project-profile.yaml'),
      'custom: user-defined\n'
    );

    const r = await installFiles(extractedDir, projectRoot, MANIFEST, { mode: 'install' });
    expect(r.skipped).toEqual(
      expect.arrayContaining([expect.stringContaining('sdd-project-profile.yaml')])
    );

    // 用户定制的内容必须保留
    const content = await fs.readFile(
      path.join(projectRoot, 'openspec/sdd-project-profile.yaml'),
      'utf-8'
    );
    expect(content).toBe('custom: user-defined\n');
  });
});

// ============= installFiles - dryRun =============

describe('installFiles - dryRun', () => {
  it('dryRun 不修改文件系统', async () => {
    const extractedDir = path.join(workdir, 'extracted');
    const projectRoot = path.join(workdir, 'project');
    await fs.mkdir(projectRoot);
    await seedExtractedDir(extractedDir);

    const r = await installFiles(extractedDir, projectRoot, MANIFEST, {
      mode: 'install',
      dryRun: true,
    });

    expect(r.dryRun).toBe(true);
    expect(Array.isArray(r.installOps)).toBe(true);
    expect(r.installOps.length).toBeGreaterThan(0);

    // 验证目标文件确实没创建
    await expect(
      fs.access(path.join(projectRoot, '.claude/skills/xt-sdd-propose/SKILL.md'))
    ).rejects.toThrow();
  });
});
