import { describe, it, expect } from 'vitest';
import { CliError, FetcherError, InstallerError, BackupError } from '../errors.js';

describe('errors', () => {
  describe('CliError (base)', () => {
    it('stores code, message, and default exitCode 1', () => {
      const e = new CliError('SOME_CODE', 'something happened');
      expect(e).toBeInstanceOf(Error);
      expect(e.code).toBe('SOME_CODE');
      expect(e.message).toBe('something happened');
      expect(e.exitCode).toBe(1);
      expect(e.name).toBe('CliError');
    });

    it('accepts custom exitCode via options', () => {
      const e = new CliError('X', 'msg', { exitCode: 7 });
      expect(e.exitCode).toBe(7);
    });
  });

  describe('FetcherError', () => {
    it('defaults exitCode to 2', () => {
      const e = new FetcherError('NETWORK_ERROR', 'dns failed');
      expect(e).toBeInstanceOf(CliError);
      expect(e).toBeInstanceOf(Error);
      expect(e.code).toBe('NETWORK_ERROR');
      expect(e.exitCode).toBe(2);
      expect(e.name).toBe('FetcherError');
    });
  });

  describe('InstallerError', () => {
    it('defaults exitCode to 1', () => {
      const e = new InstallerError('ALREADY_INSTALLED', 'use update');
      expect(e).toBeInstanceOf(CliError);
      expect(e.exitCode).toBe(1);
      expect(e.name).toBe('InstallerError');
    });
  });

  describe('BackupError', () => {
    it('defaults exitCode to 4', () => {
      const e = new BackupError('BACKUP_WRITE_FAILED', 'no write perm');
      expect(e).toBeInstanceOf(CliError);
      expect(e.exitCode).toBe(4);
      expect(e.name).toBe('BackupError');
    });
  });

  it('error types can be caught by their base class', () => {
    try {
      throw new FetcherError('X', 'y');
    } catch (e) {
      expect(e instanceof CliError).toBe(true);
      expect(e instanceof Error).toBe(true);
    }
  });
});
