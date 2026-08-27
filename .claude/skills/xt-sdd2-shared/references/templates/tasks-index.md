<!--
tasks.md 是薄索引：兼容 openspec CLI 的工件识别 + 人类速览。
微步骤详情放 tasks/NN-<分组名>.md，一屏内能看完本文件才算合格。
-->

# 任务索引：<卷宗 slug>

> - 卷宗：`<YYYY-MM-DD-<缩写>-<slug>>`
> - 总任务组数：N｜预计总微步骤：M

## 分组清单

| 组 | 文件 | 内容一句话 | 覆盖 Requirement |
|----|------|-----------|------------------|
| 01 | [tasks/01-auth-input.md](tasks/01-auth-input.md) | 入参校验域模型与解析 | R-login-api-001、R-login-api-002 |

## 覆盖矩阵（闭环校验的源头）

每个 R-ID 至少出现在一行中；audit 阶段以此双向核对：

- [ ] R-login-api-001 ↔ 组 01
- [ ] R-login-api-002 ↔ 组 01

> 矩阵若有空行或缺号，draft 的 validate 步骤即失败，不得进入 freeze。

## 执行顺序与依赖

01 → 02 → 03（02 依赖 01 的解析器；03 可并行）
