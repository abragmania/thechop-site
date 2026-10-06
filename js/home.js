// Home page: hero search, the 30 teams by division, and league-wide hitter and pitcher lists (D23, D12, D26).
import { getTeams, getList, teamLogoUrl, headshotUrl, playerUrl, teamUrl } from "./api.js";
import { initNav, attachSearch, groupTeams, DIVISIONS } from "./nav.js";
import { pctTone, ord } from "../lib/pct.mjs"; // /lib live, ./lib on the exported site
import { groupText, minText } from "../lib/groups.mjs";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const DASH = "–";
const day = (iso) => (iso ? String(iso).slice(0, 10) : DASH);

initNav($("nav"), { search: false });
attachSearch($("hq"), $("hdd"));

// D12 colour from lib/pct.mjs: green at the shown 60th percentile and up (intensity rising to the 99th), the brick tone at the 20th or below, otherwise plain.
const pill = (v, pct, digits, vs) => {
  if (v == null) return `<span class="pill"><b>${DASH}</b></span>`;
  const { c, i, pc } = pctTone(pct);
  return `<span class="pill ${c}" style="--i:${i.toFixed(2)}"><b>${Number(v).toFixed(digits)}</b>${pc != null ? `<em>${ord(pc)} pct${vs ? ` vs ${esc(vs)}` : ""}</em>` : ""}</span>`;
};

const LISTS = {
  bat: { title: "Hitters", stat: "wRC+", sort: "wRC+", unit: "PA", min: 100, step: 25, digits: 0, note: "by wRC+ (100 = league average)" },
  pit: { title: "Pitchers", stat: "SIERA", sort: "SIERA", unit: "IP", min: 30, step: 10, digits: 2, note: "by SIERA (lower is better), compared within role", pr: "SP" },
};
let season = null;

// Default view is the season's comparison group (D38) when the list carries it (stat.inGroup, true/false per player; the minimum
// itself in the list's groups, from that season's data): hitters at the PA minimum, starters and relievers at their innings
// minimums as a starter or in relief. The checkbox, labelled with the minimum, turns it off; the minimum box is an optional
// extra filter, empty by default.
function resetMins() {
  for (const role of ["bat", "pit"]) { LISTS[role].min = 0; const el = $(`min-${role}`); if (el) el.value = ""; LISTS[role].limit = 25; }
}

function shell(role) {
  const L = LISTS[role];
  L.limit = 25;
  $(role).innerHTML = `<div class="lh"><div><h3>${L.title}</h3><small>${L.note}</small></div>`
    + (role === "pit" ? `<div class="tog" id="tog-pit"><button type="button" data-r="SP" class="on">Starters</button><button type="button" data-r="RP">Relievers</button></div>` : "")
    + `<div class="ctl"><label id="qlab-${role}" hidden><input type="checkbox" id="q-${role}" checked> <span id="qtxt-${role}"></span></label> <label>Min ${L.unit} <input type="number" min="0" step="${L.step}" value="" placeholder="any" id="min-${role}" aria-label="Minimum ${L.unit}"></label></div></div>`
    + `<div id="body-${role}"><div class="msg">Loading…</div></div>`;
  $(`q-${role}`).addEventListener("change", () => { L.limit = 25; load(role); });
  $(`min-${role}`).addEventListener("input", (e) => {
    L.min = Math.max(0, Number(e.target.value) || 0); L.limit = 25;
    clearTimeout(L.t); L.t = setTimeout(() => load(role), 250);
  });
  $("tog-pit")?.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    L.pr = b.dataset.r;
    $("tog-pit").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    L.limit = 25; load("pit");
  });
}

async function load(role) {
  const L = LISTS[role], body = $(`body-${role}`);
  L.ctl?.abort();
  L.ctl = new AbortController();
  try {
    const r = await getList({ role, season, sort: L.sort, min: L.min, limit: 2000, signal: L.ctl.signal });
    const hasQ = (r.players || []).some((p) => p.stat?.inGroup === true);
    // This list's group: its minimum from the season's data ("200+ PA"); a pitcher's is innings as a starter or in relief.
    const gk = role === "bat" ? "bat" : L.pr === "SP" ? "sp" : "rp", g = r.groups?.[gk] ?? null;
    const grp = groupText(gk, g), as = role === "bat" ? "" : L.pr === "SP" ? " as a starter" : " in relief";
    $(`qlab-${role}`).hidden = !hasQ;
    // The pitcher lists are each group minus the pitchers filed under the other role, so the page says so.
    const both = role === "pit" ? " A pitcher in both groups is listed under the role he pitched more." : "";
    $(`qtxt-${role}`).textContent = g ? minText(g) : "Regulars";
    $(`qlab-${role}`).title = g ? `Only ${grp}${as} in ${season}: the group percentiles are measured against.${both}` : "";
    const qOn = hasQ && $(`q-${role}`).checked;
    const all = (r.players || []).filter((p) => {
      if (role === "bat") return !qOn || p.stat?.inGroup === true;
      return qOn ? p.stat?.groupAs === L.pr : p.stat?.role === L.pr; // on: the starters' or relievers' group; off: the season's role
    });
    const rows = all.slice(0, L.limit);
    if (!rows.length) {
      const who = role === "pit" ? (L.pr === "SP" ? "starters" : "relievers") : "hitters";
      body.innerHTML = `<div class="msg">No ${qOn ? `${grp}${as}` : who}${L.min > 0 ? `${qOn ? " and" : " with"} at least ${L.min} ${L.unit}` : ""} in ${season}.</div>`;
      return;
    }
    const src = Object.values(r.sources || {})[0];
    body.innerHTML = `<table class="pl"><thead><tr><th></th><th>Player</th><th class="hide-s">Pos</th><th>${L.unit}</th><th>${L.stat}</th></tr></thead><tbody>`
      + rows.map((p, i) => {
        const s = p.stat || {};
        const logo = p.teamId ? `<img src="${teamLogoUrl(p.teamId)}" alt="">` : "";
        // Static site: built is false when his page for this role was not exported (live rows carry no built flag).
        const off = p.built === false;
        const inner = `<img class="hs" src="${headshotUrl(p.mlbam)}" alt="" loading="lazy"><span><b>${esc(p.name ?? p.fgId)}</b><small>${logo}${esc(p.label || p.team || DASH)}${off ? " · not on the public site yet" : ""}</small></span>`;
        const cell = off ? `<span class="nolink" style="display:flex;align-items:center;gap:9px;opacity:.55;cursor:default">${inner}</span>` : `<a href="${playerUrl(p, role)}">${inner}</a>`;
        return `<tr><td class="rk">${i + 1}</td><td class="nm">${cell}</td>`
          + `<td class="hide-s">${esc(role === "pit" ? s.role || DASH : p.pos || DASH)}</td><td class="num">${s[L.unit] ?? DASH}</td><td>${pill(s[L.stat], s.pct, L.digits, role === "pit" && s.groupAs && s.role && s.groupAs !== s.role ? s.role : null)}</td></tr>`;
      }).join("") + `</tbody></table>`
      + (all.length > L.limit ? `<button class="more" type="button" id="more-${role}">Show more</button>` : "")
      + `<div class="src">Source: ${esc(src?.label || "FanGraphs")}, as of ${day(src?.asOf)}. Percentile among ${g?.n != null ? `${g.n} ` : ""}${grp}${as} in ${season}.${qOn ? both : ""}</div>`;
    $(`more-${role}`)?.addEventListener("click", () => { L.limit += 25; load(role); });
    L.asOf = src?.asOf;
    footLine();
  } catch (e) {
    if (e.name === "AbortError") return;
    body.innerHTML = `<div class="msg">${esc(e.status === 404 || e.status === 400 ? `No ${season} list is available (${e.message})` : "The list could not be loaded right now.")}</div>`;
  }
}

function footLine() {
  const d = [LISTS.bat.asOf, LISTS.pit.asOf].filter(Boolean).sort().pop();
  $("srcline").innerHTML = `<b>The Chop</b> · Player data: FanGraphs (leaderboards, ${season} season${d ? `, as of ${day(d)}` : ""}). Team logos: MLB.`;
}

// "New York Yankees" -> location "New York", nickname "Yankees" (a few nicknames are two words; the Athletics have no location).
const TWO_WORD = ["White Sox", "Red Sox", "Blue Jays"];
function splitName(name) {
  const two = TWO_WORD.find((n) => name.endsWith(n));
  const nick = two || name.split(" ").pop();
  return { loc: name.slice(0, name.length - nick.length).trim(), nick };
}
function teamGrid(teams) {
  const g = groupTeams(teams);
  const row = (t) => { const n = splitName(t.name); return `<a class="trow" href="${teamUrl(t.abbr)}" title="${esc(t.name)}"><img src="${teamLogoUrl(t.id)}" alt=""><span>${n.loc ? `<small>${esc(n.loc)}</small>` : ""}<b>${esc(n.nick)}</b></span></a>`; };
  $("tgrid").innerHTML = ["American League", "National League"].map((lg) => `<div class="lg"><h3>${lg}</h3><div class="divs">${DIVISIONS.map((dv) =>
    `<div class="dcol"><i>${dv}</i>${(g[lg]?.[dv] || []).map(row).join("")}</div>`).join("")}</div></div>`).join("");
}

(async function start() {
  shell("bat"); shell("pit");
  let cur = new Date().getFullYear();
  try {
    const r = await getTeams();
    teamGrid(r.teams);
    cur = r.season || cur;
  } catch { $("tgrid").innerHTML = `<div class="msg">Teams are unavailable right now.</div>`; }
  const sel = $("season");
  for (let y = cur; y >= 2016; y--) sel.insertAdjacentHTML("beforeend", `<option value="${y}">${y}</option>`);
  season = cur;
  sel.addEventListener("change", () => { season = Number(sel.value); resetMins(); load("bat"); load("pit"); });
  load("bat"); load("pit");
})();
