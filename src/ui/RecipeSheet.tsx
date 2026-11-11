import { recipeUsedCost, scaleRecipe } from '../engine/cost';
import { recipeNutrition } from '../engine/nutrition';
import { useApp } from '../state/store';
import type { Recipe } from '../types';
import { formatQty, money } from './format';
import { Sheet } from './kit';
import { APPLIANCES } from './prefs';
import { recipeEmoji, recipeTint } from './visuals';

export function RecipeSheet({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const app = useApp();
  const servings = app.settings.servings;
  const n = recipeNutrition(recipe, app.ingredients);
  const scaled = scaleRecipe(recipe, servings);
  const cost = recipeUsedCost(recipe, servings, app.priceOf, app.pantry);
  const appl = recipe.appliances.map((a) => APPLIANCES.find((x) => x.id === a)?.label ?? a).join(' · ');

  return (
    <Sheet
      onClose={onClose}
      title={recipe.title}
      sub={`${recipe.minutes} min · ${appl} · ${recipe.region ? `${recipe.region} Indian` : recipe.cuisine}`}
    >
      <div className="stack" style={{ gap: 18 }}>
        <div className="row">
          <span className="thumb" style={{ background: recipeTint(recipe) }} aria-hidden>{recipeEmoji(recipe)}</span>
          <p className="muted" style={{ margin: 0 }}>{recipe.blurb}</p>
        </div>

        <div>
          <div className="macro-grid">
            <div className="macro"><b>{n.protein}g</b><span>protein</span></div>
            <div className="macro"><b>{n.kcal}</b><span>kcal</span></div>
            <div className="macro"><b>{n.carbs}g</b><span>carbs</span></div>
            <div className="macro"><b>{n.fat}g</b><span>fat</span></div>
          </div>
          <p className="muted small" style={{ margin: '8px 4px 0' }}>
            Per serving · estimated from typical ingredient values, not lab-tested.
          </p>
        </div>

        <div className="card">
          <div className="row" style={{ marginBottom: 8 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800 }}>Ingredients</h3>
            <span className="spacer" />
            <span className="muted small">for {servings} · ≈ {money(cost / servings)}/serving</span>
          </div>
          {recipe.items.map((it) => {
            const ing = app.ingredients[it.ingredientId];
            if (!ing) return null;
            return (
              <div className="kv" key={it.ingredientId}>
                <span>
                  {ing.name}
                  {it.note && <span className="muted small"> · {it.note}</span>}
                  {app.pantry.has(ing.id) && <span className="tag" style={{ marginLeft: 6 }}>Have it</span>}
                </span>
                <span className="num" style={{ fontWeight: 700 }}>{formatQty(scaled.get(it.ingredientId) ?? 0, ing.unit)}</span>
              </div>
            );
          })}
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
    </Sheet>
  );
}
