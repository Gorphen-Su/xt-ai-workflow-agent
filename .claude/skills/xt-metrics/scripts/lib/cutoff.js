/**
 * cutoff.js — cutoff.yaml 读写逻辑
 *
 * 负责 openspec/metrics/cutoff.yaml 的读取、创建、更新、损坏检测与重建。
 *
 * cutoff.yaml 结构：
 * ```yaml
 * version: 1
 * last_query_time: <ISO 8601 或 null>
 * ccusage_available: <true 或 false>
 * ccusage_auto_installed: <true 或 false>
 * ```
 */

const fs = require('fs')
const path = require('path')

const CUTOFF_FILENAME = 'cutoff.yaml'

/**
 * 解析简单的 YAML 文件（仅支持顶层标量键值对）
 * @param {string} content - YAML 文件内容
 * @returns {object} 解析后的对象
 */
function parseSimpleYaml(content) {
  const result = {}
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^(\w+):\s*(.*)$/)
    if (match) {
      const key = match[1]
      let value = match[2].trim()
      // 去除引号
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      // 类型转换
      if (value === 'null' || value === '') result[key] = null
      else if (value === 'true') result[key] = true
      else if (value === 'false') result[key] = false
      else result[key] = value
    }
  }
  return result
}

/**
 * 将简单对象序列化为 YAML 字符串
 * @param {object} obj - 要序列化的对象
 * @returns {string} YAML 字符串
 */
function stringifySimpleYaml(obj) {
  const lines = ['version: 1']
  for (const [key, value] of Object.entries(obj)) {
    if (value === null) {
      lines.push(`${key}: null`)
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`)
    } else if (typeof value === 'string' && value.includes('T') && value.includes(':')) {
      // ISO 时间戳加引号
      lines.push(`${key}: "${value}"`)
    } else {
      lines.push(`${key}: ${value}`)
    }
  }
  return lines.join('\n') + '\n'
}

/**
 * 读取 cutoff.yaml
 * @param {string} metricsDir - openspec/metrics/ 目录路径
 * @returns {{ data: object|null, damaged: boolean, error: string|null }}
 */
function readCutoff(metricsDir) {
  const filePath = path.join(metricsDir, CUTOFF_FILENAME)

  if (!fs.existsSync(filePath)) {
    return { data: null, damaged: false, error: 'cutoff.yaml 不存在' }
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = parseSimpleYaml(content)

    // 基本结构验证
    if (!('version' in data) && !('last_query_time' in data)) {
      return { data: null, damaged: true, error: 'cutoff.yaml 格式错误：缺少必要字段' }
    }

    return { data, damaged: false, error: null }
  } catch (err) {
    return { data: null, damaged: true, error: `读取 cutoff.yaml 失败: ${err.message}` }
  }
}

/**
 * 创建或重建 cutoff.yaml
 * @param {string} metricsDir - openspec/metrics/ 目录路径
 * @param {object} options - 初始选项
 * @param {boolean} options.ccusageAvailable - ccusage 是否可用
 * @param {boolean} options.ccusageAutoInstalled - 是否自动安装了 ccusage
 * @returns {object} 创建的 cutoff 数据
 */
function createCutoff(metricsDir, options = {}) {
  const data = {
    last_query_time: null,
    ccusage_available: options.ccusageAvailable ?? false,
    ccusage_auto_installed: options.ccusageAutoInstalled ?? false,
  }

  // 确保目录存在
  if (!fs.existsSync(metricsDir)) {
    fs.mkdirSync(metricsDir, { recursive: true })
  }

  const filePath = path.join(metricsDir, CUTOFF_FILENAME)
  fs.writeFileSync(filePath, stringifySimpleYaml(data), 'utf-8')

  return data
}

/**
 * 更新 cutoff.yaml 的 last_query_time
 * @param {string} metricsDir - openspec/metrics/ 目录路径
 * @param {string} timestamp - ISO 8601 时间戳
 * @returns {boolean} 更新是否成功
 */
function updateLastQueryTime(metricsDir, timestamp) {
  const { data, damaged, error } = readCutoff(metricsDir)
  if (damaged || !data) {
    return false
  }

  data.last_query_time = timestamp
  const filePath = path.join(metricsDir, CUTOFF_FILENAME)
  fs.writeFileSync(filePath, stringifySimpleYaml(data), 'utf-8')
  return true
}

/**
 * 读取或初始化 cutoff（智能入口）
 * - cutoff 不存在 → 创建并返回
 * - cutoff 损坏 → 重建并返回（标记 cutoff_reset）
 * - cutoff 正常 → 返回现有数据
 * @param {string} metricsDir - openspec/metrics/ 目录路径
 * @param {object} options - 初始选项（仅在创建时使用）
 * @returns {{ data: object, cutoffReset: boolean }}
 */
function readOrCreateCutoff(metricsDir, options = {}) {
  const { data, damaged, error } = readCutoff(metricsDir)

  // 不存在 → 首次创建
  if (!data && !damaged) {
    const newData = createCutoff(metricsDir, options)
    return { data: newData, cutoffReset: false }
  }

  // 损坏 → 重建
  if (damaged) {
    const newData = createCutoff(metricsDir, options)
    return { data: newData, cutoffReset: true }
  }

  // 正常
  return { data, cutoffReset: false }
}

module.exports = {
  readCutoff,
  createCutoff,
  updateLastQueryTime,
  readOrCreateCutoff,
  parseSimpleYaml,
  stringifySimpleYaml,
}
