import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  _resetDBForTests,
  exportBackup,
  importBackup,
  loadOverrides,
  loadPantry,
  loadSettings,
  saveOverride,
  saveSettings,
  setPantry,
} from './db';
import { DEFAULT_SETTINGS } from '../data';

beforeEach(async () => {
  await _resetDBForTests();
  indexedDB.deleteDatabase('prepline');
});

describe('local storage', () => {
  it('returns defaults when nothing is saved', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips a JSON backup', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, weeklyBudget: 90, storeId: 'costco', onboarded: true });
    await saveOverride({ key: 'kroger:onion', storeId: 'kroger', ingredientId: 'onion', size: 1000, price: 2, label: 'x', updatedAt: '2026-11-11' });
    await setPantry('salt', true);
    const backup = JSON.parse(JSON.stringify(await exportBackup()));

    // Wipe and restore.
    await _resetDBForTests();
    indexedDB.deleteDatabase('prepline');
    expect((await loadSettings()).weeklyBudget).toBe(DEFAULT_SETTINGS.weeklyBudget);

    await importBackup(backup);
    expect((await loadSettings()).weeklyBudget).toBe(90);
    expect((await loadSettings()).storeId).toBe('costco');
    expect((await loadOverrides())[0].price).toBe(2);
    expect((await loadPantry()).get('salt')).toBe(true);
  });

  it('rejects files that are not backups', async () => {
    await expect(importBackup({ hello: 'world' })).rejects.toThrow(/not a Prepline backup/);
  });
});

describe('settings migration', () => {
  it('turns an old single diet into food groups', async () => {
    const { migrateSettings } = await import('./db');
    expect(migrateSettings({ diet: 'eggetarian' } as never).eats.sort()).toEqual(['dairy', 'egg', 'plant']);
    expect(migrateSettings({ eats: ['poultry'] }).eats).toEqual(['poultry']);
    expect(migrateSettings(undefined).cuisines).toEqual([]);
  });
});
