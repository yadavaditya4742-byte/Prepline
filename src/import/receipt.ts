import { chainOf } from '../engine/community';
import { parseSize } from '../engine/sizes';
import type { Ingredient, StoreId } from '../types';
import { matchIngredient } from './parseRecipe';

/*
 * Receipt reader. Turns OCR'd (or pasted) receipt text into priced lines and
 * matches each to an ingredient. Everything runs on the device. The user
 * reviews every match before any price is saved.
 */

export interface ReceiptLine {
  raw: string;
  /** Item text with codes/flags removed and abbreviations expanded. */
  name: string;
  /** Amount charged on the receipt for this line. */
  total: number;
  /** Per-pack (or per-lb / per-each) price we'd save. */
  price: number;
  /** Pack size in the ingredient's base unit, when known. */
  size: number | null;
  label: string;
  kind: 'pack' | 'per-lb' | 'each';
  ingredientId: string | null;
  confidence: number;
}

export interface ParsedReceipt {
  store: StoreId | null;
  date: string | null;
  lines: ReceiptLine[];
  /** Lines that looked like items but we couldn't match. */
  unmatched: ReceiptLine[];
}

const SKIP =
  /\b(sub ?total|total|tax|change|cash|visa|master ?card|amex|discover|debit|credit|ebt|balance|tender|savings|you saved|saved|coupon|discount|points|rewards|member|thank|cashier|store ?#|tel|phone|www\.|receipt|items? sold|# ?items|approval|auth|ref ?#|terminal|trans|bottle dep|bag fee|price you pay|promotion|bogo|reg price)\b/i;

/** Receipt shorthand → words our ingredient matcher understands. */
const ABBR: [RegExp, string][] = [
  [/\bBNLS\b/g, 'boneless'], [/\bSKNLS\b/g, 'skinless'], [/\bB\/?S\b/g, 'boneless skinless'],
  [/\bCHKN?\b|\bCHK\b/g, 'chicken'], [/\bBRST\b|\bBRS\b/g, 'breast'], [/\bTHGHS?\b|\bTHG\b/g, 'thighs'],
  [/\bGRND?\b|\bGRD\b/g, 'ground'], [/\bTRKY\b|\bTKY\b/g, 'turkey'], [/\bBF\b/g, 'beef'], [/\bSLMN\b/g, 'salmon'],
  [/\bSHRMP\b|\bSHRIMP\b/g, 'shrimp'], [/\bTILAP\b/g, 'tilapia'],
  [/\bGRK\b/g, 'greek'], [/\bYOG\b|\bYGRT\b|\bYOGRT\b/g, 'yogurt'], [/\bNF\b/g, 'nonfat'], [/\bCTG\b|\bCOTT\b/g, 'cottage'],
  [/\bCHS\b/g, 'cheese'], [/\bMOZZ?\b/g, 'mozzarella'], [/\bCHED\b|\bCHDR\b/g, 'cheddar'], [/\bPARM\b/g, 'parmesan'],
  [/\bMLK\b/g, 'milk'], [/\bBTR\b/g, 'butter'], [/\bPNT\b/g, 'peanut'], [/\bPNR\b/g, 'paneer'],
  [/\bLG\b/g, 'large'], [/\bXL\b/g, 'extra large'], [/\bDZ\b|\bDOZ\b/g, 'eggs 12 ct'],
  [/\bXTRA\b|\bX-?TRA\b|\bEX\b/g, 'extra'], [/\bFRM\b/g, 'firm'],
  [/\bYLW\b|\bYEL\b/g, 'yellow'], [/\bONIN\b|\bONI\b/g, 'onion'], [/\bTOM\b|\bTMTO\b/g, 'tomato'], [/\bSPNCH\b|\bSPIN\b/g, 'spinach'],
  [/\bBRCLI\b|\bBROC\b|\bBRCL\b/g, 'broccoli'], [/\bCAULI\b/g, 'cauliflower'], [/\bCBG\b|\bCABB\b/g, 'cabbage'],
  [/\bCRT\b|\bCARR\b/g, 'carrots'], [/\bPOT\b|\bPOTS\b/g, 'potatoes'], [/\bSWT\b/g, 'sweet'], [/\bCUKE\b|\bCUC\b/g, 'cucumber'],
  [/\bZUCC?\b/g, 'zucchini'], [/\bMSHRM\b|\bMUSH\b|\bMSHRMS\b/g, 'mushrooms'], [/\bPEPR\b|\bPPR\b/g, 'pepper'],
  [/\bGRN\b/g, 'green'], [/\bGNGR\b/g, 'ginger'], [/\bGRLC\b/g, 'garlic'], [/\bJALAP\b/g, 'jalapeno'], [/\bCILNTRO\b|\bCIL\b/g, 'cilantro'],
  [/\bAVOC?\b|\bAVO\b/g, 'avocado'], [/\bLMN\b/g, 'lemon'], [/\bLMS\b/g, 'lemons'], [/\bBNNA\b/g, 'banana'],
  [/\bGARB\b|\bCHKPEA\b|\bCHKPS\b/g, 'chickpeas'], [/\bBLK\b/g, 'black'], [/\bBN\b|\bBNS\b/g, 'beans'], [/\bKIDNY\b/g, 'kidney'],
  [/\bLNTL\b|\bLENT\b/g, 'lentils'], [/\bBASM\b/g, 'basmati'], [/\bQUIN\b/g, 'quinoa'], [/\bTORT\b/g, 'tortillas'],
  [/\bWHT\b/g, 'wheat'], [/\bBRD\b/g, 'bread'], [/\bEVOO\b/g, 'extra virgin olive oil'], [/\bEDAM\b/g, 'edamame'],
  [/\bCOCO\b/g, 'coconut'], [/\bCRSHD\b/g, 'crushed'], [/\bTOMS\b/g, 'tomatoes'], [/\bMARIN\b/g, 'marinara'],
];
/** Store-brand and filler words that hurt matching. */
const NOISE = /\b(GV|GREAT VALUE|PBX|PUBLIX|KRO?G(ER)?|SIMPLE TRUTH|ST|365|WFM|MKT PANTRY|MARKET PANTRY|GOOD ?& ?GATHER|G&G|KIRKLAND|KS|HEB|TJ'?S?|TRADER JOE'?S?|ALDI|ORG|ORGANIC|FRZ|FROZEN|FRESH|NATURAL|NAT|PK|PKG|FAM|FAMILY|VALUE)\b/g;

const PRICE_AT_END = /(-?\$?\d{1,4}\.\d{2})\s*(?:[A-Z]{1,2}|\*|-)?\s*$/;
// OCR often turns "/lb" into "/1 LB" or "/ 1b"; allow a stray 1 before the unit.
const WEIGHT = /(\d+(?:\.\d+)?)\s*(LB|LBS|KG)\s*@\s*\$?(\d+\.\d{2})\s*\/?\s*1?\s*(LB|KG)/i;
const MULTI = /(\d+)\s*@\s*\$?(\d+\.\d{2})/;
const DATE = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/;

export function cleanName(text: string): string {
  let s = text.toUpperCase();
  s = s.replace(/\b\d{6,14}\b/g, ' '); // UPC / PLU codes
  s = s.replace(/(\d)(OZ|LB|LBS|CT|GAL|ML|L|G|KG|FL ?OZ|PK)\b/g, '$1 $2'); // "32OZ" → "32 OZ"
  for (const [re, w] of ABBR) s = s.replace(re, ` ${w.toUpperCase()} `);
  s = s.replace(NOISE, ' ');
  return s.replace(/[^A-Z0-9%.& ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Fix the usual OCR slips on receipts: 320Z → 32 OZ, 1b → lb, comma decimals. */
export function fixOcr(line: string): string {
  return line
    .replace(/(\d)\s*[0O]Z\b/gi, '$1 OZ')
    .replace(/(\d)\s*[1lI]B(S?)\b/gi, '$1 LB$2')
    .replace(/\b[1lI]B(S?)\b/gi, 'LB$1')
    .replace(/(\d),(\d{2})\b/g, '$1.$2')
    .replace(/\s+@\s*|(\d)@/g, (_m, d) => (d ? `${d} @ ` : ' @ '));
}

export function parseReceiptText(text: string, ingredients: Ingredient[]): ParsedReceipt {
  const rows = text.split(/\r?\n/).map((l) => fixOcr(l.trim())).filter(Boolean);
  const store = chainOf({ osm_name: rows.slice(0, 8).join(' ') });
  const dm = text.match(DATE);
  const date = dm ? `${dm[3].length === 2 ? '20' + dm[3] : dm[3]}-${dm[1].padStart(2, '0')}-${dm[2].padStart(2, '0')}` : null;

  const lines: ReceiptLine[] = [];
  const unmatched: ReceiptLine[] = [];
  let pendingName: string | null = null;

  const push = (raw: string, nameText: string, total: number, kind: ReceiptLine['kind'], unitPrice: number) => {
    const name = cleanName(nameText);
    if (name.length < 3 || total <= 0) return;
    const { id, confidence } = matchIngredient(name.toLowerCase(), ingredients);
    const ing = id ? ingredients.find((i) => i.id === id) : undefined;
    let size: number | null = null;
    let price = unitPrice;
    let label = '';
    if (kind === 'per-lb') {
      size = 453.592;
      label = 'per lb';
    } else if (kind === 'each') {
      size = ing?.unit === 'each' ? 1 : null;
      label = 'each';
    } else {
      const ps = parseSize(name.toLowerCase());
      if (ps && ing && ps.unit === ing.unit) {
        size = ps.amount;
        label = name.match(/\d+(?:\.\d+)?\s*(FL OZ|OZ|LBS?|CT|GAL|ML|KG|G|L)\b/)?.[0].toLowerCase() ?? '';
      }
      price = total;
    }
    const line: ReceiptLine = { raw, name, total, price: Math.round(price * 100) / 100, size, label, kind, ingredientId: id, confidence };
    (id && confidence >= 0.5 ? lines : unmatched).push(line);
  };

  for (const raw of rows) {
    const up = raw.toUpperCase();
    if (SKIP.test(up)) {
      pendingName = null;
      continue;
    }
    const w = up.match(WEIGHT);
    if (w) {
      const lbs = w[2].startsWith('K') ? Number(w[1]) * 2.20462 : Number(w[1]);
      const perLb = w[4].startsWith('K') ? Number(w[3]) / 2.20462 : Number(w[3]);
      const end = up.match(PRICE_AT_END);
      const total = end ? Math.abs(Number(end[1].replace('$', ''))) : lbs * perLb;
      const before = up.slice(0, w.index).trim();
      const nameText = before.length >= 3 ? before : pendingName;
      if (nameText) push(raw, nameText, total, 'per-lb', perLb);
      pendingName = null;
      continue;
    }
    const m = up.match(MULTI);
    const end = up.match(PRICE_AT_END);
    if (m && end) {
      const before = up.slice(0, m.index).trim();
      const nameText = before.length >= 3 ? before : pendingName;
      if (nameText) push(raw, nameText, Number(end[1].replace('$', '')), 'each', Number(m[2]));
      pendingName = null;
      continue;
    }
    if (end) {
      const amount = Number(end[1].replace('$', ''));
      if (amount < 0) continue; // discounts
      const nameText = up.slice(0, end.index).trim();
      if (/[A-Z]{3,}/.test(nameText)) push(raw, nameText, amount, 'pack', amount);
      else if (pendingName) push(raw, pendingName, amount, 'pack', amount);
      pendingName = null;
      continue;
    }
    // A name with no price yet: the price/weight usually follows on the next line.
    pendingName = /[A-Z]{3,}/.test(up) ? up : null;
  }
  return { store, date, lines, unmatched };
}
