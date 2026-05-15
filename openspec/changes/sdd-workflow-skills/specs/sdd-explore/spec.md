## ADDED Requirements

### Requirement: Git 状态前置检查
sdd:explore 启动时 MUST 先检查 Git 工作区状态。如果存在未提交的更改，MUST 向用户展示变更摘要并询问是否先提交。

#### Scenario: 工作区干净
- **WHEN** 用户调用 `/sdd:explore` 且 Git 工作区无未提交更改
- **THEN** 直接进入探索阶段

#### Scenario: 工作区有未提交更改
- **WHEN** 用户调用 `/sdd:explore` 且 Git 工作区有未提交更改
- **THEN** 展示变更文件列表和摘要，询问用户是否先提交

#### Scenario: 用户选择先提交
- **WHEN** 用户在脏工作区下选择先提交
- **THEN** 自动暂存相关文件并生成中文 commit message 提交，提交成功后进入探索阶段

#### Scenario: 用户选择不提交
- **WHEN** 用户在脏工作区下选择不提交
- **THEN** 记录当前状态，在脏状态下继续进入探索阶段

### Requirement: 探索与需求澄清
sdd:explore MUST 调用 `openspec` CLI 的探索能力与用户讨论技术方案、澄清需求，产出 proposal.md。此阶段 MUST NOT 编写任何生产代码。

#### Scenario: 新需求探索
- **WHEN** 用户描述一个新的功能需求
- **THEN** 通过提问澄清需求细节，讨论 2-3 个可行方案，给出推荐方案及理由

#### Scenario: 用户选择方案
- **WHEN** 用户确认技术方案
- **THEN** 将确认的方案写入变更目录下的 proposal.md

### Requirement: 变更目录命名
sdd:explore 创建变更目录时 MUST 使用 `YYYY-MM-DD-<模块>-<子模块(可选)>-<功能>` 格式。如果用户提供了模块名，MUST 按此格式命名；如果用户未提供，MUST 从需求描述中推导。

#### Scenario: 用户提供模块名
- **WHEN** 用户调用 `/sdd:explore user-auth 登录功能`
- **THEN** 变更目录命名为 `YYYY-MM-DD-user-auth-login`（login 从功能描述推导）

#### Scenario: 用户未提供模块名
- **WHEN** 用户调用 `/sdd:explore 实现用户登录功能`
- **THEN** 从需求描述推导模块名，变更目录命名为 `YYYY-MM-DD-user-auth-login`

### Requirement: 阶段完成确认
sdd:explore 完成 proposal.md 后 MUST 要求用户确认。MUST NOT 自动跳过确认步骤。

#### Scenario: 用户确认通过
- **WHEN** 用户确认 proposal.md 内容正确
- **THEN** 提示用户是否进入下一阶段（sdd:plan）

#### Scenario: 用户确认不通过
- **WHEN** 用户认为 proposal.md 需要修改
- **THEN** 回到探索阶段，根据用户反馈修改 proposal.md，重新确认

#### Scenario: 用户选择暂停
- **WHEN** 用户选择暂停
- **THEN** 保存当前进度到 task-status.md，退出阶段
