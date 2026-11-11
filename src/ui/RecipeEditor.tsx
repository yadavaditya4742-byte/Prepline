import { useMemo, useState } from 'react';
import { AISLE_ORDER } from '../data';
import { recipeUsedCost } from '../engine/cost';
import { recipeNutrition } from '../engine/nutrition';
import { editorDefault, editorUnits, toBaseQty, type RecipeUnit } from '../engine/units';
import { getRecipeImporter } from '../import/aiImport';
import { parseRecipeText, type ParsedRecipe } from '../import/parseRecipe';
import { useApp } from '../state/store';
import type { Appliance, Cuisine, Ingredient, IndianRegion, Recipe } from '../types';
import { money } from './format';
import { IconClose, IconPlus } from './icons';
import { Sheet, Stepper } from './kit';
import { APPLIANCES } from './prefs';
import { Chip } from './kit';

const CUISINES: Cuisine[] = ['Indian', 'Mediterranean', 'Middle Eastern', 'Mexican', 'East Asian', 'Southeast Asian', 'Italian', 'American', 'Caribbean', 'African'];

interface Row {
  key: string;
  ingredientId: string;
  amount: string;
  unit: RecipeUnit;
  note: string;
  /** Original pasted text, when imported. */
  source?: string;
}

/** Editor state. Built from an existing recipe, a parsed paste, or empty. */
export interface Draft {
  id?: string;
  title: string;
  cuisine: Cuisine;
  region?: IndianRegion;
  minutes: number;
  servings: number;
  appliances: Appliance[];
  blurb: string;
  rows: Row[];
  steps: string;
  fromImport?: boolean;
}

let rowSeq = 0;
const newKey = () => `row-${++rowSeq}`;

function isRecipe(x: Draft | Recipe): x is Recipe {
  return Array.isArray((x as Recipe).items);
}

export function draftFromRecipe(r: Recipe, ingredients: Record<string, Ingredient>): Draft {
  return {
    id: r.id || undefined,
    title: r.title,
    cuisine: r.cuisine,
    region: r.region,
    minutes: r.minutes,
    servings: r.servings,
    appliances: r.appliances,
    blurb: r.blurb ?? '',
    rows: r.items.map((it) => {
      const ing = ingredients[it.ingredientId];
      const d = ing ? editorDefault(ing, it.qty) : { amount: it.qty, unit: 'g' as RecipeUnit };
      return { key: newKey(), ingredientId: it.ingredientId, amount: String(d.amount), unit: d.unit, note: it.note ?? '' };
    }),
    steps: r.steps.join('\n'),
  };
}

export function draftFromParsed(p: ParsedRecipe, ingredients: Record<string, Ingredient>): Draft {
  return {
    title: p.title,
    cuisine: 'Indian',
    minutes: p.minutes ?? 30,
    servings: p.servings ?? 4,
    appliances: ['stovetop'],
    blurb: '',
    rows: p.lines.map((l) => {
      const ing = l.ingredientId ? ingredients[l.ingredientId] : undefined;
      const units = ing ? editorUnits(ing) : [];
      const keepUnit = ing && l.unit && units.includes(l.unit) && l.amount !== null;
      const d = ing ? (keepUnit ? { amount: l.amount!, unit: l.unit! } : editorDefault(ing, l.qty)) : { amount: l.amount ?? 0, unit: 'g' as RecipeUnit };
      return { key: newKey(), ingredientId: l.ingredientId ?? '', amount: String(Math.round(d.amount * 100) / 100), unit: d.unit, note: l.note ?? '', source: l.raw };
    }),
    steps: p.steps.join('\n'),
    fromImport: true,
  };
}

function emptyDraft(): Draft {
  return { title: '', cuisine: 'Indian', minutes: 30, servings: 4, appliances: ['stovetop'], blurb: '', rows: [{ key: newKey(), ingredientId: '', amount: '', unit: 'g', note: '' }], steps: '' };
}

/** Build a Recipe from the draft (ignores incomplete rows). */
export function recipeFromDraft(d: Draft, ingredients: Record<string, Ingredient>, id: string): Recipe {
  const items = d.rows
    .filter((r) => r.ingredientId && ingredients[r.ingredientId] && Number(r.amount) > 0)
    .map((r) => ({
      ingredientId: r.ingredientId,
      qty: Math.round(toBaseQty(ingredients[r.ingredientId], Number(r.amount), r.unit).qty * 10) / 10,
      ...(r.note.trim() && { note: r.note.trim() }),
    }));
  return {
    id,
    title: d.title.trim(),
    cuisine: d.cuisine,
    ...(d.cuisine === 'Indian' && d.region && { region: d.region }),
    servings: d.servings,
    minutes: d.minutes,
    appliances: d.appliances.length ? d.appliances : ['stovetop'],
    items,
    steps: d.steps.split('\n').map((s) => s.trim()).filter(Boolean),
    ...(d.blurb.trim() && { blurb: d.blurb.trim() }),
    user: true,
  };
}

function IngredientSelect({ value, onChange, ingredients }: { value: string; onChange: (id: string) => void; ingredients: Record<string, Ingredient> }) {
  const groups = useMemo(() => {
    const all = Object.values(ingredients).sort((a, b) => a.name.localeCompare(b.name));
    return AISLE_ORDER.map((a) => [a, all.filter((i) => i.aisle === a)] as const).filter(([, l]) => l.length);
  }, [ingredients]);
  return (
    <select className={`select${value ? '' : ' warn'}`} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Ingredient">
      <option value="">Choose ingredient…</option>
      {groups.map(([aisle, list]) => (
        <optgroup key={aisle} label={aisle}>
          {list.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function RecipeEditor({ initial, onClose }: { initial: Draft | Recipe; onClose: () => void }) {
  const app = useApp();
  const [d, setD] = useState<Draft>(() =>
    isRecipe(initial) ? draftFromRecipe(initial, app.ingredients) : initial.rows ? initial : emptyDraft(),
  );
  const [err, setErr] = useState<string | null>(null);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const setRow = (key: string, patch: Partial<Row>) => setD((x) => ({ ...x, rows: x.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }));

  const preview = useMemo(() => recipeFromDraft(d, app.ingredients, d.id ?? 'preview'), [d, app.ingredients]);
  const n = recipeNutrition(preview, app.ingredients);
  const cost = preview.items.length ? recipeUsedCost(preview, preview.servings, app.priceOf, app.pantry) / preview.servings : 0;
  const unmatched = d.rows.filter((r) => !r.ingredientId).length;
  const editingExisting = Boolean(d.id);

  const save = async () => {
    const r = recipeFromDraft(d, app.ingredients, d.id ?? `my-${d.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-${Math.random().toString(36).slice(2, 6)}`);
    if (!r.title) return setErr('Give it a name.');
    if (!r.items.length) return setErr('Add at least one ingredient with an amount.');
    if (!r.steps.length) return setErr('Add at least one step.');
    await app.saveRecipe(r);
    onClose();
  };

  return (
    <Sheet onClose={onClose} title={editingExisting ? 'Edit recipe' : d.fromImport ? 'Check your import' : 'New recipe'} sub={d.fromImport ? 'We matched what we could. Fix anything highlighted, then save.' : 'Priced from your ingredient table as you type.'}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="card stack">
          <label className="field">
            <span>Name</span>
            <input className="input" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Mom’s rajma" />
          </label>
          <div className="row" style={{ gap: 8 }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Cuisine</span>
              <select className="select" value={d.cuisine} onChange={(e) => set({ cuisine: e.target.value as Cuisine })}>
                {CUISINES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            {d.cuisine === 'Indian' && (
              <label className="field" style={{ flex: 1 }}>
                <span>Region</span>
                <select className="select" value={d.region ?? ''} onChange={(e) => set({ region: (e.target.value || undefined) as IndianRegion | undefined })}>
                  <option value="">—</option>
                  {(['North', 'South', 'East', 'West'] as const).map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
            )}
          </div>
          <div className="row" style={{ gap: 16, justifyContent: 'space-between' }}>
            <div className="field">
              <span>Minutes</span>
              <input className="input" inputMode="numeric" value={d.minutes} onChange={(e) => set({ minutes: Math.max(1, Number(e.target.value) || 0) })} style={{ width: 96 }} />
            </div>
            <div className="field">
              <span>Serves</span>
              <Stepper label="servings" value={d.servings} min={1} max={12} onChange={(servings) => set({ servings })} />
            </div>
          </div>
          <div className="field">
            <span>Needs</span>
            <div className="chips">
              {APPLIANCES.map((a) => (
                <Chip key={a.id} small selected={d.appliances.includes(a.id)} onClick={() => set({ appliances: d.appliances.includes(a.id) ? d.appliances.filter((x) => x !== a.id) : [...d.appliances, a.id] })}>
                  {a.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {/* Live summary */}
        <div className="hero" style={{ padding: 16 }}>
          <div className="stats" style={{ marginTop: 0, gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat"><b>{n.protein}g</b><span>protein*</span></div>
            <div className="stat"><b>{n.kcal}</b><span>kcal*</span></div>
            <div className="stat"><b>{n.carbs}/{n.fat}</b><span>carb/fat g*</span></div>
            <div className="stat"><b>{cost ? money(cost) : '–'}</b><span>per serving</span></div>
          </div>
          <p className="small muted" style={{ margin: '10px 2px 0' }}>*Per serving, estimated. {n.protein < 25 && preview.items.length > 0 ? 'Under 25 g protein — fine for your own recipes.' : ''}</p>
        </div>

        <div>
          <div className="section-head">
            <h2 style={{ fontSize: 17 }}>Ingredients</h2>
            {unmatched > 0 && <span className="small" style={{ color: 'var(--warn)', fontWeight: 700 }}>{unmatched} to match</span>}
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {d.rows.map((row) => {
              const ing = row.ingredientId ? app.ingredients[row.ingredientId] : undefined;
              const units = ing ? editorUnits(ing) : (['g'] as RecipeUnit[]);
              return (
                <div key={row.key} className={`card ing-row${row.ingredientId ? '' : ' unmatched'}`}>
                  {row.source && <div className="muted small" style={{ marginBottom: 6 }}>From: “{row.source}”</div>}
                  <div className="row" style={{ gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <IngredientSelect
                        value={row.ingredientId}
                        ingredients={app.ingredients}
                        onChange={(id) => {
                          const next = app.ingredients[id];
                          const u = next ? editorUnits(next) : [];
                          setRow(row.key, { ingredientId: id, unit: u.includes(row.unit) ? row.unit : u[0] ?? 'g' });
                        }}
                      />
                    </div>
                    <button className="icon-btn sm" aria-label="Remove ingredient" onClick={() => set({ rows: d.rows.filter((r) => r.key !== row.key) })}>
                      <IconClose />
                    </button>
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 6 }}>
                    <input className="input" inputMode="decimal" placeholder="Amount" value={row.amount} onChange={(e) => setRow(row.key, { amount: e.target.value })} style={{ width: 90 }} aria-label="Amount" />
                    <select className="select" value={row.unit} onChange={(e) => setRow(row.key, { unit: e.target.value as RecipeUnit })} style={{ width: 96 }} aria-label="Unit">
                      {units.map((u) => <option key={u} value={u}>{u === 'ct' ? 'count' : u}</option>)}
                    </select>
                    <input className="input" placeholder="Note (optional)" value={row.note} onChange={(e) => setRow(row.key, { note: e.target.value })} style={{ flex: 1, minWidth: 0 }} aria-label="Note" />
                  </div>
                </div>
              );
            })}
            <button className="btn" onClick={() => set({ rows: [...d.rows, { key: newKey(), ingredientId: '', amount: '', unit: 'g', note: '' }] })}>
              <IconPlus /> Add ingredient
            </button>
            <p className="muted small" style={{ margin: '0 4px' }}>Missing something? Add it in Prices → Add, then pick it here.</p>
          </div>
        </div>

        <label className="field">
          <span>Steps (one per line)</span>
          <textarea className="input textarea" rows={7} value={d.steps} onChange={(e) => set({ steps: e.target.value })} placeholder={'Heat the oil…\nAdd the onions…'} />
        </label>
        <label className="field">
          <span>Short description <span className="muted">(optional)</span></span>
          <input className="input" value={d.blurb} onChange={(e) => set({ blurb: e.target.value })} />
        </label>

        {err && <div className="notice" style={{ color: 'var(--warn)' }}>{err}</div>}
        <button className="btn btn-primary" onClick={save}>Save recipe</button>
        {editingExisting && (
          <button
            className="btn btn-text"
            style={{ color: 'var(--warn)' }}
            onClick={async () => {
              if (!confirm(`Delete “${d.title}”?`)) return;
              await app.deleteRecipe(d.id!);
              onClose();
            }}
          >
            Delete recipe
          </button>
        )}
      </div>
    </Sheet>
  );
}

const SAMPLE = `Weeknight Chana Masala
Serves 4
Ingredients
2 (15 oz) cans chickpeas, drained
1 large onion, chopped
3 cloves garlic
1 tbsp oil
1 tsp garam masala
Instructions
1. Cook the onion in oil until golden.
2. Add garlic, spices and chickpeas; simmer 15 minutes.`;

export function ImportSheet({ onClose, onParsed }: { onClose: () => void; onParsed: (d: Draft) => void }) {
  const app = useApp();
  const [text, setText] = useState('');
  const ai = getRecipeImporter();
  const list = Object.values(app.ingredients);

  return (
    <Sheet onClose={onClose} title="Import a recipe" sub="Paste the recipe text. We’ll read the ingredients and steps for you to check.">
      <div className="stack" style={{ gap: 14 }}>
        <textarea className="input textarea" rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder={SAMPLE} aria-label="Recipe text" />
        <button className="btn btn-primary" disabled={text.trim().length < 10} onClick={() => onParsed(draftFromParsed(parseRecipeText(text, list), app.ingredients))}>
          Read ingredients
        </button>
        <button className="btn btn-text" onClick={() => setText(SAMPLE)}>Try an example</button>

        {/* Extension point: see src/import/aiImport.ts */}
        <div className="card stack" style={{ gap: 8 }}>
          <b>From a link or photo</b>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" style={{ flex: 1 }} disabled={!ai?.fromUrl}>🔗 From a link</button>
            <button className="btn" style={{ flex: 1 }} disabled={!ai?.fromImage}>📷 From a photo</button>
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            {ai ? 'Uses your connected AI service.' : 'These need an AI service, which isn’t set up (Prepline stays free). Text import above works offline.'}
          </p>
        </div>
      </div>
    </Sheet>
  );
}
