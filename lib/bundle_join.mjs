// TheChop player-page bundle join: rebuilds the full page bundle from the slim one and the shared league files.
// Browser-safe (no imports): served at /lib live and copied to ./lib on the exported site; used by public/js/api.js.
//   slim:        {ok, player, roles, summary, leagueSeasons:{<season>: "bat"|"sp"|"rp"}}  (lib/bundle.mjs slimBundle)
//   leagueFiles: {<season>: {bat?, sp?, rp?}}  each role entry is lib/bundle.mjs trimLeague() of that season's league file
//                (GET /api/page/league/:season live, ./data/league/<season>.json on the static site)
//   joinBundle(slim, leagueFiles) -> {ok, player, league:{<season>: <that season's entry for his role>}, roles, summary},
//   the exact shape lib/bundle.mjs playerBundle() returns and public/js/player/adapter.js reads.
// A season named in leagueSeasons whose league file or role entry is missing throws, so the page reports an error
// instead of silently dropping that season's league context. Each entry is copied, so the shared files are never changed.

/** The seasons whose league files the slim bundle needs. */
export const leagueSeasonsOf = (slim) => Object.keys(slim?.leagueSeasons ?? {});

export function joinBundle(slim, leagueFiles) {
  // An old cached bundle (before the shared league files) already carries its league: pass it through unchanged.
  if (slim.leagueSeasons === undefined && slim.league) {
    return { ok: slim.ok, player: slim.player, league: slim.league, roles: slim.roles, summary: slim.summary };
  }
  const league = {};
  for (const [y, role] of Object.entries(slim.leagueSeasons ?? {})) {
    const entry = leagueFiles?.[y]?.[role];
    if (!entry) throw new Error(`The ${y} league context (${role}) could not be loaded.`);
    league[y] = structuredClone(entry);
  }
  return { ok: slim.ok, player: slim.player, league, roles: slim.roles, summary: slim.summary };
}
