// 统一错误类：所有 CLI 抛出的错误都继承 CliError，方便顶层 catch 转换为退出码。

export class CliError extends Error {
  /**
   * @param {string} code  错误码（大写下划线，如 'NETWORK_ERROR'）
   * @param {string} message 用户友好的错误描述
   * @param {object} [options]
   * @param {number} [options.exitCode=1] 退出码
   * @param {Error}  [options.cause] 原始错误
   */
  constructor(code, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'CliError';
    this.code = code;
    this.exitCode = typeof options.exitCode === 'number' ? options.exitCode : 1;
  }
}

export class FetcherError extends CliError {
  constructor(code, message, options = {}) {
    super(code, message, { exitCode: 2, ...options });
    this.name = 'FetcherError';
  }
}

export class InstallerError extends CliError {
  constructor(code, message, options = {}) {
    super(code, message, { exitCode: 1, ...options });
    this.name = 'InstallerError';
  }
}

export class BackupError extends CliError {
  constructor(code, message, options = {}) {
    super(code, message, { exitCode: 4, ...options });
    this.name = 'BackupError';
  }
}
