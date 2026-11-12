import type { Region } from '../types';

/*
 * ZIP code → state → U.S. Census region. Uses the first three digits of the ZIP
 * (USPS sectional centers). Good enough for regional price levels; no lookup service needed.
 */

// [first ZIP3, last ZIP3, state]
const RANGES: [number, number, string][] = [
  [5, 5, 'NY'], [6, 9, 'PR'], [10, 27, 'MA'], [28, 29, 'RI'], [30, 38, 'NH'], [39, 49, 'ME'], [50, 59, 'VT'],
  [60, 69, 'CT'], [70, 89, 'NJ'], [100, 149, 'NY'], [150, 196, 'PA'], [197, 199, 'DE'], [200, 205, 'DC'],
  [206, 219, 'MD'], [220, 246, 'VA'], [247, 268, 'WV'], [270, 289, 'NC'], [290, 299, 'SC'], [300, 319, 'GA'],
  [320, 349, 'FL'], [350, 369, 'AL'], [370, 385, 'TN'], [386, 397, 'MS'], [398, 399, 'GA'], [400, 427, 'KY'],
  [430, 459, 'OH'], [460, 479, 'IN'], [480, 499, 'MI'], [500, 528, 'IA'], [530, 549, 'WI'], [550, 567, 'MN'],
  [569, 569, 'DC'], [570, 577, 'SD'], [580, 588, 'ND'], [590, 599, 'MT'], [600, 629, 'IL'], [630, 658, 'MO'],
  [660, 679, 'KS'], [680, 693, 'NE'], [700, 714, 'LA'], [716, 729, 'AR'], [730, 749, 'OK'], [750, 799, 'TX'],
  [800, 816, 'CO'], [820, 831, 'WY'], [832, 838, 'ID'], [840, 847, 'UT'], [850, 865, 'AZ'], [870, 884, 'NM'],
  [885, 885, 'TX'], [889, 898, 'NV'], [900, 961, 'CA'], [967, 968, 'HI'], [970, 979, 'OR'], [980, 994, 'WA'],
  [995, 999, 'AK'],
];

const REGION_OF: Record<string, Region> = {};
for (const s of ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA']) REGION_OF[s] = 'northeast';
for (const s of ['IL', 'IN', 'MI', 'OH', 'WI', 'IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD']) REGION_OF[s] = 'midwest';
for (const s of ['DE', 'DC', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'WV', 'AL', 'KY', 'MS', 'TN', 'AR', 'LA', 'OK', 'TX', 'PR']) REGION_OF[s] = 'south';
for (const s of ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY', 'AK', 'CA', 'HI', 'OR', 'WA']) REGION_OF[s] = 'west';

export function stateForZip(zip: string): string | null {
  if (!/^\d{5}$/.test(zip)) return null;
  const z3 = Number(zip.slice(0, 3));
  const hit = RANGES.find(([a, b]) => z3 >= a && z3 <= b);
  return hit ? hit[2] : null;
}

export function regionForZip(zip: string): Region | null {
  const st = stateForZip(zip);
  return st ? REGION_OF[st] ?? null : null;
}

export const REGION_LABEL: Record<Region, string> = {
  northeast: 'Northeast',
  midwest: 'Midwest',
  south: 'South',
  west: 'West',
};
