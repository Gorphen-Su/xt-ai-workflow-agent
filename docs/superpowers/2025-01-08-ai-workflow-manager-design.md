# AI Workflow Manager SubAgent 设计规格

## 1. 项目概述

### 1.1 目标
创建一个统一的 AI 代码开发流程管理器，整合 OpenSpec 规格驱动开发和 Superpowers 工具链，实现从需求到部署的完整自动化管理。

### 1.2 核心能力
- 自动识别开发意图（新功能/Bug修复/测试阶段）
- 基于 OpenSpec 的规格文档管理
- 集成 Superpowers 的开发执行能力
- 飞书任务同步和团队协作
- cc-connect 实时确认机制
- 自动文档归档和版本控制

## 2. 架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code 主对话                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
         ┌────────────────▼──────────────────┐
         │      AI Workflow Manager          │
         │      (SubAgent)                   │
         └────────────────┬──────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
┌───▼────┐          ┌────▼────┐          ┌────▼────┐
│OpenSpec│          │Superpowers│          │  Feishu  │
│  管理   │◄────────►│  执行    │◄────────►│  任务    │
│        │          │          │          │  同步    │
└───┬────┘          └────┬────┘          └────┬────┘
    │                    │                    │
    │          ┌────────▼────────┐          │
    │          │ cc-connect      │          │
    │          │ 确认机制        │◄─────────┘
    │          └────────┬────────┘
    │                  │
    └──────────────────┼───────────────────────┘
                       │
            ┌─────────▼─────────┐
            │   文档自动归档     │
            │   (openspec/)      │
            └─────────────────────┘
```

### 2.2 文件结构

```
.claude/agents/
└── ai-workflow-manager/
    ├── spec.yaml                  # SubAgent 定义
    ├── workflows/                  # 工作流定义
    │   ├── new-feature.md         # 新功能工作流
    │   ├── bug-fix.md            # Bug修复工作流
    │   └── test-phase.md         # 测试阶段工作流
    ├── templates/                 # 文档模板
    │   ├── proposal.md
    │   ├── feature-spec.md
    │   ├── bug-spec.md
    │   └── task-list.md
    └── scripts/                   # 辅助脚本
        ├── backup-docs.sh
        └── sync-feishu.sh

openspec/
├── changes/                      # 所有变更
│   ├── current/                  # 当前变更（软链接）
│   │   ├── {timestamp}-{type}-{id}/
│   │   │   ├── proposal.md       # 提案文档
│   │   │   ├── specs/           # 规格文档
│   │   │   ├── design.md        # 设计文档
│   │   │   ├── tasks.md         # 任务清单
│   │   │   └── status.md        # 状态文档
│   └── archive/                  # 已归档
├── specs/                       # 全局规格
│   ├── project/
│   └── templates/
└── workflow/                    # 工作流记录

docs/
├── workflow/                    # 工作流文档副本（备份）
└── sdd/                        # SDD文档副本
```

## 3. 工作流设计

### 3.1 新功能工作流 (/workflow new)

```mermaid
graph TD
    A[用户输入<br>/workflow new "功能需求"] --> B[意图识别]
    B --> C[头脑风暴<br>需求澄清]
    C --> D[生成提案文档<br>proposal.md]
    D --> E[拆分计划<br>任务清单]
    E --> F[生成规格文档<br>specs/]
    F --> G[生成设计文档<br>design.md]
    G --> H[任务确认<br>飞书消息]
    H --> I{用户确认?}
    I -->|是| J[执行开发任务<br>TDD + Code Review]
    I -->|否| E[调整任务清单]
    J --> K[冒烟测试]
    K --> L[问题检测]
    L --> M{发现Bug?}
    M -->|是| N[创建Bug修复任务<br>高优先级]
    M -->|否| O[归档提交]
    N --> P[等待Bug修复]
    P --> J
    O --> Q[更新飞书任务状态]
    Q --> R[工作流结束]
```

### 3.2 Bug修复工作流 (/workflow fix)

```mermaid
graph TD
    A[用户输入<br>/workflow fix "问题描述"] --> B[创建高优先级任务]
    B --> C[关联原需求<br>设置最高优先级]
    C --> D[自动保存到<br>openspec/changes/current/]
    D --> E[系统化调试<br>分析问题]
    E --> F[定位问题根源]
    F --> G[设计修复方案]
    G --> H[使用TDD修复<br>添加回归测试]
    H --> I[验证修复效果]
    I --> J[运行相关测试]
    J --> K[确认问题解决]
    K --> L[更新SDD文档]
    L --> M[飞书任务完成]
    M --> N[通知相关人员]
```

### 3.3 测试阶段工作流 (/workflow test)

```mermaid
graph TD
    A[用户输入<br>/workflow test "开始测试"] --> B[加载相关任务]
    B --> C[执行测试用例]
    C --> D[收集测试结果]
    D --> E[分析测试覆盖率]
    E --> F{发现问题?}
    F -->|是| G[自动创建Bug任务]
    F -->|否| H[生成测试报告]
    G --> I[关联到原功能]
    I --> J[设置最高优先级]
    J --> K[通知测试团队]
    K --> L[等待Bug修复]
    L --> M[重新测试]
    M --> N[所有通过?]
    N -->|是| O[更新任务状态]
    N -->|否| C
    O --> P[冒烟测试]
    P --> Q[发布准备]
    Q --> R[归档测试记录]
```

## 4. 飞书集成设计

### 4.1 任务同步流程

```yaml
# 任务创建流程
task_creation:
  trigger: [任务创建, 任务拆分完成]
  steps:
    - generate_documentation:
        - proposal.md
        - specs/
        - design.md
        - tasks.md
    - send_to_feishu:
        method: cc-connect send
        message: |
          新任务已创建，请确认：
          任务ID: {task_id}
          类型: {task_type}
          描述: {description}
          优先级: {priority}
          相关文档: {openspec_link}
    - wait_for_confirmation:
        timeout: 3600  # 1小时
        on_timeout: pause_workflow
        on_approve: continue_execution
        on_reject: adjust_and_retry

# 任务更新流程
task_update:
  trigger: [任务完成, 阶段完成, Bug创建]
  actions:
    - update_feishu_status:
        task_id: {task_id}
        status: {new_status}
        progress: {progress_percent}
        message: {update_message}
    - notify_assignee:
        method: lark-task notify
        message: "任务 {task_id} 已更新为 {status}"
```

### 4.2 确认消息模板

```markdown
# 任务确认消息

## 基本信息
- **任务ID**: {task_id}
- **任务类型**: {task_type}
- **创建时间**: {created_at}
- **优先级**: {priority}

## 任务描述
{description}

## 相关文档
- 规格文档: {specs_link}
- 设计文档: {design_link}
- 任务清单: {tasks_link}

## 需要确认的内容
[ ] 确认任务描述准确
[ ] 确认优先级合理
[ ] 确认时间估算可行

## 操作
- 点击 [确认] 开始执行
- 点击 [调整] 修改任务详情
- 点击 [取消] 放弃任务
```

## 5. 错误处理机制

### 5.1 执行错误处理

```yaml
error_handling:
  execution_error:
    steps:
      - log_error:
          level: error
          message: "执行出错: {error_message}"
          context: {workflow_context}
      - auto_rollback:
          - unstage_changes
          - revert_branch
          - cleanup_temp_files
      - notify_user:
          method: cc-connect send
          message: |
            执行出错已自动回滚：
            错误: {error_message}
            已恢复到上一个稳定状态
            请检查后重试
      - pause_workflow:
          state: error
          message: "等待用户处理错误"

  network_error:
    retry_policy:
      max_attempts: 3
      delay: 5  # 秒
      backoff: 2
    after_retry:
      - check_connectivity
      - sync_offline_changes

  user_timeout:
    timeout: 3600  # 1小时
    actions:
      - save_state:
          location: openspec/changes/current/{id}/state.json
      - send_notification:
          message: "任务已暂停，1小时未响应"
      - mark_as_pending:
          status: "waiting_user"
```

### 5.2 用户干预机制

```yaml
user_intervention:
  allowed_intervention_points:
    - "头脑风暴阶段": 完全控制
    - "规格设计阶段": 可以修改规格
    - "设计方案阶段": 可以调整方案
    - "代码实现阶段": 仅查看进度
    - "测试验证阶段": 仅查看结果
  intervention_methods:
    - manual_command: "/workflow pause {task_id}"
    - feishu_message: "暂停任务 {task_id}"
    - cc-connect_reply: "stop"
```

## 6. 初始化配置

### 6.1 环境检查

```bash
# 检查必要组件
check_dependencies:
  - claude-code
  - openspec-cli
  - cc-connect
  - lark-cli
  - git

# 创建必要目录
setup_directories:
  - openspec/changes/current
  - openspec/changes/archive
  - openspec/specs/project
  - openspec/specs/templates
  - docs/backup
```

### 6.2 权限配置

```yaml
permissions:
  file_operations:
    - read: "**/*.md"
    - write: "openspec/**/*"
    - edit: "openspec/**/*"
  external_tools:
    - cc-connect: send
    - lark-task: create, update
    - lark-im: send
  git_operations:
    - create_branch
    - commit_changes
    - push_origin
```

## 7. 使用示例

### 7.1 新功能开发示例

```bash
# 1. 启动新功能工作流
/workflow new "实现用户登录功能"

# 2. 系统自动执行头脑风暴
# 生成: openspec/changes/current/2025-01-08-user-login/proposal.md

# 3. 拆分任务并等待确认
# 飞书消息: 新任务已创建，请确认...

# 4. 用户确认后自动执行
# - 创建分支 feature/user-login
# - 执行 TDD 开发
# - 代码审查
# - 测试验证

# 5. 完成后自动归档
# 更新飞书任务状态
# 提交到主分支
```

### 7.2 Bug修复示例

```bash
# 1. 启动 Bug 修复工作流
/workflow fix "用户登录时密码错误不提示"

# 2. 自动创建高优先级任务
# 关联: 用户登录功能
# 优先级: highest

# 3. 系统化调试
# 定位问题: 前端验证失败
# 设计修复方案: 添加错误提示

# 4. TDD 修复
# 编写测试用例
# 实现修复代码

# 5. 验证和通知
# 更新飞书任务
# 通知测试团队
```

## 8. 维护和扩展

### 8.1 日常维护

```yaml
maintenance:
  daily:
    - backup_documents
    - sync_to_feishu
    - cleanup_temp_files
  weekly:
    - archive_completed_tasks
    - update_templates
    - review_workflow_efficiency
```

### 8.2 扩展性设计

```yaml
extensibility:
  new_workflow_types:
    - "性能优化"
    - "安全加固"
    - "重构优化"
  integration_points:
    - "其他CI/CD工具"
    - "项目管理工具"
    - "监控系统"
```

## 9. 性能优化

### 9.1 缓存策略

```yaml
caching:
  documents:
    - active_tasks: 1小时
    - completed_tasks: 24小时
    - templates: 7天
  responses:
    - workflow_states: 30分钟
    - feishu_messages: 1小时
```

### 9.2 并发处理

```yaml
concurrency:
  max_simultaneous_workflows: 3
  max_tasks_per_workflow: 10
  queue_management:
    - priority_based: true
    - fair_sharing: true
```

---

**设计文档版本**: v1.0  
**创建日期**: 2025-01-08  
**最后更新**: 2025-01-08