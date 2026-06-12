/**
 * report-writer.js — 报告 YAML 生成 + history.yaml 更新
 *
 * 负责：
 * - 生成 openspec/metrics/reports/<YYYY-MM-DD>.yaml 报告文件
 * - 同一天多次查询时使用 YYYY-MM-DD-HHMMSS 格式
 * - 更新 openspec/metrics/history.yaml 历史索引
 * - 调用 cutoff 模块更新截止时间
 */

const fs = require('fs')
const path = require('path')
const { parseSimpleYaml, stringifySimpleYaml, updateLastQueryTime } = require('./cutoff')

/**
 * 生成报告文件
 * @param {string} metricsDir - openspec/metrics/ 目录路径
 * @param {object} reportData - 报告数据
 * @returns {{ success: boolean, filePath: string|null, error: string|null }}
 */
function writeReport(metricsDir, reportData) {
  // 确保报告目录存在
  const reportsDir = path.join(metricsDir, 'reports')
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }

  // 生成文件名
  const filename = generateReportFilename(reportsDir, reportData.query_time_range.to)
  const filePath = path.join(reportsDir, filename)

  // 序列化为 YAML
  const content = stringifyReport(reportData)

  try {
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true, filePath, error: null }
  } catch (err) {
    return { success: false, filePath: null, error: `写入报告文件失败: ${err.message}` }
  }
}

/**
 * 生成报告文件名
 * 同一天首次：YYYY-MM-DD.yaml
 * 同一天多次：YYYY-MM-DD-HHMMSS.yaml
 * @param {string} reportsDir - 报告目录
 * @param {string} timestamp - ISO 8601 时间戳
 * @returns {string} 文件名
 */
function generateReportFilename(reportsDir, timestamp) {
  const date = new Date(timestamp)
  const dateStr = date.toISOString().slice(0, 10) // YYYY-MM-DD
  const baseName = `${dateStr}.yaml`

  // 检查是否已有当天报告
  if (!fs.existsSync(path.join(reportsDir, baseName))) {
    return baseName
  }

  // 同一天多次查询，使用时间戳后缀
  const timeStr = date.toISOString().replace(/[-:T]/g, '').slice(0, 14) // YYYYMMDDHHMMSS
  return `${dateStr}-${timeStr.slice(8)}.yaml`
}

/**
 * 将报告数据序列化为 YAML 字符串
 * @param {object} data - 报告数据
 * @returns {string} YAML 字符串
 */
function stringifyReport(data) {
  const lines = [
    '# xt-metrics 统计报告',
    `# 生成时间: ${data.generated_at}`,
    '',
    'version: 1',
    '',
    `generated_at: "${data.generated_at}"`,
    `cutoff_reset: ${data.cutoff_reset || false}`,
    '',
    'query_time_range:',
    `  from: "${data.query_time_range.from || 'beginning'}"`,
    `  to: "${data.query_time_range.to}"`,
    '',
  ]

  // Token 汇总
  lines.push('# Token 统计')
  lines.push('token:')
  if (data.token.unavailable) {
    lines.push('  unavailable: true')
  } else {
    lines.push(`  input_tokens: ${data.token.input_tokens || 0}`)
    lines.push(`  output_tokens: ${data.token.output_tokens || 0}`)
    lines.push(`  total_tokens: ${data.token.total_tokens || 0}`)
    lines.push(`  estimated_cost_usd: ${data.token.estimated_cost_usd !== null ? data.token.estimated_cost_usd : 'null'}`)
  }
  lines.push('')

  // 代码统计
  lines.push('# 代码统计')
  lines.push('code:')
  lines.push(`  lines_added: ${data.code.lines_added || 0}`)
  lines.push(`  lines_deleted: ${data.code.lines_deleted || 0}`)
  lines.push(`  files_changed: ${data.code.files_changed || 0}`)
  lines.push(`  commit_count: ${data.code.commit_count || 0}`)
  lines.push('')

  // 归因明细
  lines.push('# 成本归因')
  lines.push('attribution:')
  lines.push(`  type: ${data.attribution.attribution_type}`)
  if (data.attribution.total_active_changes) {
    lines.push(`  total_active_changes: ${data.attribution.total_active_changes}`)
  }
  lines.push('')

  // 变更明细
  if (data.attribution.changes && data.attribution.changes.length > 0) {
    for (const change of data.attribution.changes) {
      lines.push(`  - name: "${change.name}"`)
      lines.push(`    attribution: ${change.attribution}`)
      if (change.share_ratio !== undefined) {
        lines.push(`    share_ratio: ${change.share_ratio}`)
      }
      lines.push('    token:')
      lines.push(`      input_tokens: ${change.token.input_tokens}`)
      lines.push(`      output_tokens: ${change.token.output_tokens}`)
      lines.push(`      total_tokens: ${change.token.total_tokens}`)
      lines.push(`      estimated_cost_usd: ${change.token.estimated_cost_usd !== null ? change.token.estimated_cost_usd : 'null'}`)
      lines.push('    code:')
      lines.push(`      lines_added: ${change.code.lines_added}`)
      lines.push(`      lines_deleted: ${change.code.lines_deleted}`)
      lines.push(`      files_changed: ${change.code.files_changed}`)
      lines.push('')
    }
  }

  // 无归因部分
  if (data.attribution.unattributed) {
    lines.push('  unattributed:')
    lines.push(`    reason: "${data.attribution.unattributed.reason}"`)
    lines.push('    token:')
    lines.push(`      input_tokens: ${data.attribution.unattributed.token.input_tokens}`)
    lines.push(`      output_tokens: ${data.attribution.unattributed.token.output_tokens}`)
    lines.push(`      total_tokens: ${data.attribution.unattributed.token.total_tokens}`)
    lines.push(`      estimated_cost_usd: ${data.attribution.unattributed.token.estimated_cost_usd !== null ? data.attribution.unattributed.token.estimated_cost_usd : 'null'}`)
    lines.push('')
  }

  return lines.join('\n') + '\n'
}

/**
 * 更新 history.yaml
 * @param {string} metricsDir - openspec/metrics/ 目录路径
 * @param {object} reportData - 报告数据（用于提取摘要信息）
 * @returns {{ success: boolean, error: string|null }}
 */
function updateHistory(metricsDir, reportData) {
  const historyPath = path.join(metricsDir, 'history.yaml')

  // 读取现有历史
  let history = { version: 1, records: [] }
  if (fs.existsSync(historyPath)) {
    try {
      const content = fs.readFileSync(historyPath, 'utf-8')
      history = parseHistoryYaml(content)
    } catch {
      // 损坏则重建
      history = { version: 1, records: [] }
    }
  }

  // 添加新记录
  const record = {
    date: reportData.generated_at,
    query_range: {
      from: reportData.query_time_range.from || 'beginning',
      to: reportData.query_time_range.to,
    },
    total_tokens: reportData.token.total_tokens || 0,
    total_cost_usd: reportData.token.estimated_cost_usd || 0,
    changes_count: reportData.attribution.changes
      ? reportData.attribution.changes.length
      : 0,
  }

  history.records.push(record)

  // 写入
  try {
    const content = stringifyHistory(history)
    fs.writeFileSync(historyPath, content, 'utf-8')
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: `更新 history.yaml 失败: ${err.message}` }
  }
}

/**
 * 解析 history.yaml
 * @param {string} content - YAML 内容
 * @returns {object}
 */
function parseHistoryYaml(content) {
  // 简单解析：提取 records 数组
  const result = { version: 1, records: [] }
  let currentRecord = null

  for (const line of content.split('\n')) {
    const trimmed = line.trim()

    // 新记录开始
    if (trimmed.startsWith('- date:')) {
      if (currentRecord) result.records.push(currentRecord)
      const dateVal = trimmed.replace('- date:', '').trim().replace(/"/g, '')
      currentRecord = { date: dateVal === 'null' ? null : dateVal }
      continue
    }

    if (!currentRecord) continue

    // 解析字段
    const fieldMatch = trimmed.match(/^(\w+):\s*(.*)$/)
    if (fieldMatch) {
      const key = fieldMatch[1]
      const value = fieldMatch[2].trim().replace(/"/g, '')
      if (key === 'from' || key === 'to') {
        if (!currentRecord.query_range) currentRecord.query_range = {}
        currentRecord.query_range[key] = value === 'null' ? null : value
      } else if (['total_tokens', 'total_cost_usd', 'changes_count'].includes(key)) {
        currentRecord[key] = value === 'null' ? null : (parseFloat(value) || 0)
      }
    }
  }

  if (currentRecord) result.records.push(currentRecord)
  return result
}

/**
 * 序列化 history 为 YAML
 * @param {object} history
 * @returns {string}
 */
function stringifyHistory(history) {
  const lines = [
    '# xt-metrics 历史记录索引',
    'version: 1',
    '',
  ]

  for (const record of history.records) {
    lines.push(`- date: "${record.date}"`)
    lines.push(`  from: "${record.query_range?.from || 'beginning'}"`)
    lines.push(`  to: "${record.query_range?.to || ''}"`)
    lines.push(`  total_tokens: ${record.total_tokens || 0}`)
    lines.push(`  total_cost_usd: ${record.total_cost_usd || 0}`)
    lines.push(`  changes_count: ${record.changes_count || 0}`)
    lines.push('')
  }

  return lines.join('\n') + '\n'
}

/**
 * 完成报告写入流程：写报告 + 更新历史 + 更新 cutoff
 * @param {string} metricsDir - openspec/metrics/ 目录路径
 * @param {object} reportData - 报告数据
 * @returns {{ success: boolean, reportPath: string|null, errors: string[] }}
 */
function finalizeReport(metricsDir, reportData) {
  const errors = []

  // 1. 写入报告文件
  const reportResult = writeReport(metricsDir, reportData)
  if (!reportResult.success) {
    errors.push(reportResult.error)
  }

  // 2. 更新历史
  const historyResult = updateHistory(metricsDir, reportData)
  if (!historyResult.success) {
    errors.push(historyResult.error)
  }

  // 3. 更新 cutoff（仅成功时更新）
  if (errors.length === 0 && reportData.query_time_range.to) {
    const cutoffUpdated = updateLastQueryTime(metricsDir, reportData.query_time_range.to)
    if (!cutoffUpdated) {
      errors.push('更新 cutoff.yaml 失败')
    }
  }

  return {
    success: errors.length === 0,
    reportPath: reportResult.filePath,
    errors,
  }
}

module.exports = {
  writeReport,
  generateReportFilename,
  stringifyReport,
  updateHistory,
  parseHistoryYaml,
  stringifyHistory,
  finalizeReport,
}
