import { describe, it, expect } from 'vitest';
import { MANIFEST, DEFAULT_SOURCE, DEFAULT_REF, getManifestSkillNames } from '../manifest.js';

describe('manifest', () => {
  it('exports MANIFEST with 6 xt-sdd-* skills + 1 xt-metrics skill', () => {
    expect(MANIFEST.skills).toHaveLength(7);
    const xtSddCount = MANIFEST.skills.filter((n) => n.startsWith('xt-sdd-')).length;
    expect(xtSddCount).toBe(6);
    expect(MANIFEST.skills).toContain('xt-metrics');
  });

  it('MANIFEST.skills contains the canonical 7 names', () => {
    expect(MANIFEST.skills).toEqual([
      'xt-sdd-propose',
      'xt-sdd-plan',
      'xt-sdd-apply',
      'xt-sdd-verify',
      'xt-sdd-archive',
      'xt-sdd-fix',
      'xt-metrics',
    ]);
  });

  it('exports templates with skip-if-exists mode', () => {
    expect(Array.isArray(MANIFEST.templates)).toBe(true);
    expect(MANIFEST.templates.length).toBeGreaterThan(0);
    for (const t of MANIFEST.templates) {
      expect(t).toHaveProperty('src');
      expect(t).toHaveProperty('dst');
      expect(t.mode).toBe('skip-if-exists');
    }
  });

  it('exports commands list', () => {
    expect(Array.isArray(MANIFEST.commands)).toBe(true);
    expect(MANIFEST.commands.length).toBeGreaterThan(0);
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
