/**
 * Regional grocery price levels from the U.S. Bureau of Labor Statistics (public domain).
 * BLS publishes monthly *average prices* for common foods in each Census region.
 * We compare each region to the U.S. average across a basket of staples and write
 * public/prices/regional.json, e.g. { west: 1.07, south: 0.96, ... }.
 *
 * Free, no key (BLS public API v1). Runs daily with the other price jobs.
 *   npm run prices:regional
 */
import { mkdir, writeFile } from 'node:fs/promises';
import type { RegionalPriceFile, Region } from '../src/types';

const OUT = new URL('../public/prices/regional.json', import.meta.url);
const AREAS: Record<Region | 'us', string> = { us: '0000', northeast: '0100', midwest: '0200', south: '0300', west: '0400' };
// BLS average-price item codes (per lb unless noted).
const ITEMS: Record<string, string> = {
  eggs: '708111', // grade A large, per dozen
  milk: '709112', // whole, per gallon
  chicken: '706111', // whole fresh, per lb
  'ground-beef': '703112',
  bread: '702111',
  rice: '701312',
  bananas: '711211',
  tomatoes: '712311',
  potatoes: '712112',
  cheddar: '710212',
};

async function bls(series: string[]): Promise<Record<string, { value: number; period: string }>> {
  const year = new Date().getFullYear();
  const res = await fetch('https://api.bls.gov/publicAPI/v1/timeseries/data/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seriesid: series, startyear: String(year - 1), endyear: String(year) }),
  });
  if (!res.ok) throw new Error(`BLS ${res.status}`);
  const body = (await res.json()) as {
    status: string;
    message?: string[];
    Results?: { series: { seriesID: string; data: { year: string; periodName: string; value: string }[] }[] };
  };
  if (body.status !== 'REQUEST_SUCCEEDED') console.log('BLS:', body.status, body.message?.join(' '));
  const out: Record<string, { value: number; period: string }> = {};
  for (const s of body.Results?.series ?? []) {
    const latest = s.data.find((d) => Number(d.value) > 0);
    if (latest) out[s.seriesID] = { value: Number(latest.value), period: `${latest.periodName} ${latest.year}` };
  }
  return out;
}

async function main() {
  const ids: string[] = [];
  for (const area of Object.values(AREAS)) for (const item of Object.values(ITEMS)) ids.push(`APU${area}${item}`);
  // v1 allows 25 series per request.
  const data: Record<string, { value: number; period: string }> = {};
  for (let i = 0; i < ids.length; i += 25) Object.assign(data, await bls(ids.slice(i, i + 25)));

  const regions = {} as Record<Region, number>;
  const detail: RegionalPriceFile['items'] = {};
  let period = '';
  for (const region of ['northeast', 'midwest', 'south', 'west'] as Region[]) {
    const ratios: number[] = [];
    for (const [name, code] of Object.entries(ITEMS)) {
      const us = data[`APU${AREAS.us}${code}`];
      const r = data[`APU${AREAS[region]}${code}`];
      if (!us || !r) continue;
      ratios.push(r.value / us.value);
      (detail[name] ??= {})[region] = r.value;
      detail[name].us = us.value;
      period ||= us.period;
    }
    // Geometric mean of regional/US ratios; neutral if BLS returned nothing.
    regions[region] = ratios.length ? Math.round(Math.exp(ratios.reduce((s, x) => s + Math.log(x), 0) / ratios.length) * 1000) / 1000 : 1;
    console.log(`${region}: ${regions[region]} (${ratios.length} items)`);
  }
  const file: RegionalPriceFile = {
    source: 'U.S. Bureau of Labor Statistics, Average Price Data',
    fetchedAt: new Date().toISOString(),
    period,
    regions,
    items: detail,
  };
  await mkdir(new URL('.', OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(file, null, 1) + '\n');
  console.log(`Wrote regional.json for ${period}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
