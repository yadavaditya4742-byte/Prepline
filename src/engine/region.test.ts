import { describe, expect, it } from 'vitest';
import { INGREDIENT_BY_ID } from '../data';
import type { RegionalPriceFile } from '../types';
import { regionFactorSanity } from './region.testutil';
import { resolvePrice, seedPrice } from './prices';
import { regionForZip, stateForZip } from './region';

const regional: RegionalPriceFile = {
  source: 'BLS',
  fetchedAt: '2026-11-12T00:00:00Z',
  period: 'October 2026',
  regions: { northeast: 1.071, midwest: 1.005, south: 0.985, west: 1.033 },
  items: {},
};
const onion = INGREDIENT_BY_ID['onion'];
const tofu = INGREDIENT_BY_ID['tofu'];

describe('ZIP → region', () => {
  it.each([
    ['33610', 'FL', 'south'],
    ['10001', 'NY', 'northeast'],
    ['94103', 'CA', 'west'],
    ['60601', 'IL', 'midwest'],
    ['75201', 'TX', 'south'],
    ['98101', 'WA', 'west'],
    ['02139', 'MA', 'northeast'],
    ['45202', 'OH', 'midwest'],
    ['99501', 'AK', 'west'],
  ])('%s → %s → %s', (zip, state, region) => {
    expect(stateForZip(zip)).toBe(state);
    expect(regionForZip(zip)).toBe(region);
  });
  it('rejects bad input', () => {
    expect(regionForZip('abc')).toBeNull();
    expect(regionForZip('1234')).toBeNull();
  });
});

describe('regional estimates', () => {
  it('scales estimates to the user’s region when there is no live price', () => {
    const base = seedPrice('walmart', tofu).price;
    const west = resolvePrice('walmart', tofu, { overrides: new Map(), region: 'west', regional }).price;
    const south = resolvePrice('walmart', tofu, { overrides: new Map(), region: 'south', regional }).price;
    expect(west).toBeGreaterThan(south);
    expect(regionFactorSanity(west / base, 1.033)).toBe(true);
  });

  it('does not double-adjust when the live Kroger price is local', () => {
    const live = { source: 'Kroger API', fetchedAt: '2026-11-12', reference: false, region: 'west' as const, prices: { onion: { size: onion.base.size, price: onion.base.price, label: '3 lb' } } };
    const p = resolvePrice('walmart', onion, { overrides: new Map(), live, region: 'west', regional });
    expect(p.price).toBe(seedPrice('walmart', onion).price);
  });

  it('converts a reference-market Kroger price to the user’s region', () => {
    const live = { source: 'Kroger API', fetchedAt: '2026-11-12', reference: true, region: 'south' as const, prices: { onion: { size: onion.base.size, price: onion.base.price, label: '3 lb' } } };
    const p = resolvePrice('walmart', onion, { overrides: new Map(), live, region: 'northeast', regional });
    expect(regionFactorSanity(p.price / seedPrice('walmart', onion).price, 1.071 / 0.985)).toBe(true);
  });

  it('never touches live prices or your own edits', () => {
    const live = { source: 'Kroger API', fetchedAt: '2026-11-12', prices: { onion: { size: 1360, price: 2.99, label: '3 lb' } } };
    expect(resolvePrice('kroger', onion, { overrides: new Map(), live, region: 'west', regional }).price).toBe(2.99);
  });
});
