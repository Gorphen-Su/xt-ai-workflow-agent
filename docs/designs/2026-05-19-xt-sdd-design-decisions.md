# xt-sdd 工作流设计决策记录

> 来源：docs/explores/2. xt-sdd开发工作流.md 探索讨论

## 命令体系（6 个命令）

| 命令 | 职责 | 产出 |
|------|------|------|
| `/xt-sdd:propose` | 需求探索 + 规格生成 | proposal.md |
| `/xt-sdd:plan` | 方案设计 + 任务拆分 | design/specs/tasks/plan |
| `/xt-sdd:apply` | TDD 实现 + 编译检查 | 代码 + 测试 |
| `/xt-sdd:verify` | 文档同步 + 合规验证 + 审查 | 验证报告 |
| `/xt-sdd:archive` | 归档 + Git 提交 | archive.md |
| `/xt-sdd:fix` | Bug 修复（自动路由） | 动态起点 |

## 5 阶段硬门

| 阶段 | 禁止 | 允许 |
|------|------|------|
| propose | 写代码、写实现计划 | 需求澄清、规格生成 |
| plan | 写代码 | 技术方案、任务拆分、实现计划 |
| apply | 改规格文档 | TDD 实现 |
| verify | 新增功能代码 | 文档同步、修复审查问题 |
| archive | 改代码和规格 | 归档收尾 |

## 状态管理

- `sdd-state.yaml` 放在每个变更目录下，支持多需求并发
- 项目级信息放 `openspec/sdd-project-profile.yaml`
- 运行命令时通过 phase 做路由匹配，无需跨变更 phase 校验

### 并发变更路由逻辑

```
用户运行 /xt-sdd:<stage>
  │
  ├── 0 个活跃变更 → 提示先 /xt-sdd:propose
  ├── 1 个活跃变更 → 自动选择
  └── 多个活跃变更 → 检查哪些变更的 phase 与命令匹配
       ├── 1 个匹配 → 自动选择
       ├── 多个匹配 → 让用户选择
       └── 无匹配 → 提示各变更当前阶段
```

### 并发变更冲突策略

后者覆盖前者 — 后启动的变更为最新需求逻辑，同步更新前者的文档。apply 开始时检测是否有其他变更修改同一文件，有则警告用户。

## 文档目录合并

`superpowers/plans/` 合并到变更目录内，所有产物集中管理：

```
openspec/changes/<name>/
├── proposal.md
├── design.md
├── specs/
├── tasks.md
├── plan.md            ← 原先在 superpowers/plans/
└── sdd-state.yaml
```

归档时整个目录 mv → archive/，一条命令完成。

## 归档时机

verify 通过 + 用户确认 = 可归档。归档后发现的 Bug 作为新变更处理。

## Bug 修复流程（/xt-sdd:fix）

### 分诊路由

```
根因明确？
  否 → propose（需要搞清楚问题是什么）
  是 → 修法明确？
         否 → plan（知道问题，修法需设计）
         是 → apply（直接修）
```

### 自动升级

apply 中发现复杂度超预期 → 暂停，询问用户是否升级到 plan

### 简化文档格式

- proposal：只写 Bug 描述/根因/修法/影响范围
- plan：只写修复步骤和影响分析
- archive：只写 Bug 描述/修复内容/文档同步/验证结果

### 文档同步检查

放在 verify 阶段内部，作为合规检查的前置步骤：

```
verify 内部：
  ① 文档同步检查（前置）
  ② 合规验证（基于同步后的文档）
  ③ 测试 + 审查
```

影响分级：

| 影响级别 | 判断标准 | 操作 |
|----------|---------|------|
| 无文档影响 | 修复不改变外部可观察行为 | 跳过 |
| specs 影响 | 改变了 specs 描述的行为 | 更新 specs |
| design 影响 | 改变了架构决策 | 更新 design + specs |
