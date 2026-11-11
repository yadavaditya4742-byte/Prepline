/**
 * Prepline price server — a Cloudflare Worker (free plan is enough).
 *
 * Why it exists: store APIs need secret keys, and secrets can't ship inside
 * an app that runs on everyone's phone. This tiny server holds the keys,
 * caches results, and returns plain JSON to the app.
 *
 *   GET  /v1/health                       which sources are configured
 *   GET  /v1/kroger?zip=45202&ids=a,b,c   live prices at the nearest Kroger-family store (≤40 ids/call)
 *   GET  /v1/walmart?ids=a,b,c            live walmart.com prices (needs affiliate keys; ≤40 ids/call)
 *   POST /v1/instacart/list               body: Instacart shopping-list request → { url }
 *
 * Secrets (wrangler secret put …): KROGER_CLIENT_ID, KROGER_CLIENT_SECRET,
 *   WALMART_CONSUMER_ID, WALMART_KEY_VERSION, WALMART_PRIVATE_KEY, INSTACART_API_KEY
 * Vars (wrangler.toml): ALLOWED_ORIGINS, INSTACART_BASE
 */
import { INGREDIENT_BY_ID } from '../../src/data/ingredients';
import { buildInstacartList, listKey, type InstacartListRequest } from '../../src/engine/instacart';
import { pickProduct, type KrogerProduct } from '../../src/engine/kroger';
import { pickWalmart, walmartHeaders, WALMART_SEARCH, type WalmartItem } from '../../src/engine/walmart';
import type { LivePriceFile } from '../../src/types';
import { KROGER_TERMS } from '../../scripts/kroger-terms';

export interface Env {
  KROGER_CLIENT_ID?: string;
  KROGER_CLIENT_SECRET?: string;
  WALMART_CONSUMER_ID?: string;
  WALMART_KEY_VERSION?: string;
  WALMART_PRIVATE_KEY?: string;
  INSTACART_API_KEY?: string;
  INSTACART_BASE?: string;
  ALLOWED_ORIGINS?: string;
}

const KROGER_API = 'https://api.kroger.com/v1';
const MAX_IDS = 40; // Workers free plan allows 50 outbound requests per call
const DAY = 86_400;

// ── helpers ───────────────────────────────────────────────────
function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = (env.ALLOWED_ORIGINS ?? '*').split(',').map((s) => s.trim());
  const ok = allowed.includes('*') || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? (allowed.includes('*') ? '*' : origin) : 'null',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data: unknown, status: number, headers: Record<string, string>, maxAge = 0): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...(maxAge ? { 'Cache-Control': `public, max-age=${maxAge}` } : {}), ...headers },
  });
}

async function cached<T>(key: string, ttl: number, make: () => Promise<T | null>): Promise<T | null> {
  const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
  const url = `https://cache.prepline.internal/${encodeURIComponent(key)}`;
  if (cache) {
    const hit = await cache.match(url);
    if (hit) return (await hit.json()) as T;
  }
  const value = await make();
  if (value !== null && cache) {
    await cache.put(url, new Response(JSON.stringify(value), { headers: { 'Cache-Control': `public, max-age=${ttl}` } }));
  }
  return value;
}

function parseIds(url: URL): string[] {
  return (url.searchParams.get('ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((id) => id && INGREDIENT_BY_ID[id])
    .slice(0, MAX_IDS);
}

// ── Kroger ────────────────────────────────────────────────────
let krogerToken: { value: string; expires: number } | null = null;

async function krogerAuth(env: Env): Promise<string> {
  if (krogerToken && krogerToken.expires > Date.now() + 60_000) return krogerToken.value;
  const res = await fetch(`${KROGER_API}/connect/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.KROGER_CLIENT_ID}:${env.KROGER_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=product.compact',
  });
  if (!res.ok) throw new Error(`kroger token ${res.status}`);
  const t = (await res.json()) as { access_token: string; expires_in: number };
  krogerToken = { value: t.access_token, expires: Date.now() + t.expires_in * 1000 };
  return t.access_token;
}

async function kroger(url: URL, env: Env): Promise<{ status: number; body: unknown }> {
  if (!env.KROGER_CLIENT_ID || !env.KROGER_CLIENT_SECRET) return { status: 501, body: { error: 'Kroger is not configured on this server.' } };
  const zip = (url.searchParams.get('zip') ?? '').trim();
  if (!/^\d{5}$/.test(zip)) return { status: 400, body: { error: 'zip must be a 5-digit US ZIP code' } };
  const ids = parseIds(url);
  if (!ids.length) return { status: 400, body: { error: 'ids required' } };

  const token = await krogerAuth(env);
  const loc = await cached(`kroger-loc:${zip}`, 7 * DAY, async () => {
    const res = await fetch(`${KROGER_API}/locations?filter.zipCode.near=${zip}&filter.limit=1`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const d = ((await res.json()) as { data: { locationId: string; name: string; chain: string }[] }).data[0];
    return d ? { id: d.locationId, name: `${d.chain} · ${d.name}` } : null;
  });
  if (!loc) return { status: 404, body: { error: `No Kroger-family store near ${zip}` } };

  const prices: LivePriceFile['prices'] = {};
  await Promise.all(
    ids.map(async (id) => {
      const ing = INGREDIENT_BY_ID[id];
      const query = KROGER_TERMS[id] ?? ing.name.replace(/\(.*?\)/g, '').replace(/,/g, ' ');
      const pick = await cached(`kroger:${loc.id}:${id}`, DAY / 2, async () => {
        const res = await fetch(`${KROGER_API}/products?filter.term=${encodeURIComponent(query)}&filter.locationId=${loc.id}&filter.limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;
        return pickProduct(ing, query, ((await res.json()) as { data: KrogerProduct[] }).data ?? []) ?? null;
      });
      if (pick) prices[id] = pick;
    }),
  );
  const file: LivePriceFile = { storeId: 'kroger', source: 'Kroger API', fetchedAt: new Date().toISOString(), locationId: loc.id, locationName: loc.name, prices };
  return { status: 200, body: file };
}

// ── Walmart ───────────────────────────────────────────────────
async function walmart(url: URL, env: Env): Promise<{ status: number; body: unknown }> {
  if (!env.WALMART_CONSUMER_ID || !env.WALMART_PRIVATE_KEY) return { status: 501, body: { error: 'Walmart is not configured on this server.' } };
  const ids = parseIds(url);
  if (!ids.length) return { status: 400, body: { error: 'ids required' } };
  const prices: LivePriceFile['prices'] = {};
  await Promise.all(
    ids.map(async (id) => {
      const ing = INGREDIENT_BY_ID[id];
      const query = KROGER_TERMS[id] ?? ing.name.replace(/\(.*?\)/g, '');
      const pick = await cached(`walmart:${id}`, DAY / 2, async () => {
        const headers = await walmartHeaders(env.WALMART_CONSUMER_ID!, env.WALMART_KEY_VERSION ?? '1', env.WALMART_PRIVATE_KEY!);
        const res = await fetch(`${WALMART_SEARCH}?query=${encodeURIComponent(query)}&numItems=10`, { headers });
        if (!res.ok) return null;
        return pickWalmart(ing, query, ((await res.json()) as { items?: WalmartItem[] }).items ?? []) ?? null;
      });
      if (pick) prices[id] = pick;
    }),
  );
  const file: LivePriceFile = { storeId: 'walmart', source: 'Walmart API', fetchedAt: new Date().toISOString(), prices };
  return { status: 200, body: file };
}

// ── Instacart ─────────────────────────────────────────────────
function validInstacart(b: unknown): b is InstacartListRequest {
  const r = b as InstacartListRequest;
  return (
    !!r &&
    typeof r.title === 'string' &&
    r.title.length <= 120 &&
    Array.isArray(r.line_items) &&
    r.line_items.length > 0 &&
    r.line_items.length <= 200 &&
    r.line_items.every((l) => typeof l.name === 'string' && l.name.length <= 120 && Array.isArray(l.line_item_measurements))
  );
}

async function instacart(req: Request, env: Env): Promise<{ status: number; body: unknown }> {
  if (!env.INSTACART_API_KEY) return { status: 501, body: { error: 'Instacart is not configured on this server.' } };
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { status: 400, body: { error: 'invalid JSON' } };
  }
  if (!validInstacart(body)) return { status: 400, body: { error: 'invalid shopping list' } };
  const clean: InstacartListRequest = { ...body, link_type: 'shopping_list', expires_in: Math.min(body.expires_in || 30, 365) };
  const url = await cached(`instacart:${await listKey(clean)}`, 25 * DAY, async () => {
    const res = await fetch(`${env.INSTACART_BASE ?? 'https://connect.instacart.com'}/idp/v1/products/products_link`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.INSTACART_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(clean),
    });
    if (!res.ok) return null;
    return ((await res.json()) as { products_link_url: string }).products_link_url ?? null;
  });
  return url ? { status: 200, body: { url } } : { status: 502, body: { error: 'Instacart did not return a link' } };
}

// ── router ────────────────────────────────────────────────────
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const url = new URL(req.url);
    try {
      if (req.method === 'GET' && url.pathname === '/v1/health') {
        return json({ kroger: !!env.KROGER_CLIENT_ID, walmart: !!env.WALMART_CONSUMER_ID, instacart: !!env.INSTACART_API_KEY }, 200, h, 300);
      }
      if (req.method === 'GET' && url.pathname === '/v1/kroger') {
        const r = await kroger(url, env);
        return json(r.body, r.status, h, r.status === 200 ? 3600 : 0);
      }
      if (req.method === 'GET' && url.pathname === '/v1/walmart') {
        const r = await walmart(url, env);
        return json(r.body, r.status, h, r.status === 200 ? 3600 : 0);
      }
      if (req.method === 'POST' && url.pathname === '/v1/instacart/list') {
        const r = await instacart(req, env);
        return json(r.body, r.status, h);
      }
      return json({ error: 'not found' }, 404, h);
    } catch (e) {
      return json({ error: (e as Error).message }, 500, h);
    }
  },
};

export { buildInstacartList };
