// xt-sdd2-skills 分发清单
// 硬编码以确保可控、可审计。新增/删除 skill 时改这里即可。
//
// 与第一代（packages/cli）的差异：
// - skills 为 xt-sdd2 五命令管线 + sow 冷启动 + shared 共享约定模块
// - commands 位于 .claude/commands/xt-sdd2/ 子目录，名字带斜杠以表达相对路径

export const DEFAULT_SOURCE = 'Gorphen-Su/xt-ai-workflow-agent';
export const DEFAULT_REF = 'main';

export const MANIFEST = Object.freeze({
  // 六个 xt-sdd2 skill 分发到目标项目的 .claude/skills/<name>/
  skills: Object.freeze([
    'xt-sdd2-interview',
    'xt-sdd2-draft',
    'xt-sdd2-execute',
    'xt-sdd2-audit',
    'xt-sdd2-land',
    'xt-sdd2-sow',
    'xt-sdd2-shared',
  ]),

  // 模板文件：目标已存在时跳过，避免覆盖用户已定制的内容。
  // project.md 是 xt-sdd2 的项目配置唯一事实源（schema 见 xt-sdd2-shared）
  templates: Object.freeze([
    Object.freeze({
      src: 'openspec/openspec.yaml',
      dst: 'openspec/openspec.yaml',
      mode: 'skip-if-exists',
    }),
    Object.freeze({
      src: 'templates/xt-sdd2/project.md',
      dst: 'openspec/project.md',
      mode: 'skip-if-exists',
    }),
  ]),

  // .claude/commands/ 下的 slash command 入口（含子目录相对路径）
  commands: Object.freeze([
    'xt-sdd2/interview',
    'xt-sdd2/draft',
    'xt-sdd2/execute',
    'xt-sdd2/audit',
    'xt-sdd2/land',
    'xt-sdd2/sow',
  ]),
});

// 辅助：取 skill 名数组（供测试和调用方使用）
export function getManifestSkillNames(manifest = MANIFEST) {
  return manifest.skills;
}
