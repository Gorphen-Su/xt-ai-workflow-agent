# 任务索引：list-json-output

> - 卷宗：`2026-08-27-gophensu-list-json-output`
> - 总任务组数：1｜预计总微步骤：7

## 分组清单

| 组 | 文件 | 内容一句话 | 覆盖 Requirement |
|----|------|-----------|------------------|
| 01 | [tasks/01-json-output.md](tasks/01-json-output.md) | --json 解析放行、JSON 双模输出与首份 list 测试保护 | R-cli-installer-008、R-cli-installer-006 |

## 覆盖矩阵（闭环校验的源头）

每个 R-ID 至少出现在一行中；audit 阶段以此双向核对：

- [x] R-cli-installer-008 ↔ 组 01（步骤 1-5）
- [x] R-cli-installer-006 ↔ 组 01（步骤 6 零漂移回归）

> 矩阵若有空行或缺号，draft 的 validate 步骤即失败，不得进入 freeze。

## 执行顺序与依赖

单组顺序执行，无组间依赖。
