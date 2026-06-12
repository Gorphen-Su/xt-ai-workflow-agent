/**
 * ccusage.js — ccusage session 查询 + JSON 解析
 *
 * 负责：
 * - 检测 ccusage 是否可用
 * - 执行 `npx ccusage session --json` 查询 token 数据
 * - 解析 JSON 输出，提取 input_tokens 和 output_tokens
 * - 超时处理和不可用降级
 * - 自动安装 ccusage
 */

const { execSync } = require('child_process')

const CCUSAGE_TIMEOUT_MS = 120000 // 2 分钟超时

/**
 * 检测 ccusage 是否可用
 * @returns {{ available: boolean, version: string|null, error: string|null }}
 */
function checkCcusageAvailable() {
  try {
    const output = execSync('npx ccusage --version', {
      encoding: 'utf-8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const version = output.trim()
    return { available: true, version, error: null }
  } catch (err) {
    return { available: false, version: null, error: err.message }
  }
}

/**
 * 尝试自动安装 ccusage
 * @returns {{ success: boolean, error: string|null }}
 */
function autoInstallCcusage() {
  try {
    execSync('npm install -g ccusage', {
      encoding: 'utf-8',
      timeout: 180000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    // 安装后验证
    const check = checkCcusageAvailable()
    return { success: check.available, error: check.available ? null : '安装后验证失败' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 查询 ccusage session 数据
 * @param {string} [since] - ISO 8601 时间戳，仅查询此时间后的数据（增量查询）
 * @returns {{ success: boolean, data: object|null, error: string|null }}
 */
function queryCcusageSession(since) {
  try {
    const cmd = 'npx ccusage session --json'
    const output = execSync(cmd, {
      encoding: 'utf-8',
      timeout: CCUSAGE_TIMEOUT_MS,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 50 * 1024 * 1024, // 50MB 缓冲
    })

    const rawData = JSON.parse(output)
    const tokenData = extractTokenData(rawData, since)

    // 格式校验日志：标记使用的解析格式，便于排查 ccusage 版本兼容问题
    if (tokenData.raw_format === 'unknown') {
      tokenData._format_warning = 'ccusage session 输出格式未匹配已知模式，使用兜底解析。如数据异常请检查 ccusage 版本兼容性'
    }

    return { success: true, data: tokenData, error: null }
  } catch (err) {
    if (err.killed) {
      return { success: false, data: null, error: `ccusage 查询超时（${CCUSAGE_TIMEOUT_MS / 1000}s）` }
    }
    return { success: false, data: null, error: `ccusage 查询失败: ${err.message}` }
  }
}

/**
 * 从 ccusage session JSON 中提取 token 数据
 * @param {object} rawData - ccusage session --json 的原始输出
 * @param {string} [since] - 增量查询的截止时间
 * @returns {object} 提取后的 token 数据
 */
function extractTokenData(rawData, since) {
  // ccusage session 输出格式可能因版本而异
  // 尝试多种常见格式

  // 格式1: { sessions: [{ date, input_tokens, output_tokens, ... }] }
  if (rawData.sessions && Array.isArray(rawData.sessions)) {
    const sessions = since
      ? rawData.sessions.filter(s => s.date >= since)
      : rawData.sessions

    const input_tokens = sessions.reduce((sum, s) => sum + (s.input_tokens || 0), 0)
    const output_tokens = sessions.reduce((sum, s) => sum + (s.output_tokens || 0), 0)
    const cost_usd = sessions.reduce((sum, s) => sum + (s.cost_usd || 0), 0)

    return {
      input_tokens,
      output_tokens,
      total_tokens: input_tokens + output_tokens,
      estimated_cost_usd: cost_usd || null,
      session_count: sessions.length,
      is_incremental: !!since,
    }
  }

  // 格式2: { total_input_tokens, total_output_tokens, total_cost_usd, ... }
  if (rawData.total_input_tokens !== undefined) {
    return {
      input_tokens: rawData.total_input_tokens || 0,
      output_tokens: rawData.total_output_tokens || 0,
      total_tokens: (rawData.total_input_tokens || 0) + (rawData.total_output_tokens || 0),
      estimated_cost_usd: rawData.total_cost_usd || null,
      session_count: rawData.session_count || null,
      is_incremental: false,
    }
  }

  // 格式3: 直接返回原始数据，标记为未知格式
  return {
    input_tokens: rawData.input_tokens || 0,
    output_tokens: rawData.output_tokens || 0,
    total_tokens: (rawData.input_tokens || 0) + (rawData.output_tokens || 0),
    estimated_cost_usd: rawData.cost_usd || rawData.estimated_cost_usd || null,
    session_count: null,
    is_incremental: false,
    raw_format: 'unknown',
  }
}

/**
 * 获取 ccusage 状态（可用性检查 + 自动安装）
 * @param {boolean} tryAutoInstall - 是否尝试自动安装
 * @returns {{ available: boolean, autoInstalled: boolean, version: string|null, error: string|null }}
 */
function ensureCcusageAvailable(tryAutoInstall = true) {
  const check = checkCcusageAvailable()
  if (check.available) {
    return { available: true, autoInstalled: false, version: check.version, error: null }
  }

  if (tryAutoInstall) {
    const install = autoInstallCcusage()
    if (install.success) {
      const recheck = checkCcusageAvailable()
      return {
        available: true,
        autoInstalled: true,
        version: recheck.version,
        error: null,
      }
    }
    return {
      available: false,
      autoInstalled: false,
      version: null,
      error: `ccusage 自动安装失败: ${install.error}，请手动运行 npm install -g ccusage`,
    }
  }

  return { available: false, autoInstalled: false, version: null, error: check.error }
}

module.exports = {
  checkCcusageAvailable,
  autoInstallCcusage,
  queryCcusageSession,
  extractTokenData,
  ensureCcusageAvailable,
}
