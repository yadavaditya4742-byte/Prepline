import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetDBForTests } from '../db/db';
import { loadAccount } from '../account/account';
import { flushFeedback, sendFeedback } from './feedback';

const API = 'https://prices.example';

beforeEach(async () => {
  await _resetDBForTests();
});
afterEach(() => vi.unstubAllGlobals());

describe('feedback', () => {
  it('keeps notes written offline and sends them later', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await sendFeedback({ kind: 'idea', message: 'More paneer' }, API)).toBe('queued');
    expect(await sendFeedback({ kind: 'bug', message: 'List froze' }, API)).toBe('queued');

    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await flushFeedback(API)).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.message).toBe('More paneer');
    expect(body.installId).toBe((await loadAccount()).installId);
  });

  it('sends straight away when online', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 })));
    expect(await sendFeedback({ kind: 'love', message: 'Great app' }, API)).toBe('sent');
    expect(await flushFeedback(API)).toBe(0);
  });

  it('gives every install one stable anonymous ID', async () => {
    const a = await loadAccount();
    expect(a.plan).toBe('free');
    expect((await loadAccount()).installId).toBe(a.installId);
  });
});
