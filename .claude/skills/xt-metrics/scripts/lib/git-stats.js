/**
 * git-stats.js — git 代码变更统计
 *
 * 负责：
 * - git log --numstat 增量统计（按时间范围）
 * - git diff --name-status 文件变更统计
 * - 汇总 lines_added / lines_deleted / files_changed
 */

const { execSync } = require('child_process')

/**
 * 获取增量 git 代码统计（基于时间范围）
 * @param {string} projectRoot - 项目根目录
 * @param {string} [since] - ISO 8601 时间戳，仅统计此时间后的提交
 * @param {string} [until] - ISO 8601 时间戳，统计到此时间为止
 * @returns {{ success: boolean, data: object|null, error: string|null }}
 */
function getGitStats(projectRoot, since, until) {
  try {
    // 构建 git log 命令
    let cmd = 'git log --numstat --format="%H|%aI"'

    if (since) {
      cmd += ` --since="${since}"`
    }
    if (until) {
      cmd += ` --until="${until}"`
    }

    const output = execSync(cmd, {
      encoding: 'utf-8',
      cwd: projectRoot,
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const stats = parseGitLogOutput(output)
    return { success: true, data: stats, error: null }
  } catch (err) {
    // git log 可能因为没有匹配的提交返回非零退出码
    if (err.status === 128) {
      return { success: true, data: emptyStats(), error: null }
    }
    return { success: false, data: null, error: `git log 统计失败: ${err.message}` }
  }
}

/**
 * 获取文件变更统计（基于 commit 范围）
 * @param {string} projectRoot - 项目根目录
 * @param {string} fromSha - 起始 commit SHA
 * @param {string} toSha - 结束 commit SHA（默认 HEAD）
 * @returns {{ success: boolean, data: object|null, error: string|null }}
 */
function getFileStats(projectRoot, fromSha, toSha = 'HEAD') {
  try {
    const cmd = `git diff --name-status ${fromSha}..${toSha}`
    const output = execSync(cmd, {
      encoding: 'utf-8',
      cwd: projectRoot,
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const stats = parseDiffNameStatus(output)
    return { success: true, data: stats, error: null }
  } catch (err) {
    return { success: false, data: null, error: `git diff 统计失败: ${err.message}` }
  }
}

/**
 * 解析 git log --numstat 输出
 * @param {string} output - git log 输出
 * @returns {object} 统计结果
 */
function parseGitLogOutput(output) {
  const stats = emptyStats()
  const commits = []

  let currentCommit = null

  for (const line of output.split('\n')) {
    // 提交头行：SHA|日期
    const headerMatch = line.match(/^([0-9a-f]+)\|(.+)$/)
    if (headerMatch) {
      if (currentCommit) {
        commits.push(currentCommit)
      }
      currentCommit = {
        sha: headerMatch[1],
        date: headerMatch[2],
        lines_added: 0,
        lines_deleted: 0,
        files_changed: 0,
      }
      continue
    }

    // numstat 行：added\tdeleted\tfilename
    const numstatMatch = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)
    if (numstatMatch && currentCommit) {
      const added = numstatMatch[1] === '-' ? 0 : parseInt(numstatMatch[1], 10)
      const deleted = numstatMatch[2] === '-' ? 0 : parseInt(numstatMatch[2], 10)
      currentCommit.lines_added += added
      currentCommit.lines_deleted += deleted
      currentCommit.files_changed += 1
    }
  }

  if (currentCommit) {
    commits.push(currentCommit)
  }

  // 汇总
  for (const commit of commits) {
    stats.lines_added += commit.lines_added
    stats.lines_deleted += commit.lines_deleted
    stats.files_changed += commit.files_changed
  }

  stats.commit_count = commits.length
  stats.commits = commits

  return stats
}

/**
 * 解析 git diff --name-status 输出
 * @param {string} output - git diff 输出
 * @returns {object} 文件统计结果
 */
function parseDiffNameStatus(output) {
  const result = {
    files_added: 0,
    files_modified: 0,
    files_deleted: 0,
    files_renamed: 0,
    total_files_changed: 0,
    details: [],
  }

  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const match = trimmed.match(/^([AMDRT])\t(.+)$/)
    if (!match) continue

    const status = match[1]
    const filepath = match[2]

    result.details.push({ status, filepath })
    result.total_files_changed += 1

    switch (status) {
      case 'A': result.files_added += 1; break
      case 'M': result.files_modified += 1; break
      case 'D': result.files_deleted += 1; break
      case 'R': result.files_renamed += 1; break
      case 'T': result.files_modified += 1; break // 类型变更视为修改
    }
  }

  return result
}

/**
 * 返回空统计对象
 * @returns {object}
 */
function emptyStats() {
  return {
    lines_added: 0,
    lines_deleted: 0,
    files_changed: 0,
    commit_count: 0,
    commits: [],
  }
}

module.exports = {
  getGitStats,
  getFileStats,
  parseGitLogOutput,
  parseDiffNameStatus,
  emptyStats,
}
