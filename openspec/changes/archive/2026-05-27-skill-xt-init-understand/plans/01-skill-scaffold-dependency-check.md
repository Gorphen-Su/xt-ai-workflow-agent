<!-- sdd change: skill-xt-init-understand -->

# 1. Skill 骨架与依赖检查

本分组实现 SKILL.md 基础骨架和 Understand-Anything 依赖的检测/安装逻辑。

## 任务清单

- [x] 1.1 创建 `.claude/skills/xt-init-understand/SKILL.md` 基础骨架，定义 skill 名称、描述、触发条件和参数
  - Step: 在 `.claude/skills/xt-init-understand/` 目录下创建 `SKILL.md`
  - Step: 定义 skill metadata 区块（名称：`xt-init-understand`，触发命令：`/xt-init:understand`）
  - Step: 定义参数说明（无参数=全量分析，`[path]`=指定目录，`--update`=增量更新）
  - Step: 定义整体执行流程概述（依赖检测 → 环境检查 → 分析执行 → 文档整理 → CLAUDE.md 集成）

- [x] 1.2 实现环境依赖检测逻辑（Node.js >= 22、pnpm >= 10、Python 3）
  - Step: 在 SKILL.md 的"前置检查"区块中编写环境检测步骤
  - Step: 检测命令：`node --version`、`pnpm --version`、`python3 --version`
  - Step: 版本号解析和比较逻辑（提取 major 版本号，与 22/10/3 分别比较）
  - Step: 缺失依赖时向用户列出具体缺失项和安装建议，阻塞后续流程

- [x] 1.3 实现 Understand-Anything 插件安装状态检测逻辑
  - Step: 在 SKILL.md 中编写插件检测步骤
  - Step: 检测方式：检查 `~/.claude/plugins/understand-thing/` 目录是否存在，或尝试调用 `/understand --help` 验证可用性
  - Step: 已安装 → 跳过安装，直接继续
  - Step: 未安装 → 进入安装流程（任务 1.4 或 1.5）

- [x] 1.4 实现 Claude Code 平台自动安装流程（`/plugin marketplace add`）
  - Step: 在 SKILL.md 中编写 Claude Code 平台的安装步骤
  - Step: 平台检测逻辑：检查是否在 Claude Code 环境中（默认平台）
  - Step: 执行安装命令：`/plugin marketplace add Lum1104/Understand-Anything`
  - Step: 安装后验证：再次检测插件是否存在
  - Step: 安装失败处理：提示文档链接 https://github.com/Lum1104/Understand-Anything/blob/main/READMEs/README.zh-CN.md 和手动安装命令

- [x] 1.5 实现非 Claude Code 平台的手动安装指引
  - Step: 在 SKILL.md 中编写非 Claude Code 平台的安装指引区块
  - Step: 列出各平台安装命令（Cursor、VS Code Copilot、Windsurf 等）
  - Step: macOS/Linux: `curl -fsSL https://raw.githubusercontent.com/Lum1104/Understand-Anything/main/install.sh | bash`
  - Step: Windows PowerShell: `iwr -useb https://raw.githubusercontent.com/Lum1104/Understand-Anything/main/install.ps1 | iex`
  - Step: 使用 AskUserQuestion 询问用户是否已手动安装完成，完成后继续
