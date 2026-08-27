// list 子命令测试 —— 首次为该命令建立保护
// 覆盖契约：R-cli-installer-008（--json 双模）与 R-cli-installer-006（文本模式零漂移）
import { afterEach, describe, expect, it, vi } from 'vitest';

import { list } from '../commands/list.js';

/** 捕获一次 list 调用期间的 stdout 全部输出 */
async function captureStdout(run) {
  const chunks = [];
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    chunks.push(String(chunk));
    return true;
  });
  try {
    await run();
  } finally {
    spy.mockRestore();
  }
  return chunks.join('');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('list --json（R-cli-installer-008）', () => {
  it('A: 输出可通过 JSON.parse 解析，顶层恰为五键，且不含 ANSI 转义序列', async () => {
    const out = await captureStdout(() => list({ json: true }));

    // 契约：机器管道纯净性—— kleur 彩色码绝不许混入结构化输出
    expect(out).not.toContain('\x1b[');

    // 契约：两空格缩进多行 + 换行结尾（R-008 序列化格式条款显式钉住）
    expect(out.endsWith('\n')).toBe(true);
    expect(out.split('\n')[1]).toMatch(/^ {2}"(commands|ref|skills|source|templates)": /);

    const parsed = JSON.parse(out); // 尾部换行属合法空白，允许直接解析
    expect(Object.keys(parsed).sort()).toEqual([
      'commands',
      'ref',
      'skills',
      'source',
      'templates',
    ]);
  });

  it('B: templates 条目披露 src/dst/mode 完整字段（超集于文本模式 dst-only）', async () => {
    const out = await captureStdout(() => list({ json: true }));
    const parsed = JSON.parse(out);

    expect(Array.isArray(parsed.templates)).toBe(true);
    expect(parsed.templates.length).toBeGreaterThan(0);
    for (const t of parsed.templates) {
      expect(t).toHaveProperty('src');
      expect(t).toHaveProperty('dst');
      expect(t).toHaveProperty('mode');
    }
  });
});

describe('list 默认文本模式（R-cli-installer-006 零漂移）', () => {
  // 钉住测试（pinning test）：出生即绿是其本职——锁定冻结契约的现状行为，
  // 防止 json 双模改造或后续变更漂移文本模式的章节顺序与内容类型
  it('C: 章节关键词、章节顺序、命令映射前缀与使用提示保持原样', async () => {
    const out = await captureStdout(() => list({}));

    expect(out).toContain('Skills:');
    expect(out).toContain('Commands:');
    expect(out).toContain('Templates');
    expect(out).toContain('.claude/commands/');
    expect(out).toContain("--tag <ref>' to pin"); // 使用提示原文片段
    expect(out).toContain('--source <owner/repo>'); // fork 提示

    // R-006 场景条款：章节顺序与变更前一致
    const order = ['Skills:', 'Commands:', 'Templates'].map((s) => out.indexOf(s));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(out.indexOf("--tag <ref>'")).toBeGreaterThan(Math.max(...order));
  });
});
