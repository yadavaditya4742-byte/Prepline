import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DEFAULT_SETTINGS } from '../data';
import type { Ingredient, LivePriceFile, PriceOverride, Recipe, Settings, WeekPlan } from '../types';

/*
 * Everything the user creates is stored on this device in IndexedDB.
 * Nothing is sent anywhere. Export/import gives a JSON backup.
 */

export const DB_NAME = 'prepline';
export const DB_VERSION = 1;
export const BACKUP_FORMAT = 'prepline-backup';
export const BACKUP_VERSION = 1;

interface PreplineDB extends DBSchema {
  kv: { key: string; value: unknown };
  priceOverrides: { key: string; value: PriceOverride };
  customIngredients: { key: string; value: Ingredient };
  userRecipes: { key: string; value: Recipe };
  plans: { key: string; value: WeekPlan };
  /** Pantry: ingredient id → true (have it) / false (explicitly don't). */
  pantry: { key: string; value: { id: string; have: boolean } };
}

type StoreName = 'kv' | 'priceOverrides' | 'customIngredients' | 'userRecipes' | 'plans' | 'pantry';
const STORES: StoreName[] = ['kv', 'priceOverrides', 'customIngredients', 'userRecipes', 'plans', 'pantry'];

let dbPromise: Promise<IDBPDatabase<PreplineDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<PreplineDB>> {
  dbPromise ??= openDB<PreplineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('kv');
      db.createObjectStore('priceOverrides', { keyPath: 'key' });
      db.createObjectStore('customIngredients', { keyPath: 'id' });
      db.createObjectStore('userRecipes', { keyPath: 'id' });
      db.createObjectStore('plans', { keyPath: 'weekStart' });
      db.createObjectStore('pantry', { keyPath: 'id' });
    },
  });
  return dbPromise;
}

/** For tests: forget the cached connection. */
export async function _resetDBForTests() {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

// ── Settings ────────────────────────────────────────────────
export async function loadSettings(): Promise<Settings> {
  const db = await getDB();
  const saved = (await db.get('kv', 'settings')) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...saved };
}
export async function saveSettings(s: Settings) {
  await (await getDB()).put('kv', s, 'settings');
}

// ── Generic cached values (price files, API responses) ─────
export async function loadKV<T>(key: string): Promise<T | null> {
  return ((await (await getDB()).get('kv', key)) as T | undefined) ?? null;
}
export async function saveKV(key: string, value: unknown) {
  await (await getDB()).put('kv', value, key);
}

// ── Live prices cache (last good copy of public/prices/live.json) ──
export async function loadLiveCache(): Promise<LivePriceFile | null> {
  return ((await (await getDB()).get('kv', 'live')) as LivePriceFile | undefined) ?? null;
}
export async function saveLiveCache(f: LivePriceFile) {
  await (await getDB()).put('kv', f, 'live');
}

// ── Price overrides ─────────────────────────────────────────
export async function loadOverrides(): Promise<PriceOverride[]> {
  return (await getDB()).getAll('priceOverrides');
}
export async function saveOverride(o: PriceOverride) {
  await (await getDB()).put('priceOverrides', o);
}
export async function deleteOverride(key: string) {
  await (await getDB()).delete('priceOverrides', key);
}

// ── Custom ingredients ──────────────────────────────────────
export async function loadCustomIngredients(): Promise<Ingredient[]> {
  return (await getDB()).getAll('customIngredients');
}
export async function saveCustomIngredient(i: Ingredient) {
  await (await getDB()).put('customIngredients', { ...i, custom: true });
}
export async function deleteCustomIngredient(id: string) {
  await (await getDB()).delete('customIngredients', id);
}

// ── User recipes ────────────────────────────────────────────
export async function loadUserRecipes(): Promise<Recipe[]> {
  return (await getDB()).getAll('userRecipes');
}
export async function saveUserRecipe(r: Recipe) {
  await (await getDB()).put('userRecipes', { ...r, user: true });
}
export async function deleteUserRecipe(id: string) {
  await (await getDB()).delete('userRecipes', id);
}

// ── Plans ───────────────────────────────────────────────────
export async function loadPlan(weekStart: string): Promise<WeekPlan | undefined> {
  return (await getDB()).get('plans', weekStart);
}
export async function savePlan(p: WeekPlan) {
  await (await getDB()).put('plans', p);
}

// ── Pantry ──────────────────────────────────────────────────
export async function loadPantry(): Promise<Map<string, boolean>> {
  const rows = await (await getDB()).getAll('pantry');
  return new Map(rows.map((r) => [r.id, r.have]));
}
export async function setPantry(id: string, have: boolean) {
  await (await getDB()).put('pantry', { id, have });
}

// ── Backup ──────────────────────────────────────────────────
export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  data: Record<StoreName, unknown[]> & { kvKeys: string[] };
}

export async function exportBackup(): Promise<Backup> {
  const db = await getDB();
  const data = {} as Backup['data'];
  for (const s of STORES) data[s] = await db.getAll(s);
  data.kvKeys = (await db.getAllKeys('kv')) as string[];
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
}

/** Replace all local data with a backup. Throws on an invalid file. */
export async function importBackup(input: unknown): Promise<void> {
  const b = input as Backup;
  if (!b || b.format !== BACKUP_FORMAT || typeof b.version !== 'number' || !b.data) {
    throw new Error('This file is not a Prepline backup.');
  }
  if (b.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of Prepline. Update the app first.');
  }
  const db = await getDB();
  const tx = db.transaction(STORES, 'readwrite');
  for (const s of STORES) await tx.objectStore(s).clear();
  const kvVals = b.data.kv ?? [];
  const kvKeys = b.data.kvKeys ?? [];
  for (let i = 0; i < kvKeys.length; i++) await tx.objectStore('kv').put(kvVals[i], kvKeys[i]);
  for (const s of STORES) {
    if (s === 'kv') continue;
    for (const row of (b.data[s] ?? []) as never[]) await tx.objectStore(s).put(row);
  }
  await tx.done;
}
