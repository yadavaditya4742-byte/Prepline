import { useState, type ReactNode } from 'react';
import { IconList, IconPlan, IconPrices, IconRecipes, IconSettings } from './ui/icons';
import { PricesPreview } from './ui/PricesPreview';

type Tab = 'plan' | 'list' | 'recipes' | 'prices' | 'settings';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'plan', label: 'Plan', icon: <IconPlan /> },
  { id: 'list', label: 'List', icon: <IconList /> },
  { id: 'recipes', label: 'Recipes', icon: <IconRecipes /> },
  { id: 'prices', label: 'Prices', icon: <IconPrices /> },
  { id: 'settings', label: 'Settings', icon: <IconSettings /> },
];

function ComingSoon({ title, stage }: { title: string; stage: number }) {
  return (
    <>
      <h1 className="screen-title">{title}</h1>
      <div className="card placeholder muted">Arrives in stage {stage}.</div>
    </>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('prices');

  return (
    <div className="app">
      <header className="topbar">
        <div className="wordmark">
          <span className="wordmark-mark" aria-hidden />
          Prepline
        </div>
      </header>

      <main className="main">
        {tab === 'plan' && <ComingSoon title="This week" stage={2} />}
        {tab === 'list' && <ComingSoon title="Shopping list" stage={2} />}
        {tab === 'recipes' && <ComingSoon title="Recipes" stage={4} />}
        {tab === 'prices' && <PricesPreview />}
        {tab === 'settings' && <ComingSoon title="Settings" stage={2} />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button
            key={t.id}
            className="tab"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-pip" />
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
