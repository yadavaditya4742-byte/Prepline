// Stroke icons drawn for Prepline.
import type { ReactNode } from 'react';

const Svg = ({ children, sw = 2 }: { children: ReactNode; sw?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export const IconPlan = () => (
  <Svg>
    <rect x="3" y="4.5" width="18" height="16" rx="4" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    <circle cx="8.5" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconList = () => (
  <Svg>
    <path d="M5 7h1M5 12h1M5 17h1M10 7h9M10 12h9M10 17h6" />
  </Svg>
);
export const IconRecipes = () => (
  <Svg>
    <path d="M3.5 12.5h17a8.5 8.5 0 0 1-17 0Z" />
    <path d="M8 9c0-1.6 1.6-1.6 1.6-3.2M13 9c0-1.6 1.6-1.6 1.6-3.2" />
  </Svg>
);
export const IconPrices = () => (
  <Svg>
    <path d="M3.5 12V4.5a1 1 0 0 1 1-1H12l8.5 8.5-8.5 8.5L3.5 12Z" />
    <circle cx="8" cy="8" r="1.5" />
  </Svg>
);
export const IconSettings = () => (
  <Svg>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Svg>
);
export const IconLock = () => (
  <Svg>
    <rect x="5" y="10.5" width="14" height="10" rx="3" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Svg>
);
export const IconUnlock = () => (
  <Svg>
    <rect x="5" y="10.5" width="14" height="10" rx="3" />
    <path d="M8 10.5V8a4 4 0 0 1 7.6-1.7" />
  </Svg>
);
export const IconSwap = () => (
  <Svg>
    <path d="M7 4 4 7l3 3M4 7h12M17 20l3-3-3-3M20 17H8" />
  </Svg>
);
export const IconRefresh = () => (
  <Svg>
    <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
  </Svg>
);
export const IconBack = () => (
  <Svg sw={2.4}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);
export const IconCheck = () => (
  <Svg sw={3}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IconSearch = () => (
  <Svg>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Svg>
);
export const IconPlus = () => (
  <Svg sw={2.4}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconMinus = () => (
  <Svg sw={2.4}>
    <path d="M5 12h14" />
  </Svg>
);
export const IconShare = () => (
  <Svg>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
    <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </Svg>
);
export const IconCopy = () => (
  <Svg>
    <rect x="8" y="8" width="12" height="12" rx="3" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Svg>
);
export const IconClose = () => (
  <Svg sw={2.4}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const IconArrow = () => (
  <Svg sw={2.4}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
