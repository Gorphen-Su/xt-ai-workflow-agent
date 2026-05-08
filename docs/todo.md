我想创建一个claude code 的subagents，具体最新的方法请查看文档：https://code.claude.com/docs/zh-CN/sub-agents，该subagent有如下:
1. 我通过该subagent, 统一管理我的claude code 在执行ai 代码自动开发的全流程，目前我以及团队使用openspec + superpowers 两个工具进行管理，但是由于里面提供的功能以及能力均不一样，有时候会导致混用。
2. openspec 使用的是最新版本，具体方法请查看文档：https://github.com/Fission-AI/OpenSpec
3. 目前团队推动sdd 规格驱动开发， 通过使用openspec 进行规格文档统一管理，我大概的使用流程 1. 头脑风暴&需求澄清，2. 拆分计划&任务清单， 3.实现代码逻辑以及tdd等流程， 4. 执行代码测试以及review. 5. 冒烟用例测试。 7. 修改bug， 以及同步文档后再执行代码测试以及review以及冒烟用例测试。8. 归档， 9. 提交git
4. 请你研究下openspec 以及spuerpowers 工具所提供的所有能力，请你提供一个总体的skill或者subagent进行整体流程管控，然后各自的节点可以使用skill进行统一命令以及skill包装。
5. 当拆分完计划以及任务清单之后，需要使用飞书cli的能力把该任务清单使用飞书的任务管理能力进行同步以及管理，方面后面团队一起工作或者是说claude code 容易断掉的时候记录住状态。
6. 该subagent作为一个统一的入口进行使用，并且自动判断用户入口是一个需求入口还是修改bug入口。
7. 增加cc-connect 的使用，接入飞书，方便在claude-code 进行任务处理的过程中需要用户确认的内容，避免用户不在机器旁边导致claude code 一直停止，效率低下。
8. 切记，必须要查看https://code.claude.com/docs/zh-CN/sub-agents文档，以及https://code.claude.com/docs/zh-CN/skills文档，保证subagent 以及skill是最新的使用方法。