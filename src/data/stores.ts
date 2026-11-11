import type { Store, StoreId } from '../types';

/*
 * Store price indices are rough estimates of how each chain's regular shelf
 * prices compare to a mainstream supermarket baseline, by aisle. They make
 * the seed prices plausible out of the box; the user can edit any price, and
 * Kroger-family prices can be replaced with live prices from Kroger's free
 * public Products API (see scripts/fetch-kroger-prices.mjs).
 */
export const STORES: Store[] = [
  {
    id: 'kroger',
    name: 'Kroger family',
    note: 'Kroger, Ralphs, Fred Meyer, King Soopers, Fry’s, Smith’s, QFC, Harris Teeter, Mariano’s',
    liveCapable: true,
    index: { default: 1 },
  },
  {
    id: 'walmart',
    name: 'Walmart',
    note: 'Supercenter & Neighborhood Market',
    liveCapable: false,
    index: { default: 0.88, Produce: 0.9, Spices: 0.8 },
  },
  {
    id: 'costco',
    name: 'Costco',
    note: 'Warehouse bulk packs',
    liveCapable: false,
    usesBulk: true,
    index: { default: 0.92 },
  },
  {
    id: 'target',
    name: 'Target',
    note: 'Good & Gather prices',
    liveCapable: false,
    index: { default: 1.0, Produce: 1.05 },
  },
  {
    id: 'aldi',
    name: 'Aldi',
    note: 'Discount grocer',
    liveCapable: false,
    index: { default: 0.78, Spices: 0.65, 'Meat & Seafood': 0.85 },
  },
  {
    id: 'traderjoes',
    name: 'Trader Joe’s',
    note: 'Smaller packs, steady prices',
    liveCapable: false,
    index: { default: 0.92, 'Nuts & Seeds': 0.8, 'Meat & Seafood': 1.05 },
  },
  {
    id: 'wholefoods',
    name: 'Whole Foods',
    note: '365 brand where possible',
    liveCapable: false,
    index: { default: 1.22, 'Beans & Lentils': 1.05, 'Meat & Seafood': 1.3 },
  },
  {
    id: 'safeway',
    name: 'Safeway / Albertsons',
    note: 'Also Vons, Jewel-Osco, Acme, Shaw’s (regular, non-club prices)',
    liveCapable: false,
    index: { default: 1.15 },
  },
  {
    id: 'publix',
    name: 'Publix',
    note: 'Southeast',
    liveCapable: false,
    index: { default: 1.12 },
  },
  {
    id: 'heb',
    name: 'H-E-B',
    note: 'Texas',
    liveCapable: false,
    index: { default: 0.9 },
  },
  {
    id: 'desi',
    name: 'Indian grocery',
    note: 'Patel Brothers, India Bazaar, Apna Bazar and local desi stores',
    liveCapable: false,
    usesDesi: true,
    index: {
      default: 1.08,
      Spices: 0.9,
      'Beans & Lentils': 0.95,
      Produce: 0.85,
      'Meat & Seafood': 1.1,
    },
  },
];

export const STORE_BY_ID = Object.fromEntries(STORES.map((s) => [s.id, s])) as Record<
  StoreId,
  Store
>;
