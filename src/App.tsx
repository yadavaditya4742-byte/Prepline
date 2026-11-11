import { useEffect, useState, type ReactNode } from 'react';
import { useApp } from './state/store';
import { IconList, IconPlan, IconPrices, IconRecipes, IconSettings } from './ui/icons';
import { ListScreen } from './ui/ListScreen';
import { Onboarding } from './ui/Onboarding';
import { PlanScreen } from './ui/PlanScreen';
import { PricesScreen } from './ui/PricesScreen';
import { SettingsScreen } from './ui/SettingsScreen';

type Tab = 'plan' | 'list' | 'recipes' | 'prices' | 'settings';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'plan', label: 'Plan', icon: <IconPlan /> },
  { id: 'list', label: 'List', icon: <IconList /> },
  { id: 'recipes', label: 'Recipes', icon: <IconRecipes /> },
  { id: 'prices', label: 'Prices', icon: <IconPrices /> },
  { id: 'settings', label: 'Settings', icon: <IconSettings /> },
];

export default function App() {
  const app = useApp();
  const [tab, setTab] = useState<Tab>('plan');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  if (!app.ready) return null;
  if (!app.settings.onboarded) return <Onboarding />;

  return (
    <div className="app">
      <main className="main">
        {tab === 'plan' && <PlanScreen onOpenList={() => setTab('list')} />}
        {tab === 'list' && <ListScreen />}
        {tab === 'recipes' && (
          <>
            <h1 className="display">Recipes</h1>
            <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 40 }}>📖</div>
              <p className="muted">Browse, search and add your own recipes. Coming in stage 4.</p>
            </div>
          </>
        )}
        {tab === 'prices' && <PricesScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </main>

      <nav className="dock" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
