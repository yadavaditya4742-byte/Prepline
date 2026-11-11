/**
 * Daily: build public/prices/community.json from Open Prices, the free and
 * open (ODbL) database of shopper-reported receipt prices run by
 * Open Food Facts. No key needed. https://prices.openfoodfacts.org
 *
 * Covers any chain shoppers upload receipts from (Safeway, Aldi, Costco,
 * Trader Joe's, Target, Walmart, Whole Foods…). Coverage grows as people
 * contribute — anyone can add prices with the Open Prices app.
 *
 *   npm run prices:community
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { INGREDIENT_BY_ID } from '../src/data/ingredients';
import { aggregateCommunity, type OpenPriceItem } from '../src/engine/community';
import { OPEN_PRICES_MAP } from './openprices-map';

const API = 'https://prices.openfoodfacts.org/api/v1/prices';
const OUT = new URL('../public/prices/community.json', import.meta.url);
const SINCE = new Date(Date.now() - 365 * 86_400_000).toISOString();
const UA = 'Prepline/1.0 (open-source meal planner; daily price aggregate)';

async function page(params: Record<string, string>): Promise<OpenPriceItem[]> {
  const qs = new URLSearchParams({ currency: 'USD', created__gte: SINCE, size: '100', order_by: '-date', ...params });
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}?${qs}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) return [];
    return ((await res.json()) as { items: OpenPriceItem[] }).items ?? [];
  }
  return [];
}

async function safePage(params: Record<string, string>): Promise<OpenPriceItem[]> {
  try {
    return await page(params);
  } catch (e) {
    console.log(`  ! ${JSON.stringify(params)}: ${(e as Error).message}`);
    return [];
  }
}

async function main() {
  const byIngredient: Record<string, OpenPriceItem[]> = {};
  for (const [id, m] of Object.entries(OPEN_PRICES_MAP)) {
    const items: OpenPriceItem[] = [];
    for (const tag of m.raw ?? []) items.push(...(await safePage({ category_tag: tag })));
    for (const tag of m.cats ?? []) items.push(...(await safePage({ product__categories_tags__contains: tag })));
    byIngredient[id] = items;
    console.log(`${id}: ${items.length} receipts`);
    await new Promise((r) => setTimeout(r, 300)); // be gentle with a free community service
  }
  const file = aggregateCommunity(byIngredient, INGREDIENT_BY_ID, new Date().toISOString());
  const covered = Object.entries(file.stores).map(([s, m]) => `${s}:${Object.keys(m ?? {}).length}`).join(' ');
  await mkdir(new URL('.', OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(file) + '\n');
  console.log(`Wrote community.json — items per chain: ${covered || 'none yet'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
