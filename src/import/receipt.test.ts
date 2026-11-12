import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../data';
import { cleanName, parseReceiptText } from './receipt';

const publix = `PUBLIX
Publix Super Markets
Tampa, FL 33610
GRK YOG NF PLAIN 32OZ        5.29 F
BNLS SKNLS CHKN BRST
  2.43 lb @ 4.99 /lb        12.13 F
YLW ONIONS 3LB               3.99 F
LEMONS
  3 @ 0.69                   2.07 F
BASMATI RICE 2LB             4.49 F
PBX SAVINGS                 -1.00
SUBTOTAL                    27.97
TAX                          0.00
TOTAL                       27.97
VISA                        27.97
11/10/2026 6:42 PM`;

const walmart = `Walmart
Save money. Live better.
GV GRK YOG 007874213456 F   4.12 N
GV XTRA FRM TOFU 006870203211 F  1.98 N
BLK BNS 15OZ 007874235000 F   0.88 N
AVOCADO 000000004046 F        0.98 N
SUBTOTAL 7.96
TOTAL 7.96`;

describe('receipt reader', () => {
  it('detects the store and date', () => {
    const r = parseReceiptText(publix, INGREDIENTS);
    expect(r.store).toBe('publix');
    expect(r.date).toBe('2026-11-10');
  });

  it('reads packaged items with sizes', () => {
    const r = parseReceiptText(publix, INGREDIENTS);
    const yog = r.lines.find((l) => l.ingredientId === 'greek-yogurt')!;
    expect(yog.price).toBe(5.29);
    expect(yog.size).toBeCloseTo(907.2, 0);
    const onion = r.lines.find((l) => l.ingredientId === 'onion')!;
    expect(onion.size).toBeCloseTo(1360.8, 0);
  });

  it('reads weighed items as a price per pound', () => {
    const chicken = parseReceiptText(publix, INGREDIENTS).lines.find((l) => l.ingredientId === 'chicken-breast')!;
    expect(chicken.kind).toBe('per-lb');
    expect(chicken.price).toBe(4.99);
    expect(chicken.total).toBe(12.13);
  });

  it('reads multi-buys as a price each', () => {
    const lemon = parseReceiptText(publix, INGREDIENTS).lines.find((l) => l.ingredientId === 'lemon')!;
    expect(lemon).toMatchObject({ kind: 'each', price: 0.69, size: 1 });
  });

  it('skips totals, tax, payment and savings lines', () => {
    const r = parseReceiptText(publix, INGREDIENTS);
    expect([...r.lines, ...r.unmatched].some((l) => /TOTAL|TAX|VISA|SAVINGS/.test(l.raw))).toBe(false);
  });

  it('handles Walmart-style lines with UPC codes and flags', () => {
    const r = parseReceiptText(walmart, INGREDIENTS);
    expect(r.store).toBe('walmart');
    const ids = r.lines.map((l) => l.ingredientId);
    expect(ids).toContain('greek-yogurt');
    expect(ids).toContain('tofu');
    expect(ids).toContain('black-beans-can');
    expect(ids).toContain('avocado');
    expect(r.lines.find((l) => l.ingredientId === 'tofu')!.price).toBe(1.98);
  });

  it('expands receipt shorthand and drops store brands', () => {
    expect(cleanName('GV BNLS SKNLS CHKN THG 3LB')).toBe('BONELESS SKINLESS CHICKEN THIGHS 3 LB');
    expect(cleanName('PBX GRK YOG NF 32OZ')).toBe('GREEK YOGURT NONFAT 32 OZ');
  });
});

describe('OCR slips', () => {
  // Real Tesseract output from a photographed Publix-style receipt.
  const ocr = `PUBLIX
Publix Super Markets
Tampa, FL 33610
GRK YOG NF PLAIN 320Z    5.29 F
BNLS SKNLS CHKN BRST

2.43 1b @ 4.99 /1b    12.13 F
YLW ONIONS 3LB           3.99 F
LEMONS

3@ 0.69               2.07 F
BASMATI RICE 2LB         4.49 F
XTRA FRM TOFU 140Z       2.39 F
BLK BNS 150Z             1.09 F
PBX SAVINGS             -1.00
TOTAL                  30.45`;

  it('still reads every item', () => {
    const r = parseReceiptText(ocr, INGREDIENTS);
    expect(r.lines.map((l) => l.ingredientId).sort()).toEqual(['basmati', 'black-beans-can', 'chicken-breast', 'greek-yogurt', 'lemon', 'onion', 'tofu']);
    expect(r.lines.find((l) => l.ingredientId === 'greek-yogurt')!.size).toBeCloseTo(907.2, 0);
    expect(r.lines.find((l) => l.ingredientId === 'chicken-breast')!.price).toBe(4.99);
  });
});

it('reads a per-pound line even when OCR turns "/lb" into "/1 LB"', () => {
  const r = parseReceiptText('BNLS SKNLS CHKN BRST\n2.43 LB @ 4.99 /1 LB    12.13 F', INGREDIENTS);
  expect(r.lines[0]).toMatchObject({ ingredientId: 'chicken-breast', kind: 'per-lb', price: 4.99 });
});
