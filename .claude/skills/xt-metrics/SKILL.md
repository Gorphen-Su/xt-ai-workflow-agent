---
name: xt-metrics
description: xt-metrics — 按需统计 xt-sdd 项目的 token 用量、代码变更和成本归因。用户主动调用，不阻塞开发流程。当用户说"统计"、"metrics"、"token 用量"、"成本"、"代码统计"、使用 /xt-metrics、/xt-metrics report 或 /xt-metrics summary 时触发。
---

# xt-metrics — 按需统计 Skill

独立按需统计 xt-sdd 项目的 token 用量、代码变更和成本归因。用户主动调用，不阻塞开发流程。

## 触发条件

- 用户说"统计"、"metrics"、"token 用量"、"成本"、"代码统计"等关键词
- 用户使用 `/xt-metrics` 命令
- 用户使用 `/xt-metrics report` 或 `/xt-metrics summary`

## 子命令

### `/xt-metrics report` — 增量统计报告

执行增量 token + 代码统计，生成报告并持久化。

**执行步骤：**

1. 确定项目根目录（当前工作目录或向上查找 `.git`）
2. 执行 `node .claude/skills/xt-metrics/scripts/report.js --project-root <projectRoot>`
   - Bash 调用 timeout 至少 120000ms（ccusage 查询可能耗时 45-60 秒）
3. 解析 stdout JSON 输出
4. 格式化展示统计结果：
   ```
   ## 📊 xt-metrics 统计报告

   **查询时间范围**: <from> ~ <to>
   **截止时间重置**: <是/否>

   ### Token 用量
   | 指标 | 数值 |
   |------|------|
   | 输入 Tokens | <input_tokens> |
   | 输出 Tokens | <output_tokens> |
   | 总 Tokens | <total_tokens> |
   | 预估费用 (USD) | <$estimated_cost_usd 或 "数据不可用"> |

   ### 代码变更
   | 指标 | 数值 |
   |------|------|
   | 新增行数 | <lines_added> |
   | 删除行数 | <lines_deleted> |
   | 变更文件数 | <files_changed> |
   | 提交数 | <commit_count> |

   ### 成本归因
   | 变更名 | 归因类型 | Token 用量 | 占比 |
   |--------|---------|-----------|------|
   | <name> | <exclusive/shared> | <total_tokens> | <ratio> |
   | _unattributed | - | <tokens> | - |

   **报告文件**: <report_path>
   ```

5. 如果脚本以非零退出码退出：
   - 捕获错误，展示 stderr 内容
   - 不生成部分报告
   - 提示用户检查 ccusage 安装或网络连接

6. 如果 ccusage 不可用（`token.unavailable: true`）：
   - Token 部分展示"数据不可用"
   - 仍然展示代码统计和归因信息
   - 提示用户：`npm install -g ccusage` 或检查安装

### `/xt-metrics summary` — 统计摘要

读取历史数据，展示最近的统计摘要。

**执行步骤：**

1. 确定项目根目录
2. 执行 `node .claude/skills/xt-metrics/scripts/summary.js --project-root <projectRoot>`
3. 解析 stdout JSON 输出
4. 格式化展示摘要：
   - 如果 `has_data: false` → 提示"尚无统计数据，请先运行 /xt-metrics report"
   - 如果 `has_data: true` → 展示：
     ```
     ## 📈 xt-metrics 统计摘要

     **最近查询时间**: <last_query_time>
     **查询次数**: <query_count>

     ### 累计统计
     | 指标 | 数值 |
     |------|------|
     | 总 Token 用量 | <total_tokens> |
     | 总费用 (USD) | <$total_cost_usd> |
     | 关联变更数 | <total_changes> |

     ### 最近 5 次查询
     | 日期 | Token | 费用 | 变更数 |
     |------|-------|------|--------|
     | <date> | <tokens> | <$cost> | <count> |
     ```

## 数据目录

`openspec/metrics/` 目录结构：

```
openspec/metrics/
  cutoff.yaml           # 查询截止时间 + ccusage 状态
  history.yaml          # 历史报告索引
  reports/
    2026-06-12.yaml     # 每次查询的详细报告
```

## 注意事项

- 报告和摘要数据存在项目级 `openspec/metrics/` 目录中，进入 git 可团队共享
- 增量查询基于 `cutoff.yaml` 的 `last_query_time`，只查新数据
- 同一天多次查询时报告文件名自动添加时间戳后缀
- ccusage 不可用时 token 部分标记"数据不可用"，代码统计仍可正常工作
- 脚本可独立运行，不依赖 Claude 对话环境
