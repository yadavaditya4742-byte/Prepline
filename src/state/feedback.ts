import * as db from '../db/db';
import { loadAccount } from '../account/account';
import { defaultPricesApi } from './livePrices';

export type FeedbackKind = 'idea' | 'bug' | 'price' | 'recipe' | 'love' | 'other';

export interface FeedbackDraft {
  kind: FeedbackKind;
  message: string;
  rating?: number;
  contact?: string;
  context?: Record<string, string>;
}

interface Queued extends FeedbackDraft {
  installId: string;
  queuedAt: string;
}

const OUTBOX = 'feedback:outbox';

async function post(api: string, item: Queued): Promise<'sent' | 'retry' | 'drop'> {
  try {
    const res = await fetch(`${api.replace(/\/$/, '')}/v1/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) return 'sent';
    // 400/413/429: resending won't help. 5xx/501: server not ready yet, keep it.
    return res.status >= 500 ? 'retry' : 'drop';
  } catch {
    return 'retry'; // offline
  }
}

/** Send any feedback that was written offline. Safe to call often. */
export async function flushFeedback(pricesApi = ''): Promise<number> {
  const api = pricesApi || defaultPricesApi();
  const outbox = (await db.loadKV<Queued[]>(OUTBOX).catch(() => null)) ?? [];
  if (!api || !outbox.length) return outbox.length;
  const keep: Queued[] = [];
  for (const item of outbox) if ((await post(api, item)) === 'retry') keep.push(item);
  await db.saveKV(OUTBOX, keep);
  return keep.length;
}

/** Send now if possible; otherwise keep it on the phone and send later. */
export async function sendFeedback(draft: FeedbackDraft, pricesApi = ''): Promise<'sent' | 'queued'> {
  const { installId } = await loadAccount();
  const item: Queued = { ...draft, installId, queuedAt: new Date().toISOString() };
  const api = pricesApi || defaultPricesApi();
  const r = api ? await post(api, item) : 'retry';
  if (r === 'sent' || r === 'drop') return 'sent';
  const outbox = (await db.loadKV<Queued[]>(OUTBOX).catch(() => null)) ?? [];
  await db.saveKV(OUTBOX, [...outbox, item].slice(-20));
  return 'queued';
}
