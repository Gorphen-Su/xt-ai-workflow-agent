import { describe, it, expect } from 'vitest';
import { MANIFEST, DEFAULT_SOURCE, DEFAULT_REF, getManifestSkillNames } from '../manifest.js';

describe('manifest', () => {
  it('exports MANIFEST with 6 stage skills + shared', () => {
    expect(MANIFEST.skills).toHaveLength(7);
    const stageCount = MANIFEST.skills.filter((n) => n.startsWith('xt-sdd2-')).length;
    expect(stageCount).toBe(7);
  });

  it('MANIFEST.skills contains the canonical 7 names', () => {
    expect(MANIFEST.skills).toEqual([
      'xt-sdd2-interview',
      'xt-sdd2-draft',
      'xt-sdd2-execute',
      'xt-sdd2-audit',
      'xt-sdd2-land',
      'xt-sdd2-sow',
      'xt-sdd2-shared',
    ]);
  });

  it('exports templates with skip-if-exists mode incl project.md', () => {
    expect(Array.isArray(MANIFEST.templates)).toBe(true);
    for (const t of MANIFEST.templates) {
      expect(t).toHaveProperty('src');
      expect(t).toHaveProperty('dst');
      expect(t.mode).toBe('skip-if-exists');
    }
    // v2 新增：project.md 作为项目配置唯一事实源的种子模板
    expect(MANIFEST.templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: 'templates/xt-sdd2/project.md', dst: 'openspec/project.md' }),
        expect.objectContaining({ src: 'openspec/openspec.yaml', dst: 'openspec/openspec.yaml' }),
      ])
    );
  });

  it('commands 位于 xt-sdd2/ 子目录（斜杠相对路径表达）', () => {
    expect(MANIFEST.commands).toEqual([
      'xt-sdd2/interview',
      'xt-sdd2/draft',
      'xt-sdd2/execute',
      'xt-sdd2/audit',
      'xt-sdd2/land',
      'xt-sdd2/sow',
    ]);
    for (const c of MANIFEST.commands) {
      expect(c.startsWith('xt-sdd2/')).toBe(true);
    }
  });

  it('exports DEFAULT_SOURCE and DEFAULT_REF', () => {
    expect(DEFAULT_SOURCE).toBe('Gorphen-Su/xt-ai-workflow-agent');
    expect(DEFAULT_REF).toBe('main');
  });

  it('MANIFEST is frozen (cannot be mutated)', () => {
    expect(Object.isFrozen(MANIFEST)).toBe(true);
    expect(Object.isFrozen(MANIFEST.skills)).toBe(true);
  });

  it('getManifestSkillNames returns the skill array', () => {
    expect(getManifestSkillNames(MANIFEST)).toEqual(MANIFEST.skills);
  });
});
