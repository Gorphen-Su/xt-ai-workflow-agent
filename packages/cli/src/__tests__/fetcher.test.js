import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { create as createTar } from 'tar';
import { fetchTarball, extractTarball, cleanup } from '../fetcher.js';
import { FetcherError } from '../errors.js';

// ============= fetchTarball =============

describe('fetchTarball', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('成功下载并返回 tarballPath + resolvedRef', async () => {
    const fakeBody = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]); // gzip magic
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(),
      arrayBuffer: async () => fakeBody.buffer,
    });

    const result = await fetchTarball('owner/repo', 'main');
    expect(result.tarballPath).toMatch(/\.tar\.gz$/);
    expect(result.resolvedRef).toBe('main');
    const stat = await fs.stat(result.tarballPath);
    expect(stat.size).toBe(4);
    await fs.unlink(result.tarballPath);
  });

  it('GitHub 返回 404 时抛出 REF_NOT_FOUND', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(fetchTarball('owner/repo', 'nonexistent')).rejects.toMatchObject({
      name: 'FetcherError',
      code: 'REF_NOT_FOUND',
    });
  });

  it('网络错误（TypeError）会重试一次后抛出 NETWORK_ERROR', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(fetchTarball('owner/repo', 'main')).rejects.toMatchObject({
      name: 'FetcherError',
      code: 'NETWORK_ERROR',
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('AbortError 触发时抛出 NETWORK_TIMEOUT', async () => {
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    globalThis.fetch = vi.fn().mockRejectedValue(abortErr);
    await expect(fetchTarball('owner/repo', 'main')).rejects.toMatchObject({
      name: 'FetcherError',
      code: 'NETWORK_TIMEOUT',
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('第一次失败、第二次成功则不抛出', async () => {
    const fakeBody = new Uint8Array([0x1f, 0x8b]);
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('flaky'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        arrayBuffer: async () => fakeBody.buffer,
      });
    const r = await fetchTarball('owner/repo', 'main');
    expect(r.tarballPath).toBeTruthy();
    await fs.unlink(r.tarballPath);
  });
});

// ============= extractTarball =============

describe('extractTarball', () => {
  let workdir;
  let realTarballPath;
  beforeEach(async () => {
    workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'fetcher-test-'));
  });
  afterEach(async () => {
    if (workdir) await fs.rm(workdir, { recursive: true, force: true });
  });

  async function buildFakeTarball(filesMap, rootDirName = 'fake-repo-main') {
    // 在 workdir 下创建假目录结构，再用 tar 打包
    const src = path.join(workdir, rootDirName);
    for (const [relPath, content] of Object.entries(filesMap)) {
      const full = path.join(src, relPath);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, content);
    }
    const tarPath = path.join(workdir, 'fake.tar.gz');
    await createTar({ gzip: true, file: tarPath, cwd: workdir }, [rootDirName]);
    return tarPath;
  }

  it('解压合法 tarball 并通过 manifest 校验', async () => {
    const manifest = {
      skills: ['xt-sdd-propose'],
      templates: [],
      commands: [],
    };
    const fileMap = {
      '.claude/skills/xt-sdd-propose/SKILL.md': '# propose',
    };
    realTarballPath = await buildFakeTarball(fileMap);
    const result = await extractTarball(realTarballPath, manifest);
    expect(result.extractedDir).toBeTruthy();
    const skillFile = path.join(result.extractedDir, '.claude/skills/xt-sdd-propose/SKILL.md');
    const content = await fs.readFile(skillFile, 'utf-8');
    expect(content).toBe('# propose');
    await fs.rm(result.extractedDir, { recursive: true, force: true });
  });

  it('缺少 manifest 中的 skill 时抛出 MANIFEST_MISMATCH', async () => {
    const manifest = {
      skills: ['xt-sdd-propose', 'xt-sdd-fix'], // tarball 只含 propose
      templates: [],
      commands: [],
    };
    realTarballPath = await buildFakeTarball({
      '.claude/skills/xt-sdd-propose/SKILL.md': 'x',
    });
    await expect(extractTarball(realTarballPath, manifest)).rejects.toMatchObject({
      name: 'FetcherError',
      code: 'MANIFEST_MISMATCH',
    });
  });

  it('损坏的 tarball 抛出 TARBALL_CORRUPT', async () => {
    const corrupt = path.join(workdir, 'bad.tar.gz');
    await fs.writeFile(corrupt, 'not a tar file at all');
    await expect(extractTarball(corrupt, { skills: [], templates: [], commands: [] })).rejects.toMatchObject({
      name: 'FetcherError',
      code: 'TARBALL_CORRUPT',
    });
  });
});

// ============= cleanup =============

describe('cleanup', () => {
  let workdir;
  beforeEach(async () => {
    workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'cleanup-test-'));
  });
  afterEach(async () => {
    if (workdir) await fs.rm(workdir, { recursive: true, force: true });
  });

  it('正常清理 tarballPath 和 extractedDir', async () => {
    const tarball = path.join(workdir, 'a.tar.gz');
    const extracted = path.join(workdir, 'extracted');
    await fs.writeFile(tarball, 'x');
    await fs.mkdir(extracted);
    await fs.writeFile(path.join(extracted, 'foo'), 'y');

    await cleanup({ tarballPath: tarball, extractedDir: extracted });
    await expect(fs.access(tarball)).rejects.toThrow();
    await expect(fs.access(extracted)).rejects.toThrow();
  });

  it('路径不存在时静默忽略', async () => {
    await expect(
      cleanup({
        tarballPath: path.join(workdir, 'nonexistent.tar.gz'),
        extractedDir: path.join(workdir, 'nonexistent'),
      })
    ).resolves.toBeUndefined();
  });

  it('只清理 tarballPath 时不需要 extractedDir', async () => {
    const tar = path.join(workdir, 'b.tar.gz');
    await fs.writeFile(tar, 'x');
    await cleanup({ tarballPath: tar });
    await expect(fs.access(tar)).rejects.toThrow();
  });
});
