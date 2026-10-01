// The Chop's one percentile colour rule (D12), shared by the home, team and player pages and the static export. Browser-safe: no imports.
// The percentile is first rounded to the integer the page shows, clamped to 1-99; the colour is then judged on that shown integer:
//   60 or above = good ("g"), intensity rising from 0 at 60 to 1 at 99; 20 or below = bad ("b"), intensity rising from .05 at 20 to 1 at 1;
//   otherwise plain. So a figure shown as "20th" always carries the bad tone and one shown as "60th" always the green.

/** The shown percentile: rounded to an integer and clamped to 1-99; null when there is none. */
export function pctShown(p) {
  if (p == null || p === "") return null;
  const n = Number(p);
  return Number.isFinite(n) ? Math.max(1, Math.min(99, Math.round(n))) : null;
}

/** Colour class for a percentile: {c: "g" | "b" | plain, i: intensity 0-1, pc: the shown integer or null}. `plain` is the class used for neither. */
export function pctTone(p, plain = "") {
  const pc = pctShown(p);
  if (pc == null) return { c: plain, i: 0, pc: null };
  if (pc >= 60) return { c: "g", i: Math.min(1, (pc - 60) / 39), pc };
  if (pc <= 20) return { c: "b", i: Math.min(1, (21 - pc) / 20), pc };
  return { c: plain, i: 0, pc };
}

/** English ordinal of an integer: 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st... */
export function ord(n) {
  const s = ["th", "st", "nd", "rd"], v = Math.abs(n) % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
