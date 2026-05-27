<!-- sdd change: skill-xt-init-understand -->

# 4. 增量更新

本分组实现基于 Git diff 的增量更新逻辑，仅重新分析变更部分。

## 任务清单

- [x] 4.1 实现 `--update` 参数解析和增量更新模式入口
  - Step: 在 SKILL.md 参数解析区块中增加 `--update` 参数识别
  - Step: 检测到 `--update` 参数时进入增量更新流程
  - Step: 增量更新流程优先级：先检查基准 → 再检测变更 → 最后执行局部更新

- [x] 4.2 实现分析基准点读取（`.analysis-meta.yaml` 的 `last_analyzed_commit`）
  - Step: 读取 `docs/understand/.analysis-meta.yaml`（如果存在）
  - Step: 提取 `last_analyzed_commit` 字段
  - Step: 文件不存在或字段为空 → 提示用户"未找到上次分析记录，将执行全量分析"并降级
  - Step: 读取成功 → 以该 commit 为基准执行 `git diff <base-commit>..HEAD --name-only`

- [x] 4.3 实现调用 `/understand-diff` 获取变更影响分析
  - Step: 调用 `/understand-diff` 命令获取变更影响分析
  - Step: 解析 `/understand-diff` 的输出，提取受影响的节点和模块列表
  - Step: 结合 `git diff --name-only` 确认变更文件列表
  - Step: 无变更 → 提示"项目代码未变更，无需更新"并退出

- [x] 4.4 实现受影响模块的文档局部更新逻辑
  - Step: 根据变更影响分析结果，确定需要更新的文档（overview/modules/domain-flows/key-entities 中的一个或多个）
  - Step: 只重新生成受影响模块的 Markdown 文档内容
  - Step: 将更新内容合并到已有文档中（保留未受影响部分）
  - Step: 单模块受影响 → 只更新该模块相关文档段落
  - Step: 多模块受影响 → 逐个更新受影响段落

- [x] 4.5 实现无基准时的降级为全量分析逻辑
  - Step: `.analysis-meta.yaml` 不存在 → 自动切换为全量分析模式
  - Step: 提示用户"未找到上次分析基准，将执行全量分析"
  - Step: 使用 AskUserQuestion 确认用户是否同意执行全量分析
  - Step: 用户确认 → 执行全量分析流程（分组 2 + 3）
  - Step: 用户拒绝 → 退出
