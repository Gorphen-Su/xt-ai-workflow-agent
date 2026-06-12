#!/usr/bin/env node
/**
 * summary.js — xt-metrics summary 子命令入口
 *
 * 用法: node summary.js --project-root <path>
 *
 * 读取 history.yaml，输出统计摘要 JSON。
 */

const path = require('path')
const fs = require('fs')
const { parseHistoryYaml } = require('./lib/report-writer')

function parseArgs(args) {
  const parsed = { projectRoot: null }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project-root' && args[i + 1]) {
      parsed.projectRoot = args[i + 1]
      i++
    }
  }

  return parsed
}

function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!args.projectRoot) {
    outputError('缺少 --project-root 参数')
    process.exit(1)
  }

  const projectRoot = path.resolve(args.projectRoot)
  const historyPath = path.join(projectRoot, 'openspec', 'metrics', 'history.yaml')

  // 检查 history.yaml 是否存在
  if (!fs.existsSync(historyPath)) {
    const output = {
      success: true,
      has_data: false,
      message: '尚无统计数据，请先运行 /xt-metrics report',
    }
    console.log(JSON.stringify(output, null, 2))
    return
  }

  // 读取 history
  try {
    const content = fs.readFileSync(historyPath, 'utf-8')
    const history = parseHistoryYaml(content)

    if (!history.records || history.records.length === 0) {
      const output = {
        success: true,
        has_data: false,
        message: '尚无统计数据，请先运行 /xt-metrics report',
      }
      console.log(JSON.stringify(output, null, 2))
      return
    }

    // 计算汇总
    const latestRecord = history.records[history.records.length - 1]
    const totalTokens = history.records.reduce((sum, r) => sum + (r.total_tokens || 0), 0)
    const totalCostUsd = history.records.reduce((sum, r) => sum + (r.total_cost_usd || 0), 0)
    const totalChanges = history.records.reduce((sum, r) => sum + (r.changes_count || 0), 0)

    const output = {
      success: true,
      has_data: true,
      last_query_time: latestRecord.date,
      query_count: history.records.length,
      cumulative: {
        total_tokens: totalTokens,
        total_cost_usd: Math.round(totalCostUsd * 10000) / 10000,
        total_changes: totalChanges,
      },
      recent_queries: history.records.slice(-5).reverse().map(r => ({
        date: r.date,
        from: r.query_range?.from,
        to: r.query_range?.to,
        total_tokens: r.total_tokens,
        total_cost_usd: r.total_cost_usd,
        changes_count: r.changes_count,
      })),
    }

    console.log(JSON.stringify(output, null, 2))
  } catch (err) {
    outputError(`读取 history.yaml 失败: ${err.message}`)
    process.exit(1)
  }
}

function outputError(message) {
  console.error(JSON.stringify({ success: false, error: message }))
}

main()
