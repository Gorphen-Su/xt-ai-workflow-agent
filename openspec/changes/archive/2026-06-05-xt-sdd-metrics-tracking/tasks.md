## 1. Metrics 段结构定义

- [ ] 1.1 在 xt-sdd-propose SKILL.md 的步骤 5 中，更新 sdd-state.yaml 模板，增加完整的 `metrics` 段结构（git_baseline、file_stats、line_stats、token_usage 含 snapshots 数组），所有数值字段默认为 0 或 null
- [ ] 1.2 在 xt-sdd-propose SKILL.md 的步骤 5 中，增加记录 `git rev-parse HEAD` 到 `metrics.git_baseline.start_sha` 的指令，同时记录 `start_time`（ISO 8601）和 `dirty` 状态

## 2. ccusage 可用性检测、自动安装与 Token 快照

- [ ] 2.1 在 xt-sdd-propose SKILL.md 中，步骤 0（前置条件检查）之后增加 ccusage 环境检测与自动安装逻辑：
  1. 执行 `npx ccusage --version` 检测可用性
  2. 如不可用，自动执行 `npm install -g ccusage` 全局安装
  3. 安装后重新验证可用性
  4. 将最终结果写入 `metrics.token_usage.ccusage_available`
  5. 如自动安装，记录 `metrics.token_usage.auto_installed: true`
  6. 安装失败时设为 `false` 并记录 `install_error`，提示用户手动安装但不阻塞流程
- [ ] 2.2 在 xt-sdd-propose SKILL.md 中，增加 propose 阶段的 Token 快照记录指令：调用 `npx ccusage session --json` 获取数据并追加到 `metrics.token_usage.snapshots`
- [ ] 2.3 在 xt-sdd-plan SKILL.md 中，阶段开始处增加 Token 快照记录指令（同上）
- [ ] 2.4 在 xt-sdd-apply SKILL.md 中，阶段开始处增加 Token 快照记录指令（同上）
- [ ] 2.5 在 xt-sdd-verify SKILL.md 中，阶段开始处增加 Token 快照记录指令（同上）
- [ ] 2.6 在 xt-sdd-archive SKILL.md 中，阶段开始处增加 Token 快照记录指令（同上）
- [ ] 2.7 在 xt-sdd-fix SKILL.md 中，阶段开始处增加 Token 快照记录指令（同上）
- [ ] 2.8 所有 Token 快照记录指令中增加降级处理：ccusage 不可用时追加 `unavailable: true` 记录；执行失败时追加 `error: "<信息>"` 记录，均不阻塞流程

## 3. Git Diff 文件与行数统计

- [ ] 3.1 在 xt-sdd-archive SKILL.md 中，增加归档前的文件变更统计步骤：执行 `git diff --stat <start_sha> HEAD`，解析输出填充 `metrics.file_stats`（files_added、files_modified、files_deleted、total_files_changed）
- [ ] 3.2 在 xt-sdd-archive SKILL.md 中，增加归档前的代码行数统计步骤：执行 `git diff --numstat <start_sha> HEAD`，累加新增行数和删除行数填充 `metrics.line_stats`（lines_added、lines_deleted），跳过二进制文件
- [ ] 3.3 在 xt-sdd-archive SKILL.md 中，增加 Git 仓库脏状态检查：如有未提交更改则提醒用户先提交或 stash，确保 diff 统计准确
- [ ] 3.4 在 xt-sdd-archive SKILL.md 中，增加基线缺失处理：`metrics.git_baseline.start_sha` 为 null 时，file_stats 和 line_stats 标记 `baseline_missing: true`，字段设为 null

## 4. Token 数据汇总

- [ ] 4.1 在 xt-sdd-archive SKILL.md 中，增加 Token 数据汇总步骤：从 `metrics.token_usage.snapshots` 最后一个有效快照提取总 Token 数据，填充 `metrics.token_usage.total_input_tokens`、`total_output_tokens`、`total_tokens`、`estimated_cost_usd`
- [ ] 4.2 在 xt-sdd-archive SKILL.md 中，增加无可用数据降级处理：所有快照均 unavailable 或 error 时，汇总字段设为 null，标记 `token_data_unavailable: true`

## 5. Metrics Report 生成

- [ ] 5.1 在 xt-sdd-archive SKILL.md 中，增加 `metrics-report.md` 生成步骤：在归档前自动生成，包含变更概览、Git 基线、文件变更统计表格、代码行数统计、Token 消费汇总和阶段快照明细表
- [ ] 5.2 报告模板支持部分数据缺失：缺失字段标记 "数据不可用" 或 "N/A"，不跳过报告生成
- [ ] 5.3 报告作为标准归档产物：确保 metrics-report.md 与 archive.md 一同保留在变更目录中

## 6. 验证与测试

- [ ] 6.1 使用 xt-sdd-propose 启动一个测试变更，验证 sdd-state.yaml 中 metrics 段正确初始化、start_sha 正确记录
- [ ] 6.2 验证 ccusage 可用性检测正常工作（可用和不可用两种场景）
- [ ] 6.3 模拟完整 xt-sdd 流程（propose → archive），验证 metrics-report.md 正确生成且数据完整
