import type { Appliance, Cuisine, IndianRegion, Recipe } from '../../types';

type Item = [ingredientId: string, qty: number, note?: string];

interface Def {
  id: string;
  title: string;
  cuisine: Cuisine;
  region?: IndianRegion;
  minutes: number;
  appliances?: Appliance[];
  servings?: number;
  blurb?: string;
  items: Item[];
  steps: string[];
}

/** Compact recipe builder. Quantities are for `servings` (default 4). */
export function r(d: Def): Recipe {
  return {
    id: d.id,
    title: d.title,
    cuisine: d.cuisine,
    ...(d.region && { region: d.region }),
    servings: d.servings ?? 4,
    minutes: d.minutes,
    appliances: d.appliances ?? ['stovetop'],
    items: d.items.map(([ingredientId, qty, note]) => ({
      ingredientId,
      qty,
      ...(note && { note }),
    })),
    steps: d.steps,
    ...(d.blurb && { blurb: d.blurb }),
  };
}
