# Design - CodeGraph 索引同步更新说明补充

## Context

**当前状态：**
- codegraph-init skill 已有基础初始化流程和简短的"日常维护"章节
- codegraph-xt-sdd.md 参考文档提到"何时更新索引"，但内容较简略
- 用户在代码修改后不清楚索引是否自动更新

**约束：**
- 纯文档增强，不修改代码行为
- 需要与现有文档结构保持一致
- 必须准确反映 codegraph 的实际工作机制

**相关方：**
- 使用 xt-sdd 流程的开发者
- 使用 codegraph 进行代码检索的用户

## Goals / Non-Goals

**Goals:**
1. 提供清晰的索引同步更新机制说明
2. 在工作流中集成同步检查提示
3. 帮助用户判断何时需要手动同步
4. 降低因索引过期导致的查询错误

**Non-Goals:**
- 修改 codegraph 工具本身的行为
- 创建自动化同步脚本或工具
- 修改 xt-sdd 流程的逻辑

## Decisions

### 1. 文档结构设计

**决策：** 在 codegraph-init skill 中添加独立的"索引维护"章节，包含：
- 自动同步机制（MCP daemon）
- 手动检测方法
- 常见场景处理
- 故障排查

**理由：** 集中在一个章节便于用户快速查阅，避免信息分散。

### 2. 工作流集成方式

**决策：** 在 xt-sdd apply 和 verify skill 中添加简洁的"前置检查"提示，不增加独立步骤。

**理由：**
- 最小化对现有流程的侵入
- 提示而非强制，保持灵活性
- 在关键阶段（代码修改后、验证前）提醒即可

**替代方案考虑：**
- 在每个阶段添加独立的同步步骤 → 过于重量级，不符合 quick 流程的轻量原则
- 创建独立的 codegraph-sync skill → 功能过于单一，文档说明更合适

### 3. 检测方法说明

**决策：** 提供多层检测方法：
1. 轻量级：`codegraph status` 查看时间戳
2. 中等：查询结果与实际代码对比
3. 重量级：`codegraph index --force` 重建

**理由：** 不同场景需要不同级别的检测，给用户选择空间。

## Risks / Trade-offs

### 风险 1：文档与实际行为不一致
**缓解措施：**
- 参考官方 codegraph 文档验证
- 在发布前测试实际命令行为
- 添加版本说明，明确适用于哪些 codegraph 版本

### 风险 2：用户仍然忽略同步检查
**缓解措施：**
- 在关键节点（apply/verify）放置提示
- 强调后果（基于过期索引的查询结果不可靠）
- 提供简单的检查命令，降低执行成本

### 权衡：文档详细程度 vs. 用户阅读负担
**平衡点：**
- 核心章节详细说明（索引维护）
- 工作流集成简洁提示（一句话 + 命令）
- 提供参考链接（深度内容放在 references/）

## Migration Plan

1. 更新 codegraph-init/SKILL.md
2. 更新 codegraph-xt-sdd.md 参考文档
3. 在 xt-sdd-apply 和 xt-sdd-verify skill 中添加提示
4. 验证所有引用链接正确
5. 无需回滚（纯文档变更）

## Open Questions

1. **MCP daemon 在 Windows 上的运行状态？** — 需要验证 codegraph install 后是否自动启动后台服务
2. **`codegraph sync` 的触发频率？** — 需要确认是文件监听还是定时触发
