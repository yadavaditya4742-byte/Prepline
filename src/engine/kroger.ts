import type { Ingredient } from '../types';
import { parseSize } from './sizes';

/*
 * Pure helpers for the Kroger live-price job (scripts/fetch-kroger-prices.ts).
 * Kept in the app source so they're unit-tested alongside everything else.
 *
 * Kroger Products API docs: https://developer.kroger.com/api-products/api
 */

export interface KrogerProduct {
  productId: string;
  description: string;
  brand?: string;
  items?: {
    size?: string;
    soldBy?: string;
    price?: { regular?: number; promo?: number };
  }[];
}

export interface LivePick {
  size: number;
  price: number;
  label: string;
  productName: string;
}

const STOP = new Set(['and', 'or', 'the', 'a', 'of', 'with', 'fresh', 'frozen', 'canned', 'dry']);
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));

/**
 * Pick the best Kroger product for an ingredient:
 *  - must have a regular price and a size we can convert to the ingredient's unit
 *    (items sold by weight are priced per lb);
 *  - prefer descriptions that contain more of the search words;
 *  - among equally good matches, take the lowest unit price (store brand, usually).
 */
export function pickProduct(ing: Ingredient, query: string, products: KrogerProduct[]): LivePick | null {
  const want = words(query);
  const candidates: (LivePick & { score: number; unit: number })[] = [];
  for (const p of products) {
    const item = p.items?.[0];
    const price = item?.price?.regular;
    if (!item || !price || price <= 0) continue;

    let size = item.soldBy?.toUpperCase() === 'WEIGHT' ? { amount: 453.592, unit: 'g' as const } : parseSize(item.size ?? '');
    if (!size) continue;
    // A lone "1 ct" on a weight/volume ingredient (e.g. a bunch, a head) is OK only for produce sold each.
    if (size.unit !== ing.unit) {
      if (ing.unit === 'g' && size.unit === 'each' && size.amount === 1 && ing.base.size > 0 && ing.aisle === 'Produce') {
        size = { amount: ing.base.size, unit: 'g' };
      } else continue;
    }
    const desc = words(`${p.brand ?? ''} ${p.description}`);
    const score = want.filter((w) => desc.some((d) => d.startsWith(w) || w.startsWith(d))).length / Math.max(1, want.length);
    if (score < 0.5) continue;
    const label = item.soldBy?.toUpperCase() === 'WEIGHT' ? 'per lb' : (item.size ?? '').trim();
    candidates.push({ size: size.amount, price, label, productName: p.description, score, unit: price / size.amount });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || a.unit - b.unit);
  const { score: _s, unit: _u, ...pick } = candidates[0];
  void _s;
  void _u;
  return pick;
}
