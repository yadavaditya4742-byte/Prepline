/** Prices are rounded to shelf prices ending in 9, so allow a few percent of slack. */
export const regionFactorSanity = (actual: number, expected: number) => Math.abs(actual - expected) < 0.06;
