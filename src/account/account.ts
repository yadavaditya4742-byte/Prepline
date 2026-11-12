import * as db from '../db/db';

/*
 * Accounts & plans — groundwork only. Nothing here asks for an email or password yet.
 *
 * Today every install is an anonymous "device" account on the free plan, and every feature is
 * unlocked. When Prepline goes paid, sign-in (email + password, Apple, Google) and purchases
 * plug into this one module, and screens ask `can(...)` instead of checking plans themselves.
 * See docs/ACCOUNTS-AND-PAYMENTS.md for the plan.
 */

export type Plan = 'free' | 'friends' | 'pro';

export interface Account {
  /** Random ID for this install. Not linked to any person; lets feedback from one phone be grouped. */
  installId: string;
  kind: 'device' | 'signed-in';
  /** Only once sign-in exists. */
  email?: string;
  plan: Plan;
  /** Why the plan applies: 'beta' while testing, 'invite' for family & friends, 'store' for an App Store / Play purchase. */
  planReason: 'beta' | 'invite' | 'store';
}

/** Features that could sit behind a paid plan one day. Add here, then gate with can(). */
export type Feature = 'live-prices' | 'receipt-scan' | 'unlimited-recipes' | 'ai-import' | 'cloud-sync';

/** Who gets what. While in beta, everything is open to everyone. */
const PAID_FEATURES: Feature[] = [];
export const IS_BETA = true;

export function can(account: Account | null, feature: Feature): boolean {
  if (IS_BETA || !PAID_FEATURES.includes(feature)) return true;
  return account?.plan === 'pro' || account?.plan === 'friends';
}

const KEY = 'account';

export async function loadAccount(): Promise<Account> {
  const saved = await db.loadKV<Account>(KEY).catch(() => null);
  if (saved?.installId) return saved;
  const fresh: Account = { installId: crypto.randomUUID(), kind: 'device', plan: 'free', planReason: 'beta' };
  await db.saveKV(KEY, fresh).catch(() => undefined);
  return fresh;
}
