/** Seeds worth showing: each team's seed with one row either side, with small gaps between them filled in. */
export function visibleSeeds(seeds: number[], total: number, fillGap = 2): number[] {
  const shown = new Set<number>();
  for (const s of seeds) for (let n = s - 1; n <= s + 1; n++) if (n >= 1 && n <= total) shown.add(n);
  const sorted = [...shown].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1] - 1;
    if (gap > 0 && gap <= fillGap) for (let n = sorted[i - 1] + 1; n < sorted[i]; n++) shown.add(n);
  }
  return [...shown].sort((a, b) => a - b);
}
