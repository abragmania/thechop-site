// The Chop stat catalog (STAT-SWITCHES step 1): one entry for every stat the project uses, shows, fetches or has
// discussed, including retired and hidden ones. Pure data plus small pure helpers; imported by the Node build and the
// browser (no node: modules). lib/statmeta.mjs stays the owner of direction, flags (indexed100, meanReverting, style,
// strength, provisional), formulas and league methods; this file references those by id and never repeats them.
//
// Entry shape:
//   id           the stat's key: statmeta's key where statmeta has it, else the build's field name; per-position,
//                per-pitch and vs-hand figures use a prefix (fld.*, pitch.*, seen.*, hand.*)
//   label        plain name (statmeta's label when statmeta has the stat)     short  the column or tile label
//   aliases      other keys the same figure goes by in the code (render.js "Sprint", "Att/PA", "Defense", "RV")
//   cat          { bat, pit }: its home category id per side (CATEGORIES), null where the side does not use it
//   sides        ["bat"], ["pit"] or ["bat","pit"]: the sides with a home category
//   scope        "season" one figure per season | "pitch" per pitch type | "split" vs left / vs right |
//                "position" per fielding position | "count" a plain count
//   tile         how it draws in a box: "tile" a stat tile | "count" a plain count | "pitch" a pitch-mix row |
//                "pair" a vs-left / vs-right pair
//   fmt          "pct" | "f3" (.345) | "f2" | "f1" | "int" | "runs" (signed) | "ftps" | "deg" | "ip" (innings)
//   chart        true when some expanded view can chart it by season today
//   src          { past, live, gap }: each a list of source objects, tried in order (empty = none known from the
//                project's documents or code; never guessed). A source object is { provider, ref, from, to, sides,
//                kind?, label? }: provider "fg" | "mlb" | "savant" | "computed"; from/to seasons (to null = ongoing);
//                sides the sides it serves (defaults to the entry's sides); kind "computed" | "substitute" | "combined"
//                with label, the words shown on the page whenever that source supplies the figure (D35).
//                past = finished seasons from the FanGraphs backup (D29, D34) or the stat's only source; live = the
//                season in progress without FanGraphs (D34, D35); gap = seasons or players the backup lacks
//                (PROJECT.md HISTORY-GAPS).
//   alt          parallel figures shown beside the main one as a labelled alternative (D3, D7): a list of
//                { provider, ref, label, sides, stat? } (stat = the catalog id that carries it, where one does)
//   years        { from, to }: seasons the figure exists at any source (null = unknown or open-ended)
//   pctPop       the percentile population in words, null when no percentile is made
//   rulings      the DECISIONS.md rulings that govern it
//   fetch        false only for a stat with no working source at all
//   defaultState { bat, pit }: "main" visible on the player's main page today, "on" only in expanded views,
//                "off" nowhere on the player page (D36's starting settings come from these)
//   elsewhere    other pages that show it today ("home", "team")
//   meta         true when lib/statmeta.mjs has the stat (direction, flags, formula and league method live there)
//   combine      how several seasons combine into one figure where the player page has no rule of its own (it
//                recomputes its usual rates from summed counts and weights the rest by PA): "sum" | "max" | "rate"
//                (recomputed by the page from summed components: AVG, OBP, SLG, OPS) | "pa" | "ip" (weighted); counts
//                default to "sum"; null = no rule, so a stat that is off on the starting page shows a dash for several seasons
//   note         anything a cold reader needs
import { STATS } from "./statmeta.mjs";
import { GROUP_MIN } from "./groups.mjs";

export const PROVIDERS = ["fg", "mlb", "savant", "computed"];
export const STATES = ["off", "on", "main"];
export const SCOPES = ["season", "pitch", "split", "position", "count"];
export const TILES = ["tile", "count", "pitch", "pair"];
export const FMTS = ["pct", "f3", "f2", "f1", "int", "runs", "ftps", "deg", "ip"];
export const SOURCE_KINDS = ["computed", "substitute", "combined"];
export const COMBINES = ["sum", "max", "rate", "pa", "ip"];

// ---- categories (STAT-SWITCHES plan), ordered per side ----------------------------------------
export const CATEGORIES = {
  bat: [
    { id: "how", title: "How good" }, { id: "power", title: "Power" }, { id: "contact", title: "Contact quality" },
    { id: "kbb", title: "Strikeouts & walks" }, { id: "disc", title: "Plate discipline" }, { id: "batted", title: "Batted ball" },
    { id: "run", title: "Running" }, { id: "def", title: "Defense" }, { id: "pitch", title: "vs pitch types" },
    { id: "hand", title: "vs L/R" }, { id: "career", title: "Season by season" }, { id: "plain", title: "The plain line" },
  ],
  pit: [
    { id: "prev", title: "Run prevention" }, { id: "res", title: "Results against" }, { id: "kbb", title: "Strikeouts & walks" },
    { id: "disc", title: "Plate discipline against" }, { id: "batted", title: "Batted ball & contact against" },
    { id: "mix", title: "Pitch mix" }, { id: "run", title: "Running game" }, { id: "hand", title: "vs LHB/RHB" },
    { id: "career", title: "Season by season" }, { id: "plain", title: "The plain line" },
  ],
};

// ---- sources ------------------------------------------------------------------------------------
const src = (provider, ref, from = null, to = null) => ({ provider, ref, from, to });
/** The FanGraphs backup (release data-cache-2026-10-02): season leaderboards with every column, pitcher vs-hand
 * splits and qualified fielding lists (PROJECT.md HISTORY-GAPS). */
export const BACKUP = { release: "data-cache-2026-10-02", from: 2010, to: 2026, splitsFrom: 2015 };
const late = (a, b) => (a == null ? b : Math.max(a, b));
const FG_LB = (from) => src("fg", "FanGraphs season leaderboard (type=8), backup data-cache-2026-10-02", late(from, BACKUP.from), BACKUP.to);
const only = (s, side) => ({ ...s, sides: [side] });
const lab = (s, kind, label) => ({ ...s, kind, label });
const FG_PITSPL = only(src("fg", "FanGraphs splits leaderboard, pitchers vs LHB and RHB, backup data-cache-2026-10-02", BACKUP.splitsFrom, BACKUP.to), "pit");
const FG_FLD = (from) => src("fg", "FanGraphs fielding leaderboard (stats=fld, qual=y, type=1), backup data-cache-2026-10-02; per-player fielding is not in the backup", late(from, BACKUP.from), BACKUP.to);
const FG_PFX = (ref) => src("fg", `FanGraphs pfx pitch columns (${ref}), season leaderboard backup data-cache-2026-10-02`, BACKUP.from, BACKUP.to);
const MLB_SABR = (field) => src("mlb", `MLB Stats API stats?stats=sabermetrics${field ? ` (${field})` : ""}: FanGraphs' own figures (D34)`, null, null);
const MLB_SABR_GAP = src("mlb", "MLB Stats API people/{id}/stats sabermetrics, back to the 1880s, per-team rows included (HISTORY-GAPS)", null, null);
const MLB_PEOPLE = src("mlb", "MLB Stats API people/{id}/stats season rows, per-team rows included (HISTORY-GAPS)", null, null);
const MLB_PIT = (field) => ({ ...src("mlb", `MLB Stats API stats?stats=season&group=pitching${field ? ` (${field})` : ""}`, null, null), sides: ["pit"] });
const MLB_SBCS = only(src("mlb", "MLB Stats API pitcher stolenBases / caughtStealing / battersFaced (HISTORY-GAPS: 1985 on)", 1985, null), "pit");
const MLB_SPL = (what) => src("mlb", `MLB Stats API statSplits vl / vr${what ? `, ${what}` : ""} (HISTORY-GAPS: 1980 on, innings included)`, 1980, null);
const MLB_FLDINN = src("mlb", "MLB Stats API fielding innings by position (HISTORY-GAPS)", null, null);
const SAV = (board, from, ref) => src("savant", `Baseball Savant ${ref ?? board} (board ${board})`, from, null);
const SAV_STATCAST_BAT = only(SAV("statcast_bat", 2015, "Statcast leaderboard, batters (ev50, avg_hit_speed, brl_pa, ev95percent)"), "bat");
const SAV_XSTATS_PIT = only(SAV("xstats_pit", 2015, "expected_statistics leaderboard, pitchers (woba, est_woba, xera)"), "pit");
const SAV_ARSENAL = (col, type = "pitcher") => only(src("savant", `Baseball Savant pitch-arsenal-stats leaderboard, type=${type} (${col})`, 2017, null), type === "batter" ? "bat" : "pit");
const SAV_ALT = (col) => ({ ...only(src("savant", `Baseball Savant Statcast leaderboard, batters (${col}); SAVANT_ALT in lib/statmeta.mjs`, 2015, null), "bat"), label: "Savant" });
const SAV_PITCHSEARCH = (what) => src("savant", `Baseball Savant statcast_search pitch search (${what}; matches FanGraphs, scout 2026-10-02)`, 2008, null);
const SAV_OAA = src("savant", "Baseball Savant Outs Above Average (D34; 74 of 113 matched FanGraphs, rest unexamined)", 2016, null);
const SAV_FRV = lab(src("savant", "Baseball Savant fielding-run-value (D35, in place of DRS)", 2016, null), "substitute", "Baseball Savant Fielding Run Value, in place of DRS");
const SAV_MIX_LIVE = (what) => src("savant", `Baseball Savant pitch mix (${what}; D34 in-season)`, 2017, null);
const SAV_BB_LIVE = lab(src("savant", "Baseball Savant batted-ball mix (D34: a few points off FanGraphs' definitions; endpoint not yet in the code)", 2015, null),
  "substitute", "Baseball Savant's batted-ball definition, a few points off FanGraphs'");
const CMP = (ref, from = null, to = null) => src("computed", ref, from, to);

// percentile population from statmeta's pop flag and roles (statmeta owns which stats get one)
function popOf(m) {
  if (!m || !m.pop) return null;
  const b = m.roles.includes("bat"), p = m.roles.includes("sp") || m.roles.includes("rp");
  const parts = [];
  if (b) parts.push(`hitters with enough playing time that season (${GROUP_MIN.bat.value} PA in a full season)`);
  if (p) parts.push(`starters or relievers with enough innings that season (${GROUP_MIN.sp.value} IP as a starter, ${GROUP_MIN.rp.value} in relief, in a full season), by the role of most of his innings (D13)`);
  return parts.join("; ");
}

// ---- the catalog --------------------------------------------------------------------------------
const LIST = [];
const pair = (x) => (Array.isArray(x) ? { bat: x[0] ?? null, pit: x[1] ?? null } : { bat: x ?? null, pit: x ?? null });
const list = (x, sides) => (x == null ? [] : Array.isArray(x) ? x : [x]).map((s) => ({ ...s, sides: [...(s.sides ?? sides)] }));
/** cat and st are [bat, pit] pairs (st defaults to off); past/live/gap/alt are a source object, a list of them, or null. */
function S(id, o) {
  const m = STATS[id];
  const cat = pair(o.cat ?? [null, null]);
  const st = pair(o.st ?? ["off", "off"]);
  const sides = ["bat", "pit"].filter((s) => cat[s] != null);
  LIST.push({
    id, label: o.label ?? m?.label ?? id, short: o.short ?? id, aliases: o.aliases ?? [],
    cat, sides, scope: o.scope ?? "season", tile: o.tile ?? "tile", fmt: o.fmt, chart: !!o.chart,
    src: { past: list(o.past, sides), live: list(o.live, sides), gap: list(o.gap, sides) }, alt: list(o.alt, sides),
    years: { from: o.from ?? null, to: o.to ?? null }, pctPop: o.pctPop !== undefined ? o.pctPop : popOf(m),
    rulings: o.rulings ?? [], fetch: o.fetch ?? true, defaultState: { bat: st.bat ?? "off", pit: st.pit ?? "off" },
    elsewhere: o.elsewhere ?? [], meta: !!m, combine: o.combine ?? ((o.scope ?? "season") === "count" ? "sum" : null), note: o.note ?? null,
  });
}
const plainFg = (from) => ({ past: FG_LB(from), gap: MLB_PEOPLE });

const SIERA_LABEL = "SIERA computed from Baseball Savant counts with FanGraphs' formula";

// How good (hitters) / Run prevention (pitchers)
S("wRC+", { cat: ["how", null], st: ["main", "off"], fmt: "int", chart: true, past: FG_LB(), live: MLB_SABR("wRcPlus"), gap: MLB_SABR_GAP, rulings: ["D12", "D20", "D34"], elsewhere: ["home", "team"] });
S("wOBA", { cat: ["how", null], st: ["main", "off"], fmt: "f3", chart: true, past: FG_LB(), live: MLB_SABR(), gap: MLB_SABR_GAP, rulings: ["D8", "D20", "D34"], elsewhere: ["team"] });
S("xwOBA", { cat: ["how", null], st: ["on", "off"], fmt: "f3", chart: true, past: FG_LB(2015), from: 2015, rulings: ["D9"], note: "In-season source not named in the documents." });
S("Off", { label: "Offense runs (FanGraphs Off)", cat: ["how", null], fmt: "runs", combine: "sum", ...plainFg(), rulings: ["D26"], note: "Hidden by D26; the build still carries it on the line." });
S("WAR", { label: "Wins above replacement", cat: ["how", "prev"], fmt: "f1", combine: "sum", past: FG_LB(), live: MLB_SABR(), gap: MLB_SABR_GAP, rulings: ["D26", "D34"], note: "Hidden by D26; the bulk slice does not keep it." });
S("SIERA", { cat: [null, "prev"], st: ["off", "main"], fmt: "f2", chart: true, past: FG_LB(),
  live: lab(CMP("FanGraphs' newer SIERA formula from Baseball Savant batted-ball counts, yearly constant set so league SIERA equals league ERA (D35)", 2015), "computed", SIERA_LABEL),
  gap: lab(CMP("same computed SIERA for seasons and rows the backup lacks (D35)", 2015), "computed", SIERA_LABEL), from: 2002,
  rulings: ["D7", "D13", "D20", "D35"], elsewhere: ["home", "team"], note: "Within 0.15 of FanGraphs for 93% of 2026 pitchers (scout)." });
S("xFIP", { cat: [null, "prev"], st: ["off", "main"], fmt: "f2", chart: true, past: FG_LB(), live: MLB_SABR(), gap: MLB_SABR_GAP, rulings: ["D7", "D20", "D34"] });
S("FIP", { cat: [null, "prev"], st: ["off", "main"], fmt: "f2", chart: true, past: FG_LB(), live: MLB_SABR(), gap: MLB_SABR_GAP, rulings: ["D7", "D34"] });
S("xERA", { cat: [null, "prev"], st: ["off", "on"], fmt: "f2", past: FG_LB(2015), live: SAV_XSTATS_PIT, gap: SAV_XSTATS_PIT, from: 2015, note: "Savant xERA agrees with FanGraphs' (README)." });
S("ERA", { cat: [null, "career"], st: ["off", "on"], fmt: "f2", past: FG_LB(), live: MLB_PIT(), gap: MLB_PEOPLE, rulings: ["D31"], note: "Only in the pitcher's season-by-season career table (D31)." });
S("ERA-", { cat: [null, "prev"], fmt: "int", past: FG_LB(), rulings: ["D31"], note: "Retired by D31." });
S("FIP-", { cat: [null, "prev"], st: ["off", "on"], fmt: "int", past: FG_LB(), rulings: ["D20"] });
S("xFIP-", { cat: [null, "prev"], st: ["off", "on"], fmt: "int", past: FG_LB(), rulings: ["D20"] });
S("HR/9", { cat: [null, "res"], st: ["off", "on"], fmt: "f2", past: FG_LB(), live: MLB_PIT(), gap: MLB_PEOPLE, elsewhere: ["team"] });
S("K/9", { cat: [null, "kbb"], fmt: "f2", past: FG_LB(), elsewhere: ["team"], note: "Team page rankings only (RosterResource)." });
S("BB/9", { cat: [null, "kbb"], fmt: "f2", past: FG_LB(), elsewhere: ["team"], note: "Team page rankings only (RosterResource)." });
S("H/9", { cat: [null, "res"], fmt: "f2", past: FG_LB(), elsewhere: ["team"], note: "Team page rankings only (RosterResource)." });
S("Stuff+", { cat: [null, "mix"], fmt: "int", past: FG_LB(2020), from: 2020, note: "Discussed, never shown; FanGraphs-only." });

// Results against (pitchers)
S("wOBA against", { short: "wOBA", cat: [null, "res"], st: ["off", "main"], fmt: "f3", chart: true, from: BACKUP.splitsFrom,
  past: lab(FG_PITSPL, "combined", "FanGraphs' vs-left and vs-right lines combined by plate appearances"), rulings: ["D7", "D20"],
  alt: { ...SAV_XSTATS_PIT, label: "Savant", stat: "wOBA against (Savant)" },
  note: "In-season source not named (D35's computed vs-hand wOBA is the likely route; not ruled for wOBA against)." });
S("xwOBA against", { short: "xwOBA", cat: [null, "res"], st: ["off", "on"], fmt: "f3", past: SAV_XSTATS_PIT, live: SAV_XSTATS_PIT, from: 2015, rulings: ["D18"] });
S("wOBA against (Savant)", { cat: [null, "res"], st: ["off", "on"], fmt: "f3", past: SAV_XSTATS_PIT, live: SAV_XSTATS_PIT, from: 2015, rulings: ["D7"],
  note: "Shown as the small 'Savant' figure under wOBA against in expanded tables (season.alt)." });
S("AVG", { cat: ["plain", "res"], fmt: "f3", combine: "rate", past: FG_LB(), gap: MLB_PEOPLE, rulings: ["D26"], note: "Off on the starting page (D26); the adapter keeps it in the data, so a switch can show it (D36)." });
S("OBP", { cat: ["plain", null], fmt: "f3", combine: "rate", past: FG_LB(), gap: MLB_PEOPLE, rulings: ["D26"], note: "Off on the starting page (D26); kept in the data, so a switch can show it (D36)." });
S("SLG", { cat: ["power", null], fmt: "f3", combine: "rate", past: FG_LB(), gap: MLB_PEOPLE, rulings: ["D26"], note: "Off on the starting page (D26); kept in the data, so a switch can show it (D36)." });
S("OPS", { cat: ["plain", null], fmt: "f3", combine: "rate", past: FG_LB(), gap: MLB_PEOPLE, rulings: ["D26"], note: "Off on the starting page (D26); on the build's line and kept in the data, so a switch can show it (D36)." });
S("LOB%", { cat: [null, "batted"], st: ["off", "main"], fmt: "pct", chart: true, past: FG_LB(), rulings: ["D12", "D30"], note: "Mean-reverting; never split by hand (D30)." });

// Power (hitters)
S("ISO", { cat: ["power", null], st: ["main", "off"], fmt: "f3", chart: true, past: FG_LB(), gap: MLB_PEOPLE });
S("HR/PA", { cat: ["power", null], st: ["on", "off"], fmt: "pct", chart: true, past: FG_LB(), gap: MLB_PEOPLE, rulings: ["D9"] });
S("xHR", { label: "Expected home runs", cat: ["power", null], st: ["on", "off"], scope: "count", tile: "count", fmt: "f1", past: SAV("hr", 2016, "home-runs leaderboard (xhr)"), live: SAV("hr", 2016, "home-runs leaderboard (xhr)"), from: 2016, rulings: ["D18"] });
S("xHR/PA", { cat: ["power", null], st: ["on", "off"], fmt: "pct", chart: true, past: SAV("hr", 2016, "home-runs leaderboard (xhr) over FanGraphs PA"), live: SAV("hr", 2016, "home-runs leaderboard (xhr)"), from: 2016, rulings: ["D18"] });
S("No-doubters", { cat: ["power", null], st: ["on", "off"], scope: "count", tile: "count", fmt: "int", past: SAV("hr", 2016, "home-runs leaderboard (no_doubters)"), live: SAV("hr", 2016, "home-runs leaderboard (no_doubters)"), from: 2016, rulings: ["D18"] });
S("No-doubter%", { cat: ["power", null], st: ["on", "off"], fmt: "pct", chart: true, past: SAV("hr", 2016, "home-runs leaderboard (no_doubters ÷ hr_total)"), live: SAV("hr", 2016, "home-runs leaderboard"), from: 2016, rulings: ["D18"] });

// Contact quality (hitters; pitchers file it under batted ball & contact against)
const SAV_LIVE = lab(SAV_STATCAST_BAT, "substitute", "Baseball Savant figure");
S("EV", { short: "Exit velo", cat: ["contact", "batted"], st: ["main", "on"], fmt: "f1", chart: true, past: FG_LB(2015), live: SAV_LIVE, alt: SAV_ALT("avg_hit_speed"), from: 2015,
  rulings: ["D9", "D34"], note: "Hitters only in season: no pitcher Statcast board is named in the project yet." });
S("LA", { cat: ["contact", "batted"], fmt: "deg", past: FG_LB(2015), from: 2015, note: "Formatted in render.js but in no view." });
S("Barrel%", { cat: ["contact", "batted"], st: ["main", "main"], fmt: "pct", chart: true, past: FG_LB(2015), live: SAV_LIVE, alt: SAV_ALT("brl_percent"), from: 2015,
  rulings: ["D9", "D34"], note: "Hitters only in season: no pitcher Statcast board is named in the project yet." });
S("HardHit%", { cat: ["contact", "batted"], st: ["main", "main"], fmt: "pct", chart: true, past: FG_LB(2015), live: SAV_LIVE, alt: SAV_ALT("ev95percent"), from: 2015,
  rulings: ["D9", "D20", "D34"], note: "Hitters only in season: no pitcher Statcast board is named in the project yet." });
S("EV50", { cat: ["contact", null], st: ["on", "off"], fmt: "f1", chart: true, past: SAV_STATCAST_BAT, live: SAV_STATCAST_BAT, from: 2015, rulings: ["D9", "D18"] });
S("Brl/PA", { cat: ["contact", null], st: ["on", "off"], fmt: "pct", chart: true, past: FG_LB(2015), live: SAV_LIVE, alt: SAV_ALT("brl_pa"), from: 2015, rulings: ["D18"] });
S("xAVG", { cat: ["contact", null], fmt: "f3", past: FG_LB(2015), from: 2015, rulings: ["D26"], note: "Carried by statmeta, in no view." });
S("xSLG", { cat: ["contact", null], fmt: "f3", past: FG_LB(2015), from: 2015, rulings: ["D26"], note: "Carried by statmeta, in no view." });
S("maxEV", { label: "Maximum exit velocity", cat: ["contact", "batted"], fmt: "f1", combine: "max", past: FG_LB(2015), from: 2015, rulings: ["D9"], note: "Off on the starting page (D9); the adapter keeps it in the data, so a switch can show it (D36)." });
S("EV90", { cat: ["contact", "batted"], fmt: "f1", past: FG_LB(2015), from: 2015, note: "On the build's split rows, in no view." });
S("Soft%", { cat: ["contact", "batted"], st: ["on", "on"], fmt: "pct", past: FG_LB(2002), from: 2002 });
S("Med%", { cat: ["contact", "batted"], st: ["on", "on"], fmt: "pct", past: FG_LB(2002), from: 2002 });
S("Hard%", { cat: ["contact", "batted"], st: ["on", "on"], fmt: "pct", past: FG_LB(2002), from: 2002 });
S("Bat speed", { cat: ["contact", null], fmt: "f1", past: src("savant", "Baseball Savant bat tracking (endpoint not recorded in the project)", null, null), rulings: ["D18"], note: "Not used (D18)." });
S("Blasts", { cat: ["contact", null], fmt: "pct", past: src("savant", "Baseball Savant bat tracking (endpoint not recorded in the project)", null, null), rulings: ["D18"], note: "Not used (D18)." });
S("Swing path", { cat: ["contact", null], fmt: "deg", past: src("savant", "Baseball Savant bat tracking (endpoint not recorded in the project)", null, null), rulings: ["D18"], note: "Not used (D18)." });

// Strikeouts & walks
S("K%", { cat: ["kbb", "kbb"], st: ["main", "main"], fmt: "pct", chart: true, past: FG_LB(), live: src("savant", "Baseball Savant K% (D34: matches FanGraphs)", 2015, null), gap: MLB_PEOPLE, rulings: ["D8", "D20", "D34"], elsewhere: ["team"] });
S("BB%", { cat: ["kbb", "kbb"], st: ["main", "main"], fmt: "pct", chart: true, past: FG_LB(), live: src("savant", "Baseball Savant BB% (D34: matches FanGraphs)", 2015, null), gap: MLB_PEOPLE, rulings: ["D8", "D20", "D34"], elsewhere: ["team"] });
S("K-BB%", { cat: [null, "kbb"], st: ["off", "main"], fmt: "pct", chart: true, past: FG_LB() });

// Plate discipline
const PS = (what) => lab(SAV_PITCHSEARCH(what), "computed", "computed from Baseball Savant's pitch search");
const PD_NOTE = "In-season source not ruled: Savant plate discipline is a candidate, but the two scouts disagree on its gap to FanGraphs (within 0.3 points vs 1 to 6 points).";
S("SwStr%", { cat: ["disc", "disc"], st: ["main", "main"], fmt: "pct", chart: true, past: FG_LB(2002), gap: src("mlb", "MLB Stats API seasonAdvanced swing and whiff counts (HISTORY-GAPS: 1998/2002 on)", 2002, null), from: 2002, rulings: ["D8"], note: PD_NOTE + " Savant's SwStr% is per swing, a different stat." });
S("C+SwStr%", { short: "CSW%", aliases: ["CSW%"], cat: [null, "disc"], st: ["off", "main"], fmt: "pct", chart: true, past: FG_LB(2002), live: PS("called plus swinging strikes ÷ pitches"), gap: PS("called plus swinging strikes ÷ pitches"), from: 2002, rulings: ["D35"], note: "Not in the hitter data." });
S("CStr%", { cat: ["disc", "disc"], st: ["on", "on"], fmt: "pct", past: FG_LB(2002), live: PS("called strikes ÷ pitches"), gap: PS("called strikes ÷ pitches"), from: 2002, rulings: ["D35"] });
for (const [id, bat, pit] of [["O-Swing%", "main", "main"], ["Z-Swing%", "on", "on"], ["Swing%", "on", "on"], ["O-Contact%", "on", "on"],
  ["Z-Contact%", "main", "on"], ["Contact%", "on", "on"], ["Zone%", "on", "main"], ["F-Strike%", "on", "on"]]) {
  S(id, { short: id === "O-Swing%" ? "Chase" : id, cat: ["disc", "disc"], st: [bat, pit], fmt: "pct", chart: true, past: FG_LB(2002), from: 2002, rulings: ["D8"], note: PD_NOTE });
}
for (const [id, short, f] of [["Swing-take runs", "All zones", "runs_all"], ["Heart runs", "Heart", "runs_heart"], ["Shadow runs", "Shadow", "runs_shadow"],
  ["Chase runs", "Chase", "runs_chase"], ["Waste runs", "Waste", "runs_waste"]]) {
  S(id, { short, cat: ["disc", null], st: ["on", "off"], fmt: "runs", chart: id === "Swing-take runs", past: SAV("swingtake", 2008, `swing-take leaderboard (${f})`),
    live: SAV("swingtake", 2008, `swing-take leaderboard (${f})`), from: 2008, rulings: ["D18"] });
}

// Batted ball
const BBMIX = (id, st, o = {}) => S(id, { cat: ["batted", "batted"], st, fmt: "pct", past: FG_LB(2002), from: 2002, ...o });
const BBALT = { live: SAV_BB_LIVE, rulings: ["D8", "D34"] };
BBMIX("GB%", ["on", "main"], { chart: true, ...BBALT, rulings: ["D7", "D8", "D12", "D34"] });
BBMIX("LD%", ["on", "main"], { chart: true, ...BBALT });
BBMIX("FB%", ["main", "main"], { short: "Fly ball%", chart: true, ...BBALT });
BBMIX("IFFB%", ["on", "on"]);
BBMIX("HR/FB", ["main", "main"], { chart: true, live: lab(CMP("HR ÷ fly balls (D34)", 2015), "computed", "HR ÷ fly balls, computed"), rulings: ["D8", "D12", "D34"] });
S("BABIP", { cat: ["batted", "batted"], st: ["main", "main"], fmt: "f3", chart: true, past: FG_LB(), live: src("savant", "Baseball Savant BABIP (D34: matches FanGraphs)", 2015, null), gap: MLB_PEOPLE, rulings: ["D8", "D12", "D34"] });
BBMIX("Pull%", ["on", "on"], { chart: true, ...BBALT });
BBMIX("Cent%", ["on", "on"]);
BBMIX("Oppo%", ["on", "on"]);
BBMIX("GB/FB", ["off", "off"], { fmt: "f2", note: "On the build's split rows, in no view." });
BBMIX("IFH%", ["off", "off"], { note: "On the build's split rows, in no view." });
BBMIX("BUH%", ["off", "off"], { note: "On the build's split rows, in no view." });

// Running
S("Spd", { cat: ["run", null], st: ["on", "off"], fmt: "f1", chart: true, past: FG_LB(), live: MLB_SABR(), gap: MLB_SABR_GAP, rulings: ["D17", "D34"] });
S("Sprint speed", { short: "Sprint", aliases: ["Sprint"], cat: ["run", null], st: ["main", "off"], fmt: "ftps", chart: true, past: SAV("sprint", 2015, "sprint_speed leaderboard"), live: SAV("sprint", 2015, "sprint_speed leaderboard"), from: 2015, rulings: ["D17", "D18"] });
S("SB/OB", { cat: ["run", null], st: ["on", "off"], fmt: "pct", chart: true, past: FG_LB(), gap: MLB_PEOPLE, rulings: ["D17"] });
S("SBA/PA", { short: "Att/PA", aliases: ["Att/PA"], cat: ["run", null], st: ["main", "off"], fmt: "pct", chart: true, past: FG_LB(), gap: MLB_PEOPLE, rulings: ["D17"] });
S("SB/PA", { cat: ["run", null], st: ["on", "off"], fmt: "pct", chart: true, past: FG_LB(), gap: MLB_PEOPLE, rulings: ["D17"] });
S("SB%", { cat: ["run", null], st: ["main", "off"], fmt: "pct", chart: true, past: FG_LB(), gap: MLB_PEOPLE, rulings: ["D17"] });
S("CS%", { cat: ["run", "run"], st: ["on", "on"], fmt: "pct", chart: true, past: [only(FG_LB(), "bat"), MLB_SBCS], live: MLB_PIT("caughtStealing, stolenBases"), gap: only(MLB_PEOPLE, "bat"), rulings: ["D17"], note: "Hitters from FanGraphs counts; pitchers from MLB's counts." });
S("CS", { label: "Caught stealing", cat: ["run", null], st: ["on", "off"], scope: "count", tile: "count", fmt: "int", past: FG_LB(), gap: MLB_PEOPLE, rulings: ["D17"] });
S("wBsR", { label: "Weighted baserunning runs", cat: ["run", null], st: ["on", "off"], fmt: "runs", chart: true, past: FG_LB(2002), from: 2002, note: "League = 0 (runs above average). In-season source not named." });
S("SB allowed", { short: "SB", cat: [null, "run"], st: ["off", "on"], scope: "count", tile: "count", fmt: "int", past: MLB_SBCS, live: MLB_PIT("stolenBases"), from: 1985, rulings: ["D17"] });
S("CS against", { short: "CS", cat: [null, "run"], st: ["off", "on"], scope: "count", tile: "count", fmt: "int", past: MLB_SBCS, live: MLB_PIT("caughtStealing"), from: 1985, rulings: ["D17"] });
S("SB/100BF", { cat: [null, "run"], st: ["off", "on"], fmt: "f2", chart: true, past: MLB_SBCS, live: MLB_PIT("stolenBases, battersFaced"), from: 1985, rulings: ["D17"] });
S("SBA/100BF", { cat: [null, "run"], st: ["off", "on"], fmt: "f2", chart: true, past: MLB_SBCS, live: MLB_PIT("stolenBases, caughtStealing, battersFaced"), from: 1985, rulings: ["D17"] });
S("pickoffs", { label: "Pickoffs", short: "Pickoffs", cat: [null, "run"], st: ["off", "on"], scope: "count", tile: "count", fmt: "int", past: MLB_PIT("pickoffs"), live: MLB_PIT("pickoffs"), rulings: ["D17"],
  note: "Savant's pitcher-running-game board (n_pk) is a provisional alternative (README)." });
S("battersFaced", { label: "Batters faced (MLB)", cat: [null, "run"], scope: "count", tile: "count", fmt: "int", past: MLB_PIT("battersFaced"), live: MLB_PIT("battersFaced"), note: "The denominator of the pitcher running rates; not shown." });

// Defense (hitters)
const FLD = (id, o) => S(id, { cat: ["def", null], scope: "position", tile: "count", ...o });
FLD("fld.OAA/1000", { label: "OAA per 1,000 innings at the position", short: "OAA/1000", tile: "tile", st: ["main", "off"], fmt: "f1", past: FG_FLD(2016), live: SAV_OAA, gap: SAV_OAA, from: 2016,
  pctPop: "FanGraphs' qualified fielders at the same position, same rate (D21)", rulings: ["D21"], note: "Formula: OAA ÷ innings × 1,000. Drives the fielding colour." });
FLD("OAA", { label: "Outs above average", st: ["main", "off"], fmt: "runs", past: FG_FLD(2016), live: SAV_OAA, gap: SAV_OAA, from: 2016, rulings: ["D21", "D34"], elsewhere: ["team"], note: "Raw count beside the rate; catchers have none." });
FLD("fld.inn", { label: "Innings at the position", short: "Inn", st: ["main", "off"], fmt: "int", past: FG_FLD(), gap: MLB_FLDINN, rulings: ["D21"] });
FLD("DRS", { label: "Defensive runs saved", st: ["main", "off"], fmt: "runs", past: FG_FLD(2003), from: 2003, rulings: ["D21", "D35"], elsewhere: ["team"],
  note: "No free source after the backup; Fielding Run Value replaces it (D35). Today it still sits beside OAA on the fielding tile." });
FLD("FRV", { label: "Fielding Run Value (Savant)", fmt: "runs", past: SAV_FRV, live: SAV_FRV, from: 2016, rulings: ["D35"], note: "Approved by D35, not yet built." });
S("Def", { label: "FanGraphs Def (fielding runs with position adjustment)", short: "Def", aliases: ["Defense"], cat: ["def", null], st: ["on", "off"], fmt: "runs", chart: true, past: FG_LB(), rulings: ["D21"], elsewhere: ["team"], note: "Never coloured (D21)." });
FLD("FRP", { label: "FanGraphs FRP (fielding board)", fmt: "runs", past: FG_FLD(), elsewhere: ["team"], note: "Team page ranking column labelled 'FRV'; meaning not documented in the project." });
FLD("aFRP", { label: "Arm runs (team ranking)", short: "Arm", fmt: "runs", past: src("fg", "RosterResource team rankings (FanGraphs)", null, null), elsewhere: ["team"], note: "Team page only." });
FLD("RngR", { label: "Range runs (team ranking)", short: "Rng", fmt: "runs", past: src("fg", "RosterResource team rankings (FanGraphs)", null, null), elsewhere: ["team"], note: "Team page only." });
FLD("CFraming", { label: "Catcher framing runs", short: "Frm", fmt: "runs", past: FG_FLD(), elsewhere: ["team"], note: "On the build's fielding rows; team page ranking only." });
FLD("CStrikes", { label: "Catcher strikes (framing)", fmt: "runs", past: FG_FLD(), note: "On the build's fielding rows, in no view." });
FLD("rARM", { label: "Arm runs", fmt: "runs", past: FG_FLD(), note: "On the build's fielding rows, in no view." });
FLD("rPM", { label: "Plus-minus runs", fmt: "runs", past: FG_FLD(), note: "On the build's fielding rows, in no view." });
for (const [id, label] of [["PO", "Putouts"], ["A", "Assists"], ["E", "Errors"], ["DP", "Double plays"]]) FLD(id, { label, fmt: "int", past: FG_FLD(), note: "On the build's fielding rows, in no view." });
FLD("FP", { label: "Fielding percentage", tile: "tile", fmt: "f3", past: FG_FLD(), note: "On the build's fielding rows, in no view." });

// Pitch mix (pitchers) and pitches seen (hitters)
const PM = (id, o) => S(id, { cat: [null, "mix"], scope: "pitch", tile: "pitch", ...o });
PM("pitch.usage", { label: "Pitch usage", short: "Share", st: ["off", "main"], fmt: "pct", past: FG_PFX("pfx<c>%"), live: lab(SAV_MIX_LIVE("usage"), "substitute", "Baseball Savant usage"), from: 2007,
  alt: { ...SAV_ARSENAL("pitch_usage"), label: "Savant" }, rulings: ["D7", "D9", "D34"], note: "Savant and FanGraphs usage differ slightly (README open conflict)." });
PM("pitch.velo", { label: "Pitch velocity", short: "mph", st: ["off", "main"], fmt: "f1", past: FG_PFX("pfxv<c>"), live: lab(SAV_MIX_LIVE("velocity"), "substitute", "Baseball Savant velocity"), from: 2007, rulings: ["D7", "D18", "D34"] });
PM("pitch.rv100", { label: "Pitch run value per 100 (runs saved)", short: "Runs saved/100", aliases: ["RV"], st: ["off", "main"], fmt: "runs", past: FG_PFX("pfxw<c>/C"), from: 2007, rulings: ["D7", "D12"],
  note: "FanGraphs pitch values are FanGraphs-only (IN-SEASON-SOURCES); Savant run_value_per_100 is a different measure, not ruled." });
PM("pitch.spin", { label: "Spin rate", short: "Spin rpm", st: ["off", "on"], fmt: "int", past: FG_PFX("pfxsp<c>"), live: src("savant", "Baseball Savant pitch-arsenals leaderboard (type=avg_spin)", 2015, null), from: 2007, rulings: ["D18"] });
PM("pitch.hMov", { label: "Horizontal break", short: "H break in", st: ["off", "on"], fmt: "f1", past: FG_PFX("pfx<c>-X"), live: src("savant", "Baseball Savant pitch-movement leaderboard (pitcher_break_x)", 2015, null), from: 2007, rulings: ["D18"] });
PM("pitch.vMov", { label: "Vertical break", short: "V break in", st: ["off", "on"], fmt: "f1", past: FG_PFX("pfx<c>-Z"), live: src("savant", "Baseball Savant pitch-movement leaderboard (pitcher_break_z)", 2015, null), from: 2007, rulings: ["D18"] });
PM("pitch.whiff", { label: "Whiff% by pitch", short: "Whiff%", st: ["off", "on"], fmt: "pct", past: SAV_ARSENAL("whiff_percent"), live: SAV_ARSENAL("whiff_percent"), from: 2017,
  pctPop: `the same pitch type that season from starters or relievers with enough innings (${GROUP_MIN.sp.value} IP as a starter, ${GROUP_MIN.rp.value} in relief, in a full season) and 100+ pitches of that type`, rulings: ["D18"] });
PM("pitch.putAway", { label: "Put-away% by pitch", short: "Put-away%", st: ["off", "on"], fmt: "pct", past: SAV_ARSENAL("put_away"), live: SAV_ARSENAL("put_away"), from: 2017,
  pctPop: `the same pitch type that season from starters or relievers with enough innings (${GROUP_MIN.sp.value} IP as a starter, ${GROUP_MIN.rp.value} in relief, in a full season) and 100+ pitches of that type`, rulings: ["D18"] });
PM("pitch.extension", { label: "Extension", fmt: "f1", past: src("savant", "Baseball Savant extension download (README: broken, unverified)", null, null), fetch: false, rulings: ["D18"], note: "No working source (README)." });
const SEEN = (id, o) => S(id, { cat: ["pitch", null], scope: "pitch", tile: "pitch", ...o });
SEEN("seen.usage", { label: "Share of pitches seen", short: "Share seen", st: ["main", "off"], fmt: "pct", past: FG_PFX("pfx<c>% on hitter rows"), live: lab(SAV_ARSENAL("pitch_usage", "batter"), "substitute", "Baseball Savant usage"), from: 2007, rulings: ["D8", "D9"] });
SEEN("seen.rv100", { label: "Runs gained per 100 pitches of the type", short: "Runs gained/100", st: ["main", "off"], fmt: "runs", past: FG_PFX("pfxw<c>/C on hitter rows"), from: 2007, rulings: ["D8", "D12"],
  note: "Savant batter run_value_per_100 is a candidate; sign unverified (README)." });

// vs L/R (scope split)
const HC = (what) => lab(MLB_SPL(what), "computed", "computed from MLB split counts with FanGraphs' formulas");
const HNOTE = "Hitters: no FanGraphs source (the backup has no hitter vs-hand splits and D30 bars per-player downloads), so every season comes from the gap source.";
const FIP_LABEL = "computed FIP: (13×HR + 3×(BB+HBP) − 2×SO) ÷ IP + FIP constant";
const HB = (id, o) => S(id, { scope: "split", tile: "pair", ...o });
HB("hand.PA", { label: "PA (batters faced) vs hand", short: "PA", cat: ["hand", "hand"], st: ["main", "main"], tile: "count", fmt: "int", past: FG_PITSPL, live: MLB_SPL(), gap: MLB_SPL(), rulings: ["D9"], note: "Pitchers: batters faced (TBF). " + HNOTE });
HB("hand.wRC+", { label: "wRC+ vs hand", short: "wRC+", cat: ["hand", null], st: ["main", "off"], fmt: "int", live: HC("wRC+"), gap: HC("wRC+"), rulings: ["D9", "D30", "D35"], note: "Career vs-hand wRC+ is weighted by each season's PA (D30). " + HNOTE });
HB("hand.wOBA", { label: "wOBA vs hand", short: "wOBA", cat: ["hand", null], st: ["on", "off"], fmt: "f3", live: HC("wOBA"), gap: HC("wOBA"), rulings: ["D9", "D35"], note: HNOTE });
HB("hand.ISO", { label: "ISO vs hand", short: "ISO", cat: ["hand", null], st: ["on", "off"], fmt: "f3", live: MLB_SPL("counts"), gap: MLB_SPL("counts"), rulings: ["D9"], note: HNOTE });
HB("hand.HR/PA", { label: "HR/PA vs hand", short: "HR/PA", cat: ["hand", null], st: ["on", "off"], fmt: "pct", live: MLB_SPL("counts"), gap: MLB_SPL("counts"), rulings: ["D9"], note: HNOTE });
HB("hand.K%", { label: "K% vs hand", short: "K%", cat: ["hand", "hand"], st: ["on", "on"], fmt: "pct", past: FG_PITSPL, live: MLB_SPL("counts"), gap: MLB_SPL("counts"), rulings: ["D9"], note: HNOTE });
HB("hand.BB%", { label: "BB% vs hand", short: "BB%", cat: ["hand", "hand"], st: ["on", "on"], fmt: "pct", past: FG_PITSPL, live: MLB_SPL("counts"), gap: MLB_SPL("counts"), rulings: ["D9"], note: HNOTE });
HB("hand.HardHit%", { label: "HardHit% vs hand", short: "HardHit%", cat: ["hand", "hand"], st: ["on", "on"], fmt: "pct", past: FG_PITSPL, rulings: ["D9"], note: "Pitchers from the splits leaderboard backup; hitters have no source today (the backup has no hitter vs-hand splits, D30 bars per-player downloads, and MLB split counts carry no hard-hit data)." });
HB("hand.wOBA against", { label: "wOBA against vs hand", short: "wOBA", cat: [null, "hand"], st: ["off", "main"], fmt: "f3", past: FG_PITSPL, live: HC("wOBA"), gap: HC("wOBA"), from: BACKUP.splitsFrom, rulings: ["D7", "D30", "D35"],
  note: "Past figure is FanGraphs' own split row; live and gap are D35's computed route." });
HB("hand.FIP", { label: "FIP vs hand", short: "FIP", cat: [null, "hand"], st: ["off", "on"], fmt: "f2",
  past: lab(CMP("(13×HR + 3×(BB+HBP) − 2×SO) ÷ IP + that season's FanGraphs FIP constant; counts from FanGraphs' pitcher splits leaderboard, innings from MLB's league-wide splits (D30)", BACKUP.splitsFrom, BACKUP.to), "computed", FIP_LABEL),
  live: lab(MLB_SPL("counts and innings, FIP formula of D30"), "computed", FIP_LABEL), gap: lab(MLB_SPL("counts and innings, FIP formula of D30"), "computed", FIP_LABEL), rulings: ["D30"] });
HB("hand.K-BB%", { label: "K-BB% vs hand", short: "K-BB%", cat: [null, "hand"], st: ["off", "on"], fmt: "pct", past: FG_PITSPL, live: MLB_SPL("counts"), gap: MLB_SPL("counts"), rulings: ["D9"] });
HB("hand.GB%", { label: "GB% vs hand", short: "GB%", cat: [null, "hand"], st: ["off", "on"], fmt: "pct", past: FG_PITSPL, rulings: ["D9"] });

// The plain line (counts)
const PL = (id, label, st, o = {}) => S(id, { label, cat: o.cat ?? ["plain", "plain"], st, scope: "count", tile: "count", fmt: "int", past: FG_LB(), gap: MLB_PEOPLE, rulings: ["D22"], ...o });
const PITLIVE = { live: MLB_PIT() };
PL("G", "Games", ["main", "main"], PITLIVE);
PL("PA", "Plate appearances", ["main", "off"], { cat: ["plain", null], elsewhere: ["home", "team"] });
PL("AB", "At-bats", ["off", "off"], { cat: ["plain", null] });
PL("H", "Hits", ["main", "main"], PITLIVE);
PL("1B", "Singles", ["off", "off"], { cat: ["plain", null] });
PL("2B", "Doubles", ["off", "off"], { cat: ["plain", null] });
PL("3B", "Triples", ["off", "off"], { cat: ["plain", null] });
PL("HR", "Home runs", ["main", "main"], { chart: false, elsewhere: ["team"], ...PITLIVE, note: "Pitchers: home runs allowed." });
PL("R", "Runs", ["main", "off"], { elsewhere: ["team"], ...PITLIVE, note: "Pitchers: runs allowed, carried but not shown." });
PL("RBI", "Runs batted in", ["main", "off"], { cat: ["plain", null] });
PL("SB", "Stolen bases", ["main", "off"], { cat: ["plain", null], elsewhere: ["team"], rulings: ["D17", "D22"] });
PL("BB", "Walks", ["main", "main"], PITLIVE);
PL("IBB", "Intentional walks", ["off", "off"], { cat: ["plain", null] });
PL("SO", "Strikeouts", ["main", "main"], PITLIVE);
PL("HBP", "Hit by pitch", ["off", "off"], PITLIVE);
PL("SF", "Sacrifice flies", ["off", "off"], { cat: ["plain", null] });
PL("W", "Wins", ["off", "main"], { cat: [null, "plain"], ...PITLIVE });
PL("L", "Losses", ["off", "main"], { cat: [null, "plain"], ...PITLIVE });
PL("GS", "Games started", ["off", "main"], { cat: [null, "plain"], ...PITLIVE });
PL("SV", "Saves", ["off", "main"], { cat: [null, "plain"], elsewhere: ["team"], ...PITLIVE, note: "Panel shows saves for a career mostly in relief." });
PL("HLD", "Holds", ["off", "main"], { cat: [null, "plain"], elsewhere: ["team"], ...PITLIVE, note: "Panel shows holds for a career mostly in relief." });
PL("BS", "Blown saves", ["off", "off"], { cat: [null, "plain"], ...PITLIVE });
PL("IP", "Innings pitched", ["off", "main"], { cat: [null, "plain"], fmt: "ip", elsewhere: ["home", "team"], live: MLB_PIT("inningsPitched") });
PL("TBF", "Batters faced", ["off", "on"], { cat: [null, "plain"], live: MLB_PIT("battersFaced"), note: "Shown in the PA column of pitcher tables, labelled TBF." });
PL("ER", "Earned runs", ["off", "off"], { cat: [null, "plain"], ...PITLIVE });
PL("Pitches", "Pitches thrown", ["off", "off"], { cat: [null, "plain"], gap: null, note: "Weight for pitch-level league averages." });
S("WHIP", { cat: [null, "plain"], st: ["off", "main"], fmt: "f2", past: FG_LB(), live: MLB_PIT(), gap: MLB_PEOPLE, rulings: ["D22"], elsewhere: ["team"] });
S("wRC", { label: "Weighted runs created", cat: ["how", null], scope: "count", tile: "count", fmt: "int", fetch: false, note: "On the build's hitter split rows (FanGraphs per-player splits pages, not in the backup; D30 bars per-player downloads), in no view." });
S("Events", { label: "Batted-ball events", cat: [null, "batted"], scope: "count", tile: "count", fmt: "int", past: FG_PITSPL, note: "Weight on pitcher split rows, in no view." });

export const CATALOG = LIST;
const BY = new Map();
for (const e of LIST) { BY.set(e.id, e); for (const a of e.aliases) if (!BY.has(a)) BY.set(a, e); }

// ---- widgets: composite boxes and the stat ids they draw ----------------------------------------
export const WIDGETS = {
  pitchMix: { title: "Pitch mix", sides: ["pit"], stats: ["pitch.usage", "pitch.velo", "pitch.rv100", "pitch.spin", "pitch.hMov", "pitch.vMov", "pitch.whiff", "pitch.putAway"] },
  pitchSeen: { title: "vs pitch types", sides: ["bat"], stats: ["seen.usage", "seen.rv100"] },
  hands: { title: "vs L / R", sides: ["bat", "pit"], stats: { bat: ["hand.PA", "hand.wOBA", "hand.wRC+", "hand.ISO", "hand.HR/PA", "hand.K%", "hand.BB%", "hand.HardHit%"],
    pit: ["hand.PA", "hand.wOBA against", "hand.FIP", "hand.K%", "hand.BB%", "hand.K-BB%", "hand.HardHit%", "hand.GB%"] } },
  careerTable: { title: "Season by season", sides: ["bat", "pit"], stats: {
    bat: ["PA", "wOBA", "xwOBA", "wRC+", "K%", "BB%", "SwStr%", "ISO", "HR", "HR/PA", "EV", "Barrel%", "HardHit%", "GB%", "LD%", "FB%", "HR/FB", "BABIP", "Pull%"],
    pit: ["TBF", "IP", "ERA", "FIP", "xFIP", "SIERA", "K%", "BB%", "K-BB%", "SwStr%", "wOBA against", "xwOBA against", "HardHit%", "Barrel%", "GB%", "LD%", "FB%", "HR/FB", "BABIP", "LOB%"] } },
  careerChart: { title: "Career chart", sides: ["bat", "pit"], stats: {
    bat: ["wRC+", "wOBA", "xwOBA", "ISO", "HR/PA", "K%", "BB%", "Barrel%", "HardHit%", "BABIP", "HR/FB", "SwStr%"],
    pit: ["SIERA", "xFIP", "FIP", "K%", "BB%", "K-BB%", "SwStr%", "HardHit%", "Barrel%", "GB%", "HR/FB", "BABIP", "LOB%", "wOBA against"] } },
  speedVisual: { title: "Speed", sides: ["bat"], stats: ["Sprint speed", "Spd", "SB", "CS", "SB/OB", "SBA/PA", "SB/PA", "SB%", "CS%", "wBsR"] },
  fieldingCard: { title: "Fielding", sides: ["bat"], stats: ["fld.OAA/1000", "OAA", "fld.inn", "DRS", "Def", "FRV"] },
  plainPanel: { title: "The plain line", sides: ["bat", "pit"], stats: {
    bat: ["HR", "RBI", "R", "SB", "G", "PA", "H", "BB", "SO"],
    pit: ["W", "L", "G", "GS", "SV", "HLD", "IP", "SO", "BB", "HR", "H", "WHIP"] } },
};

// ---- helpers --------------------------------------------------------------------------------------
/** The catalog entry for an id or alias, or null. */
export const byId = (id) => BY.get(id) ?? null;

const covers = (s, y, side) => (s.from == null || y >= s.from) && (s.to == null || y <= s.to) && s.sides.includes(side);
/** The source object for a stat in a season. In season: live, then gap. A finished season: past, then gap, then live,
 * where a FanGraphs source counts only when the caller says that FanGraphs figure exists for this player, season and
 * stat (hasFgFigure), so a computed or MLB figure is never labelled FanGraphs. side ("bat" | "pit") defaults to the
 * stat's only side; a two-sided stat whose sources differ by side throws without it. Null when nothing covers it. */
export function sourceFor(stat, season, { inSeason = false, hasFgFigure = false, side = null } = {}) {
  const e = typeof stat === "string" ? byId(stat) : stat;
  if (!e) return null;
  if (!side) {
    const split = Object.values(e.src).flat().some((s) => s.sides.length < e.sides.length);
    if (e.sides.length > 1 && split) throw new Error(`sourceFor(${e.id}): its sources differ by side, so pass side "bat" or "pit"`);
    side = e.sides[0];
  }
  const y = Number(season), ok = (s) => covers(s, y, side) && (s.provider !== "fg" || hasFgFigure);
  const order = inSeason ? [e.src.live, e.src.gap] : [e.src.past, e.src.gap, e.src.live];
  return order.flat().find(ok) ?? null;
}

/** statmeta's display metadata as plain JSON (no functions; league methods kept as text). */
export function statMetaOf(s) {
  return {
    key: s.key, label: s.label, dir: s.dir, indexed100: s.indexed100, meanReverting: s.meanReverting, style: s.style,
    strength: s.strength, formula: s.formula, source: s.source, roles: s.roles, pop: s.pop, provisional: s.provisional,
    leagueMethod: { bat: s.lg.bat?.method ?? null, pit: s.lg.pit?.method ?? null },
  };
}

/** The catalog as plain JSON keyed by id, each statmeta stat merged with statmeta's display metadata. */
export function catalogJson() {
  return Object.fromEntries(LIST.map((e) => {
    const m = STATS[e.id];
    return [e.id, m ? { ...statMetaOf(m), ...structuredClone(e), label: e.label } : structuredClone(e)];
  }));
}
