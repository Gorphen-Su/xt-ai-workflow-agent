## Context

当前项目使用 OpenSpec 做规格文档管理、Superpowers 做 TDD 和代码审查，但两者在功能上存在重叠（如任务拆分）和差异（如文档格式不统一），直接混用导致：
1. 规格文档分散在 `openspec/` 和 `superpowers/plans/` 两个目录，归档时需同时处理
2. 状态管理依赖项目根目录的全局文件，不支持多需求并发
3. 没有统一的阶段硬门，容易跨阶段越界

本次设计以 HyperSpec 3 阶段工作流为参考基础，重新定义为 xt-sdd 5 阶段 + Bug 修复专用入口，作为纯编排层封装 OpenSpec 和 Superpowers 的能力。

## Goals / Non-Goals

**Goals:**

- 6 个独立命令（propose/plan/apply/verify/archive/fix），每个阶段有独立硬门
- `sdd-state.yaml` 放入变更目录，支持多需求并发推进
- 实现计划文件合并到变更目录内，统一归档管理
- verify 阶段内置文档同步检查，确保规格与代码一致
- fix 命令的分诊路由，根据信息清晰度动态选择起始阶段
- 并发变更冲突时后者覆盖前者，自动同步更新文档
- Superpowers 不可用时降级为自包含模式

**Non-Goals:**

- 不重写 OpenSpec 或 Superpowers 的原生功能，只做编排
- 不实现 git worktree 支持（串行推进）
- 不实现自动化 CI/CD 集成
- 不实现跨项目的需求依赖管理

## Decisions

### D1: 5 阶段拆分与硬门定义

将 HyperSpec 的 propose 拆分为 propose + plan，apply 拆分为 apply + verify。

| 阶段 | 硬门（禁止） | 委托 Skill |
|------|-------------|-----------|
| propose | 写代码、写实现计划 | `openspec-propose` |
| plan | 写代码 | `openspec CLI`（design/specs/tasks）+ `superpowers:writing-plans` |
| apply | 改规格文档 | `superpowers:subagent-driven-development` 或内联 TDD |
| verify | 新增功能代码 | `superpowers:verification-before-completion` + `superpowers:requesting-code-review` |
| archive | 改代码和规格 | `openspec-archive-change` |

**理由**：拆分后每个阶段职责更单一，硬门更易执行。原 HyperSpec 的 propose 阶段同时做需求澄清和实现计划生成，职责过重；apply 阶段同时做实现、验证和审查，缺少独立的合规检查点。

### D2: 状态文件位置 — 变更目录内

`sdd-state.yaml` 放在每个 `openspec/changes/<name>/` 下，项目级信息放到 `openspec/sdd-project-profile.yaml`。

**理由**：
- 每个变更的状态独立，天然支持多需求并发
- 归档时状态文件随变更目录一起迁移，无需额外处理
- 项目级 profile 是全局共享的，不属于任何单个变更

**替代方案**：HyperSpec 使用项目根目录的 `.hyperspec-state.yaml`，全局唯一 — 不支持并发。

### D3: 实现计划文件合并到变更目录

`plan.md` 放在 `openspec/changes/<name>/` 下，取代原先的 `superpowers/plans/YYYY-MM-DD-<name>.md`。

**理由**：
- 归档时一个目录包含所有产物，一条 mv 命令完成
- 断点恢复只需检查一个目录
- 避免跨目录引用

### D4: verify 阶段内置文档同步检查

在 verify 的合规验证之前，先执行文档同步检查：扫描代码变更 → 对比现有 specs/design → 按影响级别更新文档。

影响分级：
- 无文档影响 → 跳过
- specs 影响 → 更新 specs
- design 影响 → 更新 design + specs

**理由**：合规验证基于文档做比对，如果文档本身已过时，检查结果不可信。先同步再验证，逻辑更顺畅。

### D5: fix 命令的分诊路由

`/xt-sdd:fix` 内置两个维度的分诊判断：

```
根因明确？
  否 → propose（需要搞清楚问题是什么）
  是 → 修法明确？
         否 → plan（知道问题，修法需设计）
         是 → apply（直接修）
```

**自动升级**：apply 中发现复杂度超预期 → 暂停，询问用户是否升级到 plan。

**简化文档格式**：
- proposal：只写 Bug 描述/根因/修法/影响范围
- plan：只写修复步骤和影响分析
- archive：只写 Bug 描述/修复内容/文档同步/验证结果

**理由**：Bug 修复不应该强制走完整 5 阶段，但需要保留阶段纪律。分诊路由让简单修复轻量化，复杂修复自动升级，不会遗漏。

### D6: 并发变更冲突策略 — 后者覆盖

两个变更同时处于 apply 且修改同一文件时，后启动的变更为最新需求逻辑，同步更新前者的文档。

**理由**：在同一个开发迭代中，所有功能按进度同步推进，后面的需求代表最新的业务逻辑。

**风险缓解**：在 apply 开始时检测是否有其他变更修改同一文件，如果有则警告用户。

### D7: 归档时机

verify 通过 + 用户确认 = 可归档。归档后发现的 Bug 作为新变更处理（走 `/xt-sdd:fix`）。

**理由**：避免在 verify 和 archive 之间形成漫长的"Bug 修复等待期"，归档后的问题用独立流程管理更清晰。

## Risks / Trade-offs

- **[风险] fix 分诊判断可能误判** → 自动升级机制缓解，apply 中发现复杂度超预期时暂停并询问用户
- **[风险] 并发变更覆盖可能丢失前者的修改** → apply 开始时检测冲突文件并警告，覆盖前需用户确认
- **[权衡] 文档同步检查增加 verify 阶段的复杂度** → 换来的是合规检查结果的可信度，值得
- **[权衡] 6 个命令比 HyperSpec 的 1 个命令更分散** → 每个命令职责更单一，用户可按需跳入任意阶段
- **[风险] Superpowers 不可用时降级为自包含模式** → 功能缩减但流程不断裂，TDD 和审查由 skill 内置逻辑替代
