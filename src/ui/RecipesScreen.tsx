import { useMemo, useState } from 'react';
import { recipeUsedCost } from '../engine/cost';
import { fitsAppliances, fitsDiet, hasExcluded } from '../engine/diet';
import { recipeNutrition } from '../engine/nutrition';
import { useApp } from '../state/store';
import type { Cuisine, IndianRegion, Recipe } from '../types';
import { money } from './format';
import { IconPlus, IconSearch } from './icons';
import { Chip } from './kit';
import { ImportSheet, RecipeEditor, type Draft } from './RecipeEditor';
import { RecipeSheet } from './RecipeSheet';
import { recipeEmoji, recipeTags, recipeTint } from './visuals';

const CUISINES: Cuisine[] = ['Indian', 'Mediterranean', 'Middle Eastern', 'Mexican', 'East Asian', 'Southeast Asian', 'Italian', 'American', 'Caribbean', 'African'];
const REGIONS: (IndianRegion | 'All')[] = ['All', 'North', 'South', 'East', 'West'];
type Sort = 'protein' | 'cost' | 'time' | 'az';

export function RecipesScreen() {
  const app = useApp();
  const { settings } = app;
  const [q, setQ] = useState('');
  // Starts on the cuisines picked in Settings; tap several to mix.
  const [cuisines, setCuisines] = useState<Cuisine[]>(settings.cuisines);
  const [region, setRegion] = useState<IndianRegion | 'All'>('All');
  const [myDiet, setMyDiet] = useState(true);
  const [myKitchen, setMyKitchen] = useState(true);
  const [quick, setQuick] = useState(false);
  const [highP, setHighP] = useState(false);
  const [mine, setMine] = useState(false);
  const [sort, setSort] = useState<Sort>('protein');
  const [open, setOpen] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<Draft | Recipe | null>(null);
  const [importing, setImporting] = useState(false);

  const myCount = app.recipes.filter((r) => r.user).length;

  const enriched = useMemo(
    () =>
      app.recipes.map((r) => ({
        r,
        n: recipeNutrition(r, app.ingredients),
        pp: recipeUsedCost(r, settings.servings, app.priceOf, app.pantry) / settings.servings,
      })),
    [app.recipes, app.ingredients, app.priceOf, app.pantry, settings.servings],
  );

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = enriched.filter(({ r, n }) => {
      if (needle) {
        const hay = `${r.title} ${r.blurb ?? ''} ${r.cuisine} ${r.region ?? ''} ${r.items.map((i) => app.ingredients[i.ingredientId]?.name ?? '').join(' ')}`.toLowerCase();
        if (!needle.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      if (cuisines.length && !cuisines.includes(r.cuisine)) return false;
      if (r.cuisine === 'Indian' && region !== 'All' && r.region !== region) return false;
      if (myDiet && (!fitsDiet(r, settings.eats, app.ingredients) || hasExcluded(r, settings.excludes))) return false;
      if (myKitchen && !fitsAppliances(r, settings.appliances)) return false;
      if (quick && r.minutes > 30) return false;
      if (highP && n.protein < 40) return false;
      if (mine && !r.user) return false;
      return true;
    });
    out.sort((a, b) =>
      sort === 'protein' ? b.n.protein - a.n.protein : sort === 'cost' ? a.pp - b.pp : sort === 'time' ? a.r.minutes - b.r.minutes : a.r.title.localeCompare(b.r.title),
    );
    return out;
  }, [enriched, q, cuisines, region, myDiet, myKitchen, quick, highP, mine, sort, settings, app.ingredients]);

  return (
    <>
      <h1 className="display">Recipes</h1>
      <p className="lede">
        {app.recipes.length - myCount} Prepline dinners, each 25 g+ protein*{myCount ? ` · ${myCount} of yours` : ''}
      </p>

      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <button className="btn btn-dark" style={{ flex: 1 }} onClick={() => setEditing({} as Draft)}>
          <IconPlus /> New recipe
        </button>
        <button className="btn" style={{ flex: 1 }} onClick={() => setImporting(true)}>
          Import text
        </button>
      </div>

      <div className="search" style={{ marginTop: 12 }}>
        <IconSearch />
        <input className="input" placeholder="Search dishes or ingredients" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="scroll-chips" style={{ marginTop: 12 }}>
        <Chip small selected={cuisines.length === 0} onClick={() => { setCuisines([]); setRegion('All'); }}>
          All
        </Chip>
        {CUISINES.map((c) => (
          <Chip
            key={c}
            small
            selected={cuisines.includes(c)}
            onClick={() => {
              setCuisines(cuisines.includes(c) ? cuisines.filter((x) => x !== c) : [...cuisines, c]);
              if (c === 'Indian') setRegion('All');
            }}
          >
            {c}
          </Chip>
        ))}
      </div>
      {cuisines.includes('Indian') && (
        <div className="scroll-chips" style={{ marginTop: 8 }}>
          {REGIONS.map((g) => (
            <Chip key={g} small selected={region === g} onClick={() => setRegion(g)}>
              {g === 'All' ? 'All regions' : `${g} Indian`}
            </Chip>
          ))}
        </div>
      )}
      <div className="scroll-chips" style={{ marginTop: 8 }}>
        <Chip small selected={myDiet} onClick={() => setMyDiet(!myDiet)}>Fits my diet</Chip>
        <Chip small selected={myKitchen} onClick={() => setMyKitchen(!myKitchen)}>Fits my kitchen</Chip>
        <Chip small selected={quick} onClick={() => setQuick(!quick)}>≤ 30 min</Chip>
        <Chip small selected={highP} onClick={() => setHighP(!highP)}>40 g+ protein</Chip>
        <Chip small selected={mine} onClick={() => setMine(!mine)}>Mine{myCount ? ` (${myCount})` : ''}</Chip>
      </div>

      <div className="row" style={{ margin: '16px 4px 10px' }}>
        <span className="muted small" style={{ fontWeight: 700 }}>{list.length} recipes</span>
        <span className="spacer" />
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" style={{ width: 'auto', minHeight: 38, fontSize: 14 }}>
          <option value="protein">Most protein</option>
          <option value="cost">Lowest cost</option>
          <option value="time">Fastest</option>
          <option value="az">A–Z</option>
        </select>
      </div>

      {list.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="muted">No recipes match. Try turning off a filter.</p>
        </div>
      )}

      <div className="recipe-grid">
        {list.map(({ r, n, pp }) => (
          <button key={r.id} className="recipe-card" onClick={() => setOpen(r)}>
            <span className="thumb" style={{ background: recipeTint(r) }} aria-hidden>{recipeEmoji(r)}</span>
            <span className="meal-body">
              <span className="meal-tags">
                {r.user && <span className="tag user">Mine</span>}
                {recipeTags(r, app.ingredients, pp).slice(0, 2).map((t) => (
                  <span key={t.label} className={`tag${t.hot ? ' hot' : ''}`}>{t.label}</span>
                ))}
              </span>
              <span className="meal-title">{r.title}</span>
              <span className="muted small" style={{ fontWeight: 600 }}>
                {r.minutes} min · {n.protein} g protein · {n.kcal} kcal · {money(pp)}/plate
              </span>
            </span>
          </button>
        ))}
      </div>
      <p className="muted small" style={{ margin: '14px 4px 0' }}>*Nutrition is estimated from typical ingredient values.</p>

      {open && (
        <RecipeSheet
          recipe={open}
          onClose={() => setOpen(null)}
          onEdit={open.user ? () => { setEditing(open); setOpen(null); } : undefined}
          onDuplicate={() => {
            setEditing({ ...open, id: '', title: `${open.title} (my version)`, user: true });
            setOpen(null);
          }}
        />
      )}
      {editing && <RecipeEditor initial={editing} onClose={() => setEditing(null)} />}
      {importing && (
        <ImportSheet
          onClose={() => setImporting(false)}
          onParsed={(d) => {
            setImporting(false);
            setEditing(d);
          }}
        />
      )}
    </>
  );
}
