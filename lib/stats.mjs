// TheChop shared stats helpers: used by the offline build (pipeline/build/) and, later, the browser.
// A missing value is null, never 0: every helper returns null when its inputs cannot give a real figure.

/** A finite number, or null for null / undefined / NaN / non-numbers. */
export function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** num / den, or null when either is missing or den is 0. */
export function ratio(n, d) {
  const a = num(n), b = num(d);
  if (a === null || b === null || b === 0) return null;
  return a / b;
}

/**
 * Percentile of `value` in a population (a comparison group, D38): 100 × (worse + 0.5 × ties) / n.
 * `sortedPop` is the population's values (any order works; nulls are ignored).
 * `direction` is "high" (bigger is better) or "low" (smaller is better).
 * Returns null when the value is missing or the population is empty.
 */
export function percentile(value, sortedPop, direction) {
  if (direction !== "high" && direction !== "low") throw new Error(`percentile: direction must be "high" or "low", got ${direction}`);
  const v = num(value);
  if (v === null || !Array.isArray(sortedPop)) return null;
  // FanGraphs rounds the same figure to different precision in different files (leaderboards 8 decimals,
  // player files 6), so values within a relative 1e-6 count as a tie rather than as better or worse.
  const tol = 1e-6 * Math.max(1, Math.abs(v));
  let n = 0, worse = 0, ties = 0;
  for (const x of sortedPop) {
    const p = num(x);
    if (p === null) continue;
    n++;
    if (Math.abs(p - v) <= tol) ties++;
    else if (direction === "high" ? p < v : p > v) worse++;
  }
  if (n === 0) return null;
  return (100 * (worse + 0.5 * ties)) / n;
}

/** Weighted mean of values by weights; pairs with a missing value or weight (or weight ≤ 0) are skipped. Null if none remain. */
export function weightedMean(values, weights) {
  let sw = 0, s = 0;
  for (let i = 0; i < values.length; i++) {
    const v = num(values[i]), w = num(weights[i]);
    if (v === null || w === null || w <= 0) continue;
    sw += w; s += v * w;
  }
  return sw > 0 ? s / sw : null;
}

/**
 * Combine rows into one figure. `numFn(row)` and `denFn(row)` return the row's numerator and denominator
 * counts (null when missing); a row missing either is skipped entirely. Returns sum(num) / sum(den) or null.
 */
export function sumRatio(rows, numFn, denFn) {
  let sn = 0, sd = 0, used = 0;
  for (const r of rows) {
    const a = num(numFn(r)), b = num(denFn(r));
    if (a === null || b === null) continue;
    sn += a; sd += b; used++;
  }
  return used > 0 && sd !== 0 ? sn / sd : null;
}

/** Weighted mean of one field across rows, weight from `weightFn(row)`. */
export function weightedField(rows, field, weightFn) {
  return weightedMean(rows.map((r) => r[field]), rows.map(weightFn));
}

/** Sum of a count across rows, or null when every row lacks it. */
export function sumField(rows, fn) {
  let s = 0, used = 0;
  for (const r of rows) {
    const v = num(fn(r));
    if (v === null) continue;
    s += v; used++;
  }
  return used > 0 ? s : null;
}

/** Sorted numeric values with their mean and population standard deviation; missing values are dropped. */
export function distribution(values) {
  const vals = values.map(num).filter((v) => v !== null).sort((a, b) => a - b);
  if (vals.length === 0) return { vals, mean: null, sd: null };
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  return { vals, mean, sd };
}

/** Innings in baseball notation (174.2 = 174⅔) to true innings. FanGraphs rows also carry TIP, already true innings. */
export function inningsFromNotation(ip) {
  const v = num(ip);
  if (v === null) return null;
  const whole = Math.trunc(v);
  const outs = Math.round((v - whole) * 10);
  return whole + outs / 3;
}
