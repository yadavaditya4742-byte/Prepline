import { describe, expect, it } from 'vitest';
import { INGREDIENT_BY_ID } from '../data';
import { pickProduct, type KrogerProduct } from './kroger';
import { bestUnit, parseSize } from './sizes';

describe('parseSize', () => {
  it.each([
    ['3 lb', 1360.8, 'g'],
    ['16 oz', 453.6, 'g'],
    ['1.5 lbs', 680.4, 'g'],
    ['500 g', 500, 'g'],
    ['1 kg', 1000, 'g'],
    ['64 fl oz', 1892.7, 'ml'],
    ['1 gal', 3785.4, 'ml'],
    ['1/2 gal', 1892.7, 'ml'],
    ['12 ct', 12, 'each'],
    ['18 count', 18, 'each'],
    ['6 x 16 oz', 2721.6, 'g'],
  ])('%s', (text, amount, unit) => {
    const p = parseSize(text)!;
    expect(p.unit).toBe(unit);
    expect(p.amount).toBeCloseTo(amount, 0);
  });

  it('returns null when there is no size', () => {
    expect(parseSize('family size')).toBeNull();
    expect(parseSize('')).toBeNull();
  });

  it('picks friendly units for the editor', () => {
    expect(bestUnit(1360.8, 'g')).toEqual({ value: 3, unit: 'lb' });
    expect(bestUnit(283, 'g')).toEqual({ value: 9.98, unit: 'oz' });
    expect(bestUnit(3785.41, 'ml')).toEqual({ value: 1, unit: 'gal' });
  });
});

describe('pickProduct (Kroger)', () => {
  const p = (description: string, size: string, regular: number, soldBy = 'UNIT'): KrogerProduct => ({
    productId: description,
    description,
    items: [{ size, soldBy, price: { regular } }],
  });

  it('prefers matching descriptions, then the lowest unit price', () => {
    const pick = pickProduct(INGREDIENT_BY_ID['greek-yogurt'], 'plain nonfat greek yogurt', [
      p('Kroger Plain Nonfat Greek Yogurt', '32 oz', 4.99),
      p('Fancy Plain Nonfat Greek Yogurt', '32 oz', 6.49),
      p('Strawberry Yogurt Cup', '5.3 oz', 0.79),
    ])!;
    expect(pick.productName).toBe('Kroger Plain Nonfat Greek Yogurt');
    expect(pick.size).toBeCloseTo(907.2, 0);
    expect(pick.price).toBe(4.99);
  });

  it('handles items sold by weight as a price per pound', () => {
    const pick = pickProduct(INGREDIENT_BY_ID['onion'], 'yellow onion', [p('Yellow Onion', '1 lb', 1.29, 'WEIGHT')])!;
    expect(pick.size).toBeCloseTo(453.6, 0);
    expect(pick.label).toBe('per lb');
  });

  it('skips products whose size cannot match the ingredient unit', () => {
    expect(pickProduct(INGREDIENT_BY_ID['egg'], 'large eggs', [p('Large Eggs', '24 oz', 3.49)])).toBeNull();
    expect(pickProduct(INGREDIENT_BY_ID['egg'], 'large eggs', [p('Large White Eggs', '12 ct', 3.49)])!.size).toBe(12);
  });

  it('skips unpriced products', () => {
    expect(pickProduct(INGREDIENT_BY_ID['tofu'], 'extra firm tofu', [{ productId: 'x', description: 'Extra Firm Tofu', items: [{ size: '14 oz' }] }])).toBeNull();
  });
});
