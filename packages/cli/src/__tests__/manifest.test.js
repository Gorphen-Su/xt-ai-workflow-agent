import { describe, it, expect } from 'vitest';
import { MANIFEST, DEFAULT_SOURCE, DEFAULT_REF, getManifestSkillNames } from '../manifest.js';

describe('manifest', () => {
  it('exports MANIFEST with 6 xt-sdd-* skills', () => {
    expect(MANIFEST.skills).toHaveLength(6);
    for (const name of MANIFEST.skills) {
      expect(name).toMatch(/^xt-sdd-/);
    }
  });

  it('MANIFEST.skills contains the canonical 6 names', () => {
    expect(MANIFEST.skills).toEqual([
      'xt-sdd-propose',
      'xt-sdd-plan',
      'xt-sdd-apply',
      'xt-sdd-verify',
      'xt-sdd-archive',
      'xt-sdd-fix',
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
    expect(DEFAULT_SOURCE).toBe('GorphenSu/xt-ai-workflow-agent');
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
