import { describe, expect, it } from 'vitest';
import { INGREDIENT_BY_ID } from '../data';
import type { Recipe, ResolvedPrice } from '../types';
import { costNeeds, makePriceFn, mergeNeeds, packsNeeded, scaleRecipe, weekCost } from './cost';
import { resolvePrice } from './prices';

const price = (size: number, p: number): ResolvedPrice => ({ size, price: p, label: '', source: 'seed' });

const recipe = (id: string, items: [string, number][], servings = 4): Recipe => ({
  id,
  title: id,
  cuisine: 'Indian',
  servings,
  minutes: 20,
  appliances: ['stovetop'],
  items: items.map(([ingredientId, qty]) => ({ ingredientId, qty })),
  steps: [],
});

describe('packsNeeded (package rounding)', () => {
  it('rounds up to whole packs', () => {
    expect(packsNeeded(1, 454)).toBe(1);
    expect(packsNeeded(454, 454)).toBe(1);
    expect(packsNeeded(455, 454)).toBe(2);
    expect(packsNeeded(1361, 454)).toBe(3);
  });
  it('needs nothing for zero or negative need', () => {
    expect(packsNeeded(0, 454)).toBe(0);
    expect(packsNeeded(-5, 454)).toBe(0);
  });
  it('tolerates floating-point noise from scaling', () => {
    // 3 × (1/3 of a pack) should be exactly one pack, not two.
    expect(packsNeeded((454 / 3) * 3, 454)).toBe(1);
    expect(packsNeeded(0.1 + 0.2, 0.3)).toBe(1);
  });
});

describe('scaleRecipe / mergeNeeds', () => {
  it('scales quantities to servings', () => {
    const r = recipe('a', [['onion', 400]], 4);
    expect(scaleRecipe(r, 2).get('onion')).toBe(200);
    expect(scaleRecipe(r, 6).get('onion')).toBe(600);
  });
  it('merges the same ingredient across recipes', () => {
    const a = recipe('a', [['onion', 400], ['tofu', 400]]);
    const b = recipe('b', [['onion', 200]]);
    const m = mergeNeeds([a, b], 4);
    expect(m.get('onion')).toBe(600);
    expect(m.get('tofu')).toBe(400);
  });
});

describe('costNeeds', () => {
  const prices: Record<string, ResolvedPrice> = {
    onion: price(1000, 3),
    tofu: price(400, 2.5),
    salt: price(700, 1.29),
  };
  const priceOf = (id: string) => prices[id];

  it('charges whole packs bought but values only what is used', () => {
    const s = costNeeds(new Map([['onion', 1500]]), priceOf, new Set());
    expect(s.lines[0].packs).toBe(2);
    expect(s.bought).toBe(6);
    expect(s.used).toBe(4.5);
    expect(s.leftover).toBe(1.5);
  });

  it('pantry items cost zero and buy no packs', () => {
    const s = costNeeds(new Map([['onion', 500], ['salt', 10]]), priceOf, new Set(['salt']));
    const salt = s.lines.find((l) => l.ingredientId === 'salt')!;
    expect(salt.inPantry).toBe(true);
    expect(salt.packs).toBe(0);
    expect(salt.bought).toBe(0);
    expect(salt.used).toBe(0);
    expect(s.bought).toBe(3);
  });

  it('putting everything in the pantry makes the week free', () => {
    const r = recipe('a', [['onion', 400], ['tofu', 800]]);
    const s = weekCost([r], 4, priceOf, new Set(['onion', 'tofu']));
    expect(s.bought).toBe(0);
    expect(s.used).toBe(0);
  });

  it('flags ingredients with no price instead of crashing', () => {
    const s = costNeeds(new Map([['mystery', 100]]), priceOf, new Set());
    expect(s.lines[0].missingPrice).toBe(true);
    expect(s.bought).toBe(0);
  });

  it('shares packs across the week (two recipes, one tofu pack)', () => {
    const a = recipe('a', [['tofu', 200]]);
    const b = recipe('b', [['tofu', 200]]);
    const s = weekCost([a, b], 4, priceOf, new Set());
    expect(s.lines[0].packs).toBe(1);
    expect(s.bought).toBe(2.5);
  });

  it('bought is never less than used', () => {
    const r = recipe('a', [['onion', 1234], ['tofu', 333]]);
    for (const servings of [1, 2, 3, 5, 8]) {
      const s = weekCost([r], servings, priceOf, new Set());
      expect(s.bought).toBeGreaterThanOrEqual(s.used);
    }
  });
});

describe('real price table', () => {
  it('prices every ingredient at every store', () => {
    const ctx = { overrides: new Map() };
    const priceOf = makePriceFn(INGREDIENT_BY_ID, (ing) => resolvePrice('walmart', ing, ctx));
    for (const id of Object.keys(INGREDIENT_BY_ID)) {
      const p = priceOf(id)!;
      expect(p.size, id).toBeGreaterThan(0);
      expect(p.price, id).toBeGreaterThan(0);
    }
  });
});
