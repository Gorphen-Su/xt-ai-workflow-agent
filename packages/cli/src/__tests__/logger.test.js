import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as logger from '../logger.js';

describe('logger', () => {
  let stdoutSpy;
  let stderrSpy;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  it('info writes to stdout with newline', () => {
    logger.info('hello');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const out = stdoutSpy.mock.calls[0][0];
    expect(out).toContain('hello');
    expect(out.endsWith('\n')).toBe(true);
  });

  it('success writes to stdout', () => {
    logger.success('ok');
    expect(stdoutSpy).toHaveBeenCalledOnce();
    expect(stdoutSpy.mock.calls[0][0]).toContain('ok');
  });

  it('section writes to stdout', () => {
    logger.section('title');
    expect(stdoutSpy).toHaveBeenCalledOnce();
    expect(stdoutSpy.mock.calls[0][0]).toContain('title');
  });

  it('detail writes to stdout', () => {
    logger.detail('extra info');
    expect(stdoutSpy).toHaveBeenCalledOnce();
    expect(stdoutSpy.mock.calls[0][0]).toContain('extra info');
  });

  it('warn writes to stderr', () => {
    logger.warn('careful');
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy).not.toHaveBeenCalled();
    expect(stderrSpy.mock.calls[0][0]).toContain('careful');
  });

  it('error writes to stderr', () => {
    logger.error('boom');
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(stderrSpy.mock.calls[0][0]).toContain('boom');
  });

  it('all messages end with newline', () => {
    for (const fn of ['info', 'success', 'warn', 'error', 'section', 'detail']) {
      stdoutSpy.mockClear();
      stderrSpy.mockClear();
      logger[fn]('x');
      const writes = [...stdoutSpy.mock.calls, ...stderrSpy.mock.calls].map((c) => c[0]);
      expect(writes.length).toBe(1);
      expect(writes[0].endsWith('\n')).toBe(true);
    }
  });
});
