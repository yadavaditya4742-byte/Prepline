import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from './index';

type FetchMock = ReturnType<typeof vi.fn>;
let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const res = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const call = (path: string, init?: RequestInit, env = {}) => worker.fetch(new Request(`https://prices.example${path}`, init), env);

describe('price server', () => {
  it('reports which sources are configured', async () => {
    const r = await call('/v1/health', undefined, { INSTACART_API_KEY: 'k' });
    expect(await r.json()).toEqual({ kroger: false, walmart: false, instacart: true });
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('answers CORS preflight', async () => {
    const r = await call('/v1/kroger', { method: 'OPTIONS', headers: { Origin: 'https://a.example' } }, { ALLOWED_ORIGINS: 'https://a.example' });
    expect(r.status).toBe(204);
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('https://a.example');
  });

  it('says clearly when a source is not configured', async () => {
    expect((await call('/v1/kroger?zip=45202&ids=onion')).status).toBe(501);
    expect((await call('/v1/walmart?ids=onion')).status).toBe(501);
  });

  it('validates Kroger input', async () => {
    const env = { KROGER_CLIENT_ID: 'id', KROGER_CLIENT_SECRET: 's' };
    expect((await call('/v1/kroger?zip=abc&ids=onion', undefined, env)).status).toBe(400);
    expect((await call('/v1/kroger?zip=45202&ids=not-a-thing', undefined, env)).status).toBe(400);
  });

  it('prices ingredients at the nearest Kroger store', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo) => {
      const u = String(input);
      if (u.includes('/oauth2/token')) return res({ access_token: 'tok', expires_in: 1800 });
      if (u.includes('/locations')) return res({ data: [{ locationId: '014', name: 'Main St', chain: 'KROGER' }] });
      if (u.includes('/products')) return res({ data: [{ productId: 'p', description: 'Kroger Large Eggs', items: [{ size: '12 ct', price: { regular: 2.79 } }] }] });
      return res({}, 404);
    });
    const r = await call('/v1/kroger?zip=45202&ids=egg', undefined, { KROGER_CLIENT_ID: 'id', KROGER_CLIENT_SECRET: 's' });
    const body = (await r.json()) as { prices: Record<string, { price: number; size: number }>; locationName: string };
    expect(r.status).toBe(200);
    expect(body.locationName).toBe('KROGER · Main St');
    expect(body.prices.egg).toMatchObject({ price: 2.79, size: 12 });
  });

  it('creates an Instacart shopping list link with the key kept server-side', async () => {
    fetchMock.mockResolvedValue(res({ products_link_url: 'https://www.instacart.com/store/shopping_lists/abc' }));
    const list = { title: 'Week', link_type: 'shopping_list', expires_in: 30, line_items: [{ name: 'Tofu', line_item_measurements: [{ quantity: 14, unit: 'ounce' }] }] };
    const r = await call('/v1/instacart/list', { method: 'POST', body: JSON.stringify(list) }, { INSTACART_API_KEY: 'secret' });
    expect(await r.json()).toEqual({ url: 'https://www.instacart.com/store/shopping_lists/abc' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret');
  });

  it('rejects malformed Instacart requests', async () => {
    const r = await call('/v1/instacart/list', { method: 'POST', body: JSON.stringify({ title: 'x', line_items: [] }) }, { INSTACART_API_KEY: 'k' });
    expect(r.status).toBe(400);
  });
});
