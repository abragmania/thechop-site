// The Chop data access: the ONLY module that knows where data comes from.
// Live mode calls the server's /api routes; static mode (<meta name="thechop-mode" content="static">) reads ./data/*.json
// written by the site export and searches in the browser. All URLs are relative so the public site works under a sub-path.
import { copyIsStale } from "../lib/teams.mjs"; // /lib live, ./lib on the exported site
import { joinBundle, leagueSeasonsOf } from "../lib/bundle_join.mjs";
export const isStatic = document.querySelector('meta[name="thechop-mode"]')?.content === "static";

async function getJSON(url, { signal, method = "GET" } = {}) {
  const r = await fetch(url, { signal, method });
  let body = null;
  try { body = await r.json(); } catch { /* not JSON */ }
  if (!r.ok) {
    const e = new Error(body?.error?.message || `Request failed (${r.status}).`);
    e.status = r.status; e.code = body?.error?.code; e.body = body;
    throw e;
  }
  return body;
}

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const simpleKey = (s) => norm(s).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// lib/search.mjs is shared with the server when present; otherwise a plain accent-insensitive prefix/substring match.
let sharedSearch;
async function loadShared() {
  if (sharedSearch !== undefined) return sharedSearch;
  try {
    const m = await import("../lib/search.mjs"); // /lib live, ./lib on the exported site
    sharedSearch = m;
  } catch { sharedSearch = null; }
  return sharedSearch;
}

let staticIndex = null;
function fallbackSearch(list, q, limit) {
  const k = simpleKey(q);
  if (!k) return [];
  const hits = [];
  for (const p of list) {
    const key = p.key || simpleKey(p.name);
    const at = key.indexOf(k);
    if (at < 0) continue;
    hits.push({ p, rank: at === 0 ? 0 : key[at - 1] === " " ? 1 : 2 });
  }
  hits.sort((a, b) => (!!b.p.active - !!a.p.active) || (a.rank - b.rank) || ((b.p.lastSeason ?? 0) - (a.p.lastSeason ?? 0)) || String(a.p.name).localeCompare(b.p.name));
  return hits.slice(0, limit).map((h) => h.p);
}

/** Search players by name. Resolves {results:[player summary], season}. */
export async function searchPlayers(q, { signal, limit = 8 } = {}) {
  if (!isStatic) return getJSON(`./api/search?q=${encodeURIComponent(q)}&limit=${limit}`, { signal });
  // The index request is shared across keystrokes, so it must not carry any one keystroke's abort signal.
  if (!staticIndex) staticIndex = getJSON("./data/search.json").catch((e) => { staticIndex = null; throw e; });
  const raw = await staticIndex;
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const list = Array.isArray(raw) ? raw : raw.players || [];
  const m = await loadShared();
  let results;
  if (m && typeof m.search === "function") {
    try { results = m.search({ players: Object.fromEntries(list.map((p) => [p.fgId, p])) }, q, limit); } catch { results = null; }
  }
  results ||= fallbackSearch(list, q, limit);
  return { ok: true, q, season: raw.season ?? null, results };
}

let teamsP = null;
/** All 30 teams: {season, teams:[{id, abbr, name, league, division}], sources}. */
export function getTeams() {
  teamsP ||= getJSON(isStatic ? "./data/teams.json" : "./api/teams").catch((e) => { teamsP = null; throw e; });
  return teamsP;
}

/** League-wide season list for role bat|pit. Resolves {players, season, sources}; sort/min/limit applied here in static mode. */
export async function getList({ role, season, sort, min = 0, limit = 50, signal }) {
  if (!isStatic) {
    const q = new URLSearchParams({ role, season, sort, min, limit });
    return getJSON(`./api/players?${q}`, { signal });
  }
  const raw = await getJSON(`./data/lists/${season}-${role}.json`, { signal });
  const rows = Array.isArray(raw) ? raw : raw.players || [];
  // IP is in baseball notation (45.2 = 45 and 2/3), converted exactly as the server's inningsFromNotation does.
  const inn = (ip) => { if (ip == null || !Number.isFinite(Number(ip))) return null; const v = Number(ip), w = Math.trunc(v); return w + Math.round((v - w) * 10) / 3; };
  const time = (p) => (role === "bat" ? p.stat?.PA : inn(p.stat?.IP));
  const key = sort || (role === "bat" ? "wRC+" : "SIERA");
  const lowFirst = key === "SIERA";
  const players = rows.filter((p) => (time(p) ?? 0) >= min)
    .sort((a, b) => {
      const x = key === "IP" ? inn(a.stat?.IP) : a.stat?.[key], y = key === "IP" ? inn(b.stat?.IP) : b.stat?.[key];
      if (x == null || y == null) return (x == null) - (y == null);
      return lowFirst ? x - y : y - x;
    }).slice(0, limit);
  return { ok: true, season, role, sort: key, players, sources: raw.sources || {} };
}

// Static mode cannot refresh, so it judges staleness itself by the server's rule (lib/teams.mjs, 12 h / 7 days).
export const getTeamDepth = async (abbr, opts = {}) => {
  if (!isStatic) return getJSON(`./api/team-depth/${encodeURIComponent(abbr)}`, opts);
  const res = await getJSON(`./data/teams/${encodeURIComponent(abbr)}.json`, opts);
  return { ...res, stale: copyIsStale(res) };
};

// One season's shared league file, fetched once per page load and shared by every player page that needs it; it carries
// no abort signal, since another page may be waiting on it. A failed fetch is forgotten so the next try asks again.
const leagueP = new Map();
export const LEAGUE_UNAVAILABLE = "league_unavailable";
// Whatever went wrong with the shared league file, the page gets one distinct error (never "not built").
function leagueUnavailable(cause) {
  const e = new Error("League context unavailable right now; try again.");
  e.code = LEAGUE_UNAVAILABLE; e.cause = cause;
  return e;
}
function getLeague(y) {
  if (!leagueP.has(y)) {
    leagueP.set(y, getJSON(isStatic ? `./data/league/${encodeURIComponent(y)}.json` : `./api/page/league/${encodeURIComponent(y)}`)
      .catch((e) => { leagueP.delete(y); throw leagueUnavailable(e); }));
  }
  return leagueP.get(y);
}

/** The player-page bundle {ok, player, league, roles, summary}: the slim bundle joined to its seasons' league files. */
export const getPlayerPage = async (id, role, opts = {}) => {
  const slim = await getJSON(isStatic ? `./data/players/${encodeURIComponent(id)}-${role}.json` : `./api/page/player/${encodeURIComponent(id)}?role=${role}`, opts);
  const ys = leagueSeasonsOf(slim);
  const files = Object.fromEntries(await Promise.all(ys.map(async (y) => [y, await getLeague(y)])));
  if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return joinBundle(slim, files);
};

/** On-demand build (live only): start a build, then poll its status. */
// role (bat|pit) is optional: without it the server builds or reports either role, as before.
const buildUrl = (id, role) => `./api/build/player/${encodeURIComponent(id)}${role ? `?role=${encodeURIComponent(role)}` : ""}`;
export const startBuild = (id, role) => {
  if (isStatic) return Promise.reject(new Error("This player is not on the public site yet."));
  return getJSON(buildUrl(id, role), { method: "POST" });
};
/** buildStatus(id), buildStatus(id, opts), buildStatus(id, role) or buildStatus(id, role, opts). */
export const buildStatus = (id, roleOrOpts = {}, opts = {}) => {
  const role = typeof roleOrOpts === "string" ? roleOrOpts : undefined;
  return getJSON(buildUrl(id, role), typeof roleOrOpts === "string" ? opts : roleOrOpts);
};

export const teamLogoUrl = (mlbId) => `https://www.mlbstatic.com/team-logos/${mlbId}.svg`;
export const headshotUrl = (mlbam) => `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_96,q_auto:best/v1/people/${mlbam}/headshot/67/current`;
export const playerUrl = (p, role) => `./player.html?id=${encodeURIComponent(p.fgId)}&role=${role || p.roles?.[0] || "bat"}`;
export const teamUrl = (abbr) => `./team.html?t=${encodeURIComponent(abbr)}`;
