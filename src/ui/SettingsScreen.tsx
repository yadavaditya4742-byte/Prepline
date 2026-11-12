import { useRef, useState, type ReactNode } from 'react';
import { exportBackup, importBackup } from '../db/db';
import { isoDate } from '../engine/week';
import { defaultPricesApi } from '../state/livePrices';
import { useApp } from '../state/store';
import type { Settings } from '../types';
import { FeedbackSheet } from './FeedbackSheet';
import { money } from './format';
import { IconRefresh } from './icons';
import { Range, Segmented, Stepper, useToast } from './kit';
import { CuisinePicker, DaysPicker, DietPicker, KitchenPicker, PriorityPicker, SkipPicker, StorePicker } from './prefs';

function Block({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head" style={{ display: 'block' }}>
        <h2>{title}</h2>
        {sub && <div className="muted small" style={{ marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </section>
  );
}

export function SettingsScreen() {
  const app = useApp();
  const s = app.settings;
  const [dirty, setDirty] = useState(false);
  const [toast, showToast] = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState(false);

  const set = async (patch: Partial<Settings>, affectsPlan = true) => {
    await app.updateSettings(patch);
    if (affectsPlan) setDirty(true);
  };

  const download = async () => {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prepline-backup-${isoDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup saved');
  };

  return (
    <>
      <h1 className="display">Settings</h1>
      <p className="lede">Everything here stays on this device.</p>

      {dirty && (
        <div className="card" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 12, zIndex: 5 }}>
          <span style={{ flex: 1, fontWeight: 700 }}>Apply your changes to this week?</span>
          <button
            className="btn btn-dark"
            onClick={async () => {
              await app.regenerate();
              setDirty(false);
              showToast('Week rebuilt (locked dinners kept)');
            }}
          >
            <IconRefresh /> Rebuild
          </button>
        </div>
      )}

      <section className="card feedback-card" style={{ marginTop: 18 }}>
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 30 }} aria-hidden>💬</span>
          <div style={{ flex: 1 }}>
            <b>Help shape Prepline</b>
            <div className="muted small">Beta: everything is free while we test. Tell us what to fix or add.</div>
          </div>
        </div>
        <button className="btn btn-dark" style={{ width: '100%', marginTop: 12 }} onClick={() => setFeedback(true)}>
          Send feedback
        </button>
      </section>

      <Block title="Budget & people">
        <div className="card">
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="num" style={{ fontSize: 34 }}>{money(s.weeklyBudget)}</span>
            <span className="muted" style={{ fontWeight: 700 }}>per week</span>
          </div>
          <div style={{ margin: '14px 0 18px' }}>
            <Range label="Weekly budget" min={20} max={300} step={5} value={s.weeklyBudget} onChange={(weeklyBudget) => set({ weeklyBudget })} />
          </div>
          <div className="row">
            <div style={{ flex: 1 }}>
              <b>Cooking for</b>
              <div className="muted small">{s.servings === 1 ? 'Just me' : `${s.servings} people`}</div>
            </div>
            <Stepper label="people" value={s.servings} min={1} max={8} onChange={(servings) => set({ servings })} />
          </div>
        </div>
      </Block>

      <Block title="Store" sub="Prices and pack sizes follow this store.">
        <StorePicker value={s.storeId} onChange={(storeId) => set({ storeId })} />
      </Block>

      <Block title="What you eat" sub="Mix and match food groups.">
        <DietPicker value={s.eats} onChange={(eats) => set({ eats })} />
      </Block>

      <Block title="Cuisines" sub="Your weekly plan mixes the ones you pick.">
        <CuisinePicker value={s.cuisines} eats={s.eats} onChange={(cuisines) => set({ cuisines })} />
      </Block>

      <Block title="Planning priority">
        <PriorityPicker value={s.priority} onChange={(priority) => set({ priority })} />
      </Block>

      <Block title="Cooking nights">
        <DaysPicker value={s.cookDays} onChange={(cookDays) => cookDays.length && set({ cookDays })} />
      </Block>

      <Block title="Kitchen">
        <KitchenPicker value={s.appliances} onChange={(appliances) => appliances.length && set({ appliances })} />
      </Block>

      <Block title="Skip these" sub="Dinners containing these never get planned.">
        <SkipPicker value={s.excludes} onChange={(excludes) => set({ excludes })} />
      </Block>

      <Block title="Live prices" sub="Optional. Uses your own free price server; nothing is shared with Prepline.">
        <div className="card stack">
          <label className="field">
            <span>ZIP code (finds your nearest Kroger-family store)</span>
            <input className="input" inputMode="numeric" maxLength={5} placeholder="e.g. 45202" value={s.zip} onChange={(e) => set({ zip: e.target.value.replace(/\D/g, '').slice(0, 5) }, false)} />
          </label>
          <label className="field">
            <span>Price server URL {defaultPricesApi() && !s.pricesApi ? <span className="muted">(using the built-in one)</span> : null}</span>
            <input className="input" inputMode="url" placeholder={defaultPricesApi() || 'https://prepline-prices.yourname.workers.dev'} value={s.pricesApi} onChange={(e) => set({ pricesApi: e.target.value.trim() }, false)} />
          </label>
          <div className="notice">
            <span className="emoji">{app.liveState.status.server === 'ok' ? '✅' : app.liveState.status.server === 'error' ? '⚠️' : '📡'}</span>
            <span>
              {app.liveState.status.server === 'ok'
                ? `Connected.${app.live?.locationName ? ` Kroger prices from ${app.live.locationName}.` : ''}${app.liveState.liveByStore.walmart ? ' Walmart prices live.' : ''}`
                : app.liveState.status.server === 'error'
                  ? 'Couldn’t reach the price server (or it has no store keys yet). Using saved and estimated prices.'
                  : 'Not connected. You still get daily Kroger prices (if set up) and shopper-reported prices for every chain.'}
              {app.liveState.status.community ? ` · ${app.liveState.status.community} from Open Prices.` : ''}
            </span>
          </div>
        </div>
      </Block>

      <Block title="Appearance">
        <Segmented
          value={s.theme}
          onChange={(theme) => set({ theme }, false)}
          options={[
            { value: 'system', label: 'Auto' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
        <label className="row card" style={{ marginTop: 10, cursor: 'pointer' }}>
          <span style={{ flex: 1, fontWeight: 700 }}>Show store logos</span>
          <input type="checkbox" checked={s.showLogos} onChange={(e) => set({ showLogos: e.target.checked }, false)} style={{ width: 22, height: 22 }} />
        </label>
      </Block>

      <Block title="Your data" sub="No account, no server. Back up to move to a new phone.">
        <div className="card stack">
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-dark" style={{ flex: 1 }} onClick={download}>Export backup</button>
            <button className="btn" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>Import backup</button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              if (!confirm('Replace everything on this device with this backup?')) return;
              try {
                await importBackup(JSON.parse(await f.text()));
                await app.reload();
                showToast('Backup restored');
              } catch (x) {
                showToast(x instanceof Error ? x.message : 'Could not read that file');
              }
            }}
          />
          <button className="btn btn-text" onClick={() => set({ onboarded: false }, false)}>
            Walk through setup again
          </button>
        </div>
      </Block>

      <Block title="About the numbers">
        <div className="notice">
          <span className="emoji">ℹ️</span>
          <span>
            Nutrition figures are estimates from typical ingredient values. Prices are estimates unless marked
            <b> Live</b> (from a store’s official API: Kroger, Walmart), <b>Shoppers</b> (real receipts shared on Open Prices by
            Open Food Facts, ODbL open data) or <b>Edited</b> (your own number).
          </span>
        </div>
        <p className="muted small" style={{ margin: '10px 4px 0' }}>
          Store names and logos are trademarks of their owners and are shown only to identify where prices apply.
          Prepline is not affiliated with or endorsed by any store.
        </p>
      </Block>
      <p className="muted small" style={{ textAlign: 'center', margin: '18px 0 0' }}>Prepline beta · build {__APP_BUILD__}</p>
      {feedback && <FeedbackSheet onClose={() => setFeedback(false)} onSent={showToast} />}
      {toast}
    </>
  );
}
