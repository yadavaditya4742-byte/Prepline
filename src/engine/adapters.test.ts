import { generateKeyPairSync, createVerify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { INGREDIENT_BY_ID } from '../data';
import { costNeeds } from './cost';
import { buildInstacartList, listKey, measurementsFor } from './instacart';
import { pickWalmart, walmartHeaders, walmartStringToSign } from './walmart';

describe('Walmart adapter', () => {
  it('signs requests the way Walmart verifies them', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const h = await walmartHeaders('consumer-123', '1', pem, 1_700_000_000_000);
    expect(h['WM_CONSUMER.INTIMESTAMP']).toBe('1700000000000');
    const v = createVerify('RSA-SHA256');
    v.update(walmartStringToSign('consumer-123', '1700000000000', '1'));
    expect(v.verify(publicKey, h['WM_SEC.AUTH_SIGNATURE'], 'base64')).toBe(true);
  });

  it('picks a matching product with a usable size, cheapest per unit', () => {
    const pick = pickWalmart(INGREDIENT_BY_ID['greek-yogurt'], 'plain nonfat greek yogurt', [
      { itemId: 1, name: 'Great Value Plain Nonfat Greek Yogurt, 32 oz', salePrice: 4.12 },
      { itemId: 2, name: 'Brand X Plain Nonfat Greek Yogurt 32 oz Tub', salePrice: 6.48 },
      { itemId: 3, name: 'Strawberry Greek Yogurt Cups', salePrice: 1.0 },
    ])!;
    expect(pick.price).toBe(4.12);
    expect(pick.size).toBeCloseTo(907.2, 0);
  });

  it('returns null when nothing matches the unit', () => {
    expect(pickWalmart(INGREDIENT_BY_ID['egg'], 'large eggs', [{ itemId: 1, name: 'Large Eggs 24 oz', salePrice: 3 }])).toBeNull();
  });
});

describe('Instacart shopping list', () => {
  it('converts our needs into Instacart measurement units', () => {
    expect(measurementsFor(INGREDIENT_BY_ID['egg'], 7.2)).toEqual([{ quantity: 8, unit: 'each' }]);
    const chicken = measurementsFor(INGREDIENT_BY_ID['chicken-breast'], 900);
    expect(chicken[0]).toEqual({ quantity: 1.98, unit: 'pound' });
    expect(chicken.map((m) => m.unit)).toEqual(['pound', 'ounce', 'gram']);
    expect(measurementsFor(INGREDIENT_BY_ID['milk'], 473)[0]).toEqual({ quantity: 16, unit: 'fl oz' });
  });

  it('skips pantry items and cleans product names', async () => {
    const cost = costNeeds(new Map([['chickpeas-can', 878], ['salt', 5], ['green-chili', 20]]), (id) => ({ size: 100, price: 1, label: '', source: 'seed', ...{ id } }), new Set(['salt']));
    const body = buildInstacartList('Prepline week', cost.lines, INGREDIENT_BY_ID, 'https://example.app');
    expect(body.line_items.map((l) => l.name)).toEqual(['Chickpeas', 'Green chilies']);
    expect(body.landing_page_configuration?.partner_linkback_url).toBe('https://example.app');
    expect(body.link_type).toBe('shopping_list');
    expect(await listKey(body)).toMatch(/^[0-9a-f]{24}$/);
  });
});
