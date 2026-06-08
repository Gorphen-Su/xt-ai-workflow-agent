// GitHub tarball 拉取器：下载 → 解压 → 校验清单 → 清理
// 用 Node 18+ 内置 fetch，避免引入 axios/node-fetch 增加体积。

import { promises as fs, createWriteStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { randomBytes } from 'node:crypto';
import * as tar from 'tar';
import { FetcherError } from './errors.js';

const DOWNLOAD_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1_000;

/**
 * 从 GitHub codeload 下载源仓 tarball。失败自动重试 1 次。
 * @param {string} source  形如 'owner/repo'
 * @param {string} ref     分支或 tag 名
 * @returns {Promise<{tarballPath: string, resolvedRef: string, sourceCommitSha: string|null}>}
 */
export async function fetchTarball(source, ref) {
  const url = `https://codeload.github.com/${source}/tar.gz/${ref}`;

  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
      let resp;
      try {
        resp = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }

      if (!resp.ok) {
        if (resp.status === 404) {
          throw new FetcherError(
            'REF_NOT_FOUND',
            `ref '${ref}' not found in ${source} (HTTP 404 from ${url})`
          );
        }
        throw new FetcherError(
          'NETWORK_ERROR',
          `HTTP ${resp.status} ${resp.statusText || ''} from ${url}`
        );
      }

      // 写入临时文件
      const tarballPath = path.join(
        os.tmpdir(),
        `xt-sdd-skills-${randomBytes(6).toString('hex')}.tar.gz`
      );

      const buf = Buffer.from(await resp.arrayBuffer());
      await fs.writeFile(tarballPath, buf);

      // 尝试从 content-disposition 提取 commit SHA（非关键，失败容忍）
      let sourceCommitSha = null;
      const cd = typeof resp.headers?.get === 'function' ? resp.headers.get('content-disposition') : null;
      if (cd) {
        const m = cd.match(/-([0-9a-f]{40})\.tar\.gz/);
        if (m) sourceCommitSha = m[1];
      }

      return { tarballPath, resolvedRef: ref, sourceCommitSha };
    } catch (err) {
      // 4xx/5xx 路径走 FetcherError，需要直接抛出（不重试）— 但 REF_NOT_FOUND 也是 FetcherError
      // 区分：REF_NOT_FOUND / NETWORK_ERROR(http status) 不重试，TypeError/AbortError 重试
      if (err instanceof FetcherError && err.code === 'REF_NOT_FOUND') {
        throw err;
      }
      lastErr = err;
      if (attempt === 2) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  // 重试用尽，根据原始错误类型映射到错误码
  if (lastErr && lastErr.name === 'AbortError') {
    throw new FetcherError(
      'NETWORK_TIMEOUT',
      `download timeout after ${DOWNLOAD_TIMEOUT_MS}ms from https://codeload.github.com/${source}/tar.gz/${ref}`,
      { cause: lastErr }
    );
  }
  if (lastErr instanceof FetcherError) {
    throw lastErr;
  }
  throw new FetcherError(
    'NETWORK_ERROR',
    `failed to download from https://codeload.github.com/${source}/tar.gz/${ref}: ${lastErr?.message || String(lastErr)}`,
    { cause: lastErr }
  );
}

/**
 * 解压 tarball 到临时目录，并校验 manifest 中必需的文件均存在。
 * @param {string} tarballPath
 * @param {{skills: string[], templates: Array, commands: string[]}} manifest
 * @returns {Promise<{extractedDir: string}>}
 */
export async function extractTarball(tarballPath, manifest) {
  const extractedDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xt-sdd-skills-extract-'));

  try {
    // GitHub tarball 顶级目录形如 `<repo>-<ref>/`，strip:1 去掉这一层
    await tar.extract({
      file: tarballPath,
      cwd: extractedDir,
      strip: 1,
    });
  } catch (err) {
    // 解压失败：清理目录后抛出 TARBALL_CORRUPT
    await fs.rm(extractedDir, { recursive: true, force: true }).catch(() => {});
    throw new FetcherError('TARBALL_CORRUPT', `failed to extract tarball: ${err.message}`, { cause: err });
  }

  // 校验 manifest 中必需的 skill 都在
  const missing = [];
  for (const skill of manifest.skills || []) {
    const skillPath = path.join(extractedDir, '.claude', 'skills', skill);
    try {
      const st = await fs.stat(skillPath);
      if (!st.isDirectory()) missing.push(`.claude/skills/${skill} (not a dir)`);
    } catch {
      missing.push(`.claude/skills/${skill}`);
    }
  }

  if (missing.length > 0) {
    await fs.rm(extractedDir, { recursive: true, force: true }).catch(() => {});
    throw new FetcherError(
      'MANIFEST_MISMATCH',
      `tarball is missing required files declared in manifest:\n  ${missing.join('\n  ')}`
    );
  }

  return { extractedDir };
}

/**
 * 清理临时文件（tarball 和解压目录）。
 * @param {{tarballPath?: string, extractedDir?: string}} paths
 */
export async function cleanup(paths = {}) {
  const tasks = [];
  if (paths.tarballPath) {
    tasks.push(
      fs.rm(paths.tarballPath, { force: true }).catch((err) => {
        if (err.code !== 'ENOENT') throw err;
      })
    );
  }
  if (paths.extractedDir) {
    tasks.push(
      fs.rm(paths.extractedDir, { recursive: true, force: true }).catch((err) => {
        if (err.code !== 'ENOENT') throw err;
      })
    );
  }
  await Promise.all(tasks);
}
