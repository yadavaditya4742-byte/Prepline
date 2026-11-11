import { useEffect, useState } from 'react';
import * as db from '../db/db';
import { isLivePriceFile } from '../engine/prices';
import type { CommunityPriceFile, LivePriceFile, StoreId } from '../types';

/*
 * Gathers every price source the app can use, newest-first, and keeps the
 * last good copy on the device so prices still work offline:
 *
 *  1. public/prices/live.json        Kroger, refreshed daily by GitHub Actions (one ZIP)
 *  2. public/prices/community.json   shopper receipts from Open Prices, all chains
 *  3. price server /v1/kroger        Kroger at YOUR nearest store (needs ZIP)
 *  4. price server /v1/walmart       walmart.com prices (if the server has Walmart keys)
 */

export interface LiveState {
  liveByStore: Partial<Record<StoreId, LivePriceFile>>;
  community: CommunityPriceFile | null;
  /** Human-readable status per source, for the Prices screen. */
  status: { kroger?: string; walmart?: string; community?: string; server?: 'off' | 'ok' | 'error' };
}

const FRESH_MS = 12 * 3600_000;
const BATCH = 40;

export const defaultPricesApi = (): string => (import.meta.env.VITE_PRICES_API as string | undefined) ?? '';

function isCommunityFile(x: unknown): x is CommunityPriceFile {
  const f = x as CommunityPriceFile;
  return !!f && typeof f.fetchedAt === 'string' && !!f.stores && typeof f.stores === 'object';
}

async function staticFile<T>(name: string, valid: (x: unknown) => x is T): Promise<T | null> {
  const key = `prices:${name}`;
  const cached = await db.loadKV<T>(key).catch(() => null);
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}prices/${name}.json`, { cache: 'no-cache' });
    if (res.ok) {
      const data: unknown = await res.json();
      if (valid(data)) {
        await db.saveKV(key, data);
        return data;
      }
    }
  } catch {
    /* offline */
  }
  return cached;
}

async function fromServer(api: string, path: string, query: string, ids: string[], cacheKey: string): Promise<LivePriceFile | null> {
  const cached = await db.loadKV<LivePriceFile & { _key?: string }>(cacheKey).catch(() => null);
  if (cached && cached._key === query && Date.now() - new Date(cached.fetchedAt).getTime() < FRESH_MS) return cached;
  let merged: LivePriceFile | null = null;
  try {
    for (let i = 0; i < ids.length; i += BATCH) {
      const qs = `${query ? `${query}&` : ''}ids=${ids.slice(i, i + BATCH).join(',')}`;
      const res = await fetch(`${api.replace(/\/$/, '')}${path}?${qs}`);
      if (!res.ok) return cached; // not configured (501) or failing: keep what we had
      const data: unknown = await res.json();
      if (!isLivePriceFile(data)) return cached;
      const part: LivePriceFile = data;
      const prev = merged as LivePriceFile | null;
      merged = prev ? { ...part, prices: { ...prev.prices, ...part.prices } } : part;
    }
    if (merged) await db.saveKV(cacheKey, { ...(merged as LivePriceFile), _key: query });
    return merged ?? cached;
  } catch {
    return cached;
  }
}

export function useLivePrices(opts: { zip: string; pricesApi: string; ingredientIds: string[] }): LiveState {
  const [state, setState] = useState<LiveState>({ liveByStore: {}, community: null, status: {} });
  const api = opts.pricesApi || defaultPricesApi();
  const idsKey = opts.ingredientIds.join(',');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [kroger, community] = await Promise.all([staticFile('live', isLivePriceFile), staticFile('community', isCommunityFile)]);
      if (cancelled) return;
      const next: LiveState = { liveByStore: {}, community, status: {} };
      if (kroger) next.liveByStore.kroger = { storeId: 'kroger', ...kroger };
      next.status.community = community ? `${Object.values(community.stores).reduce((n, m) => n + Object.keys(m ?? {}).length, 0)} shopper prices` : undefined;
      setState({ ...next });

      if (!api) {
        next.status.server = 'off';
        setState({ ...next });
        return;
      }
      const ids = idsKey.split(',').filter(Boolean);
      let ok = false;
      if (/^\d{5}$/.test(opts.zip)) {
        const k = await fromServer(api, '/v1/kroger', `zip=${opts.zip}`, ids, 'api:kroger');
        if (k && Object.keys(k.prices).length) {
          next.liveByStore.kroger = { ...k, storeId: 'kroger' };
          ok = true;
        }
      }
      const w = await fromServer(api, '/v1/walmart', '', ids, 'api:walmart');
      if (w && Object.keys(w.prices).length) {
        next.liveByStore.walmart = { ...w, storeId: 'walmart' };
        ok = true;
      }
      next.status.server = ok ? 'ok' : 'error';
      if (!cancelled) setState({ ...next });
    })();
    return () => {
      cancelled = true;
    };
  }, [api, opts.zip, idsKey]);

  return state;
}
