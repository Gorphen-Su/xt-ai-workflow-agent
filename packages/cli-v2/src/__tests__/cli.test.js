import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.resolve(__dirname, '..', '..', 'bin', 'xt-sdd2-skills.js');

async function runCli(args, opts = {}) {
  try {
    const { stdout, stderr } = await execFileP('node', [BIN, ...args], {
      ...opts,
      // 允许用例按需覆盖着色环境变量（默认强制关色以稳定断言）
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', ...opts.env },
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    return { code: err.code ?? 1, stdout: err.stdout || '', stderr: err.stderr || '' };
  }
}

/** 以全新子进程运行 CLI 且允许自定义完整环境（用于着色纯净性证明） */
function runCliRawEnv(args, env) {
  return execFileP('node', [BIN, ...args], { env });
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
    expect(r.stdout).toContain('--json'); // 发现路径钉住：帮助文本必须收录机器可读旗标
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
    expect(r.stdout).toContain('xt-sdd2-interview');
    expect(r.stdout).toContain('xt-sdd2-land');
    expect(r.stdout).toContain('Gorphen-Su/xt-ai-workflow-agent');
  });

  it('list --json → 五键 JSON 落 stdout，stderr 空，ref 尊重 --tag 生效值，exit 0（R-cli-installer-008 端到端）', async () => {
    const r = await runCli(['list', '--tag', 'v1.2.3', '--json']);
    expect(r.code).toBe(0);
    expect(r.stderr).toBe('');

    const parsed = JSON.parse(r.stdout);
    expect(Object.keys(parsed).sort()).toEqual([
      'commands',
      'ref',
      'skills',
      'source',
      'templates',
    ]);
    expect(parsed.ref).toBe('v1.2.3');
    expect(parsed.skills.length).toBeGreaterThan(0);
  });

  it('FORCE_COLOR=1 强制着色环境下 list --json 输出仍零 ANSI（管道纯净性在真彩色进程中证明）', async () => {
    const env = { ...process.env, FORCE_COLOR: '1' };
    delete env.NO_COLOR;
    const { stdout } = await runCliRawEnv(['list', '--json'], env);

    expect(stdout).not.toContain('\x1b[');
    JSON.parse(stdout); // 着色若混入即解析失败——双保险
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
