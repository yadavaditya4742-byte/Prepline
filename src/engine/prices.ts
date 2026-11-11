import { STORE_BY_ID } from '../data/stores';
import type {
  Ingredient,
  LivePriceFile,
  Pack,
  PriceOverride,
  ResolvedPrice,
  StoreId,
} from '../types';

/** Round a computed price to a shelf-looking value ending in 9 cents. */
export function shelfRound(x: number): number {
  if (x <= 0) return 0;
  const cents = Math.round(x * 100);
  const rounded = Math.max(9, Math.round((cents - 9) / 10) * 10 + 9);
  return rounded / 100;
}

/** Seed (estimated) price for an ingredient at a store. */
export function seedPrice(storeId: StoreId, ing: Ingredient): Pack {
  const store = STORE_BY_ID[storeId];
  if (store.usesBulk && ing.bulk) return { ...ing.bulk };
  if (store.usesDesi && ing.desi) return { ...ing.desi };
  const idx = store.index[ing.aisle] ?? store.index.default;
  if (idx === 1) return { ...ing.base };
  return { ...ing.base, price: shelfRound(ing.base.price * idx) };
}

export const overrideKey = (storeId: StoreId, ingredientId: string) =>
  `${storeId}:${ingredientId}`;

export interface PriceContext {
  overrides: Map<string, PriceOverride>;
  /** Live Kroger-family prices, if the scheduled job has produced them. */
  live?: LivePriceFile | null;
}

/**
 * Resolve the price the app should use. Priority:
 *   1. the user's own edit
 *   2. a live price (Kroger family only)
 *   3. the seed estimate
 */
export function resolvePrice(
  storeId: StoreId,
  ing: Ingredient,
  ctx: PriceContext,
): ResolvedPrice {
  const o = ctx.overrides.get(overrideKey(storeId, ing.id));
  if (o) {
    return { size: o.size, price: o.price, label: o.label, source: 'user', updatedAt: o.updatedAt };
  }
  if (storeId === 'kroger' && ctx.live?.prices[ing.id]) {
    const l = ctx.live.prices[ing.id];
    return { size: l.size, price: l.price, label: l.label, source: 'live', updatedAt: ctx.live.fetchedAt };
  }
  return { ...seedPrice(storeId, ing), source: 'seed' };
}

export const unitPrice = (p: Pack) => (p.size > 0 ? p.price / p.size : 0);

/**
 * Bulk hint: if Costco's per-unit price for this ingredient is at least
 * `threshold` (default 25%) cheaper than the chosen store, return the saving.
 */
export function bulkHint(
  storeId: StoreId,
  ing: Ingredient,
  ctx: PriceContext,
  threshold = 0.25,
): { costco: ResolvedPrice; savingPct: number } | null {
  if (storeId === 'costco') return null;
  const here = resolvePrice(storeId, ing, ctx);
  const costco = resolvePrice('costco', ing, ctx);
  // Only hint on a real bulk pack (or a Costco price the user entered), not on the store index alone.
  if (!ing.bulk && costco.source === 'seed') return null;
  const a = unitPrice(here);
  const b = unitPrice(costco);
  if (a <= 0 || b <= 0) return null;
  const savingPct = 1 - b / a;
  return savingPct >= threshold ? { costco, savingPct } : null;
}
