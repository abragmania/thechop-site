// The Chop player page plan (STAT-SWITCHES step 4, D36): which stats appear in which box of the player page, and in
// which order, from Adam's switches (settings/stats.json, lib/statsettings.mjs). Pure and browser-safe: no DOM, no
// fetching. render.js draws the plan; formats, labels, notes, colour rules (D12) and layout stay in render.js.
//
// buildPlan(catalog, settings, side, DATA) -> {
//   side, fallback (null, or why the starting settings were used instead of the file), warnings,
//   spotlight: { big:[key], ring:[{ k, large, ang }] }          the circles around the photo; ang is per slot index
//   boxes: [{ id, title, n, card:[key], more:[key], has:[catalog id], groups:[[title,[key]]], chart:[key] | null,
//            def, noalt:[key], altOf:{key: parent key}, cols:[key] (widget columns),
//            fielding:{ rate, oaa, inn, drs, table, tableDrs } | null }]
//   plain: { big:[id], hsx:[id], cols:[id], rp }                 the plain-line panel ("W-L" = wins and losses together)
//   stats: { key: { fmt, combine } }  every catalog stat of the side: its catalog format (for a stat the renderer has no
//            format of its own) and how several seasons combine ("keep" = the renderer's own rule, for the stats on the
//            starting page; null = no rule, a dash for several seasons)
// }
// warnings: the validator's (a stat a box cannot draw is not_drawn there) plus the plan's own: a MAIN stat the card
// cannot draw (a pitch figure the pitch-mix card has no place for) shows only when the box is opened.
// card holds every MAIN stat the card can draw, in the settings' order; how many show before '+N more' depends on the
// window width (capFor, visibleCard; STAT-SWITCHES step 5, D36). With DATA.seasons given, a card stat or circle with no
// value in any season or the career is dropped, and a box vanishes when it has no stats or none of them has a value.
// key = the renderer's stat key: the catalog id, except "Sprint speed" -> "Sprint", "SBA/PA" -> "Att/PA", "Def" ->
// "Defense" (the adapter's renames), a pitcher's "TBF" -> "PA" in tables (pitcher rows carry batters faced as PA), and a
// vs-hand stat without its "hand." prefix.
//
// Switches are per box (D36): a stat is drawn in a box only when that box's main or on list (or a spotlight slot) has
// it; nothing in one box affects another. MAIN stats draw on the box's card in the settings' order. Expanded
// tables keep the code's column groups (TEMPLATES) filtered to the box's stats; a stat the box has that no group,
// chart, widget or alternative figure uses is added in a last "More" group. Charts keep the code's chart list
// filtered to the box's stats.
import { validate, resolve, areaTitle, drawsIn, FIELDING_IDS } from "../../lib/statsettings.mjs";

const RENAME = { "Sprint speed": "Sprint", "SBA/PA": "Att/PA", "Def": "Defense" };
/** Playing-time columns: they never make a box count as having data (STAT-SWITCHES step 5). */
const NO_DATA_IDS = ["G", "PA", "TBF", "IP", "hand.PA"];
/** The renderer's key for a catalog id on a side (see the header). */
export const keyOf = (id, side) => (side === "pit" && id === "TBF" ? "PA" : id.startsWith("hand.") ? (id === "hand.PA" ? "PA" : id.slice(5)) : RENAME[id] ?? id);

/** Angles of the small spotlight circles by slot (ring position), per side: the angles today's page used. */
export const SLOT_ANGLES = { bat: [-90, -55, 40, 140, -125], pit: [-125, 140, -90, -55, 40] };

// Per box: n and cap = the starting card's columns and limit (unused since step 5: columns follow the tile count,
// cardCols, and the limit the window width, capFor), card = the starting card (used only when
// the settings cannot be used), groups / chart / def = the expanded table's column groups, chart picker and default
// chart, widget = a box drawn by its own code (pitch mix, pitches seen, vs-hand pairs), fielding = the fielding tile's ids.
const RUN = ["Spd", "Sprint speed", "SB", "CS", "SB/OB", "SBA/PA", "SB/PA", "SB%", "CS%", "wBsR"];
const DISC_SW = ["O-Swing%", "Z-Swing%", "Swing%"], DISC_CT = ["O-Contact%", "Z-Contact%", "Contact%"];
const LAUNCH = ["GB%", "LD%", "FB%", "IFFB%"], DIRN = ["Pull%", "Cent%", "Oppo%"], SMH = ["Soft%", "Med%", "Hard%"];
export const TEMPLATES = {
  bat: {
    pitch: { widget: "pitchSeen", cols: ["seen.usage", "seen.rv100"], cardCols: ["seen.usage", "seen.rv100"], card: ["seen.usage", "seen.rv100"] },
    hands: { widget: "hands", n: 2, cap: 1, card: ["hand.wRC+", "hand.PA"],
      cols: ["hand.PA", "hand.wOBA", "hand.wRC+", "hand.ISO", "hand.HR/PA", "hand.K%", "hand.BB%", "hand.HardHit%"] },
    speed: { n: 4, cap: 4, card: ["Sprint speed", "SBA/PA", "SB%", "fld.OAA/1000", "OAA", "fld.inn", "DRS"],
      fielding: { rate: "fld.OAA/1000", oaa: "OAA", inn: "fld.inn", drs: "DRS" },
      groups: [["", ["G", "PA"]], ["Running", RUN]],
      chart: ["Sprint speed", "Spd", "SB/OB", "SBA/PA", "SB/PA", "SB%", "CS%", "wBsR", "Def"], def: "Sprint speed" },
    disc: { n: 3, cap: 3, card: ["O-Swing%", "SwStr%", "Z-Contact%"],
      groups: [["", ["PA"]], ["Swings", DISC_SW], ["Contact", DISC_CT], ["Strikes", ["SwStr%", "CStr%", "F-Strike%", "Zone%"]], ["Outcome", ["K%", "BB%"]],
        ["Swing/take runs by zone · runs gained", ["Swing-take runs", "Heart runs", "Shadow runs", "Chase runs", "Waste runs"]]],
      chart: ["O-Swing%", "Z-Swing%", "Swing%", "O-Contact%", "Z-Contact%", "Contact%", "SwStr%", "Zone%", "F-Strike%", "K%", "BB%", "Swing-take runs"], def: "O-Swing%" },
    batted: { n: 2, cap: 4, card: ["HR/FB", "BABIP", "EV", "FB%"],
      groups: [["", ["PA"]], ["Launch", LAUNCH], ["Results", ["HR/FB", "BABIP"]], ["Direction", DIRN], ["Contact", SMH], ["Quality", ["EV", "Barrel%", "HardHit%"]],
        ["Savant · power", ["EV50", "Brl/PA", "xHR", "xHR/PA", "No-doubters", "No-doubter%"]]],
      chart: ["HR/FB", "BABIP", "GB%", "LD%", "FB%", "Pull%", "EV", "Barrel%", "HardHit%", "EV50", "Brl/PA", "xHR/PA", "No-doubter%"], def: "HR/FB" },
    career: { n: 3, cap: 2, card: ["wRC+"],
      groups: [["", ["PA"]], ["How good", ["wOBA", "xwOBA", "wRC+"]], ["Discipline", ["K%", "BB%", "SwStr%"]], ["Power", ["ISO", "HR", "HR/PA"]],
        ["Contact quality", ["EV", "Barrel%", "HardHit%"]], ["Batted ball", ["GB%", "LD%", "FB%", "HR/FB", "BABIP", "Pull%"]]],
      chart: ["wRC+", "wOBA", "xwOBA", "ISO", "HR/PA", "K%", "BB%", "Barrel%", "HardHit%", "BABIP", "HR/FB", "SwStr%"], def: "wRC+" },
  },
  pit: {
    mix: { widget: "pitchMix", cols: ["pitch.usage", "pitch.velo", "pitch.spin", "pitch.hMov", "pitch.vMov", "pitch.whiff", "pitch.putAway", "pitch.rv100"],
      cardCols: ["pitch.usage", "pitch.velo", "pitch.rv100"], card: ["pitch.usage", "pitch.velo", "pitch.rv100"] },
    res: { n: 2, cap: 2, card: ["FIP", "wOBA against"],
      groups: [["", ["TBF", "IP"]], ["Run prevention", ["FIP", "xFIP", "SIERA", "xERA"]], ["Indexed · 100 = average", ["FIP-", "xFIP-"]],
        ["Against", ["wOBA against", "xwOBA against", "BABIP", "HR/FB", "HR/9", "WHIP"]], ["Stranding", ["LOB%"]],
        ["Running game", ["SB allowed", "CS against", "SB/100BF", "SBA/100BF", "CS%", "pickoffs"]]],
      chart: ["FIP", "xFIP", "SIERA", "wOBA against", "BABIP", "LOB%", "HR/FB", "SB/100BF", "SBA/100BF", "CS%"], def: "FIP" },
    career: { n: 3, cap: 2, card: ["FIP", "SIERA"],
      groups: [["", ["TBF", "IP"]], ["Run prevention", ["ERA", "FIP", "xFIP", "SIERA"]], ["Strikeouts & walks", ["K%", "BB%", "K-BB%", "SwStr%"]],
        ["Contact against", ["wOBA against", "xwOBA against", "HardHit%", "Barrel%"]], ["Batted ball", ["GB%", "LD%", "FB%", "HR/FB", "BABIP", "LOB%"]]],
      chart: ["SIERA", "xFIP", "FIP", "K%", "BB%", "K-BB%", "SwStr%", "HardHit%", "Barrel%", "GB%", "HR/FB", "BABIP", "LOB%", "wOBA against"], def: "SIERA" },
    disc: { n: 2, cap: 4, card: ["O-Swing%", "SwStr%", "C+SwStr%", "Zone%"],
      groups: [["", ["TBF"]], ["Swings", DISC_SW], ["Contact", DISC_CT], ["Strikes", ["SwStr%", "C+SwStr%", "CStr%", "F-Strike%", "Zone%"]], ["Outcome", ["K%", "BB%"]]],
      chart: ["O-Swing%", "SwStr%", "C+SwStr%", "Contact%", "Z-Contact%", "F-Strike%", "Zone%", "K%", "BB%"], def: "O-Swing%" },
    hands: { widget: "hands", n: 2, cap: 1, card: ["hand.wOBA against", "hand.PA"],
      cols: ["hand.PA", "hand.wOBA against", "hand.FIP", "hand.K%", "hand.BB%", "hand.K-BB%", "hand.HardHit%", "hand.GB%"] },
    batted: { n: 3, cap: 6, card: ["GB%", "LD%", "FB%", "HR/FB", "BABIP", "LOB%"],
      groups: [["", ["TBF"]], ["Launch", LAUNCH], ["Results", ["HR/FB", "BABIP"]], ["Direction", DIRN], ["Contact", SMH], ["Quality against", ["EV", "Barrel%", "HardHit%"]]],
      chart: ["GB%", "LD%", "FB%", "HR/FB", "BABIP", "EV", "Barrel%", "HardHit%"], def: "GB%" },
  },
};
/** The starting circles around the photo (used only when the settings cannot be used). */
const SPOT = {
  bat: { big: ["wRC+", "wOBA"], ring: ["HardHit%", "Barrel%", "ISO", "K%", "BB%"], ringLarge: ["HardHit%", "K%", "BB%"] },
  pit: { big: ["SIERA", "xFIP"], ring: ["K%", "BB%", "K-BB%", "HardHit%", "Barrel%"], ringLarge: ["K%", "BB%", "HardHit%"] },
};
/** The plain-line panel: big tiles, the small line under them and the every-season table's columns, in the code's
 * order ("W-L" = wins and losses in one tile). Pitchers whose career is mostly in relief (D13) use the rp layout. */
export const PLAIN = {
  bat: { big: ["HR", "RBI", "R", "SB", "G", "PA"], hsx: ["H", "BB", "SO"], cols: ["G", "PA", "HR", "R", "RBI", "SB", "BB", "SO"] },
  pit: { big: ["W-L", "G", "IP", "GS", "SO", "WHIP"], hsx: ["BB", "HR", "H"], cols: ["GS", "W", "L", "IP", "SO", "BB", "HR", "WHIP"] },
  rp: { big: ["SV", "HLD", "W-L", "G", "IP", "SO"], hsx: ["WHIP", "BB", "HR", "H"], cols: ["G", "SV", "HLD", "IP", "SO", "BB", "HR", "WHIP"] },
};
/** The box order of the starting page, per side. */
const ORDER = { bat: ["pitch", "hands", "speed", "disc", "batted", "career"], pit: ["mix", "res", "career", "disc", "hands", "batted"] };

const entryOf = (cat, id) => (cat instanceof Map ? cat.get(id) : cat?.[id]) ?? null;
const sideOk = (cat, id, side) => { const e = entryOf(cat, id); return !e || !e.sides || e.sides.includes(side); };
const stateOf = (cat, id, side) => entryOf(cat, id)?.defaultState?.[side] ?? null;

/**
 * Settings that reproduce the starting page from the code's templates and the catalog's starting states
 * (statreg defaultState): a stat the catalog marks "off" for the side is left out, a card stat the catalog marks "on"
 * moves to the box's on list. Used whenever settings/stats.json is missing or invalid.
 */
export function defaultSettings(catalog) {
  const out = { schema: 1, updated: null, updatedBy: "starting settings (public/js/player/plan.js defaultSettings)" };
  for (const side of ["bat", "pit"]) {
    const keep = (id) => sideOk(catalog, id, side) && stateOf(catalog, id, side) !== "off";
    const isMain = (id) => keep(id) && (stateOf(catalog, id, side) ?? "main") === "main";
    const sp = SPOT[side];
    const boxes = ORDER[side].map((id) => {
      const t = TEMPLATES[side][id];
      const main = t.card.filter(isMain);
      const pool = [...t.card, ...(t.cols ?? []), ...(t.groups ?? []).flatMap(([, ks]) => ks), ...(t.chart ?? []), ...Object.values(t.fielding ?? {})];
      for (const k of [...pool]) for (const a of entryOf(catalog, k)?.alt ?? []) if (a.stat && a.sides?.includes(side) !== false) pool.push(a.stat);
      const on = [...new Set(pool)].filter((x) => keep(x) && !main.includes(x));
      return { id, show: true, main, on };
    });
    const pl = side === "bat" ? PLAIN.bat : { big: [...new Set([...PLAIN.pit.big, ...PLAIN.rp.big])], hsx: [...new Set([...PLAIN.pit.hsx, ...PLAIN.rp.hsx])] };
    const plainMain = [...new Set([...pl.big, ...pl.hsx].flatMap((x) => (x === "W-L" ? ["W", "L"] : [x])))].filter(isMain);
    out[side] = { spotlight: { big: sp.big.filter(isMain), ring: sp.ring.filter(isMain), ringLarge: sp.ringLarge.filter(isMain) }, boxes, plain: { main: plainMain, on: [] } };
  }
  return out;
}

const CARDABLE = new Set(["season", "count"]);
/** Whether a stat can draw as a tile of an ordinary card (a season figure or count, not a pitch, split or position figure). */
const cardable = (cat, id) => { const e = entryOf(cat, id); return !e || CARDABLE.has(e.scope ?? "season"); };

function boxPlan(cat, side, b, found, warn = () => {}) {
  const t = TEMPLATES[side][b.id];
  if (!t) return null;
  const has = [...b.main, ...b.on];
  // empty boxes vanish: nothing switched on, or nothing with a value anywhere in his career (games, PA, batters faced and
  // innings do not count: every player has them; they are still drawn as columns)
  if (!has.length || (found && !has.some((id) => !NO_DATA_IDS.includes(id) && found(id)))) return null;
  const valued = (id) => !found || found(id);
  const inBox = (id) => has.includes(id);
  const k = (id) => keyOf(id, side);
  const out = { id: b.id, title: b.title, n: t.n ?? 3, card: [], more: [], has, groups: [], chart: null, def: null, noalt: [], altOf: {}, cols: [], fielding: null };
  const drawable = (id) => { const e = entryOf(cat, id); return !e || drawsIn(side, b.id, e); };
  const used = new Set();
  if (t.widget === "pitchMix" || t.widget === "pitchSeen") {
    // the card draws the share bars with up to two figures beside them; the rest of the box's pitch stats are view columns
    out.card = b.main.filter((id) => t.cardCols.includes(id)).map(k);
    out.more = b.main.filter((id) => !t.cardCols.includes(id) && t.cols.includes(id)).map(k);
    out.cols = t.cols.filter(inBox);
    t.cols.forEach((id) => used.add(id));
  } else if (t.widget === "hands") {
    // pairs (vs left, vs right) of one stat on the card; hand.PA is the count under them, not a tile of its own
    const pairs = b.main.filter((id) => id !== "hand.PA" && t.cols.includes(id) && valued(id));
    out.card = [...pairs, ...(b.main.includes("hand.PA") ? ["hand.PA"] : [])].map(k);
    out.cols = t.cols.filter(inBox).map(k);
    t.cols.forEach((id) => used.add(id));
  } else {
    const f = t.fielding;
    if (f) {
      out.fielding = { rate: b.main.includes(f.rate), oaa: b.main.includes(f.oaa), inn: b.main.includes(f.inn), drs: b.main.includes(f.drs),
        table: inBox(f.rate), tableDrs: inBox(f.drs) };
      Object.values(f).forEach((id) => used.add(id));
    }
    // card tiles in the settings' order; the fielding tile counts as one tile where its rate sits, its parts as none;
    // a stat with no value anywhere in his career is dropped
    const parts = f ? [f.oaa, f.inn, f.drs] : [];
    for (const id of b.main) {
      if (parts.includes(id)) continue;
      if (id !== f?.rate && !cardable(cat, id)) continue; // not drawable here: the validator warns (not_drawn)
      if (valued(id)) out.card.push(k(id));
    }
  }
  if (t.groups) {
    out.groups = t.groups.map(([g, ks]) => [g, ks.filter(inBox).map(k)]).filter(([, ks]) => ks.length);
    t.groups.forEach(([, ks]) => ks.forEach((id) => used.add(id)));
  }
  if (t.chart) {
    const ch = t.chart.filter(inBox).map(k);
    t.chart.forEach((id) => used.add(id));
    out.chart = ch.length ? ch : null;
    out.def = ch.length ? (ch.includes(k(t.def)) ? k(t.def) : ch[0]) : null;
  }
  // alternative figures (D3, D7): one that has its own catalog id (Savant's wOBA against) shows only where the box has it
  for (const id of has) for (const a of entryOf(cat, id)?.alt ?? []) {
    if (!a.stat || (a.sides && !a.sides.includes(side))) continue;
    used.add(a.stat);
  }
  const shown = [...out.groups.flatMap(([, ks]) => ks), ...out.cols.map(k)];
  for (const key of new Set(shown)) {
    const id = has.find((x) => k(x) === key) ?? key;
    for (const a of entryOf(cat, id)?.alt ?? []) if (a.stat && (!a.sides || a.sides.includes(side)) && !inBox(a.stat)) out.noalt.push(key);
  }
  // anything else the box has ON joins the table in a last group, when the table can show it (MAIN stats are on the card);
  // an alternative figure whose main figure is off here (Savant's wOBA against without FanGraphs') is read from that figure's alt
  if (t.groups) {
    const extra = has.filter((id) => !used.has(id) && drawable(id) && cardable(cat, id) && b.on.includes(id));
    for (const id of extra) {
      const parent = [...(cat instanceof Map ? cat.values() : Object.values(cat ?? {}))].find((e) => (e.alt ?? []).some((a) => a.stat === id && (!a.sides || a.sides.includes(side))));
      if (parent) out.altOf[k(id)] = k(parent.id);
    }
    if (extra.length) out.groups.push(["More", [...new Set(extra.map(k))]]);
  }
  for (const key of out.more) warn("view_only", `${b.title}: ${key} is MAIN but the card cannot draw it, so it shows only when the box is opened.`, b.id, key);
  return out;
}

/** The page plan for one side (see the header). Invalid or missing settings fall back to defaultSettings(catalog). */
export function buildPlan(catalog, settings, side, DATA = null) {
  side = side === "pit" ? "pit" : "bat";
  let fallback = null, warnings = [];
  if (!settings) fallback = "the settings file could not be loaded";
  else if (catalog) {
    const v = validate(settings, catalog);
    warnings = v.warnings;
    if (v.errors.length) fallback = `the settings file has ${v.errors.length} problem${v.errors.length === 1 ? "" : "s"}: ${v.errors.slice(0, 3).map((e) => e.message).join(" ")}`;
  } else fallback = "the stat catalog could not be loaded";
  const use = fallback ? defaultSettings(catalog) : settings;
  const r = resolve(use, catalog ?? {}, side);
  // with no catalog at all, resolve() knows no stat; read the lists as they stand
  const sd = catalog ? r : { spotlight: use[side].spotlight, boxes: use[side].boxes.map((b) => ({ ...b, title: areaTitle(side, b.id) })), plain: use[side].plain };
  const spot = sd.spotlight;
  const found = valueFinder(DATA, catalog, side), valued = (id) => !found || found(id);
  const ringIds = spot.ring.filter((id) => !spot.big.includes(id) && valued(id));
  const spotlight = {
    big: spot.big.filter(valued).map((id) => keyOf(id, side)),
    ring: ringIds.map((id, i) => ({ k: keyOf(id, side), large: (spot.ringLarge ?? []).includes(id), ang: SLOT_ANGLES[side][i] ?? 0 })),
  };
  const pwarn = (code, message, area, stat) => warnings.push({ code, side, area, stat, message });
  const boxes = sd.boxes.filter((b) => b.show !== false).map((b) => boxPlan(catalog, side, b, found, pwarn)).filter(Boolean);
  // each stat of the side: its catalog format and multi-season rule (render.js uses them for stats it has no rule of its own for)
  const stats = {};
  for (const e of catalog instanceof Map ? catalog.values() : Object.values(catalog ?? {})) {
    if (!(e.sides ?? []).includes(side)) continue;
    stats[keyOf(e.id, side)] ??= { fmt: e.fmt ?? null, combine: e.combine ?? ((e.defaultState?.[side] ?? "off") !== "off" ? "keep" : null) };
  }
  // plain panel: big tiles and the line under them from MAIN, table columns from MAIN and ON, each in the code's order
  const car = DATA?.career ?? {};
  const rp = side === "pit" && car.G != null && car.GS != null && car.GS < car.G / 2;
  const T = side === "bat" ? PLAIN.bat : rp ? PLAIN.rp : PLAIN.pit;
  const pdraw = (x) => { const e = entryOf(catalog, x); return !e || drawsIn(side, "plain", e); };
  const pm = (sd.plain?.main ?? []).filter(pdraw), pon = (sd.plain?.on ?? []).filter(pdraw), pall = [...pm, ...pon];
  const okMain = (x) => (x === "W-L" ? pm.includes("W") && pm.includes("L") : pm.includes(x));
  const big = T.big.filter(okMain), hsx = T.hsx.filter(okMain);
  // W or L alone (the other switched off) shows as its own tile
  if (T.big.includes("W-L") && !big.includes("W-L")) for (const x of ["W", "L"]) if (pm.includes(x)) big.splice(Math.min(T.big.indexOf("W-L"), big.length), 0, x);
  // a stat neither layout of the side places (a pitcher has a starter and a reliever layout) joins the small line, or the table when ON
  const known = side === "bat" ? [PLAIN.bat] : [PLAIN.pit, PLAIN.rp];
  const inBig = (x) => known.some((t) => t.big.includes(x) || t.hsx.includes(x) || (["W", "L"].includes(x) && t.big.includes("W-L")));
  hsx.push(...pm.filter((x) => !inBig(x)));
  const cols = [...T.cols.filter((x) => pall.includes(x)), ...pon.filter((x) => !known.some((t) => t.cols.includes(x)))];
  return { side, fallback, warnings, spotlight, boxes, plain: { big, hsx, cols, rp }, stats };
}

// ---- data presence (STAT-SWITCHES step 5): does a stat have a value in any season or the career of this player?
const PITCH_F = { "pitch.usage": "usage", "pitch.velo": "velo", "pitch.spin": "spin", "pitch.hMov": "hMov", "pitch.vMov": "vMov",
  "pitch.whiff": "whiff", "pitch.putAway": "putAway", "pitch.rv100": "rv100", "seen.usage": "usage", "seen.rv100": "rv100" };
const FLD_F = { "fld.OAA/1000": ["oaaPer1000", "OAA"], OAA: ["OAA", "rateOAA"], "fld.inn": ["inn", "rateInn"], DRS: ["DRS"] };
/**
 * id -> true when catalog stat id has a value for this player in some season row or the career row (render.js's DATA,
 * adapter.js): season figures by the renderer's key (or Savant's alternative figure), pitch figures in any pitch of any
 * season, vs-hand figures in any season's or the career's vs-left or vs-right line, fielding figures at any position but
 * pitcher. null (nothing is judged empty) when DATA has no seasons.
 */
export function valueFinder(DATA, catalog, side) {
  const SE = DATA?.seasons;
  // malformed rows: judge nothing empty rather than risk the page
  if (!Array.isArray(SE) || !SE.every((r) => r && typeof r === "object") || (DATA.career != null && typeof DATA.career !== "object")) return null;
  const rows = [...SE, DATA.career || {}], memo = new Map(), parent = {};
  for (const e of catalog instanceof Map ? catalog.values() : Object.values(catalog ?? {}))
    for (const a of e.alt ?? []) if (a.stat && (!a.sides || a.sides.includes(side))) parent[a.stat] = keyOf(e.id, side);
  const has = (v) => v != null && !(typeof v === "number" && isNaN(v));
  const test = (id) => {
    if (PITCH_F[id]) {
      const f = PITCH_F[id], w = id.startsWith("seen.") ? "pitchesSeen" : "pitches";
      return rows.some((r) => Object.values(r[w] || {}).some((p) => p && has(p[f])));
    }
    if (id.startsWith("hand.")) {
      const k = keyOf(id, side), sp = [...Object.values(DATA.ss || {}).flatMap((o) => [o?.L, o?.R]), DATA.splits?.Career?.L, DATA.splits?.Career?.R];
      return sp.some((r) => r && has(r[k]));
    }
    if (FIELDING_IDS.includes(id)) {
      const ok = (f) => f && f.pos !== "P" && FLD_F[id].some((x) => has(f[x]));
      return SE.some((s) => (s.fielding || []).some(ok)) || Object.entries(DATA.fielding3yr?.byPos || {}).some(([pos, b]) => ok({ pos, ...b }));
    }
    const k = keyOf(id, side), p = parent[id];
    return rows.some((r) => has(r[k]) || has(r.alt?.[k]?.value) || (p && has(r.alt?.[p]?.value)));
  };
  const safe = (id) => { try { return test(id); } catch { return true; } };
  return (id) => { if (!memo.has(id)) memo.set(id, safe(id)); return memo.get(id); };
}

// ---- self-fitting layout (STAT-SWITCHES step 5, D36): the pure rules render.js applies
/** The six card slots of the orbit (degrees from the photo), filled by the boxes in the settings' order; 180 and 0 are the
 * narrow side slots beside the big circles. */
export const ORBIT_SLOTS = [-124, 180, 124, -56, 0, 56];
/** Most MAIN tiles a box shows before '+N more' at a window width (D36): 3 on a phone, 4 on a laptop, 6 from 1600 px. */
export const capFor = (w) => (w < 640 ? 3 : w < 1600 ? 4 : 6);
/**
 * Which of a box's card keys show at a cap: {shown, hidden, tiles, all, widget} (tiles = shown tiles, all = tiles with
 * every stat shown). A vs-hand stat is a pair (two tiles, vs left and vs right; at least one pair shows) and its PA line
 * is not a tile; a career card's tiles are its stats plus the seasons tile (one stat alone draws a career tile and a
 * best-season tile); a widget (pitch mix, pitches seen) is never capped. A single stat is never hidden: when exactly one
 * would wait behind '+N more', it shows. At the caps (3, 4, 6) the shown tiles fill whole rows (cardCols).
 */
export function visibleCard(box, cap) {
  const card = box?.card ?? [];
  const keep = (len, n) => (len - n === 1 ? len : Math.min(len, n));
  if (box?.id === "pitch" || box?.id === "mix") return { shown: card, hidden: [], tiles: 0, all: 0, widget: true };
  if (box?.id === "hands") {
    const pairs = card.filter((k) => k !== "PA"), shown = pairs.slice(0, keep(pairs.length, Math.max(1, Math.floor(cap / 2))));
    return { shown: [...shown, ...(card.includes("PA") ? ["PA"] : [])], hidden: pairs.slice(shown.length), tiles: shown.length * 2, all: pairs.length * 2, widget: false };
  }
  if (box?.id === "career") {
    const ct = (n) => (!n ? 0 : n === 1 ? 3 : n + 1), shown = card.slice(0, keep(card.length, Math.max(1, cap - 1)));
    return { shown, hidden: card.slice(shown.length), tiles: ct(shown.length), all: ct(card.length), widget: false };
  }
  const shown = card.slice(0, keep(card.length, cap));
  return { shown, hidden: card.slice(shown.length), tiles: shown.length, all: card.length, widget: false };
}
/** A box's size class by its shown tiles: S 1-2, M 3-4, L 5-6 or a widget; S also for a card with no tiles. */
export const sizeClass = (v) => (v.widget ? "L" : v.tiles <= 2 ? "S" : v.tiles <= 4 ? "M" : "L");
/** Tile columns of a card from its tile count, so no tile sits alone on a row at the caps: 1-3 in one row, 4 two by
 * two, 5 or more in rows of 3. */
export const cardCols = (tiles) => Math.max(1, tiles <= 3 ? tiles : tiles === 4 ? 2 : 3);
/** The orbit's wider fallback when the cards do not fit two by two: four tiles in one row (still no tile alone on a row). */
export const cardColsWide = (tiles) => Math.max(1, tiles <= 4 ? tiles : 3);
