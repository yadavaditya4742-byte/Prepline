import { describe, expect, it } from 'vitest';
import { INGREDIENT_BY_ID } from '../data';
import { aggregateCommunity, chainOf, unitPriceOf, type OpenPriceItem } from './community';

const item = (o: Partial<OpenPriceItem>): OpenPriceItem => ({ price: 1, currency: 'USD', date: '2026-10-01', ...o });

describe('Open Prices aggregation', () => {
  it('maps receipt store names to our chains', () => {
    expect(chainOf({ osm_name: 'ALDI' })).toBe('aldi');
    expect(chainOf({ osm_name: 'Vons' })).toBe('safeway');
    expect(chainOf({ osm_name: "Trader Joe's" })).toBe('traderjoes');
    expect(chainOf({ osm_name: 'Fred Meyer' })).toBe('kroger');
    expect(chainOf({ osm_name: 'Patel Brothers' })).toBe('desi');
    expect(chainOf({ osm_name: 'Five Below' })).toBeNull();
  });

  it('works out a price per gram from package size or per-kg pricing', () => {
    const tofu = INGREDIENT_BY_ID['tofu'];
    expect(unitPriceOf(item({ price: 2.49, product: { product_quantity: 397, product_quantity_unit: 'g' } }), tofu)).toBeCloseTo(2.49 / 397, 6);
    expect(unitPriceOf(item({ price: 4.4, price_per: 'KILOGRAM' }), INGREDIENT_BY_ID['onion'])).toBeCloseTo(0.0044, 6);
    expect(unitPriceOf(item({ price: 0.69, price_per: 'UNIT' }), INGREDIENT_BY_ID['lemon'])).toBe(0.69);
    expect(unitPriceOf(item({ price: 1, currency: 'EUR', product: { product_quantity: 100, product_quantity_unit: 'g' } }), tofu)).toBeNull();
  });

  it('uses the regular price when a discount was applied', () => {
    expect(unitPriceOf(item({ price: 1.5, price_without_discount: 3, product: { product_quantity: 100, product_quantity_unit: 'g' } }), INGREDIENT_BY_ID['tofu'])).toBeCloseTo(0.03, 6);
  });

  it('takes the median per chain and counts reports', () => {
    const f = aggregateCommunity(
      {
        tofu: [
          item({ price: 2, product: { product_quantity: 400, product_quantity_unit: 'g' }, location: { osm_name: 'ALDI' }, date: '2026-09-01' }),
          item({ price: 3, product: { product_quantity: 400, product_quantity_unit: 'g' }, location: { osm_name: 'ALDI' }, date: '2026-10-05' }),
          item({ price: 9, product: { product_quantity: 400, product_quantity_unit: 'g' }, location: { osm_name: 'ALDI' }, date: '2026-08-01' }),
          item({ price: 4, product: { product_quantity: 400, product_quantity_unit: 'g' }, location: { osm_name: 'Safeway' } }),
        ],
      },
      INGREDIENT_BY_ID,
      '2026-11-11T00:00:00Z',
    );
    expect(f.stores.aldi?.tofu).toEqual({ unitPrice: 3 / 400, reports: 3, lastDate: '2026-10-05' });
    expect(f.stores.safeway?.tofu?.reports).toBe(1);
  });
});
