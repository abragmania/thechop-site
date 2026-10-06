// TheChop stat metadata: one entry per stat the page shows, shared by the build and (later) the browser.
//
// Each entry:
//   label        plain name shown on the page (FanGraphs' own stat name is the key)
//   dir          { bat, pit }: "high" (bigger is better for that side), "low", or null (never coloured)
//   indexed100   true for 100-is-average stats (wRC+, ERA-, FIP-, xFIP-): no league average shown beside them (D20)
//   meanReverting true for BABIP, HR/FB (everyone) and LOB% (pitchers): no good/bad colour, only an outlier marker (D12)
//   style        true for style stats (pull%, pitch usage and the like): never coloured (D12)
//   strength     { bat, pit }: 1 normally; 0.5 where D7/D8 call a stat only "slightly" good or bad, so its colour glows faintly
//   formula      text shown on the page for a derived stat, else null
//   source       where the figure comes from
//   roles        which league lines carry it: "bat" hitters, "sp" starters, "rp" relievers
//   pop          true when the comparison group's spread is built (D38, lib/groups.mjs). Percentiles are computed for
//                EVERY player against that group, with no gate and no "not in the group" note (Adam, 2026-09-30)
//   row          { needs, fn } per side: how one row's value is read or derived (default: the field itself)
//   lg           { bat, pit }: { method, needs, fn(rows) } how the league average is built from qual=0 rows
//   provisional  true for a stat Adam has not confirmed (Savant xwOBA and wOBA against: D18, PROJECT.md)
//
// Directions marked "builder's call" in comments were not ruled on by Adam; they are flagged for review.
import { ratio, sumRatio, weightedField, num } from "./stats.mjs";

const FG = "FanGraphs major-league leaderboard (type=8)";
const MLB = "MLB Stats API season pitching stats";
export const SAV = "Baseball Savant leaderboard CSV";
export const FG_SPLITS = "FanGraphs player splits (vs L + vs R, weighted by TBF)";

// ---- league-average builders -------------------------------------------------------------
const tb = (r) => (num(r["1B"]) === null || num(r["2B"]) === null || num(r["3B"]) === null || num(r.HR) === null)
  ? null : r["1B"] + 2 * r["2B"] + 3 * r["3B"] + 4 * r.HR;
const add = (...xs) => (xs.some((x) => num(x) === null) ? null : xs.reduce((a, b) => a + b, 0));
const neg = (x) => (num(x) === null ? null : -x);
const mul = (k, x) => (num(k) === null || num(x) === null ? null : k * x);

/** sum(num) ÷ sum(den) over rows, where num/den are functions of a row. */
function counts(method, needs, numFn, denFn) {
  return { method, needs, fn: (rows) => sumRatio(rows, numFn, denFn) };
}
/** Weighted mean of a published rate. */
function weighted(field, wName, wFn, extraNeeds = []) {
  return { method: `${field} as published, weighted by ${wName}`, needs: [field, ...extraNeeds], fn: (rows) => weightedField(rows, field, wFn) };
}
const byPA = (f) => weighted(f, "PA", (r) => r.PA, ["PA"]);
const byAB = (f) => weighted(f, "AB", (r) => r.AB, ["AB"]);
const byPitches = (f) => weighted(f, "Pitches", (r) => r.Pitches, ["Pitches"]);
const byEvents = (f) => weighted(f, "batted-ball events (Events)", (r) => r.Events, ["Events"]);
const byIP = (f) => weighted(f, "innings (TIP)", (r) => r.TIP, ["TIP"]);
// Pitcher rows have no AB or SF. Each row's exact at-bats are H ÷ AVG and its exact BABIP denominator
// (AB − SO − HR + SF) is (H − HR) ÷ BABIP; only where the numerator is 0 (so the division is impossible)
// does the row fall back to an estimate: AB ≈ TBF − BB − HBP, BABIP denominator ≈ that − SO − HR (SF unknown).
const estAB = (r) => add(r.TBF, neg(r.BB), neg(r.HBP));
const pitAB = (r) => (num(r.H) !== null && r.H > 0 && num(r.AVG) !== null && r.AVG > 0 ? r.H / r.AVG : estAB(r));
const pitBipDen = (r) => {
  const hn = add(r.H, neg(r.HR));
  if (hn !== null && hn > 0 && num(r.BABIP) !== null && r.BABIP > 0) return hn / r.BABIP;
  return add(estAB(r), neg(r.SO), neg(r.HR));
};
const pitAVG = counts("sum H ÷ sum at-bats, each row's at-bats = H ÷ AVG (rows with 0 hits: TBF − BB − HBP)",
  ["H", "AVG", "TBF", "BB", "HBP"], (r) => r.H, pitAB);
const pitBABIP = counts("sum (H − HR) ÷ sum (H − HR) ÷ BABIP per row, i.e. exact AB − SO − HR + SF (rows with H − HR = 0: TBF − BB − HBP − SO − HR)",
  ["H", "HR", "BABIP", "TBF", "BB", "HBP", "SO"], (r) => add(r.H, neg(r.HR)), pitBipDen);
// Plate discipline: each rate weighted by its own reconstructed denominator (FanGraphs rows carry the rates, not the counts).
const zoneP = (r) => (num(r.Pitches) === null || num(r["Zone%"]) === null ? null : r.Pitches * r["Zone%"]);
const outP = (r) => (num(r.Pitches) === null || num(r["Zone%"]) === null ? null : r.Pitches * (1 - r["Zone%"]));
const PD = ["Pitches", "Zone%"];
const pd = {
  "O-Swing%": weighted("O-Swing%", "pitches outside the zone, Pitches × (1 − Zone%)", outP, PD),
  "Z-Swing%": weighted("Z-Swing%", "pitches in the zone, Pitches × Zone%", zoneP, PD),
  "O-Contact%": weighted("O-Contact%", "swings outside the zone, Pitches × (1 − Zone%) × O-Swing%",
    (r) => mul(num(r["O-Swing%"]), outP(r)), [...PD, "O-Swing%"]),
  "Z-Contact%": weighted("Z-Contact%", "swings in the zone, Pitches × Zone% × Z-Swing%",
    (r) => mul(num(r["Z-Swing%"]), zoneP(r)), [...PD, "Z-Swing%"]),
  "Contact%": weighted("Contact%", "swings, Pitches × Swing%", (r) => mul(num(r["Swing%"]), r.Pitches), ["Pitches", "Swing%"]),
};
const bb = (field, count) => counts(`${count} ÷ (GB + LD + FB)`, [count, "GB", "LD", "FB"], (r) => r[count], (r) => add(r.GB, r.LD, r.FB));
const dirBip = (count) => counts(`${count} ÷ bipCount`, [count, "bipCount"], (r) => r[count], (r) => r.bipCount);

// Both sides share these league methods (counts exist on hitter and pitcher rows alike).
const shared = {
  "GB%": bb("GB%", "GB"), "LD%": bb("LD%", "LD"), "FB%": bb("FB%", "FB"),
  "IFFB%": counts("IFFB ÷ FB", ["IFFB", "FB"], (r) => r.IFFB, (r) => r.FB),
  "HR/FB": counts("HR ÷ FB (FB includes infield flies, as FanGraphs)", ["HR", "FB"], (r) => r.HR, (r) => r.FB),
  "Pull%": dirBip("Pull"), "Cent%": dirBip("Cent"), "Oppo%": dirBip("Oppo"),
  "Soft%": dirBip("Soft"), "Med%": dirBip("Med"), "Hard%": dirBip("Hard"),
  "Barrel%": counts("Barrels ÷ Events", ["Barrels", "Events"], (r) => r.Barrels, (r) => r.Events),
  "HardHit%": counts("HardHit ÷ Events", ["HardHit", "Events"], (r) => r.HardHit, (r) => r.Events),
  EV: byEvents("EV"), LA: byEvents("LA"),
};

// ---- the stat table --------------------------------------------------------------------
function stat(key, o) {
  return {
    key, label: o.label ?? key, dir: o.dir ?? { bat: null, pit: null }, indexed100: !!o.indexed100,
    meanReverting: !!o.mr, style: !!o.style, formula: o.formula ?? null, source: o.source ?? FG,
    strength: o.strength ?? { bat: 1, pit: 1 }, roles: o.roles, pop: o.pop ?? false, row: o.row ?? null, lg: o.lg,
    provisional: !!o.provisional,
  };
}
const B = ["bat"], P = ["sp", "rp"], BP = ["bat", "sp", "rp"];
const HB = (b, p) => ({ bat: b, pit: p });

const LIST = [
  // Core quality
  stat("wRC+", { dir: HB("high", null), indexed100: true, roles: B, pop: true, lg: { bat: byPA("wRC+") } }),
  stat("wOBA", { dir: HB("high", null), roles: B, pop: true, lg: { bat: byPA("wOBA") } }),
  stat("xwOBA", { dir: HB("high", null), roles: B, pop: true, lg: { bat: byPA("xwOBA") } }),
  stat("SIERA", { dir: HB(null, "low"), roles: P, pop: true, lg: { pit: byIP("SIERA") } }),
  stat("xFIP", { dir: HB(null, "low"), roles: P, pop: true, lg: { pit: byIP("xFIP") } }),
  stat("FIP", { dir: HB(null, "low"), roles: P, pop: true, lg: { pit: byIP("FIP") } }),
  stat("xERA", { dir: HB(null, "low"), roles: P, pop: true, lg: { pit: byIP("xERA") } }),
  stat("ERA", { dir: HB(null, "low"), roles: P, pop: true, lg: { pit: counts("9 × ER ÷ TIP", ["ER", "TIP"], (r) => mul(9, r.ER), (r) => r.TIP) } }),
  stat("ERA-", { dir: HB(null, "low"), indexed100: true, roles: P, pop: true, lg: { pit: byIP("ERA-") } }),
  stat("FIP-", { dir: HB(null, "low"), indexed100: true, roles: P, pop: true, lg: { pit: byIP("FIP-") } }),
  stat("xFIP-", { dir: HB(null, "low"), indexed100: true, roles: P, pop: true, lg: { pit: byIP("xFIP-") } }),
  stat("WHIP", { dir: HB(null, "low"), roles: P, pop: true, lg: { pit: counts("(H + BB) ÷ TIP", ["H", "BB", "TIP"], (r) => add(r.H, r.BB), (r) => r.TIP) } }),
  stat("HR/9", { dir: HB(null, "low"), roles: P, pop: true, lg: { pit: counts("9 × HR ÷ TIP", ["HR", "TIP"], (r) => mul(9, r.HR), (r) => r.TIP) } }),
  // The plain line
  stat("AVG", { dir: HB("high", "low"), roles: BP, pop: true, lg: { bat: counts("H ÷ AB", ["H", "AB"], (r) => r.H, (r) => r.AB), pit: pitAVG } }),
  stat("OBP", { dir: HB("high", null), roles: B, pop: true, lg: { bat: counts("(H + BB + HBP) ÷ (AB + BB + HBP + SF)", ["H", "BB", "HBP", "AB", "SF"], (r) => add(r.H, r.BB, r.HBP), (r) => add(r.AB, r.BB, r.HBP, r.SF)) } }),
  stat("SLG", { dir: HB("high", null), roles: B, pop: true, lg: { bat: counts("(1B + 2×2B + 3×3B + 4×HR) ÷ AB", ["1B", "2B", "3B", "HR", "AB"], tb, (r) => r.AB) } }),
  stat("ISO", { dir: HB("high", null), roles: B, pop: true, lg: { bat: counts("(total bases − H) ÷ AB", ["1B", "2B", "3B", "HR", "H", "AB"], (r) => add(tb(r), neg(r.H)), (r) => r.AB) } }),
  stat("HR/PA", { dir: HB("high", null), roles: B, pop: true, formula: "HR ÷ PA",
    row: { bat: { needs: ["HR", "PA"], fn: (r) => ratio(r.HR, r.PA) } },
    lg: { bat: counts("HR ÷ PA", ["HR", "PA"], (r) => r.HR, (r) => r.PA) } }),
  // Strikeouts and walks
  stat("K%", { dir: HB("low", "high"), roles: BP, pop: true, lg: {
    bat: counts("SO ÷ PA", ["SO", "PA"], (r) => r.SO, (r) => r.PA), pit: counts("SO ÷ TBF", ["SO", "TBF"], (r) => r.SO, (r) => r.TBF) } }),
  stat("BB%", { dir: HB("high", "low"), roles: BP, pop: true, lg: {
    bat: counts("BB ÷ PA", ["BB", "PA"], (r) => r.BB, (r) => r.PA), pit: counts("BB ÷ TBF", ["BB", "TBF"], (r) => r.BB, (r) => r.TBF) } }),
  stat("K-BB%", { dir: HB(null, "high"), roles: P, pop: true, lg: { pit: counts("(SO − BB) ÷ TBF", ["SO", "BB", "TBF"], (r) => add(r.SO, neg(r.BB)), (r) => r.TBF) } }),
  // Mean-reverting (D12): spread kept for the outlier marker, never coloured good or bad
  stat("BABIP", { mr: true, roles: BP, pop: true, lg: {
    bat: counts("(H − HR) ÷ (AB − SO − HR + SF)", ["H", "HR", "AB", "SO", "SF"], (r) => add(r.H, neg(r.HR)), (r) => add(r.AB, neg(r.SO), neg(r.HR), r.SF)),
    pit: pitBABIP } }),
  stat("HR/FB", { mr: true, roles: BP, pop: true, lg: { bat: shared["HR/FB"], pit: shared["HR/FB"] } }),
  stat("LOB%", { mr: true, roles: P, pop: true, lg: { pit: counts("(H + BB + HBP − R) ÷ (H + BB + HBP − 1.4 × HR)", ["H", "BB", "HBP", "R", "HR"],
    (r) => add(r.H, r.BB, r.HBP, neg(r.R)), (r) => add(r.H, r.BB, r.HBP, mul(-1.4, r.HR))) } }),
  // Plate discipline: each rate weighted by its own rebuilt denominator (see pd above); Swing%, Zone%, SwStr%, CStr% and C+SwStr% by Pitches
  stat("SwStr%", { dir: HB("low", "high"), roles: BP, pop: true, lg: { bat: byPitches("SwStr%"), pit: byPitches("SwStr%") } }),
  stat("C+SwStr%", { dir: HB(null, "high"), roles: P, pop: true, lg: { pit: byPitches("C+SwStr%") } }),
  stat("CStr%", { dir: HB(null, "high"), roles: BP, pop: true, lg: { bat: byPitches("CStr%"), pit: byPitches("CStr%") } }), // hitter side uncoloured: builder's call
  stat("O-Swing%", { dir: HB("low", "high"), roles: BP, pop: true, lg: { bat: pd["O-Swing%"], pit: pd["O-Swing%"] } }),
  stat("Z-Swing%", { style: true, roles: BP, lg: { bat: pd["Z-Swing%"], pit: pd["Z-Swing%"] } }),
  stat("Swing%", { style: true, roles: BP, lg: { bat: byPitches("Swing%"), pit: byPitches("Swing%") } }),
  stat("O-Contact%", { dir: HB(null, "low"), roles: BP, pop: true, lg: { bat: pd["O-Contact%"], pit: pd["O-Contact%"] } }),
  stat("Z-Contact%", { dir: HB("high", "low"), roles: BP, pop: true, lg: { bat: pd["Z-Contact%"], pit: pd["Z-Contact%"] } }),
  stat("Contact%", { dir: HB("high", "low"), roles: BP, pop: true, lg: { bat: pd["Contact%"], pit: pd["Contact%"] } }),
  stat("Zone%", { style: true, roles: BP, lg: { bat: byPitches("Zone%"), pit: byPitches("Zone%") } }),
  stat("F-Strike%", { dir: HB(null, "high"), roles: BP, pop: true, lg: { bat: weighted("F-Strike%", "PA", (r) => r.PA, ["PA"]), pit: weighted("F-Strike%", "TBF", (r) => r.TBF, ["TBF"]) } }),
  // Batted ball (D7: line drives bad, ground balls slightly good, fly balls neutral for pitchers; flipped for hitters, builder's call)
  stat("GB%", { dir: HB("low", "high"), strength: HB(0.5, 0.5), roles: BP, pop: true, lg: { bat: shared["GB%"], pit: shared["GB%"] } }),
  stat("LD%", { dir: HB("high", "low"), strength: HB(1, 1), roles: BP, pop: true, lg: { bat: shared["LD%"], pit: shared["LD%"] } }),
  stat("FB%", { strength: HB(0.5, 1), roles: BP, pop: true, lg: { bat: shared["FB%"], pit: shared["FB%"] } }),
  stat("IFFB%", { dir: HB("low", "high"), roles: BP, pop: true, lg: { bat: shared["IFFB%"], pit: shared["IFFB%"] } }),
  stat("Pull%", { style: true, roles: BP, lg: { bat: shared["Pull%"], pit: shared["Pull%"] } }),
  stat("Cent%", { style: true, roles: BP, lg: { bat: shared["Cent%"], pit: shared["Cent%"] } }),
  stat("Oppo%", { style: true, roles: BP, lg: { bat: shared["Oppo%"], pit: shared["Oppo%"] } }),
  stat("Soft%", { dir: HB("low", "high"), roles: BP, pop: true, lg: { bat: shared["Soft%"], pit: shared["Soft%"] } }),
  stat("Med%", { style: true, roles: BP, lg: { bat: shared["Med%"], pit: shared["Med%"] } }),
  stat("Hard%", { dir: HB("high", "low"), roles: BP, pop: true, lg: { bat: shared["Hard%"], pit: shared["Hard%"] } }),
  // Quality of contact (D9: good for hitters, bad for pitchers; never max EV)
  stat("EV", { label: "Average exit velocity", dir: HB("high", "low"), roles: BP, pop: true, lg: { bat: shared.EV, pit: shared.EV } }),
  stat("LA", { label: "Launch angle", style: true, roles: BP, lg: { bat: shared.LA, pit: shared.LA } }),
  stat("Barrel%", { dir: HB("high", "low"), roles: BP, pop: true, lg: { bat: shared["Barrel%"], pit: shared["Barrel%"] } }),
  stat("HardHit%", { dir: HB("high", "low"), roles: BP, pop: true, lg: { bat: shared["HardHit%"], pit: shared["HardHit%"] } }),
  stat("xAVG", { dir: HB("high", null), roles: B, pop: true, lg: { bat: byAB("xAVG") } }),
  stat("xSLG", { dir: HB("high", null), roles: B, pop: true, lg: { bat: byAB("xSLG") } }),
  // Speed and the running game (D17). Hitter CS comes from the FanGraphs rows.
  stat("Spd", { dir: HB("high", null), roles: B, pop: true, lg: { bat: byPA("Spd") } }),
  stat("SB/OB", { label: "Steal rate per time on base", dir: HB("high", null), roles: B, pop: true, formula: "SB ÷ (1B + BB + HBP)",
    row: { bat: { needs: ["SB", "1B", "BB", "HBP"], fn: (r) => ratio(r.SB, add(r["1B"], r.BB, r.HBP)) } },
    lg: { bat: counts("SB ÷ (1B + BB + HBP)", ["SB", "1B", "BB", "HBP"], (r) => r.SB, (r) => add(r["1B"], r.BB, r.HBP)) } }),
  stat("SBA/PA", { label: "Steal attempts per PA", dir: HB("high", null), roles: B, pop: true, formula: "(SB + CS) ÷ PA",
    row: { bat: { needs: ["SB", "CS", "PA"], fn: (r) => ratio(add(r.SB, r.CS), r.PA) } },
    lg: { bat: counts("(SB + CS) ÷ PA", ["SB", "CS", "PA"], (r) => add(r.SB, r.CS), (r) => r.PA) } }),
  stat("SB/PA", { label: "Stolen bases per PA", dir: HB("high", null), roles: B, pop: true, formula: "SB ÷ PA",
    row: { bat: { needs: ["SB", "PA"], fn: (r) => ratio(r.SB, r.PA) } },
    lg: { bat: counts("SB ÷ PA", ["SB", "PA"], (r) => r.SB, (r) => r.PA) } }),
  stat("SB%", { label: "Steal success rate", dir: HB("high", null), roles: B, pop: true, formula: "SB ÷ (SB + CS), only where SB + CS > 0",
    row: { bat: { needs: ["SB", "CS"], fn: (r) => ratio(r.SB, add(r.SB, r.CS)) } },
    lg: { bat: counts("SB ÷ (SB + CS)", ["SB", "CS"], (r) => r.SB, (r) => add(r.SB, r.CS)) } }),
  stat("CS%", { label: "Caught-stealing rate", dir: HB("low", "high"), roles: BP, pop: true, formula: "CS ÷ (SB + CS), only where SB + CS > 0",
    row: { bat: { needs: ["SB", "CS"], fn: (r) => ratio(r.CS, add(r.SB, r.CS)) },
      pit: { needs: ["mlbSB", "mlbCS"], fn: (r) => ratio(r.mlbCS, add(r.mlbSB, r.mlbCS)) } },
    lg: { bat: counts("CS ÷ (SB + CS)", ["SB", "CS"], (r) => r.CS, (r) => add(r.SB, r.CS)),
      pit: counts("sum CS ÷ sum (SB + CS), MLB Stats API", ["mlbSB", "mlbCS"], (r) => r.mlbCS, (r) => add(r.mlbSB, r.mlbCS)) } }),
  // Pitchers: MLB Stats API counts joined on xMLBAMID (fields mlbSB, mlbCS, mlbBF added by the build).
  // The MLB counts are the pitcher's FULL season, while the FanGraphs starter (sta) and reliever (rel) rows cover
  // only that role, so a swingman carries the same full-season SB and CS under both roles.
  stat("SB/100BF", { label: "Stolen bases allowed per 100 batters faced", dir: HB(null, "low"), roles: P, pop: true, source: MLB,
    formula: "100 × SB allowed ÷ batters faced (both MLB Stats API, full season)",
    row: { pit: { needs: ["mlbSB", "mlbBF"], fn: (r) => mul(100, ratio(r.mlbSB, r.mlbBF)) } },
    lg: { pit: counts("100 × sum SB ÷ sum batters faced", ["mlbSB", "mlbBF"], (r) => mul(100, r.mlbSB), (r) => r.mlbBF) } }),
  stat("SBA/100BF", { label: "Steal attempts against per 100 batters faced", dir: HB(null, "low"), roles: P, pop: true, source: MLB,
    formula: "100 × (SB + CS) ÷ batters faced (both MLB Stats API, full season)",
    row: { pit: { needs: ["mlbSB", "mlbCS", "mlbBF"], fn: (r) => mul(100, ratio(add(r.mlbSB, r.mlbCS), r.mlbBF)) } },
    lg: { pit: counts("100 × sum (SB + CS) ÷ sum batters faced", ["mlbSB", "mlbCS", "mlbBF"], (r) => mul(100, add(r.mlbSB, r.mlbCS)), (r) => r.mlbBF) } }),
  // Plain counts for display only: no percentile population and no league average (a count is not a rate).
  stat("SB allowed", { label: "Stolen bases allowed", roles: P, source: MLB,
    row: { pit: { needs: ["mlbSB"], fn: (r) => num(r.mlbSB) } },
    lg: { pit: { method: "plain count, not averaged", needs: ["mlbSB"], fn: () => null } } }),
  stat("CS against", { label: "Caught stealing (runners thrown out while he pitched)", roles: P, source: MLB,
    row: { pit: { needs: ["mlbCS"], fn: (r) => num(r.mlbCS) } },
    lg: { pit: { method: "plain count, not averaged", needs: ["mlbCS"], fn: () => null } } }),
  // ---- Baseball Savant (D18), only what FanGraphs lacks (D3). The build joins each Savant board to the FanGraphs rows
  // on MLBAM id (Savant player_id = FanGraphs xMLBAMID) as the sav* fields in SAVANT_FIELDS; Savant percentages are
  // stored as decimals like FanGraphs'. Savant rows are the player's FULL season, while the FanGraphs starter and
  // reliever rows cover only that role (the same caveat as the MLB running counts).
  stat("EV50", { label: "EV50 (average of his hardest-hit half)", dir: HB("high", null), roles: B, pop: true, source: SAV,
    row: { bat: { needs: ["savEV50"], fn: (r) => num(r.savEV50) } },
    lg: { bat: { ...weighted("savEV50", "", (r) => r.savBBE, ["savBBE"]), method: "EV50 as published by Savant, weighted by batted-ball events (Savant attempts)" } } }),
  // Barrels per PA from FanGraphs' own counts (D3); Savant's brl_pa is kept as the alt figure (SAVANT_ALT).
  stat("Brl/PA", { label: "Barrels per PA", dir: HB("high", null), roles: B, pop: true, formula: "Barrels ÷ PA",
    row: { bat: { needs: ["Barrels", "PA"], fn: (r) => ratio(r.Barrels, r.PA) } },
    lg: { bat: counts("Barrels ÷ PA", ["Barrels", "PA"], (r) => r.Barrels, (r) => r.PA) } }),
  stat("xHR", { label: "Expected home runs", roles: B, source: SAV,
    row: { bat: { needs: ["savXHR"], fn: (r) => num(r.savXHR) } },
    lg: { bat: { method: "plain count, not averaged", needs: ["savXHR"], fn: () => null } } }),
  stat("xHR/PA", { label: "Expected home runs per PA", dir: HB("high", null), roles: B, pop: true, source: SAV, formula: "Savant xHR ÷ FanGraphs PA",
    row: { bat: { needs: ["savXHR", "PA"], fn: (r) => ratio(r.savXHR, r.PA) } },
    lg: { bat: counts("sum Savant xHR ÷ sum FanGraphs PA, players on Savant's home-run board (1+ HR)", ["savXHR", "PA"], (r) => r.savXHR, (r) => (num(r.savXHR) === null ? null : r.PA)) } }),
  stat("No-doubters", { label: "No-doubter home runs", roles: B, source: SAV,
    row: { bat: { needs: ["savNoDoubt"], fn: (r) => num(r.savNoDoubt) } },
    lg: { bat: { method: "plain count, not averaged", needs: ["savNoDoubt"], fn: () => null } } }),
  stat("No-doubter%", { label: "Share of home runs that were no-doubters", dir: HB("high", null), roles: B, pop: true, source: SAV, formula: "no-doubters ÷ home runs (Savant)",
    row: { bat: { needs: ["savNoDoubt", "savHR"], fn: (r) => ratio(r.savNoDoubt, r.savHR) } },
    lg: { bat: counts("sum no-doubters ÷ sum home runs (Savant)", ["savNoDoubt", "savHR"], (r) => r.savNoDoubt, (r) => r.savHR) } }),
  ...[["Swing-take runs", "savRunsAll", "all pitches"], ["Heart runs", "savRunsHeart", "the heart of the zone"],
    ["Shadow runs", "savRunsShadow", "the zone's edges (shadow)"], ["Chase runs", "savRunsChase", "just outside the zone (chase)"],
    ["Waste runs", "savRunsWaste", "far outside the zone (waste)"]].map(([key, f, where]) =>
    stat(key, { label: `Swing and take run value on ${where} (runs gained)`, dir: HB("high", null), roles: B, pop: true, source: SAV,
      row: { bat: { needs: [f], fn: (r) => num(r[f]) } },
      lg: { bat: { method: "Savant swing/take run value total (runs above average); a total, not averaged", needs: [f], fn: () => null } } })),
  stat("Sprint speed", { label: "Sprint speed (ft/s)", dir: HB("high", null), roles: B, pop: true, source: SAV,
    row: { bat: { needs: ["savSprint"], fn: (r) => num(r.savSprint) } },
    lg: { bat: { ...weighted("savSprint", "", (r) => r.savRuns, ["savRuns"]), method: "sprint speed as published by Savant, weighted by competitive runs" } } }),
  stat("xwOBA against", { label: "xwOBA against (Savant)", dir: HB(null, "low"), roles: P, pop: true, source: SAV, provisional: true,
    row: { pit: { needs: ["savXwOBA"], fn: (r) => num(r.savXwOBA) } },
    lg: { pit: { ...weighted("savXwOBA", "", (r) => r.savPA, ["savPA"]), method: "xwOBA against as published by Savant, weighted by Savant PA" } } }),
  // D7: a pitcher's wOBA against is FanGraphs' vs L and vs R split rows combined, weighted by TBF. The player build
  // fills it from his splits (pipeline/build/player.mjs); pipeline/build/league.mjs fills its league average, spread
  // and method from FanGraphs' player-level splits leaderboard (sp/rp.statSrc names the files), never from Savant.
  stat("wOBA against", { label: "wOBA against", dir: HB(null, "low"), roles: P, pop: true, source: FG_SPLITS,
    row: { pit: { needs: [], fn: () => null } },
    lg: { pit: { method: "FanGraphs splits leaderboard, filled by pipeline/build/league.mjs (null when its files are not cached)", needs: [], fn: () => null } } }),
  // Savant's season total: the labelled alternative (season.alt["wOBA against"]), kept under its own key so its
  // league average, spread and percentile are never shown beside the FanGraphs figure.
  stat("wOBA against (Savant)", { label: "wOBA against (Savant)", dir: HB(null, "low"), roles: P, pop: true, source: SAV, provisional: true,
    row: { pit: { needs: ["savwOBA"], fn: (r) => num(r.savwOBA) } },
    lg: { pit: { ...weighted("savwOBA", "", (r) => r.savPA, ["savPA"]), method: "wOBA against as published by Savant, weighted by Savant PA" } } }),
];

// Savant board columns -> the sav* fields joined onto FanGraphs rows; scale 0.01 turns Savant percents into decimals.
export const SAVANT_FIELDS = {
  statcast_bat: { ev50: ["savEV50"], avg_hit_speed: ["savEV"], ev95percent: ["savHardHit", 0.01], brl_percent: ["savBarrelBBE", 0.01],
    brl_pa: ["savBrlPA", 0.01], barrels: ["savBarrels"], attempts: ["savBBE"] },
  hr: { xhr: ["savXHR"], no_doubters: ["savNoDoubt"], hr_total: ["savHR"] },
  swingtake: { runs_all: ["savRunsAll"], runs_heart: ["savRunsHeart"], runs_shadow: ["savRunsShadow"], runs_chase: ["savRunsChase"], runs_waste: ["savRunsWaste"] },
  sprint: { sprint_speed: ["savSprint"], competitive_runs: ["savRuns"] },
  xstats_pit: { est_woba: ["savXwOBA"], woba: ["savwOBA"], pa: ["savPA"] },
};
// Which boards each side joins; per-pitch arsenal rows (arsenal_pit) are joined separately, per pitch type.
export const SAVANT_BOARDS = { bat: ["statcast_bat", "hr", "swingtake", "sprint"], pit: ["xstats_pit"] };
// First season each board has data (same as pipeline/cachekey.py SAVANT_FIRST).
export const SAVANT_FIRST = { statcast_bat: 2015, hr: 2016, swingtake: 2008, sprint: 2015, xstats_pit: 2015, arsenal_pit: 2017 };

// D3: where FanGraphs publishes the same figure, FanGraphs' is the shown value and Savant's goes in the `alt` field.
export const SAVANT_ALT = {
  bat: { EV: "savEV", "HardHit%": "savHardHit", "Barrel%": "savBarrelBBE", "Brl/PA": "savBrlPA" },
  pit: {},
};

// Savant pitch code -> FanGraphs pfx codes to try, in order (the first one present in his pfx mix wins), with the
// ambiguity rules in fgPitchCode. pfx overlaps: SL = SLO + ST and CU = CUO + CV, where CV is the slurve (every pfx CV
// pitcher checked in 2019, 2023 and 2026 has a Savant SV row, and CU = CUO + CV exactly, e.g. Berrios 2019).
// Savant has no knuckle-curve code, so its CU covers curveballs and knuckle curves.
export const SAVANT_PITCH_MAP = {
  FF: ["FA"], SI: ["SI", "FT"], FC: ["FC"], SL: ["SLO", "SL"], ST: ["ST"], CH: ["CH"], FS: ["FS"], FO: ["FO"],
  KN: ["KN"], SC: ["SC"], EP: ["EP"], CU: ["CUO", "CU", "KC"], SV: ["CV"],
};

/** The FanGraphs pfx code a Savant pitch belongs to, given the codes in his pfx mix (`fgCodes`) and the Savant codes he
 * threw that season (`savCodes`); null when unmatched or ambiguous, never guessed. Ambiguous: SI when his mix has both
 * SI and FT; SL when only the coarse pfx SL matches while Savant also lists an ST (the coarse SL holds both); CU when
 * only the coarse pfx CU matches while Savant also lists an SV; CU when he throws a curve and a knuckle curve. */
export function fgPitchCode(savCode, fgCodes, savCodes = []) {
  const cands = SAVANT_PITCH_MAP[savCode];
  if (!cands) return null;
  const have = cands.filter((c) => fgCodes.includes(c));
  if (savCode === "SI" && have.includes("SI") && have.includes("FT")) return null;
  if (savCode === "SL" && have[0] === "SL" && savCodes.includes("ST")) return null;
  if (savCode === "CU" && have.includes("KC") && have.some((c) => c !== "KC")) return null;
  if (savCode === "CU" && have[0] === "CU" && savCodes.includes("SV")) return null;
  return have[0] ?? null;
}

export const STATS = Object.fromEntries(LIST.map((s) => [s.key, s]));

/** "bat" for hitters, "pit" for starters and relievers. */
export const side = (role) => (role === "bat" ? "bat" : "pit");

/** Stats carried on a role's league line. */
export const statsForRole = (role) => LIST.filter((s) => s.roles.includes(role));

/** One row's value of a stat for a role (derived where the stat has a row function), null when missing. */
export function rowValue(s, row, role) {
  const r = s.row?.[side(role)];
  return r ? r.fn(row) : num(row[s.key]);
}

/** Every raw field a role's league build reads from the FanGraphs rows (MLB- and Savant-joined fields excluded). */
export function neededFields(role) {
  const f = new Set();
  for (const s of statsForRole(role)) {
    const sd = side(role);
    for (const x of s.lg[sd]?.needs ?? []) f.add(x);
    if (s.pop) for (const x of s.row?.[sd]?.needs ?? [s.key]) f.add(x);
  }
  return [...f].filter((x) => !x.startsWith("mlb") && !x.startsWith("sav")).sort();
}

/** Direction for a role, or null when the stat is never coloured for that side. */
export function directionFor(s, role) {
  if (s.style || s.meanReverting) return null;
  return s.dir[side(role)] ?? null;
}
