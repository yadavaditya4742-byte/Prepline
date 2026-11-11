import type { Aisle, DietTag, Ingredient, Pack, Unit } from '../types';

/*
 * Seed ingredient table.
 *
 * Nutrition: estimated per 100 g / 100 ml (or per piece for `each`), rounded
 * from typical USDA-style values. These are estimates, not lab values.
 *
 * Prices: estimated regular shelf prices at a mainstream US supermarket,
 * late 2026. Stores apply their own index on top (see stores.ts). Users can
 * edit any price, and Kroger-family prices can be refreshed by the live job.
 */

type N = [kcal: number, protein: number, carbs: number, fat: number];
type P = [size: number, price: number, label: string];

interface Opts {
  bulk?: P;
  desi?: P;
  staple?: boolean;
  gPerCup?: number;
}

const pack = ([size, price, label]: P): Pack => ({ size, price, label });

function i(
  id: string,
  name: string,
  aisle: Aisle,
  unit: Unit,
  n: N,
  diet: DietTag,
  base: P,
  o: Opts = {},
): Ingredient {
  return {
    id,
    name,
    aisle,
    unit,
    nutrition: { kcal: n[0], protein: n[1], carbs: n[2], fat: n[3] },
    diet,
    base: pack(base),
    ...(o.bulk && { bulk: pack(o.bulk) }),
    ...(o.desi && { desi: pack(o.desi) }),
    ...(o.staple && { staple: true }),
    ...(o.gPerCup && { gPerCup: o.gPerCup }),
  };
}

const PR: Aisle = 'Produce';
const MS: Aisle = 'Meat & Seafood';
const DE: Aisle = 'Dairy & Eggs';
const PP: Aisle = 'Tofu & Plant Protein';
const GR: Aisle = 'Grains, Pasta & Bread';
const BL: Aisle = 'Beans & Lentils';
const CJ: Aisle = 'Canned & Jarred';
const NS: Aisle = 'Nuts & Seeds';
const OC: Aisle = 'Oils & Condiments';
const SP: Aisle = 'Spices';
const FZ: Aisle = 'Frozen';

export const INGREDIENTS: Ingredient[] = [
  // ── Produce ───────────────────────────────────────────────
  i('onion', 'Yellow onion', PR, 'g', [40, 1.1, 9.3, 0.1], 'plant', [1360, 3.49, '3 lb bag'], { bulk: [4540, 6.99, '10 lb bag'], desi: [1360, 2.49, '3 lb bag'], gPerCup: 160 }),
  i('red-onion', 'Red onion', PR, 'g', [40, 1.1, 9.3, 0.1], 'plant', [454, 1.79, '1 lb'], { gPerCup: 160 }),
  i('tomato', 'Tomatoes', PR, 'g', [18, 0.9, 3.9, 0.2], 'plant', [454, 2.29, '1 lb'], { desi: [454, 1.49, '1 lb'], gPerCup: 180 }),
  i('cherry-tomato', 'Cherry tomatoes', PR, 'g', [18, 0.9, 3.9, 0.2], 'plant', [283, 2.99, '10 oz pint'], { bulk: [907, 5.99, '2 lb'], gPerCup: 150 }),
  i('garlic', 'Garlic', PR, 'g', [149, 6.4, 33, 0.5], 'plant', [150, 1.79, '3-head pack'], { bulk: [907, 6.99, '2 lb peeled'], desi: [227, 1.49, '1/2 lb'] }),
  i('ginger', 'Fresh ginger', PR, 'g', [80, 1.8, 18, 0.8], 'plant', [113, 1.19, '1/4 lb'], { desi: [227, 1.29, '1/2 lb'] }),
  i('green-chili', 'Green chilies (serrano)', PR, 'g', [40, 2, 9, 0.2], 'plant', [113, 0.99, '1/4 lb'], { desi: [113, 0.59, '1/4 lb'] }),
  i('jalapeno', 'Jalapeños', PR, 'g', [29, 0.9, 6.5, 0.4], 'plant', [113, 0.69, '1/4 lb']),
  i('cilantro', 'Cilantro', PR, 'g', [23, 2.1, 3.7, 0.5], 'plant', [60, 0.99, 'bunch'], { desi: [60, 0.50, 'bunch'], gPerCup: 16 }),
  i('mint', 'Mint', PR, 'g', [70, 3.8, 15, 0.9], 'plant', [21, 2.29, '0.75 oz pack'], { desi: [60, 0.99, 'bunch'], gPerCup: 20 }),
  i('curry-leaves', 'Curry leaves', PR, 'g', [108, 6, 18, 1], 'plant', [14, 2.49, 'small pack'], { desi: [28, 1.49, 'pack'] }),
  i('lemon', 'Lemon', PR, 'each', [17, 0.6, 5.4, 0.2], 'plant', [1, 0.69, 'each'], { bulk: [24, 7.99, '5 lb bag'], desi: [1, 0.39, 'each'] }),
  i('lime', 'Lime', PR, 'each', [11, 0.2, 3.7, 0.1], 'plant', [1, 0.39, 'each'], { bulk: [40, 6.99, '3 lb bag'], desi: [1, 0.25, 'each'] }),
  i('spinach', 'Baby spinach', PR, 'g', [23, 2.9, 3.6, 0.4], 'plant', [283, 2.99, '10 oz clamshell'], { bulk: [1134, 4.99, '2.5 lb'], gPerCup: 30 }),
  i('kale', 'Kale', PR, 'g', [35, 2.9, 4.4, 1.5], 'plant', [283, 3.49, '10 oz bag'], { bulk: [907, 5.49, '2 lb'], gPerCup: 25 }),
  i('romaine', 'Romaine hearts', PR, 'g', [17, 1.2, 3.3, 0.3], 'plant', [567, 3.99, '3 hearts'], { bulk: [1360, 4.99, '6 hearts'], gPerCup: 47 }),
  i('cabbage', 'Green cabbage', PR, 'g', [25, 1.3, 5.8, 0.1], 'plant', [907, 1.99, 'head (~2 lb)'], { desi: [907, 1.49, 'head'], gPerCup: 89 }),
  i('potato', 'Russet potatoes', PR, 'g', [77, 2, 17, 0.1], 'plant', [2268, 4.49, '5 lb bag'], { bulk: [4540, 6.99, '10 lb bag'], gPerCup: 150 }),
  i('sweet-potato', 'Sweet potatoes', PR, 'g', [86, 1.6, 20, 0.1], 'plant', [454, 1.29, '1 lb'], { bulk: [2721, 5.99, '6 lb'], gPerCup: 133 }),
  i('cauliflower', 'Cauliflower', PR, 'g', [25, 1.9, 5, 0.3], 'plant', [600, 3.49, 'head'], { desi: [600, 2.49, 'head'], gPerCup: 107 }),
  i('broccoli', 'Broccoli florets', PR, 'g', [34, 2.8, 7, 0.4], 'plant', [340, 2.99, '12 oz bag'], { bulk: [1360, 5.99, '3 lb'], gPerCup: 91 }),
  i('bell-pepper', 'Bell peppers', PR, 'g', [26, 1, 6, 0.3], 'plant', [450, 3.99, '3-pack'], { bulk: [1360, 6.99, '6-pack'], gPerCup: 150 }),
  i('carrot', 'Carrots', PR, 'g', [41, 0.9, 10, 0.2], 'plant', [907, 1.99, '2 lb bag'], { bulk: [2268, 3.99, '5 lb'], gPerCup: 128 }),
  i('cucumber', 'Cucumber', PR, 'g', [15, 0.7, 3.6, 0.1], 'plant', [300, 0.79, 'each'], { bulk: [1360, 4.99, '6 mini pack'], gPerCup: 120 }),
  i('zucchini', 'Zucchini', PR, 'g', [17, 1.2, 3.1, 0.3], 'plant', [454, 1.79, '1 lb'], { gPerCup: 124 }),
  i('mushroom', 'Cremini mushrooms', PR, 'g', [22, 3.1, 3.3, 0.3], 'plant', [227, 2.49, '8 oz'], { bulk: [680, 4.99, '24 oz'], gPerCup: 70 }),
  i('eggplant', 'Eggplant', PR, 'g', [25, 1, 6, 0.2], 'plant', [550, 2.49, 'each (~1.2 lb)'], { desi: [454, 1.49, '1 lb'], gPerCup: 82 }),
  i('green-beans', 'Green beans', PR, 'g', [31, 1.8, 7, 0.2], 'plant', [454, 2.49, '1 lb'], { bulk: [907, 4.49, '2 lb'], gPerCup: 110 }),
  i('scallion', 'Green onions', PR, 'g', [32, 1.8, 7.3, 0.2], 'plant', [100, 0.99, 'bunch'], { gPerCup: 100 }),
  i('bok-choy', 'Baby bok choy', PR, 'g', [13, 1.5, 2.2, 0.2], 'plant', [454, 2.49, '1 lb'], { gPerCup: 70 }),
  i('avocado', 'Avocado', PR, 'each', [240, 3, 13, 22], 'plant', [1, 1.25, 'each'], { bulk: [6, 5.99, 'bag of 6'] }),
  i('mango', 'Mango', PR, 'each', [200, 2.8, 50, 1.3], 'plant', [1, 1.29, 'each']),

  // ── Meat & Seafood ────────────────────────────────────────
  i('chicken-breast', 'Chicken breast, boneless skinless', MS, 'g', [120, 22.5, 0, 2.6], 'poultry', [1360, 11.97, '3 lb pack'], { bulk: [2860, 21.99, '6.3 lb pack'] }),
  i('chicken-thigh', 'Chicken thighs, boneless skinless', MS, 'g', [121, 19.7, 0, 4.1], 'poultry', [1360, 9.99, '3 lb pack'], { bulk: [2720, 17.99, '6 lb pack'], desi: [907, 5.99, '2 lb halal'] }),
  i('ground-turkey', 'Ground turkey 93/7', MS, 'g', [150, 18.7, 0, 8.3], 'poultry', [454, 5.49, '1 lb'], { bulk: [1360, 13.99, '3 lb'] }),
  i('ground-chicken', 'Ground chicken', MS, 'g', [143, 17.4, 0, 8.1], 'poultry', [454, 4.99, '1 lb'], { desi: [907, 7.99, '2 lb halal'] }),
  i('salmon', 'Salmon fillet', MS, 'g', [208, 20, 0, 13], 'fish', [454, 10.99, '1 lb'], { bulk: [1360, 26.99, '3 lb frozen'] }),
  i('tilapia', 'Tilapia fillets (frozen)', MS, 'g', [96, 20, 0, 1.7], 'fish', [454, 5.99, '1 lb bag'], { bulk: [1814, 15.99, '4 lb bag'] }),
  i('cod', 'Cod fillets', MS, 'g', [82, 18, 0, 0.7], 'fish', [454, 8.99, '1 lb'], { bulk: [1360, 22.99, '3 lb frozen'] }),
  i('shrimp', 'Shrimp, peeled (frozen)', MS, 'g', [85, 20, 0, 0.5], 'fish', [907, 13.99, '2 lb bag'], { bulk: [907, 12.49, '2 lb bag'] }),
  i('ground-beef', 'Ground beef 90/10', MS, 'g', [176, 20, 0, 10], 'meat', [454, 6.49, '1 lb'], { bulk: [2040, 25.99, '4.5 lb'] }),
  i('ground-lamb', 'Ground lamb', MS, 'g', [282, 16.6, 0, 23.4], 'meat', [454, 9.99, '1 lb'], { desi: [454, 7.99, '1 lb halal'] }),
  i('pork-tenderloin', 'Pork tenderloin', MS, 'g', [120, 21, 0, 3.5], 'meat', [680, 6.99, '1.5 lb'], { bulk: [1814, 14.99, '4 lb twin pack'] }),
  i('sirloin', 'Sirloin steak', MS, 'g', [160, 21, 0, 8], 'meat', [454, 9.99, '1 lb']),

  // ── Dairy & Eggs ──────────────────────────────────────────
  i('egg', 'Eggs, large', DE, 'each', [72, 6.3, 0.4, 4.8], 'egg', [12, 3.29, 'dozen'], { bulk: [60, 11.99, '5 dozen'] }),
  i('egg-white', 'Liquid egg whites', DE, 'ml', [52, 11, 0.7, 0.2], 'egg', [473, 3.99, '16 oz carton'], { bulk: [2838, 11.99, '6 × 16 oz'], gPerCup: 243 }),
  i('paneer', 'Paneer', DE, 'g', [265, 18.3, 1.2, 20.8], 'dairy', [397, 5.99, '14 oz block'], { desi: [794, 7.99, '28 oz block'] }),
  i('greek-yogurt', 'Greek yogurt, plain nonfat', DE, 'g', [59, 10.3, 3.6, 0.4], 'dairy', [907, 5.49, '32 oz tub'], { bulk: [1360, 6.99, '48 oz tub'], gPerCup: 245 }),
  i('yogurt', 'Plain yogurt (dahi)', DE, 'g', [61, 3.5, 4.7, 3.3], 'dairy', [907, 3.49, '32 oz tub'], { desi: [907, 2.99, '2 lb tub'], gPerCup: 245 }),
  i('cottage-cheese', 'Cottage cheese, 2%', DE, 'g', [81, 10.5, 4.3, 2.3], 'dairy', [680, 4.29, '24 oz tub'], { bulk: [1360, 6.99, '48 oz'], gPerCup: 226 }),
  i('milk', 'Milk, 2%', DE, 'ml', [50, 3.3, 4.8, 2], 'dairy', [3785, 3.89, 'gallon'], { bulk: [7570, 6.49, '2 gallons'], gPerCup: 244 }),
  i('mozzarella', 'Mozzarella, part-skim shredded', DE, 'g', [254, 24, 2.8, 16], 'dairy', [227, 2.99, '8 oz bag'], { bulk: [1134, 9.99, '2.5 lb'], gPerCup: 112 }),
  i('parmesan', 'Parmesan', DE, 'g', [431, 38, 4, 29], 'dairy', [142, 4.99, '5 oz'], { bulk: [680, 12.99, '24 oz'], gPerCup: 100 }),
  i('feta', 'Feta', DE, 'g', [264, 14, 4, 21], 'dairy', [170, 4.49, '6 oz'], { bulk: [680, 8.99, '24 oz'], gPerCup: 150 }),
  i('cheddar', 'Cheddar, shredded', DE, 'g', [403, 23, 3, 33], 'dairy', [227, 2.99, '8 oz bag'], { bulk: [1134, 9.49, '2.5 lb'], gPerCup: 113 }),
  i('butter', 'Butter', DE, 'g', [717, 0.9, 0.1, 81], 'dairy', [454, 4.99, '1 lb'], { bulk: [1814, 14.99, '4 lb'], gPerCup: 227, staple: true }),
  i('ghee', 'Ghee', DE, 'g', [900, 0, 0, 100], 'dairy', [397, 9.99, '14 oz jar'], { desi: [794, 12.99, '28 oz jar'], staple: true, gPerCup: 205 }),
  i('cream', 'Heavy cream', DE, 'ml', [340, 2.8, 2.7, 36], 'dairy', [473, 3.49, 'pint'], { gPerCup: 238 }),

  // ── Tofu & Plant Protein ──────────────────────────────────
  i('tofu', 'Tofu, extra-firm', PP, 'g', [130, 15, 2.5, 7.5], 'plant', [397, 2.49, '14 oz block'], { bulk: [1814, 7.99, '4 × 16 oz'], desi: [397, 1.99, '14 oz'] }),
  i('tempeh', 'Tempeh', PP, 'g', [192, 20, 7.6, 10.8], 'plant', [227, 3.49, '8 oz']),
  i('seitan', 'Seitan', PP, 'g', [140, 25, 6, 2], 'plant', [227, 4.99, '8 oz']),
  i('soy-chunks', 'Soya chunks (TVP)', PP, 'g', [345, 52, 33, 0.5], 'plant', [200, 2.99, '7 oz bag'], { desi: [1000, 5.99, '1 kg bag'], gPerCup: 50 }),
  i('vital-wheat-gluten', 'Vital wheat gluten', PP, 'g', [370, 75, 14, 1.9], 'plant', [567, 6.99, '20 oz bag'], { gPerCup: 120 }),

  // ── Grains, Pasta & Bread ─────────────────────────────────
  i('basmati', 'Basmati rice', GR, 'g', [356, 8, 78, 0.6], 'plant', [907, 3.99, '2 lb bag'], { bulk: [4536, 13.99, '10 lb bag'], desi: [4536, 12.99, '10 lb bag'], gPerCup: 185 }),
  i('brown-rice', 'Brown rice', GR, 'g', [367, 7.5, 76, 2.7], 'plant', [907, 2.49, '2 lb bag'], { bulk: [5443, 11.99, '12 lb'], gPerCup: 190 }),
  i('quinoa', 'Quinoa', GR, 'g', [368, 14, 64, 6], 'plant', [340, 4.99, '12 oz'], { bulk: [2040, 9.99, '4.5 lb'], gPerCup: 170 }),
  i('atta', 'Whole wheat flour (atta)', GR, 'g', [340, 13, 72, 2.5], 'plant', [2268, 4.29, '5 lb bag'], { desi: [9072, 14.99, '20 lb bag'], gPerCup: 120 }),
  i('besan', 'Chickpea flour (besan)', GR, 'g', [387, 22, 58, 6.7], 'plant', [454, 3.99, '1 lb'], { desi: [907, 3.49, '2 lb'], gPerCup: 92 }),
  i('semolina', 'Semolina (rava/sooji)', GR, 'g', [360, 12.7, 73, 1], 'plant', [680, 3.49, '24 oz'], { desi: [907, 2.99, '2 lb'], gPerCup: 167 }),
  i('poha', 'Poha (flattened rice)', GR, 'g', [346, 6.6, 77, 1.2], 'plant', [907, 4.49, '2 lb'], { desi: [907, 2.99, '2 lb'], gPerCup: 70 }),
  i('pasta', 'Pasta, dry', GR, 'g', [371, 13, 75, 1.5], 'plant', [454, 1.49, '1 lb box'], { bulk: [2722, 7.99, '6 × 1 lb'], gPerCup: 100 }),
  i('chickpea-pasta', 'Chickpea or lentil pasta', GR, 'g', [340, 21, 57, 6], 'plant', [227, 2.99, '8 oz box'], { bulk: [1360, 11.99, '6 × 8 oz'], gPerCup: 100 }),
  i('couscous', 'Couscous', GR, 'g', [376, 13, 77, 0.6], 'plant', [283, 2.99, '10 oz'], { gPerCup: 173 }),
  i('rice-noodles', 'Rice noodles', GR, 'g', [364, 6, 80, 0.6], 'plant', [454, 2.99, '1 lb'], {}),
  i('soba', 'Soba noodles', GR, 'g', [336, 14, 74, 0.7], 'plant', [255, 3.49, '9 oz'], {}),
  i('oats', 'Rolled oats', GR, 'g', [379, 13, 68, 6.5], 'plant', [1190, 4.99, '42 oz'], { bulk: [4540, 9.99, '10 lb'], gPerCup: 81 }),
  i('tortilla', 'Whole wheat tortillas (8")', GR, 'each', [130, 4, 22, 3.5], 'plant', [8, 3.49, '8-pack'], { bulk: [20, 6.49, '20-pack'] }),
  i('corn-tortilla', 'Corn tortillas', GR, 'each', [57, 1.5, 12, 0.7], 'plant', [30, 2.99, '30-pack'], {}),
  i('pita', 'Whole wheat pita', GR, 'each', [170, 6, 35, 1.7], 'plant', [6, 2.99, '6-pack'], {}),
  i('bread', 'Whole grain bread', GR, 'each', [110, 5, 20, 1.5], 'plant', [20, 3.49, 'loaf (20 slices)'], { bulk: [40, 5.99, '2 loaves'] }),
  i('naan', 'Naan', GR, 'each', [260, 8, 45, 5], 'dairy', [4, 3.49, '4-pack'], { desi: [5, 2.99, '5-pack'] }),

  // ── Beans & Lentils (dry unless "canned") ─────────────────
  i('toor-dal', 'Toor dal (split pigeon peas)', BL, 'g', [343, 22, 63, 1.5], 'plant', [907, 4.49, '2 lb'], { desi: [1814, 6.99, '4 lb'], gPerCup: 200 }),
  i('masoor-dal', 'Red lentils (masoor dal)', BL, 'g', [358, 24, 63, 2], 'plant', [907, 3.29, '2 lb'], { desi: [1814, 5.49, '4 lb'], gPerCup: 192 }),
  i('moong-dal', 'Yellow moong dal', BL, 'g', [348, 24.5, 63, 1.2], 'plant', [907, 4.29, '2 lb'], { desi: [1814, 6.49, '4 lb'], gPerCup: 207 }),
  i('chana-dal', 'Chana dal', BL, 'g', [360, 22, 60, 5], 'plant', [907, 3.79, '2 lb'], { desi: [1814, 5.99, '4 lb'], gPerCup: 200 }),
  i('urad-dal', 'Urad dal', BL, 'g', [341, 25, 59, 1.6], 'plant', [907, 4.49, '2 lb'], { desi: [1814, 6.99, '4 lb'], gPerCup: 200 }),
  i('whole-moong', 'Whole green moong', BL, 'g', [347, 24, 63, 1.2], 'plant', [907, 3.99, '2 lb'], { desi: [1814, 5.99, '4 lb'], gPerCup: 207 }),
  i('kala-chana', 'Black chickpeas (kala chana)', BL, 'g', [364, 20, 61, 5], 'plant', [907, 3.99, '2 lb'], { desi: [1814, 5.49, '4 lb'], gPerCup: 200 }),
  i('rajma', 'Kidney beans, dry (rajma)', BL, 'g', [333, 24, 60, 0.8], 'plant', [907, 3.49, '2 lb'], { desi: [1814, 5.99, '4 lb'], gPerCup: 184 }),
  i('green-lentils', 'Brown/green lentils', BL, 'g', [352, 25, 63, 1], 'plant', [454, 1.79, '1 lb'], { bulk: [3629, 9.99, '8 lb'], gPerCup: 192 }),
  i('chickpeas-can', 'Chickpeas, canned', BL, 'g', [120, 6.5, 20, 2], 'plant', [439, 1.19, '15.5 oz can'], { bulk: [3512, 8.99, '8 cans'], gPerCup: 160 }),
  i('black-beans-can', 'Black beans, canned', BL, 'g', [91, 6, 16, 0.3], 'plant', [425, 1.09, '15 oz can'], { bulk: [3400, 8.49, '8 cans'], gPerCup: 170 }),
  i('kidney-beans-can', 'Kidney beans, canned', BL, 'g', [100, 7, 17, 0.4], 'plant', [439, 1.09, '15.5 oz can'], { bulk: [3512, 8.49, '8 cans'], gPerCup: 170 }),
  i('white-beans-can', 'Cannellini beans, canned', BL, 'g', [90, 6, 16, 0.3], 'plant', [439, 1.29, '15.5 oz can'], { gPerCup: 170 }),

  // ── Canned & Jarred ───────────────────────────────────────
  i('crushed-tomato', 'Crushed tomatoes', CJ, 'g', [32, 1.6, 7, 0.3], 'plant', [794, 2.29, '28 oz can'], { bulk: [6352, 13.99, '8 × 28 oz'], gPerCup: 240 }),
  i('tomato-paste', 'Tomato paste', CJ, 'g', [82, 4.3, 19, 0.5], 'plant', [170, 0.99, '6 oz can'], { gPerCup: 262 }),
  i('coconut-milk', 'Light coconut milk', CJ, 'ml', [70, 0.6, 2, 6.5], 'plant', [400, 2.49, '13.5 oz can'], { bulk: [2400, 9.99, '6 cans'], desi: [400, 1.79, '13.5 oz can'], gPerCup: 240 }),
  i('tuna-can', 'Tuna in water, canned', CJ, 'g', [116, 26, 0, 0.8], 'fish', [142, 1.29, '5 oz can'], { bulk: [1584, 15.99, '8 × 7 oz'] }),
  i('marinara', 'Marinara sauce', CJ, 'g', [50, 1.5, 8, 1.5], 'plant', [680, 2.99, '24 oz jar'], { bulk: [2040, 8.99, '3 jars'], gPerCup: 250 }),
  i('salsa', 'Salsa', CJ, 'g', [36, 1.5, 7, 0.2], 'plant', [454, 3.49, '16 oz jar'], { bulk: [1077, 5.99, '38 oz'], gPerCup: 260 }),
  i('veg-broth', 'Vegetable broth', CJ, 'ml', [6, 0.2, 1, 0.1], 'plant', [946, 2.49, '32 oz carton'], { bulk: [5676, 10.99, '6 cartons'], gPerCup: 240 }),
  i('chicken-broth', 'Chicken broth, low sodium', CJ, 'ml', [7, 1, 0.5, 0.2], 'poultry', [946, 2.49, '32 oz carton'], { bulk: [5676, 10.99, '6 cartons'], gPerCup: 240 }),
  i('peanut-butter', 'Peanut butter', CJ, 'g', [588, 25, 20, 50], 'plant', [454, 2.99, '16 oz jar'], { bulk: [2268, 10.99, '2 × 40 oz'], gPerCup: 258 }),
  i('tahini', 'Tahini', CJ, 'g', [595, 17, 21, 54], 'plant', [454, 6.99, '16 oz jar'], { desi: [454, 4.99, '16 oz jar'], gPerCup: 240 }),
  i('tamarind', 'Tamarind paste', CJ, 'g', [250, 2.8, 62, 0.6], 'plant', [227, 3.49, '8 oz jar'], { desi: [400, 2.49, '14 oz block'] }),
  i('soy-sauce', 'Soy sauce, low sodium', OC, 'ml', [60, 6, 6, 0.1], 'plant', [296, 3.49, '10 oz bottle'], { staple: true, gPerCup: 255 }),
  i('honey', 'Honey', OC, 'g', [304, 0.3, 82, 0], 'plant', [340, 4.99, '12 oz'], { staple: true, gPerCup: 340 }),
  i('vinegar', 'Vinegar (apple cider)', OC, 'ml', [21, 0, 0.9, 0], 'plant', [473, 2.49, '16 oz'], { staple: true, gPerCup: 240 }),
  i('dijon', 'Dijon mustard', OC, 'g', [66, 4, 6, 4], 'plant', [340, 3.49, '12 oz jar'], { staple: true }),
  i('hot-sauce', 'Hot sauce / sriracha', OC, 'g', [93, 2, 19, 1], 'plant', [482, 4.49, '17 oz bottle'], { staple: true }),

  // ── Nuts & Seeds ──────────────────────────────────────────
  i('peanuts', 'Peanuts, roasted', NS, 'g', [567, 26, 16, 49], 'plant', [454, 3.99, '16 oz'], { bulk: [1134, 6.99, '2.5 lb'], gPerCup: 146 }),
  i('cashews', 'Cashews', NS, 'g', [553, 18, 30, 44], 'plant', [227, 5.99, '8 oz'], { bulk: [1134, 15.99, '2.5 lb'], desi: [907, 12.99, '2 lb'], gPerCup: 137 }),
  i('almonds', 'Almonds', NS, 'g', [579, 21, 22, 50], 'plant', [340, 6.99, '12 oz'], { bulk: [1360, 14.99, '3 lb'], gPerCup: 143 }),
  i('hemp-hearts', 'Hemp hearts', NS, 'g', [553, 32, 9, 49], 'plant', [340, 9.99, '12 oz'], { bulk: [907, 14.99, '2 lb'], gPerCup: 160 }),
  i('pumpkin-seeds', 'Pumpkin seeds (pepitas)', NS, 'g', [559, 30, 11, 49], 'plant', [227, 5.99, '8 oz'], { bulk: [907, 11.99, '2 lb'], gPerCup: 129 }),
  i('sesame-seeds', 'Sesame seeds', NS, 'g', [573, 18, 23, 50], 'plant', [57, 2.99, '2 oz'], { desi: [200, 2.49, '7 oz'], staple: true, gPerCup: 144 }),

  // ── Oils & Condiments (staples) ───────────────────────────
  i('olive-oil', 'Olive oil', OC, 'ml', [805, 0, 0, 91], 'plant', [500, 7.99, '16.9 oz'], { bulk: [2000, 19.99, '2 L'], staple: true, gPerCup: 216 }),
  i('oil', 'Neutral oil (canola/avocado)', OC, 'ml', [810, 0, 0, 91], 'plant', [1420, 4.49, '48 oz'], { bulk: [4730, 11.99, '1.25 gal'], desi: [2840, 7.99, '96 oz'], staple: true, gPerCup: 218 }),
  i('sesame-oil', 'Toasted sesame oil', OC, 'ml', [810, 0, 0, 91], 'plant', [207, 4.49, '7 oz'], { staple: true, gPerCup: 218 }),
  i('salt', 'Salt', SP, 'g', [0, 0, 0, 0], 'plant', [737, 1.29, '26 oz'], { staple: true, gPerCup: 292 }),
  i('black-pepper', 'Black pepper', SP, 'g', [251, 10, 64, 3], 'plant', [85, 3.99, '3 oz'], { staple: true }),

  // ── Spices (staples) ──────────────────────────────────────
  i('cumin-seeds', 'Cumin seeds', SP, 'g', [375, 18, 44, 22], 'plant', [57, 3.49, '2 oz jar'], { desi: [200, 2.99, '7 oz bag'], staple: true }),
  i('cumin', 'Ground cumin', SP, 'g', [375, 18, 44, 22], 'plant', [57, 3.49, '2 oz jar'], { desi: [200, 2.99, '7 oz bag'], staple: true }),
  i('coriander', 'Ground coriander', SP, 'g', [298, 12, 55, 18], 'plant', [57, 2.99, '2 oz jar'], { desi: [200, 2.49, '7 oz bag'], staple: true }),
  i('turmeric', 'Turmeric', SP, 'g', [312, 9.7, 67, 3.3], 'plant', [57, 3.49, '2 oz jar'], { desi: [200, 2.49, '7 oz bag'], staple: true }),
  i('chili-powder', 'Kashmiri red chili powder', SP, 'g', [282, 13, 50, 14], 'plant', [57, 3.99, '2 oz jar'], { desi: [200, 3.49, '7 oz bag'], staple: true }),
  i('garam-masala', 'Garam masala', SP, 'g', [380, 15, 45, 15], 'plant', [57, 4.99, '2 oz jar'], { desi: [100, 2.99, '3.5 oz box'], staple: true }),
  i('mustard-seeds', 'Black mustard seeds', SP, 'g', [508, 26, 28, 36], 'plant', [57, 2.99, '2 oz jar'], { desi: [200, 1.99, '7 oz bag'], staple: true }),
  i('chaat-masala', 'Chaat masala', SP, 'g', [230, 8, 40, 4], 'plant', [100, 3.99, '3.5 oz box'], { desi: [100, 2.49, '3.5 oz box'], staple: true }),
  i('sambar-powder', 'Sambar powder', SP, 'g', [330, 14, 50, 9], 'plant', [100, 3.99, '3.5 oz box'], { desi: [200, 2.99, '7 oz box'], staple: true }),
  i('hing', 'Asafoetida (hing)', SP, 'g', [297, 4, 68, 1], 'plant', [50, 3.99, 'small jar'], { desi: [100, 3.49, 'jar'], staple: true }),
  i('kasuri-methi', 'Dried fenugreek leaves (kasuri methi)', SP, 'g', [323, 23, 58, 6.4], 'plant', [28, 3.49, '1 oz box'], { desi: [100, 2.49, '3.5 oz box'], staple: true }),
  i('paprika', 'Smoked paprika', SP, 'g', [282, 14, 54, 13], 'plant', [57, 3.99, '2 oz jar'], { staple: true }),
  i('italian-herbs', 'Italian seasoning', SP, 'g', [265, 9, 69, 4], 'plant', [21, 2.99, '0.75 oz jar'], { staple: true }),
  i('chili-flakes', 'Red pepper flakes', SP, 'g', [318, 12, 57, 17], 'plant', [43, 2.99, '1.5 oz jar'], { staple: true }),
  i('cinnamon', 'Ground cinnamon', SP, 'g', [247, 4, 81, 1.2], 'plant', [57, 3.49, '2 oz jar'], { staple: true }),
  i('taco-seasoning', 'Taco seasoning', SP, 'g', [300, 6, 55, 6], 'plant', [28, 1.49, '1 oz packet'], { staple: true }),
  i('curry-powder', 'Curry powder', SP, 'g', [325, 14, 56, 14], 'plant', [57, 3.99, '2 oz jar'], { staple: true }),
  i('oregano', 'Dried oregano', SP, 'g', [265, 9, 69, 4], 'plant', [21, 2.49, '0.75 oz jar'], { staple: true }),
  i('cardamom', 'Green cardamom', SP, 'g', [311, 11, 68, 6.7], 'plant', [28, 6.99, '1 oz jar'], { desi: [100, 5.99, '3.5 oz'], staple: true }),

  // ── Frozen ────────────────────────────────────────────────
  i('peas', 'Green peas, frozen', FZ, 'g', [77, 5.2, 13.6, 0.4], 'plant', [454, 1.99, '16 oz bag'], { bulk: [2268, 6.99, '5 lb'], desi: [907, 2.99, '2 lb'], gPerCup: 134 }),
  i('mixed-veg', 'Mixed vegetables, frozen', FZ, 'g', [64, 3, 13, 0.5], 'plant', [454, 1.79, '16 oz bag'], { bulk: [2500, 8.99, '5.5 lb'], gPerCup: 135 }),
  i('corn', 'Sweet corn, frozen', FZ, 'g', [88, 3.3, 19, 1.4], 'plant', [454, 1.79, '16 oz bag'], { bulk: [2268, 6.49, '5 lb'], gPerCup: 145 }),
  i('frozen-okra', 'Cut okra, frozen', FZ, 'g', [30, 1.8, 6, 0.3], 'plant', [340, 2.49, '12 oz bag'], { desi: [907, 3.49, '2 lb'], gPerCup: 100 }),
  i('frozen-spinach', 'Chopped spinach, frozen', FZ, 'g', [29, 4, 4, 0.6], 'plant', [283, 1.79, '10 oz box'], { desi: [907, 3.49, '2 lb'], gPerCup: 156 }),
  i('edamame', 'Shelled edamame, frozen', FZ, 'g', [121, 12, 9, 5], 'plant', [340, 2.99, '12 oz bag'], { bulk: [1814, 10.99, '4 lb'], gPerCup: 155 }),
  i('cauli-rice', 'Cauliflower rice, frozen', FZ, 'g', [25, 2, 5, 0.3], 'plant', [340, 2.99, '12 oz bag'], { bulk: [1814, 8.99, '4 lb'], gPerCup: 107 }),
  i('frozen-broccoli', 'Broccoli florets, frozen', FZ, 'g', [35, 2.8, 7, 0.4], 'plant', [340, 1.99, '12 oz bag'], { bulk: [2268, 8.99, '5 lb'], gPerCup: 91 }),
  i('stir-fry-veg', 'Stir-fry vegetable mix, frozen', FZ, 'g', [35, 2, 7, 0.3], 'plant', [454, 2.49, '16 oz bag'], { bulk: [2268, 9.49, '5 lb'], gPerCup: 120 }),

  // ── Added for the expanded library ────────────────────────
  i('butternut', 'Butternut squash', PR, 'g', [45, 1, 12, 0.1], 'plant', [1130, 3.49, 'each (~2.5 lb)'], { bulk: [1360, 4.49, '3 lb cubed'], gPerCup: 140 }),
  i('celery', 'Celery', PR, 'g', [16, 0.7, 3, 0.2], 'plant', [450, 1.99, 'bunch'], { gPerCup: 101 }),
  i('parsley', 'Flat-leaf parsley', PR, 'g', [36, 3, 6, 0.8], 'plant', [60, 0.99, 'bunch'], { gPerCup: 60 }),
  i('basil', 'Fresh basil', PR, 'g', [23, 3.2, 2.7, 0.6], 'plant', [21, 2.49, '0.75 oz pack'], { gPerCup: 21 }),
  i('chicken-sausage', 'Chicken sausage, fully cooked', MS, 'g', [160, 14, 3, 10], 'poultry', [340, 5.49, '12 oz pack'], { bulk: [1360, 14.99, '3 lb'] }),
  i('turkey-cutlet', 'Turkey breast cutlets', MS, 'g', [111, 24, 0, 1], 'poultry', [454, 6.99, '1 lb'], {}),
  i('flank-steak', 'Flank steak', MS, 'g', [155, 21, 0, 7.5], 'meat', [680, 11.99, '1.5 lb'], { bulk: [1360, 19.99, '3 lb'] }),
  i('pork-chop', 'Boneless pork loin chops', MS, 'g', [143, 22, 0, 5.5], 'meat', [680, 6.49, '1.5 lb'], { bulk: [2040, 14.99, '4.5 lb'] }),
  i('salmon-can', 'Pink salmon, canned', CJ, 'g', [139, 23, 0, 5], 'fish', [418, 4.49, '14.75 oz can'], { bulk: [1260, 11.99, '6 × 7.5 oz'] }),
  i('sardines', 'Sardines in water, canned', CJ, 'g', [180, 25, 0, 9], 'fish', [106, 1.99, '3.75 oz tin'], {}),
  i('halloumi', 'Halloumi', DE, 'g', [321, 21, 2, 25], 'dairy', [227, 5.99, '8 oz block'], { bulk: [567, 11.99, '2 × 10 oz'] }),
  i('ricotta', 'Ricotta, part-skim', DE, 'g', [138, 11, 5, 8], 'dairy', [425, 3.99, '15 oz tub'], { gPerCup: 246 }),
  i('bulgur', 'Bulgur wheat', GR, 'g', [342, 12, 76, 1.3], 'plant', [454, 2.99, '1 lb'], { desi: [907, 3.49, '2 lb dalia'], gPerCup: 140 }),
  i('farro', 'Farro', GR, 'g', [340, 14, 72, 2.5], 'plant', [454, 3.99, '1 lb'], { gPerCup: 200 }),
  i('orzo', 'Orzo', GR, 'g', [371, 13, 75, 1.5], 'plant', [454, 1.99, '1 lb'], { gPerCup: 170 }),
  i('ww-pasta', 'Whole wheat pasta', GR, 'g', [348, 14, 72, 2.5], 'plant', [454, 1.79, '1 lb box'], { bulk: [2722, 8.99, '6 × 1 lb'], gPerCup: 100 }),
  i('udon', 'Udon noodles (fresh)', GR, 'g', [130, 3.5, 27, 0.5], 'plant', [600, 2.99, '3 × 200 g'], {}),
  i('panko', 'Panko breadcrumbs', GR, 'g', [395, 13, 78, 3.5], 'plant', [226, 2.49, '8 oz'], { gPerCup: 60 }),
  i('buns', 'Whole wheat buns (pav)', GR, 'each', [140, 5, 26, 2], 'plant', [8, 2.99, '8-pack'], { desi: [12, 2.99, '12 pav'] }),
  i('dosa-batter', 'Idli/dosa batter (refrigerated)', DE, 'g', [125, 4, 26, 0.5], 'plant', [907, 5.49, '32 oz tub'], { desi: [907, 3.99, '2 lb tub'], gPerCup: 250 }),
  i('pinto-beans-can', 'Pinto beans, canned', BL, 'g', [86, 5, 15, 0.5], 'plant', [425, 1.09, '15 oz can'], { bulk: [3400, 8.49, '8 cans'], gPerCup: 170 }),
  i('matki', 'Moth beans (matki)', BL, 'g', [343, 23, 62, 1.6], 'plant', [907, 4.49, '2 lb'], { desi: [907, 3.49, '2 lb'], gPerCup: 190 }),
  i('lobia', 'Black-eyed peas, dry (lobia)', BL, 'g', [336, 24, 60, 1.3], 'plant', [454, 1.99, '1 lb'], { desi: [907, 3.49, '2 lb'], gPerCup: 170 }),
  i('white-peas', 'Dried white peas (vatana)', BL, 'g', [341, 24, 60, 1.2], 'plant', [907, 3.49, '2 lb'], { desi: [907, 2.49, '2 lb'], gPerCup: 190 }),
  i('red-curry-paste', 'Thai red curry paste', CJ, 'g', [100, 2, 12, 5], 'plant', [113, 3.49, '4 oz jar'], {}),
  i('gochujang', 'Gochujang', CJ, 'g', [200, 4, 40, 2], 'plant', [500, 6.49, '17.6 oz tub'], {}),
  i('miso', 'White miso', CJ, 'g', [199, 12, 26, 6], 'plant', [400, 5.49, '14 oz tub'], {}),
  i('fish-sauce', 'Fish sauce', OC, 'ml', [35, 5, 3.6, 0], 'fish', [207, 3.49, '7 oz bottle'], { gPerCup: 240 }),
  i('hoisin', 'Hoisin sauce', CJ, 'g', [220, 3, 44, 3.4], 'plant', [240, 3.29, '8.5 oz jar'], {}),
  i('harissa', 'Harissa paste', CJ, 'g', [100, 2, 10, 6], 'plant', [283, 4.99, '10 oz jar'], {}),
  i('pesto', 'Basil pesto', CJ, 'g', [450, 5, 6, 45], 'dairy', [170, 3.99, '6 oz jar'], { bulk: [624, 9.99, '22 oz'] }),
  i('olives', 'Kalamata olives', CJ, 'g', [115, 0.8, 6, 11], 'plant', [170, 3.49, '6 oz jar'], {}),
  i('capers', 'Capers', CJ, 'g', [23, 2.4, 4.9, 0.9], 'plant', [100, 2.99, '3.5 oz jar'], {}),
  i('enchilada-sauce', 'Red enchilada sauce', CJ, 'g', [30, 1, 5, 1], 'plant', [283, 1.99, '10 oz can'], { gPerCup: 250 }),
  i('bbq-sauce', 'BBQ sauce', CJ, 'g', [170, 1, 40, 0.6], 'plant', [510, 2.49, '18 oz'], {}),
  i('chipotle', 'Chipotle peppers in adobo', CJ, 'g', [70, 1.5, 10, 3], 'plant', [198, 2.49, '7 oz can'], {}),
  i('sweet-chili', 'Sweet chili sauce', OC, 'g', [230, 0.5, 55, 0.5], 'plant', [296, 2.99, '10 oz'], { staple: true }),
  i('rice-vinegar', 'Rice vinegar', OC, 'ml', [18, 0, 0.5, 0], 'plant', [355, 2.99, '12 oz'], { staple: true, gPerCup: 240 }),
  i('jaggery', 'Jaggery (gur)', OC, 'g', [383, 0.4, 98, 0.1], 'plant', [454, 3.49, '1 lb'], { desi: [907, 2.99, '2 lb'] }),
  i('mustard-oil', 'Mustard oil', OC, 'ml', [810, 0, 0, 91], 'plant', [500, 5.99, '500 ml'], { desi: [1000, 6.99, '1 L'], staple: true, gPerCup: 218 }),
  i('coconut-dry', 'Desiccated coconut', NS, 'g', [660, 6.9, 24, 64], 'plant', [200, 3.49, '7 oz'], { desi: [400, 2.99, '14 oz'], gPerCup: 80 }),
  i('panch-phoron', 'Panch phoron (Bengali 5-spice)', SP, 'g', [370, 16, 40, 18], 'plant', [100, 3.99, '3.5 oz'], { desi: [100, 2.49, '3.5 oz'], staple: true }),
  i('rasam-powder', 'Rasam powder', SP, 'g', [330, 12, 50, 10], 'plant', [100, 3.99, '3.5 oz'], { desi: [100, 2.49, '3.5 oz'], staple: true }),
  i('goda-masala', 'Goda masala', SP, 'g', [380, 12, 45, 18], 'plant', [100, 4.49, '3.5 oz'], { desi: [100, 2.99, '3.5 oz'], staple: true }),
  i('pav-bhaji-masala', 'Pav bhaji masala', SP, 'g', [330, 12, 50, 10], 'plant', [100, 3.99, '3.5 oz'], { desi: [100, 2.49, '3.5 oz'], staple: true }),
  i('fennel-seeds', 'Fennel seeds', SP, 'g', [345, 16, 52, 15], 'plant', [57, 2.99, '2 oz'], { desi: [200, 2.49, '7 oz'], staple: true }),
  i('zaatar', 'Za’atar', SP, 'g', [300, 10, 40, 12], 'plant', [56, 4.99, '2 oz'], { staple: true }),
  i('cajun', 'Cajun seasoning', SP, 'g', [260, 10, 50, 6], 'plant', [70, 3.49, '2.5 oz'], { staple: true }),
  i('jerk', 'Jerk seasoning', SP, 'g', [270, 8, 55, 5], 'plant', [70, 3.49, '2.5 oz'], { staple: true }),
  i('berbere', 'Berbere spice', SP, 'g', [300, 12, 50, 8], 'plant', [56, 5.99, '2 oz'], { staple: true }),
];

export const INGREDIENT_BY_ID: Record<string, Ingredient> = Object.fromEntries(
  INGREDIENTS.map((x) => [x.id, x]),
);

export const AISLE_ORDER: Aisle[] = [PR, MS, DE, PP, GR, BL, CJ, NS, OC, SP, FZ];
