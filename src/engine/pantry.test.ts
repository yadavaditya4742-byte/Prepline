import { describe, expect, it } from 'vitest';
import { INGREDIENT_BY_ID } from '../data';
import { effectivePantry } from './pantry';

describe('effectivePantry', () => {
  const all = Object.values(INGREDIENT_BY_ID);
  it('staples start in the pantry, everything else does not', () => {
    const p = effectivePantry(all, new Map());
    expect(p.has('salt')).toBe(true);
    expect(p.has('turmeric')).toBe(true);
    expect(p.has('chicken-breast')).toBe(false);
  });
  it('user toggles override the default both ways', () => {
    const p = effectivePantry(all, new Map([['salt', false], ['basmati', true]]));
    expect(p.has('salt')).toBe(false);
    expect(p.has('basmati')).toBe(true);
  });
});
