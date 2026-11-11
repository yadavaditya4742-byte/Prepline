// Core data model for Prepline. All data lives on the device.

/** Base unit an ingredient is measured in. Recipes and packs use the same unit. */
export type Unit = 'g' | 'ml' | 'each';

export type Aisle =
  | 'Produce'
  | 'Meat & Seafood'
  | 'Dairy & Eggs'
  | 'Tofu & Plant Protein'
  | 'Grains, Pasta & Bread'
  | 'Beans & Lentils'
  | 'Canned & Jarred'
  | 'Nuts & Seeds'
  | 'Oils & Condiments'
  | 'Spices'
  | 'Frozen';

/**
 * What kind of food an ingredient is, for diet filtering.
 * plant = vegan, dairy/egg = vegetarian variants, fish/poultry/meat = non-veg.
 */
export type DietTag = 'plant' | 'dairy' | 'egg' | 'fish' | 'poultry' | 'meat';

/** Estimated nutrition per 100 g / 100 ml, or per piece for `each` items. */
export interface Nutrition {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Pack {
  /** Pack size in the ingredient's base unit. */
  size: number;
  /** Shelf price in USD. */
  price: number;
  /** Human label, e.g. "3 lb bag". */
  label: string;
}

export interface Ingredient {
  id: string;
  name: string;
  aisle: Aisle;
  unit: Unit;
  nutrition: Nutrition;
  diet: DietTag;
  /** Typical regular-price pack at a mainstream US supermarket (seed estimate). */
  base: Pack;
  /** Warehouse-club bulk pack, when one is common. */
  bulk?: Pack;
  /** Indian/South Asian grocery pack, when notably different. */
  desi?: Pack;
  /** Pantry staple (oil, salt, spices): starts as "I already have this". */
  staple?: boolean;
  /** Grams per cup, used by the recipe-text parser for volume conversions. */
  gPerCup?: number;
  /** True for ingredients the user added. */
  custom?: boolean;
}

export type StoreId =
  | 'kroger'
  | 'walmart'
  | 'costco'
  | 'target'
  | 'aldi'
  | 'traderjoes'
  | 'wholefoods'
  | 'safeway'
  | 'publix'
  | 'heb'
  | 'desi';

export interface Store {
  id: StoreId;
  name: string;
  /** Short note shown under the name. */
  note: string;
  /** Whether a free official price feed exists (Kroger Products API). */
  liveCapable: boolean;
  /** Price multiplier vs. base, per aisle (missing aisles use `default`). */
  index: Partial<Record<Aisle, number>> & { default: number };
  /** Use the ingredient's bulk pack when it has one. */
  usesBulk?: boolean;
  /** Use the ingredient's desi pack when it has one. */
  usesDesi?: boolean;
}

/**
 * seed      = our estimate
 * live      = from a store's official API (Kroger, Walmart)
 * community = shopper-reported receipt prices (Open Prices / Open Food Facts)
 * user      = the user's own edit
 */
export type PriceSource = 'seed' | 'live' | 'community' | 'user';

export interface ResolvedPrice extends Pack {
  source: PriceSource;
  /** Seed estimate nudged by the live Kroger price for the same item. */
  tracksLive?: boolean;
  /** Where a live/community price came from, e.g. "Kroger API", "Walmart API", "Open Prices". */
  sourceName?: string;
  /** Number of shopper reports behind a community price. */
  reports?: number;
  /** ISO date for live/user prices. */
  updatedAt?: string;
}

/** A user's edit of a price, keyed by `${storeId}:${ingredientId}`. */
export interface PriceOverride {
  key: string;
  storeId: StoreId;
  ingredientId: string;
  size: number;
  price: number;
  label: string;
  updatedAt: string;
}

/** Live prices fetched by the scheduled job (public/prices/live.json). */
/** A live price file for one store (public/prices/<storeId>.json or the prices API). */
export interface LivePriceFile {
  /** Which store this file prices. Defaults to 'kroger' for older files. */
  storeId?: StoreId;
  source: string;
  fetchedAt: string;
  locationId?: string;
  locationName?: string;
  prices: Record<string, { size: number; price: number; label: string; productName?: string }>;
}

export type Appliance =
  | 'stovetop'
  | 'oven'
  | 'pressure-cooker'
  | 'air-fryer'
  | 'blender'
  | 'grill'
  | 'microwave';

export type Cuisine =
  | 'Indian'
  | 'Mediterranean'
  | 'Mexican'
  | 'East Asian'
  | 'Southeast Asian'
  | 'Middle Eastern'
  | 'American'
  | 'Italian'
  | 'Caribbean'
  | 'African';

export type IndianRegion = 'North' | 'South' | 'East' | 'West';

export interface RecipeItem {
  ingredientId: string;
  /** Quantity in the ingredient's base unit, for `servings` servings. */
  qty: number;
  note?: string;
}

export interface Recipe {
  id: string;
  title: string;
  cuisine: Cuisine;
  region?: IndianRegion;
  /** Servings the quantities are written for. */
  servings: number;
  /** Total active + passive time. */
  minutes: number;
  appliances: Appliance[];
  items: RecipeItem[];
  steps: string[];
  blurb?: string;
  /** True for recipes the user created or imported. */
  user?: boolean;
}

export type DietPreset =
  | 'vegan'
  | 'vegetarian'
  | 'eggetarian'
  | 'pescatarian'
  | 'chicken-fish'
  | 'everything';

export type Priority = 'protein' | 'cost' | 'fast' | 'balanced';

export interface Settings {
  onboarded: boolean;
  weeklyBudget: number;
  storeId: StoreId;
  diet: DietPreset;
  servings: number;
  appliances: Appliance[];
  /** Ingredient ids the user never wants. */
  excludes: string[];
  priority: Priority;
  /** Days that get a dinner, 0 = Monday … 6 = Sunday. */
  cookDays: number[];
  theme: 'system' | 'light' | 'dark';
  /** US ZIP, used to find the nearest Kroger-family store (stays on device + your price server). */
  zip: string;
  /** Base URL of your Prepline price server (Cloudflare Worker). Empty = use the build default. */
  pricesApi: string;
  /** Show store logos (off by default in app-store builds). */
  showLogos: boolean;
}

export interface PlanDay {
  /** null = no dinner planned this day. */
  recipeId: string | null;
  locked: boolean;
}

export interface WeekPlan {
  /** ISO date of the Monday this plan starts. */
  weekStart: string;
  days: PlanDay[];
  createdAt: string;
}

/** Shopper-reported prices per chain, built daily from Open Prices (public/prices/community.json). */
export interface CommunityPriceFile {
  source: string;
  license: string;
  fetchedAt: string;
  /** storeId → ingredientId → median price per base unit. */
  stores: Partial<Record<StoreId, Record<string, { unitPrice: number; reports: number; lastDate: string }>>>;
}
