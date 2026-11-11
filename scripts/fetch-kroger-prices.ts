/**
 * Daily live-price job for Kroger-family stores.
 *
 * Uses Kroger's free public developer API (https://developer.kroger.com):
 *   1. client-credentials token (scope: product.compact)
 *   2. nearest store to KROGER_ZIP (or a fixed KROGER_LOCATION_ID)
 *   3. one product search per ingredient, priced at that store
 * and writes public/prices/live.json, which the app loads on start.
 *
 * Run locally:   KROGER_CLIENT_ID=… KROGER_CLIENT_SECRET=… KROGER_ZIP=45202 npm run prices:kroger
 * In CI:         .github/workflows/kroger-prices.yml (daily, free GitHub Actions minutes)
 *
 * About 150 product calls per run; Kroger's public limit is 10,000/day.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { INGREDIENTS } from '../src/data/ingredients';
import { pickProduct, type KrogerProduct } from '../src/engine/kroger';
import type { LivePriceFile } from '../src/types';
import { KROGER_TERMS } from './kroger-terms';

const API = 'https://api.kroger.com/v1';
const OUT = new URL('../public/prices/live.json', import.meta.url);

const { KROGER_CLIENT_ID, KROGER_CLIENT_SECRET, KROGER_ZIP, KROGER_LOCATION_ID } = process.env;

async function token(): Promise<string> {
  const basic = Buffer.from(`${KROGER_CLIENT_ID}:${KROGER_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${API}/connect/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=product.compact',
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function get<T>(path: string, bearer: string): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/json' } });
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }
  throw new Error(`${path} → gave up after retries`);
}

async function main() {
  if (!KROGER_CLIENT_ID || !KROGER_CLIENT_SECRET) {
    console.error('Set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET (free at developer.kroger.com).');
    process.exit(1);
  }
  const bearer = await token();

  let locationId = KROGER_LOCATION_ID;
  let locationName: string | undefined;
  if (!locationId) {
    if (!KROGER_ZIP) throw new Error('Set KROGER_ZIP or KROGER_LOCATION_ID.');
    const locs = await get<{ data: { locationId: string; name: string; chain: string }[] }>(
      `/locations?filter.zipCode.near=${encodeURIComponent(KROGER_ZIP)}&filter.limit=1`,
      bearer,
    );
    if (!locs.data.length) throw new Error(`No Kroger-family store near ${KROGER_ZIP}.`);
    locationId = locs.data[0].locationId;
    locationName = `${locs.data[0].chain} · ${locs.data[0].name}`;
  }
  console.log(`Pricing at ${locationName ?? locationId}`);

  const prices: LivePriceFile['prices'] = {};
  let found = 0;
  for (const ing of INGREDIENTS) {
    const query = KROGER_TERMS[ing.id] ?? ing.name.replace(/\(.*?\)/g, '').replace(/,/g, ' ');
    try {
      const res = await get<{ data: KrogerProduct[] }>(
        `/products?filter.term=${encodeURIComponent(query)}&filter.locationId=${locationId}&filter.limit=10`,
        bearer,
      );
      const pick = pickProduct(ing, query, res.data ?? []);
      if (pick) {
        prices[ing.id] = pick;
        found++;
      } else console.log(`  · no confident match for ${ing.id} ("${query}")`);
    } catch (e) {
      console.log(`  ! ${ing.id}: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 120)); // be polite
  }

  const file: LivePriceFile = {
    source: 'Kroger Products API',
    fetchedAt: new Date().toISOString(),
    locationId,
    locationName,
    prices,
  };
  await mkdir(new URL('.', OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(file, null, 1) + '\n');
  console.log(`Wrote ${found}/${INGREDIENTS.length} live prices to public/prices/live.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
