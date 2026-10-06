// The Stats page (STAT-SWITCHES, D36): every stat in the catalog, grouped by category for hitters and pitchers, with
// where it shows (its MAIN / ON / OFF switch per box), where its numbers come from, and the settings file's warnings.
// On the local app Adam flips the switches here and saves them (POST /api/settings, server/routes/settings.js); on the
// public site the controls show but are disabled. The player page starts obeying the switches in STAT-SWITCHES step 4.
import { getSettings, getCatalog, saveSettings, isStatic } from "./api.js";
import { initNav } from "./nav.js";
import { validate, resolve, canonical, areaTitle, BOXES, BIG_MAX, RING_MAX } from "../lib/statsettings.mjs"; // /lib live, ./lib on the exported site
import { CATEGORIES } from "../lib/statreg.mjs";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const DASH = "–";
const SIDE_WORD = { bat: "hitters", pit: "pitchers" };

// Plain-English names for stats whose catalog label is only the FanGraphs abbreviation.
const PLAIN = {
  "wRC+": "Weighted runs created plus (100 = league average)", wOBA: "Weighted on-base average", xwOBA: "Expected wOBA from quality of contact",
  ISO: "Isolated power (extra bases per at-bat)", "HR/PA": "Home runs per plate appearance", "K%": "Strikeout rate", "BB%": "Walk rate",
  "K-BB%": "Strikeout rate minus walk rate", "SwStr%": "Swinging-strike rate (whiffs per pitch)", "C+SwStr%": "Called plus swinging strikes per pitch",
  "CStr%": "Called-strike rate per pitch", "O-Swing%": "Chase rate: swings at pitches outside the zone", "Z-Swing%": "Swings at pitches in the zone",
  "Swing%": "Swing rate on all pitches", "O-Contact%": "Contact on swings outside the zone", "Z-Contact%": "Contact on swings in the zone",
  "Contact%": "Contact on all swings", "Zone%": "Share of pitches in the strike zone", "F-Strike%": "First-pitch strike rate",
  "GB%": "Ground-ball rate", "LD%": "Line-drive rate", "FB%": "Fly-ball rate", "IFFB%": "Infield fly balls (share of fly balls)",
  "HR/FB": "Home runs per fly ball", BABIP: "Batting average on balls in play", "Pull%": "Pulled batted balls", "Cent%": "Batted balls up the middle",
  "Oppo%": "Opposite-field batted balls", "Soft%": "Softly hit balls", "Med%": "Medium-hit balls", "Hard%": "Hard-hit balls (FanGraphs' contact buckets)",
  "Barrel%": "Barrels (ideal speed and angle) per batted ball", "HardHit%": "Hard-hit rate (95+ mph) per batted ball", LA: "Average launch angle",
  EV90: "Exit velocity of his 90th-percentile batted ball", Spd: "Speed score", FIP: "Fielding-independent pitching", xFIP: "Expected FIP (fly balls at the league home-run rate)",
  SIERA: "Skill-interactive earned run average estimator", xERA: "Expected earned run average from quality of contact", ERA: "Earned run average",
  "FIP-": "FIP against league (100 = average, lower is better)", "xFIP-": "xFIP against league (100 = average, lower is better)",
  "LOB%": "Runners left on base (strand rate)", "HR/9": "Home runs allowed per nine innings", "K/9": "Strikeouts per nine innings",
  "BB/9": "Walks per nine innings", "H/9": "Hits allowed per nine innings", WHIP: "Walks plus hits per inning", "Stuff+": "Stuff+ pitch-quality model (100 = average)",
  AVG: "Batting average", OBP: "On-base percentage", SLG: "Slugging percentage", OPS: "On-base plus slugging", xAVG: "Expected batting average",
  xSLG: "Expected slugging", "GB/FB": "Ground balls per fly ball", "IFH%": "Infield-hit rate", "BUH%": "Bunt-hit rate",
  "wOBA against": "wOBA allowed", "xwOBA against": "Expected wOBA allowed", "wOBA against (Savant)": "wOBA allowed (Baseball Savant's figure)",
};
// stats indexed to the league whose id ends in "-" (FIP-, xFIP- and the retired one for earned runs) read the same way
const indexedName = (e) => (/^[A-Za-z]+-$/.test(e.id) ? `${e.id.slice(0, -1)} against league (100 = average, lower is better)` : null);
const nameOf = (e) => PLAIN[e.id] ?? indexedName(e) ?? e.label ?? e.id;
// visible text never carries ruling numbers or FanGraphs query codes: "(D13)", "(FanGraphs qual=y)", "(... D21)"
const plainText = (t) => String(t ?? "").replace(/\s*\([^()]*(\bD\d+\b|qual=)[^()]*\)/g, "").trim();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayText = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? "")); return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : DASH; };
// what each settings warning means, in words for the page
const WARN_TEXT = {
  no_source: (w) => `No data source for ${SIDE_WORD[w.side]} yet, so it shows a dash in ${areaTitle(w.side, w.area)}.`,
  ruling: (w) => `An earlier ruling keeps this stat off the pages; switching it on in ${areaTitle(w.side, w.area)} overrides that.`,
  no_label: (w) => `One of its computed sources has no label for the page (${areaTitle(w.side, w.area)}).`,
  old_name: (w) => `Listed under an old name in ${areaTitle(w.side, w.area)}; the next save writes its current name.`,
};

const PROVIDER = { mlb: "MLB Stats API", savant: "Baseball Savant", computed: "Computed" };
const providerWord = (s) => (s.provider === "fg" ? "FanGraphs" : PROVIDER[s.provider] ?? s.provider);
const span = (from, to) => (from != null && to != null ? (from === to ? `${from}` : `${from}–${to}`) : from != null ? `${from} on` : to != null ? `to ${to}` : "");
const forSide = (list, e, side) => (list ?? []).filter((s) => (s.sides ?? e.sides).includes(side));

// SAVED: the file as loaded; BASE: the same with old names replaced by current ids (what DRAFT starts from, so an
// old name alone is not an unsaved change and the next save writes the current ids)
let CAT = null, SAVED = null, BASE = null, DRAFT = null, SIDE = "bat", Q = "", OFFONLY = false, BUSY = false, RESULT = null, STALE = false;
const OPEN = new Set();
const clone = (x) => JSON.parse(JSON.stringify(x));
const dirty = () => JSON.stringify(DRAFT) !== JSON.stringify(BASE);
const LOCKED = isStatic;

function srcHTML(list) {
  if (!list.length) return `<span class="none" title="No source named in the project's documents">${DASH}</span>`;
  return list.map((s) => {
    const yrs = span(s.from, s.to);
    return `<span class="s1">${esc(providerWord(s))}${yrs ? ` <small>(${yrs})</small>` : ""}${s.label ? `<em>${esc(plainText(s.label))}</em>` : ""}</span>`;
  }).join(`<span class="then">then</span>`);
}

// seasons available: the catalog's own span, else the sources' (earliest known start, latest known end; a source with a
// known start and no end runs to now); null when no source names a start
function yearsOf(e, side) {
  const all = ["past", "live", "gap"].flatMap((k) => forSide(e.src?.[k], e, side));
  const froms = all.filter((s) => s.from != null);
  const from = e.years?.from ?? (froms.length ? Math.min(...froms.map((s) => s.from)) : null);
  if (from == null) return null;
  const open = froms.some((s) => s.to == null) || (e.years?.from != null && all.some((s) => s.to == null));
  const tos = all.filter((s) => s.to != null).map((s) => s.to);
  const to = e.years?.to ?? (open || !tos.length ? null : Math.max(...tos));
  return to == null ? `${from} to now` : span(from, to);
}

// the ranking population for this side: the catalog joins the hitter and pitcher wording with "; " (lib/statreg.mjs popOf)
function popFor(e, side) {
  if (!e.pctPop) return null;
  const parts = e.pctPop.split("; ");
  if (parts.length < 2) return plainText(e.pctPop);
  return plainText(parts.find((x) => (side === "bat") === /\bhitters\b/.test(x)) ?? e.pctPop);
}

function pill(w) {
  const where = w.area === "spotlight" ? `Around the photo · ${w.slot === "big" ? "big circle" : "small circle"}` : w.title;
  return `<span class="pl ${w.state}"><b>${w.state === "main" ? "MAIN" : "ON"}</b>${esc(where)}</span>`;
}

// the boxes as the file lists them (a missing box is a validation error, never invented here), then the plain line
function areasOf(side) {
  const known = BOXES[side].map((b) => b.id);
  return [...DRAFT[side].boxes.map((b) => b.id).filter((id) => known.includes(id)), "plain"];
}
function stateIn(side, area, id) {
  const sd = DRAFT[side], t = area === "plain" ? sd.plain : sd.boxes.find((b) => b.id === area);
  return !t ? "off" : t.main.includes(id) ? "main" : t.on.includes(id) ? "on" : "off";
}
// one switch: unchanged state = no change at all (order kept, nothing unsaved); otherwise the stat leaves the box's
// lists and, when switched ON or MAIN, goes to the end of that list. Returns whether anything changed.
function setIn(side, area, id, st) {
  const sd = DRAFT[side];
  const t = area === "plain" ? sd.plain : sd.boxes.find((b) => b.id === area);
  if (!t || stateIn(side, area, id) === st) return false;
  t.main = t.main.filter((x) => x !== id); t.on = t.on.filter((x) => x !== id);
  if (st === "main") t.main.push(id);
  if (st === "on") t.on.push(id);
  return true;
}

function editorHTML(e) {
  const dis = LOCKED || BUSY ? " disabled" : "";
  const cells = areasOf(SIDE).map((a) => {
    const st = stateIn(SIDE, a, e.id), box = DRAFT[SIDE].boxes.find((b) => b.id === a);
    return `<div class="ea"><span>${esc(areaTitle(SIDE, a))}${box && box.show === false ? ` <small>(box hidden)</small>` : ""}</span><div class="seg3" role="group" aria-label="${esc(areaTitle(SIDE, a))}">${["off", "on", "main"].map((s) =>
      `<button type="button" class="${s}${st === s ? " cur" : ""}" data-area="${esc(a)}" data-set="${s}" data-id="${esc(e.id)}" aria-pressed="${st === s}"${dis}>${s.toUpperCase()}</button>`).join("")}</div></div>`;
  }).join("");
  return `<div class="sedit">${cells}<p class="en">Around the photo is set at the top of the page.</p></div>`;
}

function rowHTML(e, r, warns) {
  const s = r.stats[e.id], short = e.short && e.short !== nameOf(e) ? e.short : null;
  const off = !s.where.length ? `<span class="pl off"><b>OFF</b>every box</span>` : `<span class="pl off q"><b>OFF</b>all other boxes</span>`;
  const kinds = [...new Set(["past", "live", "gap"].flatMap((k) => forSide(e.src?.[k], e, SIDE)).filter((x) => x.kind).map((x) => x.kind))];
  const w = warns.filter((x) => x.stat === e.id);
  const open = OPEN.has(e.id);
  return `<div class="srow${s.state === "off" ? " isoff" : ""}${open ? " open" : ""}" data-row="${esc(e.id)}">
    <div class="sname"><b>${esc(nameOf(e))}</b><small>${short ? `<code>${esc(short)}</code>` : ""}${e.id !== short && e.id !== nameOf(e) ? `<code class="id">${esc(e.id)}</code>` : ""}${kinds.map((k) => `<span class="kb">${esc(k)}</span>`).join("")}</small></div>
    <div class="swhere"><div class="pills">${s.where.map(pill).join("")}${off}</div><button type="button" class="chg" data-open="${esc(e.id)}" aria-expanded="${open}">${open ? "Done" : LOCKED ? "See switches" : "Change"}</button></div>
    <div class="ssrc"><div><i>Past seasons</i>${srcHTML(forSide(e.src?.past, e, SIDE))}</div><div><i>This season</i>${srcHTML(forSide(e.src?.live, e, SIDE))}</div></div>
    <div class="sdet">${yearsOf(e, SIDE) ? `<div><i>Years</i>${esc(yearsOf(e, SIDE))}</div>` : ""}<div><i>Ranked among</i>${popFor(e, SIDE) ? esc(popFor(e, SIDE)) : DASH}</div>${w.map((x) => `<div class="warn">${esc((WARN_TEXT[x.code] ?? ((y) => plainText(y.message.replace(/^(hitters|pitchers): /, ""))))(x))}</div>`).join("")}</div>
    ${open ? editorHTML(e) : ""}</div>`;
}

function layoutHTML(r) {
  const dis = LOCKED || BUSY ? " disabled" : "";
  const sp = DRAFT[SIDE].spotlight;
  const opts = Object.values(CAT).filter((e) => e.sides.includes(SIDE) && !["pitch", "position", "split"].includes(e.scope)).sort((a, b) => (a.short || a.id).localeCompare(b.short || b.id));
  const optLabel = (e) => { const sh = e.short || e.id, nm = nameOf(e).replace(/\s*\([^)]*\)/g, "").replace(/\s+per\s.*$/, ""); return nm && nm !== sh ? `${sh} · ${nm}` : sh; };
  const sel = (list, i, cur) => `<select data-spot="${list}" data-i="${i}" aria-label="${list === "big" ? "Big circle" : "Small circle"} ${i + 1}"${dis}><option value="">${DASH} none</option>${opts.map((e) =>
    `<option value="${esc(e.id)}"${e.id === cur ? " selected" : ""}>${esc(optLabel(e))}</option>`).join("")}</select>`;
  const big = Array.from({ length: BIG_MAX }, (_, i) => `<div class="slot">${sel("big", i, sp.big[i])}</div>`).join("");
  const ring = Array.from({ length: RING_MAX }, (_, i) => `<div class="slot">${sel("ring", i, sp.ring[i])}<label class="lgck"><input type="checkbox" data-large="${i}"${sp.ring[i] && sp.ringLarge.includes(sp.ring[i]) ? " checked" : ""}${sp.ring[i] ? dis : " disabled"}> larger</label></div>`).join("");
  const boxes = areasOf(SIDE).filter((a) => a !== "plain").map((a) => {
    const b = DRAFT[SIDE].boxes.find((x) => x.id === a);
    return `<div class="bx${b.show ? "" : " hid"}"><b>${esc(areaTitle(SIDE, a))}</b><small>${b.main.length} main · ${b.on.length} on</small><label class="shw"><input type="checkbox" data-show="${esc(a)}"${b.show ? " checked" : ""}${dis}> ${b.show ? "Shown" : "Hidden"}</label></div>`;
  }).join("");
  const pl = r.plain;
  return `<h2>Around the photo · ${SIDE_WORD[SIDE]}</h2><p class="lh2">Two big circles and up to five small ones; "larger" draws a small circle a size up.</p>
    <div class="spot"><div><i>Big circles</i><div class="slots">${big}</div></div><div><i>Small circles</i><div class="slots">${ring}</div></div></div>
    <h2>Boxes · ${SIDE_WORD[SIDE]}</h2><p class="lh2">A hidden box leaves the player page with every stat in it; its switches are kept for when it comes back.</p>
    <div class="bxs">${boxes}<div class="bx"><b>${esc(areaTitle(SIDE, "plain"))}</b><small>${pl.main.length} main · ${pl.on.length} on</small><span class="shw fixed">Always shown</span></div></div>`;
}

function render() {
  const r = resolve(DRAFT, CAT, SIDE);
  const { errors, warnings } = validate(DRAFT, CAT);
  const warns = warnings.filter((w) => w.side === SIDE);
  $("asof").textContent = `Last saved ${dayText(SAVED.updated)}.`;
  $("layout").innerHTML = layoutHTML(r);
  const q = Q.trim().toLowerCase();
  const hit = (e) => !q || [e.id, e.short, e.label, nameOf(e), ...(e.aliases ?? [])].some((x) => String(x ?? "").toLowerCase().includes(q));
  let shown = 0;
  $("cats").innerHTML = CATEGORIES[SIDE].map((c) => {
    const list = Object.values(CAT).filter((e) => e.cat?.[SIDE] === c.id && hit(e) && (!OFFONLY || r.stats[e.id].state === "off"));
    if (!list.length) return "";
    shown += list.length;
    return `<section class="card cat"><h2>${esc(c.title)}<small>${list.length} stat${list.length === 1 ? "" : "s"}</small></h2>
      <div class="shead"><span>Stat</span><span>Where it shows</span><span>Where the numbers come from</span><span>Details</span></div>${list.map((e) => rowHTML(e, r, warns)).join("")}</section>`;
  }).join("") || `<div class="card msg">No stat matches${q ? ` “${esc(Q)}”` : ""}${OFFONLY ? " among the stats switched off everywhere" : ""}.</div>`;
  void shown;
  // the save bar: unsaved changes, problems that block a save, or the last save's result
  const bar = $("savebar");
  if (LOCKED) { bar.hidden = true; return; }
  if (dirty() || RESULT) {
    const errs = errors.length ? `<ul class="errs">${errors.map((x) => `<li>${esc(x.message)}</li>`).join("")}</ul>` : "";
    const res = RESULT && !dirty() ? `<span class="${STALE ? "bad" : "ok"}">${esc(RESULT)}</span>` : "";
    const fail = RESULT && dirty() ? `<span class="bad">${esc(RESULT)}</span>` : "";
    bar.innerHTML = dirty() ? `<div class="sbi"><b>Unsaved changes</b>${fail}<span class="sp"></span>${STALE ? `<button type="button" class="save" id="reload">Reload</button>` : `<button type="button" class="save" id="save"${errors.length || BUSY ? " disabled" : ""}>${BUSY ? "Saving…" : "Save"}</button>`}<button type="button" class="disc" id="discard"${BUSY ? " disabled" : ""}>Discard</button></div>${errs}`
      : `<div class="sbi">${res}<span class="sp"></span>${STALE ? `<button type="button" class="save" id="reload">Reload</button>` : `<button type="button" class="disc" id="dismiss">OK</button>`}</div>`;
    bar.hidden = false;
  } else bar.hidden = true;
}

async function save() {
  BUSY = true; RESULT = null; render();
  try {
    const r = await saveSettings(DRAFT); // carries the updated stamp it loaded; the server refuses a stale save (409)
    SAVED = r.settings; BASE = clone(SAVED); DRAFT = clone(SAVED);
    RESULT = `Saved${r.warnings?.length ? ` · ${r.warnings.length} warning${r.warnings.length === 1 ? "" : "s"} to look at (shown under each stat)` : ""}. Player pages start following the switches in the next update.`;
  } catch (e) {
    const list = e.body?.error?.errors;
    if (e.code === "stale_settings") { STALE = true; RESULT = "Not saved: the switches were changed somewhere else since this page loaded. Your choices are still shown here; note them, then reload to see the latest switches."; }
    else RESULT = `Not saved: ${e.message}${list?.length ? ` ${list.map((x) => x.message).join(" ")}` : ""}`;
  }
  BUSY = false; render();
}

document.addEventListener("click", (ev) => {
  const t = ev.target;
  const tab = t.closest("#sidetog [data-side]");
  if (tab) { SIDE = tab.dataset.side; document.querySelectorAll("#sidetog button").forEach((b) => { b.classList.toggle("on", b === tab); b.setAttribute("aria-selected", String(b === tab)); }); OPEN.clear(); render(); return; }
  const op = t.closest("[data-open]");
  if (op) { const id = op.dataset.open; if (OPEN.has(id)) OPEN.delete(id); else OPEN.add(id); render(); return; }
  const set = t.closest("[data-set]");
  if (set && !LOCKED && !BUSY) { if (setIn(SIDE, set.dataset.area, set.dataset.id, set.dataset.set)) { if (!STALE) RESULT = null; render(); } return; }
  if (t.closest("#reload")) { location.reload(); return; }
  if (t.closest("#save")) { save(); return; }
  if (t.closest("#discard")) { DRAFT = clone(BASE); if (!STALE) RESULT = null; render(); return; }
  if (t.closest("#dismiss")) { RESULT = null; render(); }
});
document.addEventListener("change", (ev) => {
  const t = ev.target;
  if (LOCKED || BUSY) return;
  const sp = DRAFT[SIDE].spotlight;
  if (t.dataset.spot) {
    const n = t.dataset.spot === "big" ? BIG_MAX : RING_MAX, arr = Array.from({ length: n }, (_, i) => sp[t.dataset.spot][i] ?? "");
    arr[+t.dataset.i] = t.value;
    sp[t.dataset.spot] = arr.filter(Boolean);
    sp.ringLarge = sp.ringLarge.filter((id) => sp.ring.includes(id));
  } else if (t.dataset.large != null) {
    const id = sp.ring[+t.dataset.large];
    if (id) sp.ringLarge = t.checked ? [...new Set([...sp.ringLarge, id])] : sp.ringLarge.filter((x) => x !== id);
  } else if (t.dataset.show) {
    const b = DRAFT[SIDE].boxes.find((x) => x.id === t.dataset.show);
    if (b) b.show = t.checked;
  } else return;
  if (!STALE) RESULT = null; render();
});
$("sq").addEventListener("input", (ev) => { Q = ev.target.value; render(); });
$("offonly").addEventListener("change", (ev) => { OFFONLY = ev.target.checked; render(); });
addEventListener("beforeunload", (ev) => { if (DRAFT && dirty()) { ev.preventDefault(); ev.returnValue = ""; } });

initNav($("nav"), { search: true });
$("modenote").textContent = LOCKED
  ? "Switch stats from The Chop on your computer (start.cmd)."
  : "Click Change on any stat to switch it per box, then Save; a newly switched-on stat goes to the end of its box. Player pages start following the switches in the next update.";
try {
  [CAT, SAVED] = await Promise.all([getCatalog(), getSettings()]);
  BASE = canonical(SAVED, CAT); DRAFT = clone(BASE);
  $("state").hidden = true; $("page").hidden = false;
  render();
} catch (e) {
  $("state").textContent = `The stats could not be loaded: ${e.message}`;
}
