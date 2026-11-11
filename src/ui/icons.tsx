// Simple stroke icons drawn for Prepline.
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
};

export const IconPlan = () => (
  <svg {...base}>
    <rect x="3" y="4" width="18" height="17" rx="3" />
    <path d="M3 9h18M8 2v4M16 2v4M7.5 14h3M7.5 17.5h6" />
  </svg>
);
export const IconList = () => (
  <svg {...base}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 6l1 1 2-2M4 12l1 1 2-2" />
    <circle cx="5" cy="18" r="1" />
  </svg>
);
export const IconRecipes = () => (
  <svg {...base}>
    <path d="M4 13h16a8 8 0 0 1-16 0Z" />
    <path d="M9 9c0-2 2-2 2-4M14 9c0-2 2-2 2-4" />
  </svg>
);
export const IconPrices = () => (
  <svg {...base}>
    <path d="M3 12V4h8l10 10-8 8L3 12Z" />
    <circle cx="7.5" cy="8.5" r="1.5" />
  </svg>
);
export const IconSettings = () => (
  <svg {...base}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);
