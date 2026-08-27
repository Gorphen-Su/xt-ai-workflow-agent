import { describe, it, expect } from 'vitest';
import { parseArgv } from '../argv.js';
import { DEFAULT_SOURCE, DEFAULT_REF } from '../manifest.js';

describe('parseArgv', () => {
  it('无参数 → command=null', () => {
    const r = parseArgv([]);
    expect(r.command).toBeNull();
    expect(r.unknownCommand).toBeNull();
    expect(r.error).toBeNull();
  });

  it('识别 install/update/list', () => {
    for (const cmd of ['install', 'update', 'list']) {
      expect(parseArgv([cmd]).command).toBe(cmd);
    }
  });

  it('未知子命令 → unknownCommand 字段', () => {
    const r = parseArgv(['foo']);
    expect(r.command).toBeNull();
    expect(r.unknownCommand).toBe('foo');
  });

  it('--tag 设置 tag', () => {
    const r = parseArgv(['update', '--tag', 'v1.0.0']);
    expect(r.command).toBe('update');
    expect(r.tag).toBe('v1.0.0');
  });

  it('-t 短选项', () => {
    expect(parseArgv(['install', '-t', 'main']).tag).toBe('main');
  });

  it('--source 必须是 owner/repo', () => {
    expect(parseArgv(['install', '--source', 'foo/bar']).source).toBe('foo/bar');
    expect(parseArgv(['install', '--source', 'invalid']).error).toMatch(/owner\/repo/);
  });

  it('--dry-run 标志', () => {
    expect(parseArgv(['install', '--dry-run']).dryRun).toBe(true);
  });

  it('--no-backup 标志', () => {
    expect(parseArgv(['update', '--no-backup']).noBackup).toBe(true);
  });

  it('--json 标志（R-cli-installer-008 接线钉住）', () => {
    expect(parseArgv(['list', '--json']).json).toBe(true);
    expect(parseArgv(['list']).json).toBe(false); // 默认关闭
  });

  it('--json 与其它 flag 组合放行', () => {
    const r = parseArgv(['list', '--tag', 'v1.2.3', '--json']);
    expect(r.json).toBe(true);
    expect(r.tag).toBe('v1.2.3');
  });

  it('--help / -h', () => {
    expect(parseArgv(['--help']).help).toBe(true);
    expect(parseArgv(['-h']).help).toBe(true);
    expect(parseArgv(['install', '-h']).help).toBe(true);
  });

  it('未知 flag → error', () => {
    expect(parseArgv(['install', '--foo']).error).toMatch(/unknown flag/);
  });

  it('--tag 缺少值 → error', () => {
    expect(parseArgv(['install', '--tag']).error).toMatch(/requires a value/);
  });

  it('--tag 后跟另一个 flag → error（不静默把 flag 当 tag 值）', () => {
    expect(parseArgv(['install', '--tag', '--dry-run']).error).toMatch(/requires a value/);
    expect(parseArgv(['update', '--source', '--no-backup']).error).toMatch(/requires a value/);
  });

  it('默认值正确', () => {
    const r = parseArgv(['install']);
    expect(r.tag).toBe(DEFAULT_REF);
    expect(r.source).toBe(DEFAULT_SOURCE);
    expect(r.dryRun).toBe(false);
    expect(r.noBackup).toBe(false);
  });
});
