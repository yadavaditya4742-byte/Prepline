import type { CostLine } from './cost';
import type { Ingredient } from '../types';
import { G_PER, ML_PER } from './sizes';

/*
 * Instacart Developer Platform — "Create shopping list page".
 * POST https://connect.instacart.com/idp/v1/products/products_link
 * (development: https://connect.dev.instacart.tools)
 * Authorization: Bearer <API key>  — the key must stay on a server
 * (our price server / Cloudflare Worker), never in the app.
 *
 * The user opens the link, picks any store Instacart serves near them
 * (Costco, Aldi, Safeway, Publix, Sprouts, Kroger family, and more),
 * and sees that store's live prices for every item on our list.
 */

export interface InstacartLineItem {
  name: string;
  display_text?: string;
  line_item_measurements: { quantity: number; unit: string }[];
}

export interface InstacartListRequest {
  title: string;
  link_type: 'shopping_list';
  expires_in: number;
  instructions?: string[];
  line_items: InstacartLineItem[];
  landing_page_configuration?: { partner_linkback_url?: string };
}

const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

/** Our needed amount, expressed in units Instacart understands (several options help its matching). */
export function measurementsFor(ing: Ingredient, need: number): { quantity: number; unit: string }[] {
  if (ing.unit === 'each') return [{ quantity: Math.max(1, Math.ceil(need)), unit: 'each' }];
  if (ing.unit === 'ml') {
    return [
      { quantity: round(need / ML_PER['fl oz']), unit: 'fl oz' },
      { quantity: round(need), unit: 'ml' },
    ];
  }
  const oz = need / G_PER.oz;
  const out = [
    { quantity: round(oz), unit: 'ounce' },
    { quantity: Math.round(need), unit: 'gram' },
  ];
  if (oz >= 16) out.unshift({ quantity: round(need / G_PER.lb, 2), unit: 'pound' });
  return out;
}

/** Build the request body for a shopping-list page from our merged grocery list. */
export function buildInstacartList(
  title: string,
  lines: CostLine[],
  ingredients: Record<string, Ingredient>,
  linkback?: string,
): InstacartListRequest {
  return {
    title,
    link_type: 'shopping_list',
    expires_in: 30,
    instructions: ['Built with Prepline. Pick your store to see its live prices.'],
    line_items: lines
      .filter((l) => !l.inPantry && ingredients[l.ingredientId])
      .map((l) => {
        const ing = ingredients[l.ingredientId];
        const name = ing.name.replace(/\s*\(.*?\)/g, '').replace(/,.*$/, '').trim();
        return { name, display_text: ing.name, line_item_measurements: measurementsFor(ing, l.need) };
      }),
    ...(linkback && { landing_page_configuration: { partner_linkback_url: linkback } }),
  };
}

/** Stable key so the same list reuses the same link (Instacart asks partners to cache links). */
export async function listKey(body: InstacartListRequest): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(body.line_items));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}
