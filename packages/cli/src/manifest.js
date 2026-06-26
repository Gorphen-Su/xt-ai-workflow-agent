// xt-sdd-skills 分发清单
// 硬编码以确保可控、可审计。新增/删除 skill 时改这里即可。

export const DEFAULT_SOURCE = 'Gorphen-Su/xt-ai-workflow-agent';
export const DEFAULT_REF = 'main';

export const MANIFEST = Object.freeze({
  // 6 个核心 xt-sdd-* skill + xt-metrics 按需统计 + xt-codegraph-init 代码图谱初始化，分发到目标项目的 .claude/skills/<name>/
  skills: Object.freeze([
    'xt-sdd-propose',
    'xt-sdd-plan',
    'xt-sdd-apply',
    'xt-sdd-verify',
    'xt-sdd-archive',
    'xt-sdd-fix',
    'xt-metrics',
    'xt-codegraph-init',
  ]),

  // 模板文件：目标已存在时跳过，避免覆盖用户已定制的内容
  templates: Object.freeze([
    Object.freeze({
      src: 'openspec/sdd-project-profile.yaml',
      dst: 'openspec/sdd-project-profile.yaml',
      mode: 'skip-if-exists',
    }),
    Object.freeze({
      src: 'openspec/openspec.yaml',
      dst: 'openspec/openspec.yaml',
      mode: 'skip-if-exists',
    }),
  ]),

  // .claude/commands/ 下的 slash command 入口文件名（不含扩展名）
  commands: Object.freeze([
    'xt-sdd-propose',
    'xt-sdd-plan',
    'xt-sdd-apply',
    'xt-sdd-verify',
    'xt-sdd-archive',
    'xt-sdd-fix',
    'xt-metrics',
  ]),
});

// 辅助：取 skill 名数组（供测试和调用方使用）
export function getManifestSkillNames(manifest = MANIFEST) {
  return manifest.skills;
}
