/**
 * Unified scoring formula used by both solo games and 1v1 match rounds.
 * Exponential decay: diff=0 → 100 pts, diff=0.5 → ~55, diff=1 → ~30, diff=2 → ~9.
 */
const DECAY = 1.2;

export function calcScore(diff: number): number {
  return Math.max(0, Math.round(100 * Math.exp(-diff * DECAY)));
}
