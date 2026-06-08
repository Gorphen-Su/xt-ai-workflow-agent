import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.resolve(__dirname, '..', '..', 'bin', 'xt-sdd-skills.js');

async function runCli(args, opts = {}) {
  try {
    const { stdout, stderr } = await execFileP('node', [BIN, ...args], {
      ...opts,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    return { code: err.code ?? 1, stdout: err.stdout || '', stderr: err.stderr || '' };
  }
}

describe('CLI 入口', () => {
  it('无参数 → 打印 usage 到 stdout，exit 0', async () => {
    const r = await runCli([]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('Usage:');
    expect(r.stdout).toContain('install');
    expect(r.stdout).toContain('update');
    expect(r.stdout).toContain('list');
  });

  it('--help → 打印 usage 到 stdout，exit 0', async () => {
    const r = await runCli(['--help']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('Usage:');
  });

  it('--version → 打印版本号，exit 0', async () => {
    const r = await runCli(['--version']);
    expect(r.code).toBe(0);
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('list → 输出清单，exit 0，不联网', async () => {
    const r = await runCli(['list']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('Available');
    expect(r.stdout).toContain('xt-sdd-propose');
    expect(r.stdout).toContain('xt-sdd-fix');
    expect(r.stdout).toContain('Gorphen-Su/xt-ai-workflow-agent');
  });

  it('未知子命令 → 错误信息到 stderr，exit 1', async () => {
    const r = await runCli(['foo']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('Unknown command');
    expect(r.stderr).toContain('foo');
  });

  it('未知 flag → 错误信息到 stderr，exit 1', async () => {
    const r = await runCli(['install', '--bogus']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('unknown flag');
  });

  it('--source 格式错误 → exit 1', async () => {
    const r = await runCli(['install', '--source', 'invalid']);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/owner\/repo/);
  });
});
