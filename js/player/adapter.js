// The Chop: player bundle -> the player-page draft's data globals.
//
// Input: the full bundle public/js/api.js getPlayerPage returns (the slim GET /api/page/player/:fgId?role=bat|pit body
// joined to the shared league files by lib/bundle_join.mjs; the shape lib/bundle.mjs playerBundle() builds):
//   { ok, player: <data/build/players/<id>-<role>.json>,
//     league: { <season>: { role, avg:{stat:v}, sd:{stat:sd}, n, asOf, asOfApprox, statSrc?, pitches?, vsHand? } },
//     roles: ["bat"|"pit", ...], summary: <index summary> }
// Output of adaptBundle(): { ROLE, DATA, SPL, POPS, LGP, POPSP, SDP } in the shapes of the
// embedded objects in design/player-page.html. Browser-safe, no imports, never mutates its input.
//
// Rules (DECISIONS D6, D9, D12, D13, D18, D21, D26, D27):
// - The draft's names are the contract. Stat keys are the build's (FanGraphs / Savant)
//   names except three renamed back to the draft's, in every map (rows, pct, src, alt, why, league):
//     build "Sprint speed" -> "Sprint"   "SBA/PA" -> "Att/PA"   "Def" -> "Defense"
//   The build's SBA/PA value is authoritative (the renderer must not recompute Att/PA).
//     wBsR from line.wBsR; CS from line/running; DRS, OAA from fielding[] (see fieldTotals)
//     pitcher pitch mix pfxFA% / pfxvFA / svWhiffFA ... -> row.pitches[pfxCode] =
//       { usage, velo, hMov, vMov, spin, rv100, savCode, whiff, putAway, whiffPct, putAwayPct,
//         lgWhiff, lgPutAway }   (passed through from the build)
//     hitter pitches seen (draft: BIS FB%1 / wFB/C) -> row.pitchesSeen[pfxCode] = { usage, rv100 }
//     pitcher wOBA / xwOBA against keep the build names "wOBA against" / "xwOBA against";
//     a pitcher's split row "wOBA" is renamed "wOBA against" so split tables share the columns.
// - Percentiles: row.pct[stat] is the build's per-season percentile (authoritative; never
//   recomputed here). POPS / POPSP carry only { n } per season: there are no population arrays.
// - DATA.lgss[y] (hitters only): the league line vs LHP (L) and vs RHP (R) from bundle.league[y].vsHand
//   (FanGraphs' team splits leaderboard, 30 clubs summed): L / R hold only the rates made from those
//   summed counts (K% = SO/PA, BB% = BB/PA, HR/PA); the counts sit in lgss[y].counts.{L,R}, the source
//   and as-of in lgss[y].source / asOf / asOfApprox. A season without vsHand has no entry; pitchers
//   have none (no league line by batter hand), so their split views use the all-pitchers line, labelled.
// - Pitcher role per season is row.pitRole ("SP" | "RP", D13); league context for that season is
//   already the matching role group in the bundle (DATA.lgmeta[y].role says which).
// - DATA.lgmeta[y].statSrc: per-stat sources for league figures whose source differs from the
//   league file's, copied from the bundle (league[y].statSrc); today sp/rp "wOBA against", whose
//   league average and spread come from FanGraphs' splits leaderboard: { "wOBA against":
//   [{ file, source, url, asOf, asOfApprox }] or null }. {} when the bundle has none.
// - A traded season keeps the build's combined team label, e.g. "NYY/SD" (D6).
// - A missing value stays null (shown as a dash, never 0). A season absent from bundle.league
//   (pre-2015, or null pitRole) has no entry in lgavg / sdBy / lgmeta / POPS.
// - Nothing is removed: every field the build carries (AVG, OBP, SLG, OPS and maxEV included) stays in the output, so
//   switching a stat on needs no rebuild. A stat is rendered only where the stat switches put it (settings/stats.json,
//   D36; public/js/player/plan.js); D9 and D26 hold through the starting settings.
//
// DATA fields:
//   player   { name, first, last, fgId, mlbam, bats, throws, height, weight, birthDate, age,
//              debut, lastGame:null (not in the build), fetchedAt (FanGraphs stats download
//              date, YYYY-MM-DD; label it "FanGraphs, fetched <date>"), college:null, nick:null, team, teamAbbr, teamId, number, pos,
//              role, twoWay, colors:null, park:null }  (colors/park come from lib/teams.mjs)
//   seasons  [row]  one row per season, oldest first:
//              Season, Team, Age, pitRole, roleIP, every line field (pitchers: IP = true innings
//              from TIP, IPtext = FanGraphs' "174.1" notation, PA = TBF), every stats field,
//              running fields, DRS, OAA (season total), fielding[] (per position, as built),
//              pct{}, pctSrc, src{}, alt{}, why{}, pitches{} (pit) or pitchesSeen{} (bat)
//   career   row of the same kind without Season/Team/pct/alt (fielding totals null); has src{}, why{}
// fieldTotals: the season's "OF" row (when present, LF/CF/RF are dropped) plus every
//   non-outfield position row except P; a null in any counted row makes that stat's total null,
//   except a C row's null OAA (not applicable).
//   latest   last season year     nqual  league n (comparison group size) for the latest season (null if none)
//   lgavg    { <season>: avg }    lgtrend  same object as lgavg    lgss  see above (hitters' vs-hand line)
//   pop      { stat: { sd } } for the latest season       sdBy  { <season>: { stat: sd } }
//   lgmeta   { <season>: { role, n, asOf, asOfApprox } }  lgpitch { <season>: league pitches
//              keyed by Savant code: { avg:{whiff,putAway}, sd:{whiff,putAway}, n } }
//   ss       { <season>: { L: split row, R: split row } } (seasons only)
//   splits   { Career: { L, R } } from the build's career splits when present, else {}
//   fetched  as-of date (YYYY-MM-DD) of the FanGraphs stats download   sources  meta.sources
// SPL.source carries the oldest fetch date among the fg-splits-* sources ("–" when none).
// POPSP (pitchers) always has an entry for the latest season ({ n: null } when no league file).
//   roles    bundle.roles
// D18 Savant extras on hitter rows: "EV50", "Brl/PA", "xHR", "xHR/PA", "No-doubters",
//   "No-doubter%", "Swing-take runs", "Heart runs", "Shadow runs", "Chase runs", "Waste runs",
//   "Sprint" (Savant sprint speed). Pitcher running game on pitcher rows: "SB allowed", "CS against",
//   "SB/100BF", "SBA/100BF", "CS%", "pickoffs", "battersFaced".
// headPct(DATA, years): D27 headline percentile (wRC+ or SIERA pct weighted by PA or IP).

// Copies the output, applying RENAME to every key at every depth; nothing is dropped.
function strip(o) {
  if (Array.isArray(o)) return o.map(strip);
  if (o && typeof o === "object") {
    const out = {};
    for (const [k, v] of Object.entries(o)) out[RENAME[k] || k] = strip(v);
    return out;
  }
  return o;
}

const day = s => (typeof s === "string" && s.length >= 10 ? s.slice(0, 10) : null);

// FanGraphs innings notation 66.1 / 66.2 -> 66.333 / 66.667
function trueIP(v) {
  if (v == null || typeof v !== "number") return v ?? null;
  const w = Math.trunc(v), f = Math.round((v - w) * 10);
  return w + f / 3;
}

function ageAt(birth, asOf) {
  if (!birth || !asOf) return null;
  const [by, bm, bd] = birth.split("-").map(Number), [y, m, d] = asOf.split("-").map(Number);
  if (!by || !y) return null;
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

// Season fielding total: FanGraphs' "OF" row (its outfield total; LF/CF/RF are then dropped) plus
// every non-outfield position row except P (a pitcher's own fielding, or a position player
// pitching). A null in any counted row makes that stat's total null (incomplete), never a partial
// sum; a C row's null OAA is not applicable and is skipped. A pitcher's own rows give all nulls.
const OF_POS = new Set(["LF", "CF", "RF"]);
function fieldTotals(fielding) {
  const out = { DRS: null, OAA: null };
  if (!Array.isArray(fielding) || !fielding.length) return out;
  const hasOF = fielding.some(f => f.pos === "OF");
  const rows = fielding.filter(f => f.pos !== "P" && !(hasOF && OF_POS.has(f.pos)));
  if (!rows.length) return out;
  for (const k of Object.keys(out)) {
    // Catchers have no OAA (D21): a C row's null OAA is "not applicable", not an incomplete total.
    const counted = k === "OAA" ? rows.filter(f => !(f.pos === "C" && f.OAA == null)) : rows;
    if (!counted.length) continue;
    const vals = counted.map(f => f[k]);
    out[k] = vals.some(v => v == null) ? null : vals.reduce((a, b) => a + b, 0);
  }
  return out;
}

const RENAME = { "Sprint speed": "Sprint", "SBA/PA": "Att/PA", "Def": "Defense" };

function flatRow(src, isPit) {
  const row = {};
  Object.assign(row, src.line || {});
  for (const [k, v] of Object.entries(src.stats || {})) row[k] = v;
  for (const [k, v] of Object.entries(src.running || {})) if (!(k in row)) row[k] = v;
  if (isPit) {
    const line = src.line || {};
    row.IPtext = line.IP ?? null;
    row.IP = line.TIP != null ? line.TIP : trueIP(line.IP);
    row.PA = line.TBF ?? null;
  }
  return row;
}

function seasonRow(s, isPit) {
  const row = { Season: s.season, Team: s.team ?? null, Age: s.age ?? null, pitRole: s.pitRole ?? null, roleIP: s.roleIP ?? null };
  Object.assign(row, flatRow(s, isPit));
  Object.assign(row, fieldTotals(s.fielding));
  row.fielding = s.fielding || [];
  row.fieldingPct = s.fieldingPct ?? null; // D21: primary position's OAA per 1,000 inn and its percentile (as built)
  row.pct = s.pct || {};
  row.pctSrc = s.pctSrc ?? null;
  row.src = s.src || {};
  row.alt = s.alt || {};
  row.why = s.why || {};
  if (isPit) row.pitches = s.pitches || {};
  else row.pitchesSeen = s.pitchesSeen || {};
  return row;
}

function splitRow(r, side, isPit) {
  const row = { Split: side === "L" ? "vs L" : "vs R" };
  Object.assign(row, r);
  if (isPit) {
    if ("wOBA" in row) { row["wOBA against"] = row.wOBA; delete row.wOBA; }
    row.IPtext = r.IP ?? null;
    row.IP = r.TIP != null ? r.TIP : trueIP(r.IP);
    if (row.PA == null) row.PA = r.TBF ?? null;
  }
  return row;
}

export function adaptBundle(bundle) {
  if (!bundle || !bundle.player || !Array.isArray(bundle.player.seasons)) throw new Error("adaptBundle: bundle has no player build");
  const B = bundle.player, pl = B.player || {}, sm = bundle.summary || {}, league = bundle.league || {};
  const ROLE = pl.role === "pit" ? "pit" : "bat", isPit = ROLE === "pit";
  const sources = (B.meta && B.meta.sources) || {};
  const statSrc = sources[`fg-stats-${ROLE}`] || {};
  const asOf = day(statSrc.fetchedAt);

  const seasons = B.seasons.map(s => seasonRow(s, isPit)).sort((a, b) => a.Season - b.Season);
  const latest = seasons.length ? seasons[seasons.length - 1].Season : null;
  const lastRow = seasons[seasons.length - 1] || {};

  const career = flatRow(B.career || {}, isPit);
  Object.assign(career, { DRS: null, OAA: null });
  career.src = (B.career && B.career.src) || {};
  career.why = (B.career && B.career.why) || {};
  if (isPit) career.pitches = (B.career && B.career.pitches) || {};
  else career.pitchesSeen = (B.career && B.career.pitchesSeen) || {};

  const lgavg = {}, sdBy = {}, lgmeta = {}, lgpitch = {}, pops = {}, lgss = {};
  const VH_RATES = ["K%", "BB%", "HR/PA"];
  for (const [y, L] of Object.entries(league)) {
    if (!L) continue;
    const vh = !isPit && L.vsHand;
    if (vh && vh.vsL && vh.vsR) {
      const rates = (o) => Object.fromEntries(VH_RATES.map((k) => [k, typeof o[k] === "number" ? o[k] : null]));
      const counts = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !VH_RATES.includes(k)));
      const src = Array.isArray(vh.src) && vh.src.length ? vh.src[0].source : null;
      lgss[y] = { L: rates(vh.vsL), R: rates(vh.vsR), counts: { L: counts(vh.vsL), R: counts(vh.vsR) },
        source: src, asOf: day(vh.asOf), asOfApprox: !!vh.asOfApprox };
    }
    lgavg[y] = L.avg || {};
    sdBy[y] = L.sd || {};
    lgmeta[y] = { role: L.role ?? null, n: L.n ?? null, min: L.min ?? null, asOf: L.asOf ?? null, asOfApprox: L.asOfApprox ?? null,
      statSrc: L.statSrc ? { ...L.statSrc } : {} };
    if (L.pitches) lgpitch[y] = L.pitches;
    pops[y] = { n: L.n ?? null };
  }
  if (isPit && latest != null && !pops[String(latest)]) pops[String(latest)] = { n: null };
  const pop = {};
  for (const [k, sd] of Object.entries(sdBy[String(latest)] || {})) pop[k] = { sd };

  const ss = {}, splSeasons = {}, careerSplits = {};
  const cs = (B.splits || {}).career;
  if (cs && (cs["vs L"] || cs["vs R"])) {
    careerSplits.Career = {};
    if (cs["vs L"]) careerSplits.Career.L = splitRow(cs["vs L"], "L", isPit);
    if (cs["vs R"]) careerSplits.Career.R = splitRow(cs["vs R"], "R", isPit);
  }
  for (const [y, sp] of Object.entries(B.splits || {})) {
    if (y === "career") continue;
    const L = sp && sp["vs L"] ? splitRow(sp["vs L"], "L", isPit) : null;
    const R = sp && sp["vs R"] ? splitRow(sp["vs R"], "R", isPit) : null;
    ss[y] = {};
    splSeasons[y] = {};
    if (L) { ss[y].L = L; splSeasons[y]["vs L"] = L; }
    if (R) { ss[y].R = R; splSeasons[y]["vs R"] = R; }
  }
  // As fresh as the oldest splits download; none at all: no as-of (dash).
  const splDates = Object.keys(sources).filter(k => k.startsWith("fg-splits-")).map(k => day(sources[k].fetchedAt));
  const splAsOf = splDates.length && splDates.every(Boolean) ? splDates.sort()[0] : null;
  const SPL = {
    source: `FanGraphs player splits, fetched ${splAsOf || "–"}`,
    player: `${pl.name || sm.name || ""} ${pl.fgId ?? sm.fgId ?? ""}`.trim(),
    seasons: splSeasons,
  };

  const name = pl.name || sm.name || "";
  const sp = name.indexOf(" ");
  let pos = pl.pos ?? sm.pos ?? null;
  if (isPit && (pos === "P" || pos === "TWP")) pos = lastRow.pitRole || pos;
  const team = pl.team || {};

  const player = {
    name, first: sp > 0 ? name.slice(0, sp) : name, last: sp > 0 ? name.slice(sp + 1) : name,
    fgId: pl.fgId ?? (sm.fgId != null ? Number(sm.fgId) : null), mlbam: pl.mlbam ?? sm.mlbam ?? null,
    bats: pl.bats ?? sm.bats ?? null, throws: pl.throws ?? sm.throws ?? null,
    height: pl.height ?? null, weight: pl.weight ?? null, birthDate: pl.birthDate ?? null,
    age: ageAt(pl.birthDate, asOf), debut: pl.debut ?? null, lastGame: null, fetchedAt: asOf,
    college: null, nick: null,
    team: team.name ?? sm.teamName ?? null, teamAbbr: team.abbr ?? sm.team ?? null, teamId: team.id ?? sm.teamId ?? null,
    number: pl.number ?? sm.number ?? null, pos, role: ROLE, twoWay: !!pl.twoWay,
    colors: null, park: null,
  };

  const DATA = {
    player, seasons, career, latest,
    nqual: (lgmeta[String(latest)] || {}).n ?? null,
    lgavg, lgtrend: lgavg, lgss, pop, sdBy, lgmeta, lgpitch,
    ss, splits: careerSplits, fetched: asOf, sources, roles: bundle.roles || [ROLE],
    fielding3yr: B.fielding3yr ?? null, // D21: three-season OAA by position (span, primary, byPos), as built
  };

  const out = {
    ROLE, DATA, SPL,
    POPS: isPit ? {} : pops,
    LGP: isPit ? lgavg : {},
    POPSP: isPit ? pops : {},
    SDP: isPit ? pop : {},
  };
  return strip(out);
}

// D27: headline percentile over the selected seasons, each season's build pct weighted by PA
// (hitters, wRC+) or IP (pitchers, SIERA). Null when no selected season has one.
export function headPct(DATA, years) {
  const pit = DATA.player.role === "pit", key = pit ? "SIERA" : "wRC+", wk = pit ? "IP" : "PA";
  const want = new Set((years || []).map(Number));
  let num = 0, den = 0;
  for (const r of DATA.seasons) {
    if (!want.has(Number(r.Season))) continue;
    const p = r.pct && r.pct[key], w = r[wk];
    if (p == null || !w) continue;
    num += p * w; den += w;
  }
  return den ? num / den : null;
}
