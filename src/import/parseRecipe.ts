import { toBaseQty, type RecipeUnit } from '../engine/units';
import type { Ingredient } from '../types';

/*
 * Free, on-device recipe-text parser. No AI, no network.
 * Paste a recipe; we split it into title / ingredients / steps, read each
 * ingredient line's quantity and unit, and match it to the ingredient table.
 * The user confirms everything in the editor before saving.
 */

export interface ParsedLine {
  raw: string;
  amount: number | null;
  unit: RecipeUnit | null;
  name: string;
  note?: string;
  ingredientId: string | null;
  /** 0–1 match confidence. */
  confidence: number;
  /** Quantity in the matched ingredient's base unit. */
  qty: number;
  guessed: boolean;
}

export interface ParsedRecipe {
  title: string;
  servings: number | null;
  minutes: number | null;
  lines: ParsedLine[];
  steps: string[];
}

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };

const UNIT_WORDS: [RegExp, RecipeUnit][] = [
  [/^(cups?|c)$/, 'cup'],
  [/^(tablespoons?|tbsps?|tbs|tbl|T)$/, 'tbsp'],
  [/^(teaspoons?|tsps?|t)$/, 'tsp'],
  [/^(grams?|g|gr)$/, 'g'],
  [/^(kilograms?|kgs?)$/, 'kg'],
  [/^(ounces?|oz)$/, 'oz'],
  [/^(pounds?|lbs?)$/, 'lb'],
  [/^(milliliters?|millilitres?|ml)$/, 'ml'],
  [/^(liters?|litres?|l)$/, 'l'],
  [/^(cloves?)$/, 'clove'],
  [/^(cans?|tins?)$/, 'can'],
  [/^(bunch(es)?)$/, 'bunch'],
  [/^(inch(es)?|in)$/, 'inch'],
  [/^(pinch(es)?)$/, 'pinch'],
  [/^(handfuls?)$/, 'handful'],
  [/^(slices?)$/, 'slice'],
  [/^(pieces?|pcs?|whole)$/, 'piece'],
];

const SIZE_WORDS = /^(large|medium|small|big|heaped|heaping|level|scant|generous)$/i;

/** Extra names people use, mapped to ingredient ids. */
const ALIASES: [RegExp, string][] = [
  [/chicken breast/, 'chicken-breast'],
  [/chicken thigh/, 'chicken-thigh'],
  [/ground turkey|turkey mince/, 'ground-turkey'],
  [/ground chicken|chicken mince/, 'ground-chicken'],
  [/ground beef|beef mince|minced beef/, 'ground-beef'],
  [/ground lamb|lamb mince|minced lamb|keema/, 'ground-lamb'],
  [/prawns?|shrimps?/, 'shrimp'],
  [/garbanzo|chickpeas?|chick peas|kabuli chana/, 'chickpeas-can'],
  [/kidney beans?|rajma/, 'kidney-beans-can'],
  [/black beans?/, 'black-beans-can'],
  [/cannellini|white beans?|navy beans?/, 'white-beans-can'],
  [/red lentils?|masoor/, 'masoor-dal'],
  [/toor|tuvar|arhar|pigeon peas?/, 'toor-dal'],
  [/moong dal|mung dal|yellow lentils?/, 'moong-dal'],
  [/chana dal|bengal gram/, 'chana-dal'],
  [/urad/, 'urad-dal'],
  [/(brown|green) lentils?|lentils?/, 'green-lentils'],
  [/scallions?|green onions?|spring onions?/, 'scallion'],
  [/red onions?/, 'red-onion'],
  [/onions?|shallots?/, 'onion'],
  [/coriander leaves|cilantro|fresh coriander|dhania leaves/, 'cilantro'],
  [/ground coriander|coriander powder|dhania powder/, 'coriander'],
  [/cumin seeds?|jeera/, 'cumin-seeds'],
  [/ground cumin|cumin powder|cumin/, 'cumin'],
  [/kashmiri|red chil+i powder|chil+i powder|cayenne|lal mirch/, 'chili-powder'],
  [/red pepper flakes|chil+i flakes|crushed red pepper/, 'chili-flakes'],
  [/green chil+i(es|s)?|serranos?|thai chil+i(es|s)?/, 'green-chili'],
  [/jalape(n|ñ)os?/, 'jalapeno'],
  [/garam masala/, 'garam-masala'],
  [/turmeric|haldi/, 'turmeric'],
  [/ginger garlic paste/, 'garlic'],
  [/ginger/, 'ginger'],
  [/garlic/, 'garlic'],
  [/greek yogh?urt|hung curd/, 'greek-yogurt'],
  [/yogh?urt|curd|dahi/, 'yogurt'],
  [/cottage cheese/, 'cottage-cheese'],
  [/paneer/, 'paneer'],
  [/tofu/, 'tofu'],
  [/heavy cream|double cream|cream/, 'cream'],
  [/ghee|clarified butter/, 'ghee'],
  [/butter/, 'butter'],
  [/extra virgin olive oil|olive oil/, 'olive-oil'],
  [/sesame oil/, 'sesame-oil'],
  [/mustard oil/, 'mustard-oil'],
  [/vegetable oil|canola oil|neutral oil|sunflower oil|avocado oil|\boil\b/, 'oil'],
  [/basmati|\brice\b/, 'basmati'],
  [/brown rice/, 'brown-rice'],
  [/atta|whole ?wheat flour|chapati flour/, 'atta'],
  [/besan|gram flour|chickpea flour/, 'besan'],
  [/semolina|sooji|suji|rava/, 'semolina'],
  [/tomato paste|tomato puree/, 'tomato-paste'],
  [/crushed tomatoes|canned tomatoes|diced tomatoes|tinned tomatoes/, 'crushed-tomato'],
  [/cherry tomatoes|grape tomatoes/, 'cherry-tomato'],
  [/tomato(es)?/, 'tomato'],
  [/coconut milk/, 'coconut-milk'],
  [/desiccated coconut|grated coconut|shredded coconut/, 'coconut-dry'],
  [/soy sauce|soya sauce|tamari/, 'soy-sauce'],
  [/lemon/, 'lemon'],
  [/\blimes?\b/, 'lime'],
  [/bell peppers?|capsicum/, 'bell-pepper'],
  [/frozen peas|green peas|\bpeas\b|matar/, 'peas'],
  [/spinach|palak/, 'spinach'],
  [/potato(es)?|aloo/, 'potato'],
  [/sweet potato(es)?/, 'sweet-potato'],
  [/cauliflower|gobi/, 'cauliflower'],
  [/aubergine|eggplant|brinjal|baingan/, 'eggplant'],
  [/courgette|zucchini/, 'zucchini'],
  [/mushrooms?/, 'mushroom'],
  [/egg whites?/, 'egg-white'],
  [/\beggs?\b/, 'egg'],
  [/salmon/, 'salmon'],
  [/\bcod\b|white fish/, 'cod'],
  [/tilapia/, 'tilapia'],
  [/tuna/, 'tuna-can'],
  [/salt/, 'salt'],
  [/black pepper|\bpepper\b/, 'black-pepper'],
  [/honey/, 'honey'],
  [/mint/, 'mint'],
  [/curry leaves/, 'curry-leaves'],
  [/mustard seeds?/, 'mustard-seeds'],
  [/asafoetida|hing/, 'hing'],
  [/kasuri methi|dried fenugreek/, 'kasuri-methi'],
  [/cardamom|elaichi/, 'cardamom'],
  [/cinnamon/, 'cinnamon'],
  [/tamarind/, 'tamarind'],
  [/quinoa/, 'quinoa'],
  [/tortillas?|wraps?/, 'tortilla'],
  [/pita/, 'pita'],
  [/naan/, 'naan'],
  [/parmesan|parmigiano/, 'parmesan'],
  [/mozzarella/, 'mozzarella'],
  [/feta/, 'feta'],
  [/cheddar/, 'cheddar'],
  [/milk/, 'milk'],
];

function toWords(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 1);
}

/** Match a free-text ingredient name to the table. */
export function matchIngredient(name: string, ingredients: Ingredient[]): { id: string | null; confidence: number } {
  const n = name.toLowerCase();
  const byId = new Set(ingredients.map((i) => i.id));
  // Longest alias match wins (so "sweet potato" beats "potato").
  let best: { id: string; len: number } | null = null;
  for (const [re, id] of ALIASES) {
    const m = n.match(re);
    if (m && byId.has(id) && (!best || m[0].length > best.len)) best = { id, len: m[0].length };
  }
  if (best) return { id: best.id, confidence: 0.9 };

  const want = toWords(name).filter((w) => !['fresh', 'chopped', 'diced', 'sliced', 'minced', 'and', 'or', 'of', 'to', 'taste'].includes(w));
  if (!want.length) return { id: null, confidence: 0 };
  let top: { id: string; score: number } = { id: '', score: 0 };
  for (const ing of ingredients) {
    const have = new Set([...toWords(ing.name), ...ing.id.split('-')]);
    const hits = want.filter((w) => have.has(w) || have.has(w.replace(/e?s$/, ''))).length;
    const score = hits / Math.max(want.length, 1);
    if (score > top.score) top = { id: ing.id, score };
  }
  return top.score >= 0.5 ? { id: top.id, confidence: top.score * 0.8 } : { id: null, confidence: top.score };
}

function readAmount(tokens: string[]): { amount: number | null; used: number } {
  let i = 0;
  let total = 0;
  let found = false;
  while (i < tokens.length && i < 3) {
    let t = tokens[i];
    // unicode fraction alone or glued: "1½"
    const glued = t.match(/^(\d+)([½¼¾⅓⅔⅛⅜⅝⅞])$/);
    if (glued) {
      total += Number(glued[1]) + FRACTIONS[glued[2]];
      found = true;
      i++;
      continue;
    }
    if (FRACTIONS[t] !== undefined) {
      total += FRACTIONS[t];
      found = true;
      i++;
      continue;
    }
    // ranges: "2-3" or "2–3" → average
    const range = t.match(/^(\d+(?:\.\d+)?)[-–](\d+(?:\.\d+)?)$/);
    if (range) {
      total += (Number(range[1]) + Number(range[2])) / 2;
      found = true;
      i++;
      continue;
    }
    const frac = t.match(/^(\d+)\/(\d+)$/);
    if (frac) {
      total += Number(frac[1]) / Number(frac[2]);
      found = true;
      i++;
      continue;
    }
    t = t.replace(/,$/, '');
    if (/^\d+(\.\d+)?$/.test(t)) {
      total += Number(t);
      found = true;
      i++;
      continue;
    }
    break;
  }
  return { amount: found ? total : null, used: i };
}

function readUnit(token: string | undefined): RecipeUnit | null {
  if (!token) return null;
  const t = token.replace(/\.$/, '');
  for (const [re, unit] of UNIT_WORDS) if (re.test(t) || re.test(t.toLowerCase())) return unit;
  return null;
}

/** Parse one ingredient line like "1 1/2 cups cooked chickpeas, drained". */
export function parseIngredientLine(raw: string, ingredients: Ingredient[]): ParsedLine {
  let s = raw.replace(/^[\s\-•*▢☐◦·–]+/, '').trim();
  // "1 (15 oz) can chickpeas" → keep the can, drop the parenthetical size
  s = s.replace(/\(([^)]*)\)/g, (_, inner: string) => (/\d/.test(inner) && /(oz|ounce|g|ml|lb)/i.test(inner) ? '' : `(${inner})`));
  // split glued numbers and units: "200g" → "200 g"
  s = s.replace(/(\d)([a-zA-Z]{1,6})\b/g, '$1 $2');
  const tokens = s.split(/\s+/).filter(Boolean);
  const { amount, used } = readAmount(tokens);
  let rest = tokens.slice(used);
  let unit = readUnit(rest[0]);
  if (unit) rest = rest.slice(1);
  while (rest.length && SIZE_WORDS.test(rest[0])) rest = rest.slice(1);
  // unit after a size word: "2 large cloves garlic"
  if (!unit) {
    const u = readUnit(rest[0]);
    if (u) {
      unit = u;
      rest = rest.slice(1);
    }
  }
  if (rest[0]?.toLowerCase() === 'of') rest = rest.slice(1);
  let name = rest.join(' ');
  let note: string | undefined;
  const comma = name.indexOf(',');
  if (comma > 0) {
    note = name.slice(comma + 1).trim();
    name = name.slice(0, comma).trim();
  }
  const { id, confidence } = matchIngredient(name || raw, ingredients);
  const ing = id ? ingredients.find((i) => i.id === id) : undefined;
  const conv = ing && amount !== null ? toBaseQty(ing, amount, unit) : { qty: 0, guessed: true };
  // "salt to taste" with no amount: a pinch
  const qty = ing && amount === null ? (ing.aisle === 'Spices' ? 3 : ing.unit === 'each' ? 1 : 0) : conv.qty;
  return {
    raw,
    amount,
    unit,
    name,
    note: note || undefined,
    ingredientId: id,
    confidence,
    qty: Math.round(qty * 10) / 10,
    guessed: amount === null || conv.guessed,
  };
}

const ING_HEAD = /^\s*(ingredients?|you(’|')?ll need|what you need)\s*:?\s*$/i;
const STEP_HEAD = /^\s*(instructions?|method|directions?|steps?|preparation|how to make( it)?)\s*:?\s*$/i;
const STEP_LINE = /^\s*(step\s*)?\d+[.)]\s+|^\s*step\s*\d+\s*:?\s*/i;
const LOOKS_LIKE_INGREDIENT = /^[\s\-•*▢☐]*([\d½¼¾⅓⅔⅛]|a\s+(pinch|handful|few)|salt|pepper)/i;

/** Parse a whole pasted recipe. */
export function parseRecipeText(text: string, ingredients: Ingredient[]): ParsedRecipe {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let title = '';
  let servings: number | null = null;
  let minutes: number | null = null;
  const ingLines: string[] = [];
  const steps: string[] = [];
  let mode: 'head' | 'ing' | 'steps' = 'head';

  for (const line of lines) {
    const serv = line.match(/(?:serves|servings|yield|makes)\s*:?\s*(\d+)/i) ?? line.match(/(\d+)\s*servings/i);
    const time = line.match(/(?:total|cook|prep)?\s*time\s*:?\s*(\d+)\s*(min|minutes|mins|h|hr|hrs|hours?)/i) ?? line.match(/^(\d+)\s*(min|minutes|mins)\b/i);
    if (serv && line.length < 40) {
      servings = Number(serv[1]);
      continue;
    }
    if (time && line.length < 40) {
      const n = Number(time[1]);
      minutes = /^h/i.test(time[2]) ? n * 60 : n;
      continue;
    }
    if (ING_HEAD.test(line)) {
      mode = 'ing';
      continue;
    }
    if (STEP_HEAD.test(line)) {
      mode = 'steps';
      continue;
    }
    if (mode === 'head') {
      if (!title && !LOOKS_LIKE_INGREDIENT.test(line)) {
        title = line.replace(/^#+\s*/, '');
        continue;
      }
      mode = LOOKS_LIKE_INGREDIENT.test(line) ? 'ing' : 'steps';
    }
    if (mode === 'ing') {
      // A long sentence after ingredients without a heading is probably a step.
      if (STEP_LINE.test(line) || (line.length > 80 && !LOOKS_LIKE_INGREDIENT.test(line))) {
        mode = 'steps';
      } else {
        ingLines.push(line);
        continue;
      }
    }
    steps.push(line.replace(STEP_LINE, '').trim());
  }

  return {
    title: title || 'Imported recipe',
    servings,
    minutes,
    lines: ingLines.map((l) => parseIngredientLine(l, ingredients)),
    steps: steps.filter(Boolean),
  };
}
