/**
 * attributor.js — sdd 变更时间窗口归因计算
 *
 * 负责：
 * - 扫描 openspec/changes/ 下所有 sdd-state.yaml 提取变更时间窗口
 * - 单一活跃变更归因
 * - 多变更并发时按时间窗口比例分配 + 标记 attribution: shared
 * - 无活跃变更时归因到 _unattributed
 */

const fs = require('fs')
const path = require('path')
const { parseSimpleYaml } = require('./cutoff')

/**
 * 扫描所有 sdd 变更的时间窗口
 * @param {string} projectRoot - 项目根目录
 * @returns {Array<{ name: string, start_time: string|null, end_time: string|null, phase: string }>}
 */
function scanChangeTimeWindows(projectRoot) {
  const changesDir = path.join(projectRoot, 'openspec', 'changes')
  const changes = []

  if (!fs.existsSync(changesDir)) {
    return changes
  }

  const entries = fs.readdirSync(changesDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const stateFile = path.join(changesDir, entry.name, 'sdd-state.yaml')
    if (!fs.existsSync(stateFile)) continue

    try {
      const content = fs.readFileSync(stateFile, 'utf-8')
      const data = parseSimpleYaml(content)

      // 提取时间窗口信息
      const startTime = data.start_time || null
      const endTime = data.end_time || null
      const phase = data.phase || 'unknown'

      // 跳过归档目录中的变更（通常在 archive/ 子目录）
      if (entry.name === 'archive') continue

      changes.push({
        name: entry.name,
        start_time: startTime,
        end_time: endTime,
        phase,
      })
    } catch (err) {
      // 跳过解析失败的变更
      continue
    }
  }

  return changes
}

/**
 * 将 token 和代码统计归因到 sdd 变更
 * @param {object} tokenData - token 统计数据（input_tokens, output_tokens, total_tokens, estimated_cost_usd）
 * @param {object} codeData - 代码统计数据（lines_added, lines_deleted, files_changed, commits）
 * @param {Array} changes - 变更时间窗口列表（来自 scanChangeTimeWindows）
 * @param {string} fromTime - 查询起始时间
 * @param {string} toTime - 查询结束时间
 * @returns {object} 归因结果
 */
function attributeToChanges(tokenData, codeData, changes, fromTime, toTime) {
  // 计算查询时间范围的总时长（秒）
  const totalRangeSeconds = timeRangeSeconds(fromTime, toTime)
  if (totalRangeSeconds <= 0) {
    return buildUnattributedResult(tokenData, codeData, '查询时间范围无效')
  }

  // 找出在查询时间范围内活跃的变更
  const activeChanges = changes.filter(c => isChangeActiveInWindow(c, fromTime, toTime))

  if (activeChanges.length === 0) {
    return buildUnattributedResult(tokenData, codeData, '查询时间范围内无活跃的 sdd 变更')
  }

  if (activeChanges.length === 1) {
    return buildSingleAttribution(activeChanges[0], tokenData, codeData)
  }

  return buildSharedAttribution(activeChanges, tokenData, codeData, fromTime, toTime, totalRangeSeconds)
}

/**
 * 判断变更在给定时间窗口内是否活跃
 * @param {object} change - 变更信息
 * @param {string} fromTime - 窗口起始时间
 * @param {string} toTime - 窗口结束时间
 * @returns {boolean}
 */
function isChangeActiveInWindow(change, fromTime, toTime) {
  const start = change.start_time
  const end = change.end_time

  // 变更开始时间在查询窗口内
  if (start && start >= fromTime && start <= toTime) return true

  // 变更结束时间在查询窗口内
  if (end && end >= fromTime && end <= toTime) return true

  // 变更横跨整个查询窗口（开始早于窗口，结束晚于窗口或仍在进行中）
  if (start && start <= fromTime && (!end || end >= toTime)) return true

  return false
}

/**
 * 计算变更在查询窗口内的活跃时长（秒）
 * @param {object} change - 变更信息
 * @param {string} fromTime - 窗口起始时间
 * @param {string} toTime - 窗口结束时间
 * @returns {number} 活跃时长（秒）
 */
function changeActiveSeconds(change, fromTime, toTime) {
  const effectiveStart = change.start_time && change.start_time > fromTime
    ? change.start_time
    : fromTime
  const effectiveEnd = change.end_time && change.end_time < toTime
    ? change.end_time
    : toTime

  return timeRangeSeconds(effectiveStart, effectiveEnd)
}

/**
 * 构建单一变更归因结果
 */
function buildSingleAttribution(change, tokenData, codeData) {
  return {
    attribution_type: 'single',
    changes: [
      {
        name: change.name,
        attribution: 'exclusive',
        token: {
          input_tokens: tokenData.input_tokens || 0,
          output_tokens: tokenData.output_tokens || 0,
          total_tokens: tokenData.total_tokens || 0,
          estimated_cost_usd: tokenData.estimated_cost_usd || null,
        },
        code: {
          lines_added: codeData.lines_added || 0,
          lines_deleted: codeData.lines_deleted || 0,
          files_changed: codeData.files_changed || 0,
          commit_count: codeData.commit_count || 0,
        },
      },
    ],
    unattributed: null,
  }
}

/**
 * 构建多变更共享归因结果（按时间窗口比例分配）
 */
function buildSharedAttribution(activeChanges, tokenData, codeData, fromTime, toTime, totalRangeSeconds) {
  // 计算每个变更的活跃时长
  const changeDurations = activeChanges.map(c => ({
    change: c,
    activeSeconds: changeActiveSeconds(c, fromTime, toTime),
  }))

  const totalActiveSeconds = changeDurations.reduce((sum, cd) => sum + cd.activeSeconds, 0)

  const changes = changeDurations.map(cd => {
    const ratio = totalActiveSeconds > 0 ? cd.activeSeconds / totalActiveSeconds : 1 / activeChanges.length

    return {
      name: cd.change.name,
      attribution: 'shared',
      share_ratio: Math.round(ratio * 10000) / 10000, // 保留4位小数
      active_seconds: cd.activeSeconds,
      token: {
        input_tokens: Math.round((tokenData.input_tokens || 0) * ratio),
        output_tokens: Math.round((tokenData.output_tokens || 0) * ratio),
        total_tokens: Math.round((tokenData.total_tokens || 0) * ratio),
        estimated_cost_usd: tokenData.estimated_cost_usd
          ? Math.round(tokenData.estimated_cost_usd * ratio * 10000) / 10000
          : null,
      },
      code: {
        lines_added: Math.round((codeData.lines_added || 0) * ratio),
        lines_deleted: Math.round((codeData.lines_deleted || 0) * ratio),
        files_changed: Math.round((codeData.files_changed || 0) * ratio),
        commit_count: codeData.commit_count || 0,
      },
    }
  })

  return {
    attribution_type: 'shared',
    total_active_changes: activeChanges.length,
    changes,
    unattributed: null,
  }
}

/**
 * 构建无归因结果
 */
function buildUnattributedResult(tokenData, codeData, reason) {
  return {
    attribution_type: 'unattributed',
    changes: [],
    unattributed: {
      reason,
      token: {
        input_tokens: tokenData.input_tokens || 0,
        output_tokens: tokenData.output_tokens || 0,
        total_tokens: tokenData.total_tokens || 0,
        estimated_cost_usd: tokenData.estimated_cost_usd || null,
      },
      code: {
        lines_added: codeData.lines_added || 0,
        lines_deleted: codeData.lines_deleted || 0,
        files_changed: codeData.files_changed || 0,
        commit_count: codeData.commit_count || 0,
      },
    },
  }
}

/**
 * 计算两个 ISO 8601 时间戳之间的秒数
 * @param {string} from - ISO 8601 起始时间
 * @param {string} to - ISO 8601 结束时间
 * @returns {number} 秒数
 */
function timeRangeSeconds(from, to) {
  try {
    const fromDate = new Date(from)
    const toDate = new Date(to)
    return Math.max(0, (toDate - fromDate) / 1000)
  } catch {
    return 0
  }
}

module.exports = {
  scanChangeTimeWindows,
  attributeToChanges,
  isChangeActiveInWindow,
  changeActiveSeconds,
  timeRangeSeconds,
}
