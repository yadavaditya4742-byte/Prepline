import { useState } from 'react';
import { recipeUsedCost, scaleRecipe, weekCost } from '../engine/cost';
import { recipeDiet, DIET_LABELS } from '../engine/diet';
import { recipeNutrition } from '../engine/nutrition';
import { DAY_SHORT } from '../engine/week';
import { useApp } from '../state/store';
import type { Recipe } from '../types';
import { formatQty, money } from './format';
import { Sheet, Stepper, useToast } from './kit';
import { APPLIANCES } from './prefs';
import { recipeEmoji, recipeTint } from './visuals';

export function RecipeSheet({
  recipe,
  onClose,
  onEdit,
  onDuplicate,
}: {
  recipe: Recipe;
  onClose: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
}) {
  const app = useApp();
  const [servings, setServings] = useState(app.settings.servings);
  const [picking, setPicking] = useState(false);
  const [toast, showToast] = useToast();
  const n = recipeNutrition(recipe, app.ingredients);
  const scaled = scaleRecipe(recipe, servings);
  const cost = recipeUsedCost(recipe, servings, app.priceOf, app.pantry);
  const appl = recipe.appliances.map((a) => APPLIANCES.find((x) => x.id === a)?.label ?? a).join(' · ');
  const days = app.plan?.days ?? Array.from({ length: 7 }, () => ({ recipeId: null, locked: false }));

  const addToDay = async (i: number) => {
    const next = days.map((d, j) => (j === i ? { recipeId: recipe.id, locked: d.locked } : d));
    await app.setPlanDays(next);
    const planned = next.map((d) => (d.recipeId ? app.recipeById.get(d.recipeId) : undefined)).filter((r): r is Recipe => !!r);
    const total = weekCost(planned, app.settings.servings, app.priceOf, app.pantry).bought;
    setPicking(false);
    showToast(`Added to ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]} · week now ${money(total)}`);
  };

  return (
    <Sheet
      onClose={onClose}
      title={recipe.title}
      sub={`${recipe.minutes} min · ${appl} · ${recipe.region ? `${recipe.region} Indian` : recipe.cuisine} · ${DIET_LABELS[recipeDiet(recipe, app.ingredients)]}`}
    >
      <div className="stack" style={{ gap: 18 }}>
        <div className="row">
          <span className="thumb" style={{ background: recipeTint(recipe) }} aria-hidden>{recipeEmoji(recipe)}</span>
          <p className="muted" style={{ margin: 0 }}>{recipe.blurb ?? (recipe.user ? 'One of your recipes.' : '')}</p>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-primary" style={{ minHeight: 50, fontSize: 16 }} onClick={() => setPicking(!picking)}>
            {picking ? 'Pick a day' : 'Add to this week'}
          </button>
          {onEdit && <button className="btn" style={{ minHeight: 50 }} onClick={onEdit}>Edit</button>}
          {!onEdit && onDuplicate && <button className="btn" style={{ minHeight: 50 }} onClick={onDuplicate}>Make my version</button>}
        </div>
        {picking && (
          <div className="days" role="group" aria-label="Choose a day">
            {DAY_SHORT.map((d, i) => {
              const current = days[i]?.recipeId ? app.recipeById.get(days[i].recipeId!) : null;
              return (
                <button key={i} className="day-pill" style={{ minHeight: 64 }} aria-pressed={current?.id === recipe.id} onClick={() => addToDay(i)} title={current ? `Replaces ${current.title}` : 'Empty'}>
                  {d}
                  <span className="small muted" style={{ fontWeight: 600, fontSize: 10 }}>{current ? '•' : '+'}</span>
                </button>
              );
            })}
          </div>
        )}

        <div>
          <div className="macro-grid">
            <div className="macro"><b>{n.protein}g</b><span>protein</span></div>
            <div className="macro"><b>{n.kcal}</b><span>kcal</span></div>
            <div className="macro"><b>{n.carbs}g</b><span>carbs</span></div>
            <div className="macro"><b>{n.fat}g</b><span>fat</span></div>
          </div>
          <p className="muted small" style={{ margin: '8px 4px 0' }}>Per serving · estimated from typical ingredient values, not lab-tested.</p>
        </div>

        <div className="card">
          <div className="row" style={{ marginBottom: 8 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800 }}>Ingredients</h3>
            <span className="spacer" />
            <Stepper label="servings" value={servings} min={1} max={12} onChange={setServings} />
          </div>
          <div className="muted small" style={{ marginBottom: 6 }}>
            For {servings} · ≈ {money(cost / servings)} per serving · {money(cost)} total*
          </div>
          {recipe.items.map((it) => {
            const ing = app.ingredients[it.ingredientId];
            if (!ing) return <div className="kv" key={it.ingredientId}><span className="muted">Missing ingredient ({it.ingredientId})</span></div>;
            return (
              <div className="kv" key={it.ingredientId}>
                <span>
                  {ing.name}
                  {it.note && <span className="muted small"> · {it.note}</span>}
                  {app.pantry.has(ing.id) && <span className="tag" style={{ marginLeft: 6 }}>Have it</span>}
                </span>
                <span className="num" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{formatQty(scaled.get(it.ingredientId) ?? 0, ing.unit)}</span>
              </div>
            );
          })}
          <p className="muted small" style={{ margin: '8px 0 0' }}>*Cost of what’s used, at your store. Pantry items count as $0.</p>
        </div>

        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 4px 12px' }}>Method</h3>
          <ol className="steps">
            {recipe.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {servings !== recipe.servings && (
            <p className="muted small" style={{ margin: '12px 4px 0' }}>
              Steps are written for {recipe.servings}; quantities above are scaled for {servings}.
            </p>
          )}
        </div>
      </div>
      {toast}
    </Sheet>
  );
}
