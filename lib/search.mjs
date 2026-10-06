// TheChop player search, shared by the server (server/routes/index.js) and the browser (public/js/api.js on the static
// site). Browser-safe: no node imports. pipeline/build/players.mjs re-exports searchKey and search.

/** Accent- and punctuation-insensitive search key: "Ronald Acuña Jr." -> "ronald acuna jr". */
export function searchKey(s) {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Playing time of a player's latest season: plate appearances or batters faced, whichever is larger. */
export const playingTime = (p) => Math.max(p.headline?.bat?.PA ?? 0, p.headline?.pit?.TBF ?? 0);

/**
 * Name search over {players:{fgId: player}}: the matching player objects themselves, best first. A player's `key` is
 * used when present, else searchKey(name). Order: active players first, then the whole name starting with the query,
 * then a later word starting with it, then a substring inside a word; then latest season, playing time and name.
 */
export function search(index, q, limit = 20) {
  const k = searchKey(q);
  if (!k) return [];
  const hits = [];
  for (const p of Object.values(index.players)) {
    const key = p.key ?? searchKey(p.name);
    const at = key.indexOf(k);
    if (at < 0) continue;
    // 0: the whole name starts with it; 1: a later word starts with it; 2: substring inside a word.
    const rank = at === 0 ? 0 : key[at - 1] === " " ? 1 : 2;
    hits.push({ p, rank });
  }
  hits.sort((a, b) => (b.p.active - a.p.active) || (a.rank - b.rank) || (b.p.lastSeason - a.p.lastSeason)
    || (playingTime(b.p) - playingTime(a.p)) || a.p.name.localeCompare(b.p.name));
  return hits.slice(0, limit).map((h) => h.p);
}
