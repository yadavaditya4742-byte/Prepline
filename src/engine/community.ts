import type { CommunityPriceFile, Ingredient, StoreId } from '../types';
import { G_PER, ML_PER } from './sizes';

/*
 * Turns raw Open Prices records (shopper receipts, ODbL open data from
 * Open Food Facts — https://prices.openfoodfacts.org) into a per-chain,
 * per-ingredient median price per base unit. Pure + unit-tested; the daily
 * job (scripts/fetch-community-prices.ts) feeds it.
 */

export interface OpenPriceItem {
  price: number;
  price_without_discount?: number | null;
  price_per?: 'KILOGRAM' | 'UNIT' | null;
  currency: string;
  date: string;
  category_tag?: string | null;
  product?: { product_name?: string | null; product_quantity?: number | null; product_quantity_unit?: string | null } | null;
  location?: { osm_name?: string | null; osm_brand?: string | null } | null;
}

/** Map a store name on a receipt to one of our chains. */
const CHAINS: [RegExp, StoreId][] = [
  [/kroger|ralphs|fred meyer|king soopers|fry'?s food|smith'?s|qfc|harris teeter|mariano|dillons|food 4 less|pick ?n ?save|metro market|city market|baker'?s/i, 'kroger'],
  [/walmart/i, 'walmart'],
  [/costco/i, 'costco'],
  [/\btarget\b/i, 'target'],
  [/\baldi\b/i, 'aldi'],
  [/trader joe/i, 'traderjoes'],
  [/whole foods/i, 'wholefoods'],
  [/safeway|albertsons|vons|jewel|acme|shaw'?s|tom thumb|randalls|pavilions|star market/i, 'safeway'],
  [/publix/i, 'publix'],
  [/h-?e-?b\b/i, 'heb'],
  [/patel|india bazaar|apna bazar|subzi mandi|indian grocer|desi/i, 'desi'],
];

export function chainOf(loc: OpenPriceItem['location']): StoreId | null {
  const name = `${loc?.osm_brand ?? ''} ${loc?.osm_name ?? ''}`;
  for (const [re, id] of CHAINS) if (re.test(name)) return id;
  return null;
}

/** Price per base unit (g / ml / each) for one record, or null if it can't be worked out. */
export function unitPriceOf(item: OpenPriceItem, ing: Ingredient): number | null {
  const price = item.price_without_discount && item.price_without_discount > 0 ? item.price_without_discount : item.price;
  if (!(price > 0) || item.currency !== 'USD') return null;
  if (item.price_per === 'KILOGRAM') return ing.unit === 'g' ? price / 1000 : null;
  if (item.price_per === 'UNIT' && !item.product?.product_quantity) return ing.unit === 'each' ? price : null;
  const q = item.product?.product_quantity;
  const u = (item.product?.product_quantity_unit ?? '').toLowerCase();
  if (!q || q <= 0) return null;
  if (ing.unit === 'g' && (u === 'g' || u === 'kg' || u === 'oz' || u === 'lb')) return price / (q * (G_PER[u as keyof typeof G_PER] ?? 1));
  if (ing.unit === 'ml' && (u === 'ml' || u === 'l' || u === 'cl' || u === 'fl oz')) {
    const per = u === 'cl' ? 10 : ML_PER[u as keyof typeof ML_PER] ?? 1;
    return price / (q * per);
  }
  return null;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Aggregate records already grouped by ingredient. */
export function aggregateCommunity(
  byIngredient: Record<string, OpenPriceItem[]>,
  ingredients: Record<string, Ingredient>,
  fetchedAt: string,
): CommunityPriceFile {
  const stores: CommunityPriceFile['stores'] = {};
  for (const [ingId, items] of Object.entries(byIngredient)) {
    const ing = ingredients[ingId];
    if (!ing) continue;
    const perChain = new Map<StoreId, { prices: number[]; last: string }>();
    for (const it of items) {
      const chain = chainOf(it.location);
      const up = unitPriceOf(it, ing);
      if (!chain || up === null || !Number.isFinite(up)) continue;
      const e = perChain.get(chain) ?? { prices: [], last: '' };
      e.prices.push(up);
      if (it.date > e.last) e.last = it.date;
      perChain.set(chain, e);
    }
    for (const [chain, e] of perChain) {
      (stores[chain] ??= {})[ingId] = { unitPrice: median(e.prices), reports: e.prices.length, lastDate: e.last };
    }
  }
  return {
    source: 'Open Prices (Open Food Facts)',
    license: 'Open Database License (ODbL) — prices.openfoodfacts.org',
    fetchedAt,
    stores,
  };
}
