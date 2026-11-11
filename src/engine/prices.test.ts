import { describe, expect, it } from 'vitest';
import { INGREDIENT_BY_ID, STORES } from '../data';
import type { PriceOverride } from '../types';
import { bulkHint, overrideKey, resolvePrice, seedPrice, shelfRound } from './prices';

const ing = (id: string) => INGREDIENT_BY_ID[id];

describe('shelfRound', () => {
  it('ends prices in 9 cents', () => {
    expect(shelfRound(3.0)).toBe(2.99);
    expect(shelfRound(3.14)).toBe(3.19);
    expect(shelfRound(0.01)).toBe(0.09);
  });
});

describe('seedPrice', () => {
  it('Kroger uses the base pack unchanged', () => {
    expect(seedPrice('kroger', ing('onion'))).toEqual(ing('onion').base);
  });
  it('Costco uses the bulk pack when there is one', () => {
    expect(seedPrice('costco', ing('chicken-breast'))).toEqual(ing('chicken-breast').bulk);
  });
  it('Indian grocery uses the desi pack when there is one', () => {
    expect(seedPrice('desi', ing('toor-dal'))).toEqual(ing('toor-dal').desi);
  });
  it('every store has a positive price for every ingredient', () => {
    for (const s of STORES) {
      for (const i of Object.values(INGREDIENT_BY_ID)) {
        const p = seedPrice(s.id, i);
        expect(p.price, `${s.id}/${i.id}`).toBeGreaterThan(0);
        expect(p.size, `${s.id}/${i.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('resolvePrice priority', () => {
  const onion = ing('onion');
  const override: PriceOverride = {
    key: overrideKey('kroger', 'onion'),
    storeId: 'kroger',
    ingredientId: 'onion',
    size: 1000,
    price: 1.11,
    label: 'my bag',
    updatedAt: '2026-11-01',
  };
  const live = {
    source: 'Kroger Products API',
    fetchedAt: '2026-11-10T06:00:00Z',
    prices: { onion: { size: 1360, price: 2.79, label: '3 lb bag' } },
  };

  it('falls back to seed', () => {
    expect(resolvePrice('kroger', onion, { overrides: new Map() }).source).toBe('seed');
  });
  it('live beats seed (Kroger only)', () => {
    const p = resolvePrice('kroger', onion, { overrides: new Map(), live });
    expect(p.source).toBe('live');
    expect(p.price).toBe(2.79);
    expect(resolvePrice('walmart', onion, { overrides: new Map(), live }).source).toBe('seed');
  });
  it('user edit beats live', () => {
    const p = resolvePrice('kroger', onion, { overrides: new Map([[override.key, override]]), live });
    expect(p.source).toBe('user');
    expect(p.price).toBe(1.11);
  });
});

describe('bulkHint', () => {
  const ctx = { overrides: new Map() };
  it('flags Costco chicken as much cheaper per pound than Whole Foods', () => {
    const h = bulkHint('wholefoods', ing('chicken-breast'), ctx);
    expect(h).not.toBeNull();
    expect(h!.savingPct).toBeGreaterThan(0.25);
  });
  it('never hints when you already shop at Costco', () => {
    expect(bulkHint('costco', ing('chicken-breast'), ctx)).toBeNull();
  });
  it('no hint for items without a real bulk advantage', () => {
    expect(bulkHint('kroger', ing('tempeh'), ctx)).toBeNull();
  });
  it('no hint when Costco has no bulk pack, even at a pricey store', () => {
    expect(ing('cilantro').bulk).toBeUndefined();
    expect(bulkHint('wholefoods', ing('cilantro'), ctx)).toBeNull();
  });
});
