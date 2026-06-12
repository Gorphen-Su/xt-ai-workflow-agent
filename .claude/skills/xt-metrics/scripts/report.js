#!/usr/bin/env node
/**
 * report.js — xt-metrics report 子命令入口
 *
 * 用法: node report.js --project-root <path> [--from <iso-timestamp>]
 *
 * 执行流程：
 * 1. 确定项目根目录
 * 2. 读取或创建 cutoff.yaml
 * 3. 检测 ccusage 可用性
 * 4. 增量查询 token 数据（ccusage session）
 * 5. 增量查询 git 代码统计（git log --numstat）
 * 6. 扫描 openspec changes 提取时间窗口
 * 7. 成本归因计算
 * 8. 生成报告 + 更新 history + 更新 cutoff
 * 9. 输出 JSON 到 stdout
 */

const path = require('path')
const fs = require('fs')
const { readOrCreateCutoff } = require('./lib/cutoff')
const { ensureCcusageAvailable, queryCcusageSession } = require('./lib/ccusage')
const { getGitStats } = require('./lib/git-stats')
const { scanChangeTimeWindows, attributeToChanges } = require('./lib/attributor')
const { finalizeReport } = require('./lib/report-writer')

// 解析命令行参数
function parseArgs(args) {
  const parsed = {
    projectRoot: null,
    from: null,
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project-root' && args[i + 1]) {
      parsed.projectRoot = args[i + 1]
      i++
    } else if (args[i] === '--from' && args[i + 1]) {
      parsed.from = args[i + 1]
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
  if (!fs.existsSync(path.join(projectRoot, '.git'))) {
    outputError(`不是有效的 Git 仓库: ${projectRoot}`)
    process.exit(1)
  }

  const metricsDir = path.join(projectRoot, 'openspec', 'metrics')

  // 当前时间戳
  const now = new Date().toISOString()

  // 1. 读取或创建 cutoff
  const { data: cutoffData, cutoffReset } = readOrCreateCutoff(metricsDir, {})

  // 确定查询起始时间：优先使用命令行参数 > cutoff.last_query_time > null（全量）
  const fromTime = args.from || cutoffData.last_query_time || null

  // 2. 检测 ccusage 可用性
  const ccusageStatus = ensureCcusageAvailable(true)

  // 3. 查询 token 数据
  let tokenData = { unavailable: true, input_tokens: 0, output_tokens: 0, total_tokens: 0, estimated_cost_usd: null }
  if (ccusageStatus.available) {
    const sessionResult = queryCcusageSession(fromTime)
    if (sessionResult.success) {
      tokenData = sessionResult.data
      tokenData.unavailable = false
    } else {
      tokenData.unavailable = true
      tokenData.error = sessionResult.error
    }
  } else {
    tokenData.error = ccusageStatus.error
  }

  // 4. 查询 git 代码统计
  const gitResult = getGitStats(projectRoot, fromTime, now)
  const codeData = gitResult.success ? gitResult.data : {
    lines_added: 0,
    lines_deleted: 0,
    files_changed: 0,
    commit_count: 0,
    error: gitResult.error,
  }

  // 5. 扫描 sdd 变更时间窗口
  const changes = scanChangeTimeWindows(projectRoot)

  // 6. 成本归因
  const attribution = attributeToChanges(
    tokenData,
    codeData,
    changes,
    fromTime || '1970-01-01T00:00:00Z',
    now,
  )

  // 7. 构建报告数据
  const reportData = {
    generated_at: now,
    cutoff_reset: cutoffReset,
    query_time_range: {
      from: fromTime,
      to: now,
    },
    token: tokenData,
    code: codeData,
    attribution,
    ccusage: {
      available: ccusageStatus.available,
      auto_installed: ccusageStatus.autoInstalled,
      version: ccusageStatus.version,
    },
  }

  // 8. 写入报告 + 更新历史 + 更新 cutoff
  const finalizeResult = finalizeReport(metricsDir, reportData)

  // 9. 输出 JSON
  const output = {
    success: finalizeResult.success,
    report_path: finalizeResult.reportPath,
    generated_at: now,
    cutoff_reset: cutoffReset,
    query_time_range: reportData.query_time_range,
    token: {
      input_tokens: tokenData.input_tokens,
      output_tokens: tokenData.output_tokens,
      total_tokens: tokenData.total_tokens,
      estimated_cost_usd: tokenData.estimated_cost_usd,
      unavailable: tokenData.unavailable || false,
    },
    code: {
      lines_added: codeData.lines_added,
      lines_deleted: codeData.lines_deleted,
      files_changed: codeData.files_changed,
      commit_count: codeData.commit_count,
    },
    attribution: {
      type: attribution.attribution_type,
      changes: attribution.changes.map(c => ({
        name: c.name,
        attribution: c.attribution,
        share_ratio: c.share_ratio,
        total_tokens: c.token.total_tokens,
      })),
      unattributed: attribution.unattributed
        ? { reason: attribution.unattributed.reason, total_tokens: attribution.unattributed.token.total_tokens }
        : null,
    },
    ccusage: reportData.ccusage,
    errors: finalizeResult.errors.length > 0 ? finalizeResult.errors : undefined,
  }

  console.log(JSON.stringify(output, null, 2))
}

function outputError(message) {
  console.error(JSON.stringify({ success: false, error: message }))
}

main()
