import { STORE_BY_ID } from '../data/stores';
import type {
  CommunityPriceFile,
  Ingredient,
  LivePriceFile,
  Region,
  RegionalPriceFile,
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
  /** Live Kroger-family prices (official Kroger API). */
  live?: LivePriceFile | null;
  /** Live prices for other stores with an official API (e.g. Walmart). */
  liveByStore?: Partial<Record<StoreId, LivePriceFile>>;
  /** Shopper-reported prices by chain (Open Prices). */
  community?: CommunityPriceFile | null;
  /** "Today" for freshness checks (tests pass a fixed date). */
  now?: Date;
  /** User's Census region (from ZIP) and BLS regional price levels. */
  region?: Region | null;
  regional?: RegionalPriceFile | null;
}

/**
 * How much to scale an estimate for the user's region.
 * - If the live Kroger price for this item is from the user's own area, it already reflects
 *   local prices, so no extra regional step.
 * - If it's from a reference market elsewhere, convert from that market's region to the user's.
 * - If there's no live price, scale the national estimate to the user's region.
 */
export function regionalFactor(ing: Ingredient, ctx: PriceContext): number {
  const levels = ctx.regional?.regions;
  if (!levels || !ctx.region) return 1;
  const user = levels[ctx.region] ?? 1;
  const kroger = liveFileFor('kroger', ctx);
  if (kroger?.prices[ing.id]) {
    if (!kroger.reference) return 1;
    const from = kroger.region ? levels[kroger.region] ?? 1 : 1;
    return user / from;
  }
  return user;
}

/** Community prices older than this are ignored. */
export const COMMUNITY_MAX_AGE_DAYS = 365;
/** A community unit price more than 2× off our estimate is treated as a bad product match. */
export const COMMUNITY_SANITY = 2;
/** One receipt is an anecdote; require at least this many. */
export const COMMUNITY_MIN_REPORTS = 2;

export function liveFileFor(storeId: StoreId, ctx: PriceContext): LivePriceFile | null {
  if (storeId === 'kroger') return ctx.live ?? ctx.liveByStore?.kroger ?? null;
  return ctx.liveByStore?.[storeId] ?? null;
}

/**
 * Resolve the price the app should use. Priority:
 *   1. the user's own edit
 *   2. a live price from the store's official API (Kroger, Walmart)
 *   3. a shopper-reported price for that chain (Open Prices), if recent and sane
 *   4. our estimate, nudged by the live Kroger market when available
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
  const lf = liveFileFor(storeId, ctx);
  if (lf?.prices[ing.id]) {
    const l = lf.prices[ing.id];
    return { size: l.size, price: l.price, label: l.label, source: 'live', updatedAt: lf.fetchedAt, sourceName: lf.source };
  }
  const seed = seedPrice(storeId, ing);
  const c = ctx.community?.stores[storeId]?.[ing.id];
  if (c && c.unitPrice > 0 && c.reports >= COMMUNITY_MIN_REPORTS) {
    const ageDays = ((ctx.now ?? new Date()).getTime() - new Date(c.lastDate).getTime()) / 86_400_000;
    const ratio = c.unitPrice / unitPrice(seed);
    if (ageDays <= COMMUNITY_MAX_AGE_DAYS && ratio < COMMUNITY_SANITY && ratio > 1 / COMMUNITY_SANITY) {
      return {
        ...seed,
        price: Math.round(c.unitPrice * seed.size * 100) / 100,
        source: 'community',
        sourceName: ctx.community!.source,
        reports: c.reports,
        updatedAt: c.lastDate,
      };
    }
  }
  const live = liveFactor(ing, liveFileFor('kroger', ctx));
  const regional = regionalFactor(ing, ctx);
  const factor = Math.min(LIVE_FACTOR_MAX, Math.max(LIVE_FACTOR_MIN, (live ?? 1) * regional));
  if (live !== null || regional !== 1) {
    return { ...seed, price: shelfRound(seed.price * factor), source: 'seed', ...(live !== null && { tracksLive: true }) };
  }
  return { ...seed, source: 'seed' };
}

/** Live-market factor bounds: one odd product match can't swing estimates wildly. */
export const LIVE_FACTOR_MIN = 0.6;
export const LIVE_FACTOR_MAX = 1.6;

/**
 * How far the live Kroger unit price sits from our Kroger seed estimate.
 * Other stores' estimates are scaled by this, so they follow real market moves.
 */
export function liveFactor(ing: Ingredient, live?: LivePriceFile | null): number | null {
  const l = live?.prices[ing.id];
  if (!l || l.size <= 0 || l.price <= 0) return null;
  const seedUnit = unitPrice(seedPrice('kroger', ing));
  if (seedUnit <= 0) return null;
  const f = l.price / l.size / seedUnit;
  return Math.min(LIVE_FACTOR_MAX, Math.max(LIVE_FACTOR_MIN, f));
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

/** Light validation for public/prices/live.json before trusting it. */
export function isLivePriceFile(x: unknown): x is LivePriceFile {
  if (!x || typeof x !== 'object') return false;
  const f = x as LivePriceFile;
  if (typeof f.fetchedAt !== 'string' || !f.prices || typeof f.prices !== 'object') return false;
  return Object.values(f.prices).every(
    (p) => p && typeof p.size === 'number' && p.size > 0 && typeof p.price === 'number' && p.price > 0 && typeof p.label === 'string',
  );
}
