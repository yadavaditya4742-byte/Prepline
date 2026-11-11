import { useEffect, useMemo, useRef, useState } from 'react';
import { LIBRARY_RECIPES, STORE_BY_ID } from '../data';
import { importBackup } from '../db/db';
import { makePriceFn, recipeUsedCost } from '../engine/cost';
import { cheapestWeek } from '../engine/plan';
import { resolvePrice } from '../engine/prices';
import { useApp } from '../state/store';
import type { Settings } from '../types';
import { money } from './format';
import { IconArrow, IconBack } from './icons';
import { Range, Stepper } from './kit';
import { DaysPicker, DietPicker, KitchenPicker, PriorityPicker, SkipPicker, StorePicker } from './prefs';
import { recipeEmoji, recipeTint } from './visuals';

type StepId = 'store' | 'diet' | 'kitchen' | 'skip' | 'priority' | 'days' | 'budget';
const STEPS: StepId[] = ['store', 'diet', 'kitchen', 'skip', 'priority', 'days', 'budget'];

const COPY: Record<StepId, { title: string; lede: string }> = {
  store: { title: 'Where do you shop?', lede: 'Every price in your plan is worked out for this store.' },
  diet: { title: 'How do you eat?', lede: 'Pick the closest fit. You can widen it any time.' },
  kitchen: { title: 'What can you cook with?', lede: 'We’ll only suggest dinners your kitchen can handle.' },
  skip: { title: 'Anything off the menu?', lede: 'Allergies, dislikes, or just “not this week”.' },
  priority: { title: 'What matters most?', lede: 'This decides which dinners rise to the top.' },
  days: { title: 'Which nights are you cooking?', lede: 'Leave a night off for leftovers or takeout.' },
  budget: { title: 'Set your weekly budget', lede: 'Groceries for dinners only, for everyone you feed.' },
};

export function Onboarding() {
  const app = useApp();
  const [draft, setDraft] = useState<Settings>(app.settings);
  const [step, setStep] = useState(-1); // -1 = welcome
  const [building, setBuilding] = useState(false);
  const set = (patch: Partial<Settings>) => setDraft((d) => ({ ...d, ...patch }));

  if (building) return <Building draft={draft} />;
  if (step < 0) return <Welcome onStart={() => setStep(0)} />;

  const id = STEPS[step];
  const canContinue =
    (id === 'kitchen' && draft.appliances.length > 0) ||
    (id === 'days' && draft.cookDays.length > 0) ||
    !['kitchen', 'days'].includes(id);
  const last = step === STEPS.length - 1;

  return (
    <div className="onb">
      <div className="onb-top">
        <button className="icon-btn" aria-label="Back" onClick={() => setStep(step - 1)}>
          <IconBack />
        </button>
        <div className="onb-track" aria-hidden>
          <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <span className="onb-count">{step + 1}/{STEPS.length}</span>
      </div>

      <div className="onb-body" key={id}>
        <h1 className="display">{COPY[id].title}</h1>
        <p className="lede">{COPY[id].lede}</p>
        <div style={{ marginTop: 26 }}>
          {id === 'store' && <StorePicker value={draft.storeId} onChange={(storeId) => set({ storeId })} />}
          {id === 'diet' && <DietPicker value={draft.diet} onChange={(diet) => set({ diet })} />}
          {id === 'kitchen' && <KitchenPicker value={draft.appliances} onChange={(appliances) => set({ appliances })} />}
          {id === 'skip' && <SkipPicker value={draft.excludes} onChange={(excludes) => set({ excludes })} />}
          {id === 'priority' && <PriorityPicker value={draft.priority} onChange={(priority) => set({ priority })} />}
          {id === 'days' && (
            <>
              <DaysPicker value={draft.cookDays} onChange={(cookDays) => set({ cookDays })} />
              <p className="muted" style={{ textAlign: 'center', fontWeight: 700, marginTop: 18 }}>
                {draft.cookDays.length === 7 ? 'Every night' : `${draft.cookDays.length} night${draft.cookDays.length === 1 ? '' : 's'} a week`}
              </p>
            </>
          )}
          {id === 'budget' && <BudgetStep draft={draft} set={set} />}
        </div>
      </div>

      <div className="onb-foot">
        <button
          className="btn btn-primary"
          disabled={!canContinue}
          onClick={async () => {
            if (!last) return setStep(step + 1);
            setBuilding(true);
          }}
        >
          {last ? 'Build my week' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

function BudgetStep({ draft, set }: { draft: Settings; set: (p: Partial<Settings>) => void }) {
  const app = useApp();
  const floor = useMemo(() => {
    const priceOf = makePriceFn(app.ingredients, (i) => resolvePrice(draft.storeId, i, app.priceCtx));
    return cheapestWeek({ recipes: app.recipes, ingredients: app.ingredients, settings: draft, priceOf, pantry: app.pantry });
  }, [app.ingredients, app.recipes, app.priceCtx, app.pantry, draft]);
  const perPlate = draft.weeklyBudget / Math.max(1, draft.servings * draft.cookDays.length);
  const tooLow = floor > 0 && draft.weeklyBudget < floor;

  return (
    <>
      <div className="big-figure">
        <div className="value num">
          <sup>$</sup>
          {draft.weeklyBudget}
        </div>
        <div className="unit">per week · about {money(perPlate)} a plate</div>
      </div>
      <Range label="Weekly budget" min={20} max={300} step={5} value={draft.weeklyBudget} onChange={(weeklyBudget) => set({ weeklyBudget })} />
      <div className="row muted small" style={{ justifyContent: 'space-between', marginTop: 8, fontWeight: 700 }}>
        <span>$20</span>
        <span>$300</span>
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <div className="row">
          <span className="option-card" style={{ border: 0, padding: 0, width: 'auto' }}>
            <span className="emoji" style={{ background: 'var(--accent)' }} aria-hidden>🍽️</span>
          </span>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 17 }}>Cooking for</b>
            <div className="muted small">{draft.servings === 1 ? 'Just me' : `${draft.servings} people`}</div>
          </div>
          <Stepper label="people" value={draft.servings} min={1} max={8} onChange={(servings) => set({ servings })} />
        </div>
      </div>

      <div className="notice" style={{ marginTop: 14 }}>
        <span className="emoji">{tooLow ? '⚠️' : '💡'}</span>
        <span>
          {tooLow ? (
            <>That’s under the cheapest week we can build with your choices (<b>{money(floor)}</b>). We’ll get as close as we can.</>
          ) : (
            <>The cheapest week we can build at {STORE_BY_ID[draft.storeId].name} with your choices is about <b>{money(floor)}</b>.</>
          )}
        </span>
      </div>
    </>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  const app = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const samples = useMemo(() => {
    const priceOf = makePriceFn(app.ingredients, (i) => resolvePrice('kroger', i, app.priceCtx));
    return ['tandoori-chicken-tray', 'peanut-tofu-soba', 'kerala-shrimp-curry']
      .map((id) => LIBRARY_RECIPES.find((r) => r.id === id)!)
      .map((r) => ({ r, pp: recipeUsedCost(r, r.servings, priceOf, app.pantry) / r.servings }));
  }, [app.ingredients, app.priceCtx, app.pantry]);
  const spots = [
    { left: '4%', top: '8%', delay: '0s' },
    { right: '2%', top: '38%', delay: '1.2s' },
    { left: '10%', top: '68%', delay: '2.1s' },
  ];

  return (
    <div className="onb">
      <div className="onb-top" style={{ justifyContent: 'center' }}>
        <span className="wordmark">
          Prepline<span className="dot" />
        </span>
      </div>
      <div className="onb-body" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="welcome-art" aria-hidden>
          <span className="orbit" style={{ left: '62%', top: '2%' }}>🌶️</span>
          <span className="orbit" style={{ left: '2%', top: '44%', animationDelay: '1s' }}>🥑</span>
          <span className="orbit" style={{ right: '6%', top: '78%', animationDelay: '2s' }}>🍋</span>
          {samples.map(({ r, pp }, i) => (
            <div key={r.id} className="float-card" style={{ ...spots[i], animationDelay: spots[i].delay }}>
              <span className="thumb" style={{ background: recipeTint(r) }}>{recipeEmoji(r)}</span>
              <span>
                <b>{r.title}</b>
                <span className="muted small">{r.minutes} min · {money(pp)}/plate</span>
              </span>
            </div>
          ))}
        </div>
        <h1 className="display" style={{ fontSize: 40, textAlign: 'center' }}>
          Dinner, sorted.
          <br />
          <span style={{ background: 'linear-gradient(transparent 62%, var(--accent) 62%)' }}>Budget, kept.</span>
        </h1>
        <p className="lede" style={{ textAlign: 'center' }}>
          High-protein dinners for the week, priced at your store, with one grocery list that adds up.
        </p>
      </div>
      <div className="onb-foot stack">
        <button className="btn btn-primary" onClick={onStart}>
          Build my week <IconArrow />
        </button>
        <button className="btn btn-text" onClick={() => fileRef.current?.click()}>
          Restore from a backup file
        </button>
        {err && <p className="small" style={{ color: 'var(--warn)', textAlign: 'center', margin: 0 }}>{err}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              await importBackup(JSON.parse(await f.text()));
              await app.reload();
            } catch (x) {
              setErr(x instanceof Error ? x.message : 'Could not read that file.');
            }
          }}
        />
      </div>
    </div>
  );
}

function Building({ draft }: { draft: Settings }) {
  const app = useApp();
  const [tick, setTick] = useState(0);
  const store = STORE_BY_ID[draft.storeId].name;
  const n = draft.cookDays.length;
  const lines = [
    `Pricing ${Object.keys(app.ingredients).length} ingredients at ${store}…`,
    `Filtering ${app.recipes.length} dinners for your kitchen…`,
    `Fitting ${n} dinner${n === 1 ? '' : 's'} under $${draft.weeklyBudget}…`,
    'Merging your grocery list…',
  ];
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const timer = setInterval(() => setTick((t) => t + 1), 330);
    const minWait = new Promise((r) => setTimeout(r, 2600));
    // Build the real plan, then hand over once the animation has had its moment.
    void Promise.all([new Promise((r) => setTimeout(r, 50)), minWait]).then(async () => {
      clearInterval(timer);
      await app.completeOnboarding(draft);
    });
    return () => clearInterval(timer);
  }, [app, draft]);

  const filled = Math.min(7, tick);
  const pct = Math.min(100, (tick / 8) * 100);
  const bowls = ['🍛', '🥗', '🍲', '🌮', '🍝', '🥢', '🍳'];

  return (
    <div className="build">
      <div>
        <h1 className="title" style={{ fontSize: 32 }}>Plating up your week</h1>
        <p className="lede">Doing the math so you don’t have to.</p>
        <div className="thali" aria-hidden>
          {bowls.map((b, i) => {
            const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
            return (
              <span key={i} className={`bowl${i < filled ? ' on' : ''}`} style={{ left: `${50 + 36 * Math.cos(a)}%`, top: `${50 + 36 * Math.sin(a)}%` }}>
                {b}
              </span>
            );
          })}
        </div>
        <div className="build-bar">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p style={{ fontWeight: 700, color: 'var(--ink-soft)', minHeight: 24 }} aria-live="polite">
          {lines[Math.min(lines.length - 1, Math.floor(tick / 2))]}
        </p>
      </div>
    </div>
  );
}
