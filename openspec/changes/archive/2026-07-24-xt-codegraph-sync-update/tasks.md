# Tasks - CodeGraph 索引同步更新说明补充

## 1. codegraph-init skill 主要修改

- [ ] 1.1 在 SKILL.md 中创建"索引维护"独立章节（位于"日常维护"章节之后）
- [ ] 1.2 编写"自动同步机制"小节（说明 MCP daemon 后台运行和自动 sync）
- [ ] 1.3 编写"手动检测方法"小节（codegraph status、index --force）
- [ ] 1.4 编写"常见场景处理"小节（大改、切换分支、索引异常）
- [ ] 1.5 编写"故障排查"小节（索引损坏、daemon 未运行等）
- [ ] 1.6 更新 SKILL.md 中规则区块模板的"索引维护"行（增强说明）

## 2. xt-sdd 工作流集成

- [ ] 2.1 在 xt-sdd-apply/SKILL.md 中添加同步检查提示（步骤 4"定位修改点"）
- [ ] 2.2 在 xt-sdd-verify/SKILL.md 中添加同步检查提示（步骤 5"codegraph affected 精准回归"）

## 3. 参考文档更新

- [ ] 3.1 扩展 codegraph-xt-sdd.md 中"何时更新索引"章节
- [ ] 3.2 添加工作流集成说明（apply/verify 阶段提示）
- [ ] 3.3 添加 MCP daemon 运行机制说明

## 4. 验证和测试

- [ ] 4.1 验证所有文档引用链接正确
- [ ] 4.2 验证 codegraph 命令示例与实际行为一致
- [ ] 4.3 验证文档格式和拼写
