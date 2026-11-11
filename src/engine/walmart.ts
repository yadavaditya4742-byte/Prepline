import type { Ingredient } from '../types';
import type { LivePick } from './kroger';
import { parseSize } from './sizes';

/*
 * Walmart Affiliate API adapter (walmart.io). Free, but requires an approved
 * Walmart affiliate account; you get a Consumer ID and register an RSA public
 * key. Prices are walmart.com prices (national), not a specific store.
 *
 * Built from Walmart's published affiliate spec — verify against your
 * walmart.io dashboard once you have keys (endpoints occasionally move).
 *   GET https://developer.api.walmart.com/api-proxy/service/affil/product/v2/search?query=…&numItems=10
 *   Headers: WM_CONSUMER.ID, WM_CONSUMER.INTIMESTAMP, WM_SEC.KEY_VERSION, WM_SEC.AUTH_SIGNATURE
 */
export const WALMART_SEARCH = 'https://developer.api.walmart.com/api-proxy/service/affil/product/v2/search';

export interface WalmartItem {
  itemId: number;
  name: string;
  salePrice?: number;
  msrp?: number;
  size?: string;
  stock?: string;
  availableOnline?: boolean;
  categoryPath?: string;
}

function pemToBytes(pem: string): Uint8Array<ArrayBuffer> {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** The canonical string Walmart signs: consumerId \n timestamp \n keyVersion \n */
export const walmartStringToSign = (consumerId: string, timestamp: string, keyVersion: string) =>
  `${consumerId}\n${timestamp}\n${keyVersion}\n`;

/** WM_SEC.AUTH_SIGNATURE = base64(RSA-SHA256(stringToSign)), using WebCrypto (Node 20+ and Workers). */
export async function walmartHeaders(consumerId: string, keyVersion: string, privateKeyPem: string, now = Date.now()) {
  const timestamp = String(now);
  const key = await crypto.subtle.importKey('pkcs8', pemToBytes(privateKeyPem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(walmartStringToSign(consumerId, timestamp, keyVersion)));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return {
    'WM_CONSUMER.ID': consumerId,
    'WM_CONSUMER.INTIMESTAMP': timestamp,
    'WM_SEC.KEY_VERSION': keyVersion,
    'WM_SEC.AUTH_SIGNATURE': b64,
    Accept: 'application/json',
  };
}

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 1);

/** Pick the best-matching, cheapest-per-unit Walmart product for an ingredient. */
export function pickWalmart(ing: Ingredient, query: string, items: WalmartItem[]): LivePick | null {
  const want = words(query).filter((w) => !['fresh', 'frozen', 'canned', 'dry', 'and', 'of'].includes(w));
  let best: (LivePick & { score: number; unit: number }) | null = null;
  for (const it of items) {
    const price = it.salePrice ?? it.msrp;
    if (!price || price <= 0 || it.availableOnline === false) continue;
    const size = parseSize(it.size ?? '') ?? parseSize(it.name);
    if (!size || size.unit !== ing.unit) continue;
    const have = words(it.name);
    const score = want.filter((w) => have.some((h) => h.startsWith(w) || w.startsWith(h))).length / Math.max(1, want.length);
    if (score < 0.5) continue;
    const unit = price / size.amount;
    if (!best || score > best.score || (score === best.score && unit < best.unit)) {
      best = { size: size.amount, price, label: (it.size ?? '').trim() || 'pack', productName: it.name, score, unit };
    }
  }
  if (!best) return null;
  return { size: best.size, price: best.price, label: best.label, productName: best.productName };
}
