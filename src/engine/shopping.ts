import type { Aisle, Ingredient } from '../types';
import type { CostLine, CostSummary } from './cost';

export interface ListGroup {
  aisle: Aisle;
  lines: CostLine[];
}

/** Group cost lines by aisle in store-walk order; pantry items are returned separately. */
export function groupByAisle(
  cost: CostSummary,
  ingredients: Record<string, Ingredient>,
  order: Aisle[],
): { groups: ListGroup[]; pantry: CostLine[] } {
  const byAisle = new Map<Aisle, CostLine[]>();
  const pantry: CostLine[] = [];
  for (const line of cost.lines) {
    const ing = ingredients[line.ingredientId];
    if (!ing) continue;
    if (line.inPantry) {
      pantry.push(line);
      continue;
    }
    const list = byAisle.get(ing.aisle) ?? [];
    list.push(line);
    byAisle.set(ing.aisle, list);
  }
  const name = (l: CostLine) => ingredients[l.ingredientId].name;
  const groups = order
    .filter((a) => byAisle.has(a))
    .map((aisle) => ({ aisle, lines: byAisle.get(aisle)!.sort((a, b) => name(a).localeCompare(name(b))) }));
  pantry.sort((a, b) => name(a).localeCompare(name(b)));
  return { groups, pantry };
}

/** Plain-text list for copy/share. */
export function listAsText(opts: {
  storeName: string;
  weekLabel: string;
  groups: ListGroup[];
  ingredients: Record<string, Ingredient>;
  total: number;
}): string {
  const out: string[] = [`Prepline grocery list: ${opts.storeName}, ${opts.weekLabel}`, `Estimated total $${opts.total.toFixed(2)}`, ''];
  for (const g of opts.groups) {
    out.push(g.aisle.toUpperCase());
    for (const l of g.lines) {
      const ing = opts.ingredients[l.ingredientId];
      const pack = l.price ? `${l.packs} × ${l.price.label}` : 'price unknown';
      out.push(`☐ ${ing.name} (${pack}${l.price ? `, $${l.bought.toFixed(2)}` : ''})`);
    }
    out.push('');
  }
  return out.join('\n').trimEnd();
}
