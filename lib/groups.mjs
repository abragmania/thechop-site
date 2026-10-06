// TheChop comparison groups (D38): who a player's percentiles and spreads are measured against. Browser-safe (its
// only import is lib/stats.mjs): used by the offline build (pipeline/build/) and the pages (served at /lib live,
// copied to ./lib on the exported site).
// A group is every player of a role who reached a playing-time minimum that season, never FanGraphs' "qualified"
// lists. The full-season minimums below are scaled to the season's length (seasonGames), so a short season (2020) or
// an unfinished one keeps a group of about the same share of the league. Every player is still ranked against the
// group whether or not he is in it (D12). Fielding (D21) is not covered here: it keeps FanGraphs' qualified fielders.
import { num, inningsFromNotation } from "./stats.mjs";

export const FULL_SEASON_GAMES = 162;
// Full-season (162 games) minimums. bat: plate appearances; sp: innings as a starter (the starters' board's own IP);
// rp: innings in relief (the relievers' board's own IP). Change a group's bar here, in one line.
export const GROUP_MIN = {
  bat: { stat: "PA", value: 200 },
  sp: { stat: "IP", value: 60 },
  rp: { stat: "IP", value: 20 },
};
export const GROUP_WHO = { bat: "hitters", sp: "starters", rp: "relievers" };

/** Games played in a season: the largest G of any one-club hitter row (FanGraphs teamid not 0), capped at 162. A traded
 * player's combined row (teamid 0, "2 Tms") is skipped because it can exceed every club's games (2020: 61 against a
 * 60-game season). Rows with no one-club row at all fall back to every row. Null when no row carries a G. */
export function seasonGames(hitterRows) {
  const rows = (hitterRows ?? []).filter((r) => r && num(r.G) !== null);
  const oneClub = rows.filter((r) => num(r.teamid) !== null && r.teamid !== 0);
  const use = oneClub.length ? oneClub : rows;
  if (!use.length) return null;
  return Math.min(FULL_SEASON_GAMES, Math.max(...use.map((r) => r.G)));
}

/** A role's minimum in a season of `games` games: {stat, value, seasonGames}; the full-season minimum x games / 162.
 * PA is rounded to a whole number; innings are true innings kept to one decimal. Null when the games are unknown. */
export function groupMin(role, games) {
  const full = GROUP_MIN[role], g = num(games);
  if (!full || g === null || g <= 0) return null;
  const scaled = (full.value * Math.min(g, FULL_SEASON_GAMES)) / FULL_SEASON_GAMES;
  return { stat: full.stat, value: full.stat === "PA" ? Math.round(scaled) : Math.round(scaled * 10) / 10, seasonGames: Math.min(g, FULL_SEASON_GAMES) };
}

/** A row's playing time for its role: PA, or true innings from IP in baseball notation (59.2 = 59 2/3). */
export function groupTime(role, row) {
  if (!row) return null;
  return GROUP_MIN[role]?.stat === "PA" ? num(row.PA) : inningsFromNotation(row.IP);
}

/** True when a row of the role's own board (hitters, starters, relievers) meets the minimum; exactly the minimum is in. */
export function inGroup(role, row, min) {
  const t = groupTime(role, row);
  return !!min && t !== null && t >= min.value;
}

/** The rows of a role's board that are in its comparison group. */
export function groupRows(role, rows, min) {
  return rows.filter((r) => inGroup(role, r, min));
}

/** A minimum's figure as a page shows it. PA: the number. Innings: the smallest innings total that reaches the minimum,
 * in baseball notation like the IP columns beside it. The stored value is decimal true innings, so 22.2 is first reached
 * at 22 1/3 innings and shows "22.1"; 7.4 shows "7.2"; 60 stays "60". Display only: membership compares true innings. */
export function minShown(min) {
  const v = num(min?.value);
  if (v === null) return null;
  if (min.stat !== "IP") return String(v);
  const outs = Math.ceil(v * 3 - 1e-9);
  return String(Math.floor(outs / 3) + (outs % 3) / 10);
}

/** A minimum as a page shows it: "200+ PA", "22.1+ IP". */
export const minText = (min) => `${minShown(min)}+ ${min.stat}`;

/** Short page wording for one season's group: "hitters with 200+ PA"; tight: "hitters, 200+ PA". Innings minimums are
 * shown in baseball notation (minShown). Without a minimum on file (an older build) it is the generic wording, which
 * stays true for any season. */
export function groupText(role, min, tight = false) {
  const who = GROUP_WHO[role];
  if (!who) return null;
  if (!min || num(min.value) === null) return `${who} with enough playing time`;
  return tight ? `${who}, ${minText(min)}` : `${who} with ${minText(min)}`;
}

/** Wording that is true across seasons: "hitters with enough playing time (200 PA in a full season)". */
export function groupTextAny(role) {
  const who = GROUP_WHO[role], full = GROUP_MIN[role];
  return who ? `${who} with enough playing time (${full.value} ${full.stat} in a full season)` : null;
}

/** The method text recorded in the league file for one season's group. */
export function groupMethod(role, min) {
  const full = GROUP_MIN[role];
  const what = role === "bat" ? `hitters with ${min.value}+ PA that season (pitchers who batted excluded)`
    : role === "sp" ? `pitchers with ${min.value}+ innings as a starter that season (the starters' board's own IP, compared as true innings: ${minShown(min)} or more in baseball notation)`
    : `pitchers with ${min.value}+ innings in relief that season (the relievers' board's own IP, compared as true innings: ${minShown(min)} or more in baseball notation)`;
  return `Comparison group (D38): ${what}, taken from FanGraphs' full (qual=0) leaderboard, not its qualified list. Minimum = ${full.value} ${full.stat} per ${FULL_SEASON_GAMES} games x the season's ${min.seasonGames} games / ${FULL_SEASON_GAMES}; the season's games are the largest G of any one-club hitter row (a traded player's combined row is skipped), capped at ${FULL_SEASON_GAMES}. Every player is ranked against the group whether or not he is in it (D12).`;
}
