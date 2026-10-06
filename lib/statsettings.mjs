// The Chop stat switches (STAT-SWITCHES step 2, D36): checks and reads Adam's settings file (settings/stats.json).
// Pure and browser-safe (no node: modules, no imports); the catalog is passed in, either lib/statreg.mjs CATALOG (an
// array) or catalogJson() / GET /api/meta/stats (an object keyed by id).
//
// Settings shape: {schema:1, updated, updatedBy, bat:SIDE, pit:SIDE}, SIDE = {spotlight:{big:[ids, at most 2],
// ring:[ids, at most 5], ringLarge:[ids drawn as the larger ring circles, each also in ring]}, boxes:[{id, show,
// main:[ids], on:[ids]}], plain:{main:[ids], on:[ids]}}.
// Switches are per box (D36): an id in a box's main list (or a spotlight slot) is MAIN there, visible in that box on
// the main page; in a box's on list it is ON there, shown when that box is opened; absent from a box it is OFF for that
// box only. A switch never affects any other box or page. List order is display order.

export const SCHEMA = 1;
export const SIDES = ["bat", "pit"];
export const BIG_MAX = 2;
export const RING_MAX = 5;

/** The player page's boxes per side, in today's order (public/js/player/render.js CL), with their titles. */
export const BOXES = {
  bat: [
    { id: "pitch", title: "vs pitch types" }, { id: "hands", title: "vs L / R" }, { id: "speed", title: "Speed & defense" },
    { id: "disc", title: "Plate discipline" }, { id: "batted", title: "Batted ball" }, { id: "career", title: "Career stats" },
  ],
  pit: [
    { id: "mix", title: "Pitch mix" }, { id: "res", title: "Results against" }, { id: "career", title: "Career stats" },
    { id: "disc", title: "Plate discipline against" }, { id: "hands", title: "vs LHB / RHB" }, { id: "batted", title: "Batted ball against" },
  ],
};
/** The two areas that are not boxes: the circles around the photo, and the plain-line panel. */
export const AREAS = { spotlight: "Around the photo", plain: "The plain line" };

/** The title of a box or area id on a side ("spotlight", "plain" or a BOXES id); the id itself when unknown. */
export function areaTitle(side, id) {
  if (AREAS[id]) return AREAS[id];
  return (BOXES[side] ?? []).find((b) => b.id === id)?.title ?? id;
}

// D26 (WAR, Off, AVG, OBP, SLG, OPS hidden) and D31 (ERA only in the pitcher's season-by-season table): placing one of
// these where the starting rules keep it out is allowed (D36 makes them starting settings) but warned about.
const RULED = ["D26", "D31"];
const ONLY_IN = { ERA: { side: "pit", area: "career", state: "on" } };

/** The catalog as a Map id -> entry, from the CATALOG array or a catalogJson()-style object. */
export function catalogMap(catalog) {
  if (catalog instanceof Map) return catalog;
  if (Array.isArray(catalog)) return new Map(catalog.map((e) => [e.id, e]));
  if (catalog && typeof catalog === "object") return new Map(Object.entries(catalog).map(([id, e]) => [e.id ?? id, e]));
  return new Map();
}

const isList = (x) => Array.isArray(x);
// What each box of the player page can draw (public/js/player/plan.js draws exactly these): the pitch-mix and
// pitches-seen boxes their own per-pitch figures; the vs-hand box vs-hand (split) figures; the speed box the four
// fielding figures as well; every other box, the photo circles and the plain line season figures and counts.
const WIDGET_IDS = {
  bat: { pitch: ["seen.usage", "seen.rv100"] },
  pit: { mix: ["pitch.usage", "pitch.velo", "pitch.spin", "pitch.hMov", "pitch.vMov", "pitch.whiff", "pitch.putAway", "pitch.rv100"] },
};
export const FIELDING_IDS = ["fld.OAA/1000", "OAA", "fld.inn", "DRS"];
/** Whether the player page can draw catalog entry e in an area ("spotlight", "plain" or a box id) of a side. */
export function drawsIn(side, area, e) {
  const scope = e?.scope ?? "season", w = WIDGET_IDS[side]?.[area];
  if (w) return w.includes(e?.id);
  if (area === "hands") return scope === "split";
  if (scope === "position") return area === "speed" && FIELDING_IDS.includes(e?.id);
  return scope === "season" || scope === "count";
}
// per-pitch, per-position and vs-hand figures have no single value to put in a circle around the photo
const NOT_IN_SPOTLIGHT = ["pitch", "position", "split"];

/** Old ids (catalog aliases) -> current id, for aliases that are not themselves a current id. */
function aliasMap(cat) {
  const m = new Map();
  for (const [id, e] of cat) for (const a of e.aliases ?? []) if (!cat.has(a) && !m.has(a)) m.set(a, id);
  return m;
}
/** The current catalog id for an id or an old name (alias); the input itself when the catalog knows neither. */
export function currentId(id, catalog) {
  const cat = catalogMap(catalog);
  return cat.has(id) ? id : aliasMap(cat).get(id) ?? id;
}
/** Every id list of the settings, as [path, list] pairs (spotlight, boxes, plain), for both sides. */
function idLists(settings) {
  const out = [];
  for (const side of SIDES) {
    const sd = settings?.[side];
    if (!sd || typeof sd !== "object") continue;
    for (const k of ["big", "ring", "ringLarge"]) if (isList(sd.spotlight?.[k])) out.push([side, "spotlight", sd.spotlight[k]]);
    for (const b of isList(sd.boxes) ? sd.boxes : []) for (const k of ["main", "on"]) if (b && isList(b[k])) out.push([side, b.id, b[k]]);
    for (const k of ["main", "on"]) if (isList(sd.plain?.[k])) out.push([side, "plain", sd.plain[k]]);
  }
  return out;
}
/** A copy of the settings with every old name (catalog alias) replaced by the stat's current id, so a catalog rename
 * never forces an edit to the settings file; the next save writes the current ids. Order is kept. */
export function canonical(settings, catalog) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return settings;
  const cat = catalogMap(catalog), al = aliasMap(cat), copy = JSON.parse(JSON.stringify(settings));
  for (const [, , list] of idLists(copy)) list.forEach((id, i) => { if (!cat.has(id) && al.has(id)) list[i] = al.get(id); });
  return copy;
}
const sidesOf = (e) => e.sides ?? [];
const sourcesFor = (e, side) => ["past", "live", "gap"].flatMap((k) => (e.src?.[k] ?? []).filter((s) => (s.sides ?? sidesOf(e)).includes(side)));

/** Every placement of one side as [{area, list, ids}], area = "spotlight", "plain" or a box id; list = "big" | "ring" |
 * "main" | "on". Missing or malformed lists are skipped (validate reports them). */
function placements(sd) {
  const out = [];
  if (!sd || typeof sd !== "object") return out;
  const sp = sd.spotlight ?? {};
  for (const list of ["big", "ring"]) if (isList(sp[list])) out.push({ area: "spotlight", list, ids: sp[list] });
  for (const b of isList(sd.boxes) ? sd.boxes : []) {
    for (const list of ["main", "on"]) if (b && isList(b[list])) out.push({ area: b.id, list, ids: b[list] });
  }
  for (const list of ["main", "on"]) if (sd.plain && isList(sd.plain[list])) out.push({ area: "plain", list, ids: sd.plain[list] });
  return out;
}

/**
 * Checks a settings object against the catalog. Resolves {errors, warnings}, each a list of
 * {code, side, area, stat, message} (side, area and stat null where they do not apply).
 * Errors (the file cannot be used): wrong schema, a side or list missing or not a list, unknown stat id, a stat on the
 * wrong side, the same stat twice within one box (or twice around the photo), more than 2 big or 5 ring circles, a
 * ringLarge stat not in the ring, a per-pitch, per-position or vs-hand stat around the photo (spotlight_scope), an unknown,
 * repeated or missing box id (every box of the side must be listed), show not true or false.
 * Warnings (allowed, worth a look): a placed stat with no data source for that side, a placement that overrides the
 * D26 / D31 starting rules, a placed stat whose computed or substitute source has no label for the page (D35), an old
 * name (a catalog alias, old_name; checked as its current id), a stat the box cannot draw (not_drawn, drawsIn: a
 * per-pitch figure outside the pitch box, a season figure in the vs-hand box, and so on), so it would not show.
 */
export function validate(settings, catalog) {
  const errors = [], warnings = [];
  const cat = catalogMap(catalog), al = aliasMap(cat);
  const err = (code, message, o = {}) => errors.push({ code, side: o.side ?? null, area: o.area ?? null, stat: o.stat ?? null, message });
  const warn = (code, message, o = {}) => warnings.push({ code, side: o.side ?? null, area: o.area ?? null, stat: o.stat ?? null, message });
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    err("not_object", "The settings file is not a JSON object.");
    return { errors, warnings };
  }
  if (settings.schema !== SCHEMA) err("schema", `schema must be ${SCHEMA} (found ${JSON.stringify(settings.schema)}).`);
  // old names (catalog aliases) are accepted as their current id, with a warning; the checks below run on current ids
  for (const [side, area, list] of idLists(settings)) {
    for (const id of list) {
      if (!cat.has(id) && al.has(id)) warn("old_name", `${side === "bat" ? "hitters" : "pitchers"}: ${areaTitle(side, area)} uses the old name ${id}; it is saved as ${al.get(id)} on the next save.`, { side, area, stat: al.get(id) });
    }
  }
  settings = canonical(settings, cat);

  for (const side of SIDES) {
    const sd = settings[side];
    const name = side === "bat" ? "hitters" : "pitchers";
    if (!sd || typeof sd !== "object") { err("side_missing", `The ${name} section ("${side}") is missing.`, { side }); continue; }
    const sp = sd.spotlight;
    if (!sp || typeof sp !== "object") err("list_missing", `${name}: "spotlight" is missing.`, { side, area: "spotlight" });
    else {
      for (const list of ["big", "ring", "ringLarge"]) if (!isList(sp[list])) err("list_missing", `${name}: spotlight.${list} must be a list.`, { side, area: "spotlight" });
      if (isList(sp.big) && sp.big.length > BIG_MAX) err("too_many_big", `${name}: ${sp.big.length} big circles; at most ${BIG_MAX}.`, { side, area: "spotlight" });
      if (isList(sp.ring) && sp.ring.length > RING_MAX) err("too_many_ring", `${name}: ${sp.ring.length} ring circles; at most ${RING_MAX}.`, { side, area: "spotlight" });
      if (isList(sp.ringLarge) && isList(sp.ring)) {
        for (const id of sp.ringLarge) if (!sp.ring.includes(id)) err("ring_large", `${name}: ${id} is in ringLarge but not in the ring.`, { side, area: "spotlight", stat: id });
      }
    }
    if (!isList(sd.boxes)) err("list_missing", `${name}: "boxes" must be a list.`, { side });
    else {
      const known = new Set((BOXES[side] ?? []).map((b) => b.id)), seen = new Set();
      for (const b of sd.boxes) {
        const id = b?.id;
        if (!known.has(id)) err("unknown_box", `${name}: unknown box "${id}" (known: ${[...known].join(", ")}).`, { side, area: id ?? null });
        else if (seen.has(id)) err("duplicate_box", `${name}: box "${id}" is listed twice.`, { side, area: id });
        seen.add(id);
        if (b && typeof b.show !== "boolean") err("show", `${name}: box "${id}" needs show: true or false.`, { side, area: id ?? null });
        for (const list of ["main", "on"]) if (!b || !isList(b[list])) err("list_missing", `${name}: box "${id}" ${list} must be a list.`, { side, area: id ?? null });
      }
      for (const id of known) if (!seen.has(id)) err("box_missing", `${name}: box "${id}" (${areaTitle(side, id)}) is missing; every box must be listed (show: false hides one).`, { side, area: id });
    }
    if (!sd.plain || !isList(sd.plain.main) || !isList(sd.plain.on)) err("list_missing", `${name}: plain.main and plain.on must be lists.`, { side, area: "plain" });

    // per stat: known, right side, once per box; then the warnings
    const inArea = new Map(); // area -> Set of ids
    for (const { area, list, ids } of placements(sd)) {
      const set = inArea.get(area) ?? new Set();
      inArea.set(area, set);
      for (const id of ids) {
        const where = { side, area, stat: id }, title = areaTitle(side, area);
        const e = cat.get(id);
        if (!e) { err("unknown_stat", `${name}: "${id}" in ${title} (${list}) is not in the stat catalog.`, where); continue; }
        if (!sidesOf(e).includes(side)) { err("wrong_side", `${name}: ${id} in ${title} is not a ${side === "bat" ? "hitter" : "pitcher"} stat.`, where); continue; }
        if (set.has(id)) { err("duplicate", `${name}: ${id} appears twice in ${title}.`, where); continue; }
        if (area === "spotlight" && NOT_IN_SPOTLIGHT.includes(e.scope)) { err("spotlight_scope", `${name}: ${id} is a per-${e.scope === "split" ? "hand" : e.scope} figure, so it cannot be a circle around the photo.`, where); continue; }
        set.add(id);
        if (!drawsIn(side, area, e)) warn("not_drawn", `${name}: ${id} cannot be drawn in ${title}, so it will not show there${e.scope && e.scope !== "season" ? ` (it is a per-${e.scope === "split" ? "hand" : e.scope} figure)` : ""}.`, where);
        if (!sourcesFor(e, side).length) warn("no_source", `${name}: ${id} is shown in ${title} but has no data source for ${name}, so it will show a dash.`, where);
        const only = ONLY_IN[id];
        if (only && (only.side !== side || only.area !== area || only.state !== list)) {
          warn("ruling", `${name}: ${id} in ${title} (${list}) overrides D31 (ERA only in the pitcher's season-by-season table).`, where);
        } else if (!only && (e.rulings ?? []).some((r) => RULED.includes(r)) && (e.defaultState?.[side] ?? "off") === "off") {
          warn("ruling", `${name}: ${id} in ${title} overrides ${(e.rulings ?? []).filter((r) => RULED.includes(r)).join(" and ")}, which keeps it off the pages.`, where);
        }
        const unlabelled = sourcesFor(e, side).filter((s) => (s.kind || s.provider === "computed") && !s.label);
        if (unlabelled.length) warn("no_label", `${name}: ${id} in ${title} can come from a ${unlabelled[0].kind ?? "computed"} source with no label for the page (D35).`, where);
      }
    }
  }
  return { errors, warnings };
}

/**
 * One side of the settings, ready to draw: {side, spotlight:{big, ring, ringLarge}, boxes:[{id, title, show, main, on}]
 * in the file's order, plain:{main, on}, stats}. stats has every catalog stat of that side:
 * {id: {state, where:[{area, title, state, slot?}]}}, where lists the boxes (and areas) that show it, state "main" or
 * "on" per area, and the stat's overall state is "main" when it is MAIN anywhere, "on" when ON anywhere, else "off"
 * (off in every box). Old names (catalog aliases) count as their current id. Ids the catalog does not know, or of the
 * other side, are left out; call validate first.
 */
export function resolve(settings, catalog, side) {
  const cat = catalogMap(catalog);
  const sd = canonical(settings, cat)?.[side] ?? {};
  const ok = (id) => { const e = cat.get(id); return !!e && sidesOf(e).includes(side); };
  const clean = (ids) => [...new Set((isList(ids) ? ids : []).filter(ok))];
  const sp = sd.spotlight ?? {};
  const spotlight = { big: clean(sp.big), ring: clean(sp.ring), ringLarge: clean(sp.ringLarge) };
  const boxes = (isList(sd.boxes) ? sd.boxes : []).map((b) => {
    const main = clean(b?.main);
    return { id: b?.id, title: areaTitle(side, b?.id), show: b?.show !== false, main, on: clean(b?.on).filter((id) => !main.includes(id)) };
  });
  const pm = clean(sd.plain?.main);
  const plain = { main: pm, on: clean(sd.plain?.on).filter((id) => !pm.includes(id)) };
  const stats = {};
  for (const [id, e] of cat) if (sidesOf(e).includes(side)) stats[id] = { state: "off", where: [] };
  const mark = (id, area, state, slot) => {
    const s = stats[id];
    if (!s) return;
    s.where.push({ area, title: areaTitle(side, area), state, ...(slot ? { slot } : {}) });
    if (state === "main" || s.state === "off") s.state = state === "main" ? "main" : s.state === "main" ? "main" : "on";
  };
  spotlight.big.forEach((id) => mark(id, "spotlight", "main", "big"));
  spotlight.ring.filter((id) => !spotlight.big.includes(id)).forEach((id) => mark(id, "spotlight", "main", spotlight.ringLarge.includes(id) ? "ring-large" : "ring"));
  for (const b of boxes) {
    if (!b.show) continue;
    b.main.forEach((id) => mark(id, b.id, "main"));
    b.on.forEach((id) => mark(id, b.id, "on"));
  }
  plain.main.forEach((id) => mark(id, "plain", "main"));
  plain.on.forEach((id) => mark(id, "plain", "on"));
  return { side, spotlight, boxes, plain, stats };
}

/** The settings reduced to the known shape (unknown keys dropped), keeping list order: what a save writes. */
export function normalize(settings) {
  const ids = (x) => (isList(x) ? x.map(String) : []);
  const side = (sd = {}) => ({
    spotlight: { big: ids(sd.spotlight?.big), ring: ids(sd.spotlight?.ring), ringLarge: ids(sd.spotlight?.ringLarge) },
    boxes: (isList(sd.boxes) ? sd.boxes : []).map((b) => ({ id: String(b?.id), show: b?.show !== false, main: ids(b?.main), on: ids(b?.on) })),
    plain: { main: ids(sd.plain?.main), on: ids(sd.plain?.on) },
  });
  return { schema: settings?.schema, updated: settings?.updated ?? null, updatedBy: settings?.updatedBy ?? null, bat: side(settings?.bat), pit: side(settings?.pit) };
}

/** The settings file's text: two-space JSON with every id list on one line, so a change reads as a one-line diff. */
export function formatSettings(settings) {
  const s = normalize(settings), j = (x) => JSON.stringify(x).replace(/","/g, "\", \"");
  const side = (sd) => [
    "    \"spotlight\": {",
    `      "big": ${j(sd.spotlight.big)},`,
    `      "ring": ${j(sd.spotlight.ring)},`,
    `      "ringLarge": ${j(sd.spotlight.ringLarge)}`,
    "    },",
    "    \"boxes\": [",
    sd.boxes.map((b) => `      { "id": ${JSON.stringify(b.id)}, "show": ${b.show}, "main": ${j(b.main)}, "on": ${j(b.on)} }`).join(",\n"),
    "    ],",
    `    "plain": { "main": ${j(sd.plain.main)}, "on": ${j(sd.plain.on)} }`,
  ].join("\n");
  return ["{", `  "schema": ${JSON.stringify(s.schema)},`, `  "updated": ${JSON.stringify(s.updated)},`, `  "updatedBy": ${JSON.stringify(s.updatedBy)},`,
    "  \"bat\": {", side(s.bat), "  },", "  \"pit\": {", side(s.pit), "  }", "}", ""].join("\n");
}
