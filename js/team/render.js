// The Chop team page: lifted from design/team-page.html, adapted to the normalized team build
// (GET /api/team-depth/:abbr -> {team, asOf, checkedAt, stale, refreshError}). All links relative.
import { getTeamDepth, teamLogoUrl, headshotUrl } from "../api.js";
import { initNav } from "../nav.js";
import { TEAMS } from "../../lib/teams.mjs";
import { pctTone, pctShown, ord } from "../../lib/pct.mjs";
import { GROUP_MIN, groupText, groupTextAny } from "../../lib/groups.mjs";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const DASH = "–";
const f3 = (v) => (v == null ? DASH : Number(v).toFixed(3).replace(/^0/, ""));
const pctf = (v) => (v == null ? DASH : (v * 100).toFixed(1) + "%");
const num = (v) => (v == null || v === "" ? DASH : v);
const ROUND = { WCS: "Wild Card Series", DS: "Division Series", CS: "Championship Series", WS: "World Series" };
const DIV = { E: "East", C: "Central", W: "West" };
const fmtDate = (iso) => {
  if (!iso) return DASH;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso).slice(0, 10) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const md = (s) => { const d = new Date(String(s).slice(0, 10) + "T12:00:00"); return Number.isNaN(d.getTime()) ? DASH : (d.getMonth() + 1) + "/" + d.getDate(); };
/* D12 colour (lib/pct.mjs): judged on the shown integer percentile; 60th+ green with intensity rising to the 99th, 20th or below the brick tone, between plain */
const qc = (pc) => pctTone(pc);
const ageF = (v) => (v == null || v === "" ? DASH : Number(v).toFixed(1));
const ipF = (v) => (v == null ? DASH : Number(v).toFixed(1));
const isPitPos = (pos) => /^(SP|RP|P|CL|LHP|RHP)$/i.test(String(pos || ""));
const numericId = (v) => v != null && /^\d+$/.test(String(v));
const teamFor = (abbr) => TEAMS[abbr] || Object.values(TEAMS).find((t) => t.fgAbbr === abbr) || null;
const teamByShort = (short) => Object.values(TEAMS).find((t) => t.name === short || t.name.endsWith(" " + short)) || null;

/* team accent (D19): the darker of the two team colours, darkened further if still light, so white text on it stays readable */
const lum = (hex) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
function accent(c) {
  let h = lum(c.primary) <= lum(c.secondary) ? c.primary : c.secondary;
  const n = parseInt(h.slice(1), 16);
  let rgb = [n >> 16, (n >> 8) & 255, n & 255];
  for (let k = 0; k < 6 && lum("#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("")) > .12; k++) rgb = rgb.map((v) => Math.round(v * .8));
  return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
}
let T, SRC, SEAS, HSEAS, ROUNDN, HAND = "R", LVL = "aaa", PROS = new Map(), L6 = [], BPD = [];
const asOfOf = (id) => fmtDate(SRC[id]?.asOf);

/* player links: numeric FanGraphs ids only; minor-league ids ("sa...") get none */
const plUrl = (fgId, role) => `./player.html?id=${encodeURIComponent(fgId)}&role=${role}`;
const roleOf = (r) => (r.headlineRole === "pit" ? "pit" : "bat");

/* pills */
function pill(h, kind) {
  const bat = kind === "bat";
  if (!h || h.value == null) return `<span class="pill"><b>${DASH}</b><small>${bat ? "no PA" : "no IP"}</small></span>`;
  const q = qc(h.pct);
  const shown = h.pct == null ? "" : ord(pctShown(h.pct));
  const val = bat ? Math.round(h.value) : Number(h.value).toFixed(2);
  const src = asOfOf(h.src);
  // The comparison group his percentile is against, with that season's own minimum (h.min from the league build); a
  // team file saved before the minimum was recorded gets the generic wording.
  const who = groupText(bat ? "bat" : h.role === "SP" ? "sp" : "rp", h.min);
  const tip = bat
    ? `<b>wRC+ ${val}</b> in ${num(h.PA)} PA, ${h.season}<br>${shown ? `${shown} percentile of ${num(h.n)} ${who}<br>` : ""}100 = league average<br>FanGraphs, as of ${src}`
    : `<b>SIERA ${val}</b> in ${num(h.IP)} IP, ${h.season}<br>${shown ? `${shown} percentile of ${num(h.n)} ${who} (lower SIERA is better)<br>` : ""}${h.ipSP && h.ipRP ? `Judged as a ${h.role === "SP" ? "starter" : "reliever"}: most of his innings (${h.ipSP} as SP, ${h.ipRP} as RP)<br>` : ""}FanGraphs, as of ${src}`;
  return `<span class="pill ${q.c}" style="--i:${q.i.toFixed(2)}" data-tip="${esc(tip)}"><b>${val}</b><small>${shown}</small>${old(h)}</span>`;
}
const old = (h) => (h && h.season != null && h.season !== HSEAS ? `<em class="sy" data-tip="${esc(`Latest MLB season: ${h.season}, not ${HSEAS}`)}">${h.season}</em>` : "");
const pillFor = (r) => pill(r.headline, roleOf(r));

/* last six lineups (position and batting-order spot), oldest first */
const l6head = () => `<div class="l6h">${L6.map((g) => `<span>${esc(g.label2)}${g.dh ? `<sup>G${g.dh}</sup>` : ""}<em class="${esc(g.oppHand)}">vs ${esc(g.oppHand || DASH)}</em></span>`).join("")}</div>`;
const l6 = (r) => `<div class="l6">${L6.map((g) => { const e = g.players.find((p) => p.mlbam === r.mlbam); return e ? `<span>${esc(e.pos)}<sup>${e.order}</sup></span>` : `<span class="e">${DASH}</span>`; }).join("")}</div>`;
/* bullpen usage: last six days, pitches with save/hold/blown/win/loss marks */
const bphead = () => `<div class="l6h">${BPD.map((d) => `<span style="width:34px">${esc(d.label)}<em>${esc(d.label2)}</em></span>`).join("")}</div>`;
const MARK = { sv: ["S", "save"], bs: ["B", "blown save"], hld: ["H", "hold"], w: ["W", "win"], l: ["L", "loss"] };
function bpu(r) {
  return `<div class="bpu">${BPD.map((d) => {
    const u = (r.usage || []).find((x) => x.date === d.date);
    if (!u || !u.pitched) return `<span>${DASH}</span>`;
    if (u.pitches == null) return `<span data-tip="pitched, pitch count not published">${DASH}</span>`;
    const n = u.pitches, marks = (u.marks || []).filter((k) => MARK[k]);
    const m = marks.map((k) => MARK[k][0]).join(""), k = Math.min(1, n / 40);
    return `<span class="p${k > .6 ? " hi" : ""}" style="--u:${k.toFixed(2)}" data-tip="${esc(`${esc(d.label)} ${esc(d.label2)}: ${n} pitches${u.ip != null ? `, ${esc(u.ip)} IP` : ""}${marks.length ? ` · ${marks.map((x) => MARK[x][1]).join(", ")}` : ""}`)}">${n}${m ? `<sup>${m}</sup>` : ""}</span>`;
  }).join("")}</div>`;
}

/* shared cells */
function nameCell(r, pl) {
  const inner = `<img loading="lazy" src="${headshotUrl(r.mlbam)}" alt=""><b>${esc(r.name)}</b>${r.platoon ? `<i>${esc(r.platoon)}</i>` : ""}${pl ? `<span class="mob">${pl}</span>` : ""}`;
  return numericId(r.fgId) ? `<a class="nm" href="${plUrl(r.fgId, roleOf(r))}">${inner}</a>` : `<div class="nm">${inner}</div>`;
}
const signed = (r) => (r.signed?.year ? `${esc(r.signed.year)} ${esc(r.signed.team || "")}${r.signed.round ? ` · Rd ${esc(r.signed.round)}` : ""}${r.signed.pick ? ` · #${esc(r.signed.pick)}` : ""}` : DASH);
const prosOf = (r) => (numericId(r.fgId) ? PROS.get(String(r.fgId)) : null) || PROS.get("n:" + r.name);
const prospect = (r) => { const p = prosOf(r); return p ? `Org #${p.orgRank ?? DASH}${p.top100 ? ` · Top 100 #${p.top100}` : ""}` : DASH; };
const svc = (r) => (r.serviceTime ? `<span data-tip="MLB service time: years.days (172 days = 1 year)">${esc(r.serviceTime)}</span>` : DASH);
const XCOLS = [["Acquired", (r) => esc(r.acquired || DASH)], ["Opt", (r) => esc(num(r.options)), "c"], ["Service", svc, "r"], ["Signed", signed], ["Prospect rank", prospect], ["Born", (r) => esc(r.country || DASH)]];
const xh = () => XCOLS.map(([h, , c]) => `<th class="x ${c || ""}">${h}</th>`).join("");
const xd = (r) => XCOLS.map(([, f, c]) => `<td class="x ${c || ""}">${f(r)}</td>`).join("");
const tbl = (head, body) => `<div class="twrap"><div class="tw"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></div>`;
const tr = (r, cells, extra = "") => {
  const link = numericId(r.fgId) ? plUrl(r.fgId, roleOf(r)) : "";
  return `<tr class="pr${link ? "" : " nolink"}${extra}"${link ? ` data-href="${link}" data-tip="${esc(`Open ${esc(r.name)}'s page`)}"` : ""}>${cells}</tr>`;
};
const stat = (v, f) => (v == null ? DASH : f ? f(v) : v);
const hh = (r) => r.headline || {};

function hitTable(list, first, withL6 = true) {
  const head = `${first == null ? "" : `<th>${first}</th>`}<th>Pos</th><th class="r jn">#</th><th>Player</th><th class="c">B</th><th class="r">Age</th><th class="r">PA</th><th class="r">HR</th><th class="c pc">wRC+ · pct</th>${withL6 ? `<th>${l6head()}</th>` : ""}${xh()}`;
  return tbl(head, list.map(({ r, o, pos }) => tr(r, `${first == null ? "" : `<td>${o}</td>`}<td><span class="pos">${esc(pos || r.pos || DASH)}</span></td><td class="r jn">${esc(num(r.number))}</td><td>${nameCell(r, pillFor(r))}</td><td class="c">${esc(r.bats || DASH)}</td><td class="r mu">${ageF(r.age)}</td><td class="r mu">${stat(hh(r).PA)}${old(hh(r))}</td><td class="r">${stat(hh(r).HR)}</td><td class="c pc">${pillFor(r)}</td>${withL6 ? `<td>${l6(r)}</td>` : ""}${xd(r)}`)).join(""));
}
function pitTable(list, first, usage) {
  const bp = usage === "bp";
  const head = `<th>${first}</th><th class="r jn">#</th><th>Pitcher</th><th class="c">T</th><th class="r">Age</th><th class="r">IP</th><th class="c pc">SIERA · pct</th><th class="r">K%</th><th class="r">BB%</th>${bp ? `<th class="r">SV</th><th class="r">HLD</th>` : ""}${bp ? `<th>${bphead()}</th>` : ""}${xh()}`;
  return tbl(head, list.map(({ r, o }) => { const h = hh(r); return tr(r, `<td>${o}</td><td class="r jn">${esc(num(r.number))}</td><td>${nameCell(r, pillFor(r))}</td><td class="c">${esc(r.throws || DASH)}</td><td class="r mu">${ageF(r.age)}</td><td class="r mu">${ipF(h.IP)}${old(h)}</td><td class="c pc">${pillFor(r)}</td><td class="r">${pctf(h["K%"])}</td><td class="r">${pctf(h["BB%"])}</td>${bp ? `<td class="r">${stat(h.SV)}</td><td class="r">${stat(h.HLD)}</td>` : ""}${bp ? `<td>${bpu(r)}</td>` : ""}${xd(r)}`); }).join(""));
}
const card = (id, title, sub, tools, body, src, opts = {}) => `<section class="card${opts.cls ? " " + opts.cls : ""}" id="${id}"><div class="ch"><h2>${title}${sub ? `<small>${sub}</small>` : ""}</h2><span class="sp"></span>${tools || ""}${opts.noX ? "" : `<button class="xp" data-x="${id}">All columns ›</button>`}</div>${body}${src ? `<div class="src">${src}</div>` : ""}</section>`;

function srcH() { return `Roster, order, acquired, options and service time: RosterResource, updated ${fmtDate(SRC.rr?.rrUpdated || SRC.rr?.asOf)}. Stats: FanGraphs ${HSEAS} regular season as of ${asOfOf("fg-lb-bat-" + HSEAS)}; wRC+ percentile among ${groupTextAny("bat")} (green = good). Last 6 lineups: position with batting-order spot.`; }
function srcP() { return `Roles: RosterResource, updated ${fmtDate(SRC.rr?.rrUpdated || SRC.rr?.asOf)}. Stats: FanGraphs ${HSEAS} regular season as of ${asOfOf("fg-lb-pit-" + HSEAS)}; SIERA percentile among starters or relievers with enough innings (${GROUP_MIN.sp.value} IP as a starter, ${GROUP_MIN.rp.value} in relief, in a full season), by the role where most of his innings came. Last 6 days: pitches thrown (S save, H hold, B blown save, W win, L loss).`; }

/* ===== lineup vs RHP / vs LHP ===== */
function lineupCard() {
  const side = HAND === "R" ? T.lineups.vsRHP : T.lineups.vsLHP;
  const list = (side?.players || []).slice().sort((a, b) => a.order - b.order).map((r) => ({ r, o: `<span class="ord">${r.order}</span>`, pos: r.pos }));
  const tools = `<div class="seg" id="hand"><button data-h="R" class="${HAND === "R" ? "on" : ""}">vs RHP</button><button data-h="L" class="${HAND === "L" ? "on" : ""}">vs LHP</button></div>`;
  let note;
  if (HAND === "R") note = `RosterResource's go-to lineup vs right-handed starters${ROUNDN ? ` for the ${esc(ROUNDN)}` : ""}.`;
  else if (side?.published === false) {
    const g = side.fromGame;
    note = `RosterResource publishes no separate vs LHP lineup here, so this is the lineup ${esc(T.team.shortName)} last used against a left-hander${g ? ` (${esc(g.label)} ${esc(g.label2)})` : ""}, from its last-6-lineups data.`;
  } else note = `RosterResource's go-to lineup vs left-handed starters${ROUNDN ? ` for the ${esc(ROUNDN)}` : ""}.`;
  const body = list.length ? hitTable(list, "Ord") : `<div class="note">No lineup listed.</div>`;
  return card("lineup", "Starting lineup", ROUNDN ? esc(ROUNDN) + " roster" : "", tools, `<div class="note">${note}</div>` + body, srcH(), { cls: "lineup" });
}
const roleN = (r) => parseInt(String(r.role).replace(/\D/g, "")) || 99;
function render() {
  const bench = (T.bench || []).map((r) => ({ r, o: `<span class="pos">BN</span>`, pos: r.pos }));
  const rot = (T.rotation || []).slice().sort((a, b) => roleN(a) - roleN(b)).map((r) => ({ r, o: `<span class="pos cl">${esc(r.role || DASH)}</span>` }));
  const RO = { CL: 0, SU8: 1, SU7: 2, MID: 3, LR: 4 };
  const RN = { CL: "Closer", SU8: "Setup, 8th inning", SU7: "Setup, 7th inning", MID: "Middle relief", LR: "Long relief" };
  const pen = (T.bullpen?.pitchers || []).slice().sort((a, b) => (RO[a.role] ?? 9) - (RO[b.role] ?? 9)).map((r) => ({ r, o: `<span class="pos${r.role === "CL" ? " cl" : ""}" data-tip="${esc(RN[r.role] || esc(r.role || ""))}">${esc(r.role || DASH)}</span>` }));
  const inact = T.inactive || [], inH = inact.filter((r) => r.headlineRole !== "pit"), inP = inact.filter((r) => r.headlineRole === "pit");
  const il = T.injured || [];
  const ilBody = il.length ? tbl(`<th>Status</th><th>Pos</th><th class="r jn">#</th><th>Player</th><th class="c">B/T</th><th class="r">Age</th><th>Injury</th><th class="r" data-tip="Date of the injury or surgery, as RosterResource lists it">Injured</th><th class="r" data-tip="The date the injured-list stay counts from (retroactive date); it can differ from the injury date">IL from</th><th class="c pc">Headline · pct</th>${xh()}`,
    il.map((r) => tr(r, `<td><span class="pos il">${esc(r.injury?.status || r.role || DASH)}</span></td><td><span class="pos">${esc(r.pos || DASH)}</span></td><td class="r jn">${esc(num(r.number))}</td><td>${nameCell(r, pillFor(r))}</td><td class="c">${esc(r.bats || DASH)}/${esc(r.throws || DASH)}</td><td class="r mu">${ageF(r.age)}</td><td>${esc(r.injury?.note || DASH)}</td><td class="r mu">${esc(r.injury?.date || DASH)}</td><td class="r mu">${esc(r.injury?.retroDate || DASH)}</td><td class="c pc">${pillFor(r)}</td>${xd(r)}`)).join("")) : `<div class="note">No one on the injured list.</div>`;
  const inactBody = (inH.length ? hitTable(inH.map((r) => ({ r, o: `<span class="pos">${esc(r.pos || DASH)}</span>`, pos: r.pos })), "Pos", false) : "") + (inP.length ? pitTable(inP.map((r) => ({ r, o: `<span class="pos">${esc(r.pos || DASH)}</span>` })), "Pos", "sp") : "");
  const rr = fmtDate(SRC.rr?.rrUpdated || SRC.rr?.asOf);
  $("main").innerHTML = lineupCard()
    + card("bench", "Bench", `${bench.length} players`, "", bench.length ? hitTable(bench, null) : `<div class="note">No bench listed.</div>`, srcH())
    + card("rot", "Starting rotation", esc(ROUNDN || ""), "", `${ROUNDN ? `<div class="note">RosterResource lists ${rot.length} starters for the ${esc(ROUNDN)}.</div>` : ""}` + (rot.length ? pitTable(rot, "Role", "sp") : `<div class="note">No rotation listed.</div>`), srcP())
    + card("pen", "Bullpen", "roles", "", pen.length ? pitTable(pen, "Role", "bp") : `<div class="note">No bullpen listed.</div>`, srcP())
    + card("il", "Injured list", `${il.length} players`, "", ilBody, `Injuries and IL status: RosterResource, updated ${rr}. Headline stat as in the lineup and bullpen.`)
    + (inact.length ? card("inact", `Inactive${ROUNDN ? ` for the ${esc(ROUNDN)}` : ""}`, "", "", inactBody, srcP()) : "")
    + minorsCard();
  side(); wire();
}

/* ===== minors depth ===== */
const LV = [["aaa", "AAA"], ["aa", "AA"], ["ha", "High-A"], ["la", "Low-A"], ["ss", "Complex"]];
function minorsCard() {
  const tools = `<div class="seg" id="lvl">${LV.map(([k, l]) => `<button data-l="${k}" class="${k === LVL ? "on" : ""}">${l}</button>`).join("")}</div>`;
  const m = T.minors?.[LVL] || {};
  const grp = [["Position players", m.hitters], ["Starters", m.starters], ["Relievers", m.relievers], ["Pitchers", m.pitchers]].filter((g) => g[1]?.length);
  const body = grp.map(([h, l]) => `<div class="note" style="margin:8px 2px 2px"><b style="color:var(--navy2)">${h}</b> · ${l.length}</div>` + tbl(`<th>Pos</th><th class="r jn">#</th><th>Player</th><th class="c">B/T</th><th class="r">Age</th><th>Prospect rank</th><th>ETA</th>${xh()}`,
    l.map((r, i) => tr(r, `<td><span class="pos">${esc(r.pos || DASH)}</span></td><td class="r jn">${esc(num(r.number))}</td><td>${nameCell(r)}</td><td class="c">${esc(r.bats || DASH)}/${esc(r.throws || DASH)}</td><td class="r mu">${ageF(r.age)}</td><td>${prospect(r)}</td><td class="mu">${esc(num(prosOf(r)?.eta))}</td>${xd(r)}`, i >= 8 ? " mr" : "")).join("")) + (l.length > 8 ? `<div class="more8">+ ${l.length - 8} more ${h.toLowerCase()} · All columns shows everyone</div>` : "")).join("") || `<div class="note">No players listed at this level.</div>`;
  return card("minors", "Minor-league depth", m.affiliate ? esc(m.affiliate) : "", "", `<div class="mn">${tools}</div>` + body, `Depth by level: RosterResource, updated ${fmtDate(SRC.rr?.rrUpdated || SRC.rr?.asOf)}. "Complex" is RosterResource's lowest level group (mostly Dominican Summer League players). Minor leaguers without a FanGraphs MLB page have no link.`, { cls: "minors" });
}

/* ===== side column ===== */
const plink = (fgId, pos, inner) => (numericId(fgId) ? `<a href="${plUrl(fgId, isPitPos(pos) ? "pit" : "bat")}">${inner}</a>` : inner);
function side() {
  const rr = fmtDate(SRC.rr?.rrUpdated || SRC.rr?.asOf);
  const st = T.standings || [];
  const stand = `<section class="card"><h3>${esc(T.team.league)} ${DIV[T.team.division] || ""} standings <i>FanGraphs RosterResource</i></h3>
    <div class="st h"><span></span><span>Team</span><span class="r">W</span><span class="r">L</span><span class="r">W%</span><span class="r">GB</span></div>
    ${st.map((s) => { const t = teamByShort(s.team); return `<div class="st${s.fgTeamId === T.team.fgTeamId ? " me" : ""}"><img src="${t ? teamLogoUrl(t.id) : ""}" alt=""><span>${t ? `<a href="./team.html?t=${encodeURIComponent(t.abbr)}"><b>${esc(s.team)}</b></a>` : `<b>${esc(s.team)}</b>`}${s.divisionTitle ? "<em>DIV</em>" : s.playoffs ? "<em>PO</em>" : ""}</span><span class="r num">${num(s.W)}</span><span class="r num">${num(s.L)}</span><span class="r num">${f3(s.pct)}</span><span class="r num">${s.GB ? s.GB : DASH}</span></div>`; }).join("") || `<div class="note">No standings listed.</div>`}
    <div class="src">RosterResource, updated ${rr}. DIV clinched division, PO clinched a playoff spot.</div></section>`;
  const RK = T.rankings || {}, N = RK.fg?.clubs || 30;
  const fgv = { "wRC+": (v) => Math.round(v), wOBA: f3, "BB%": pctf, "K%": pctf };
  const rg = (l, o, keys, fg, cls) => `<div class="rk"><div class="l">${l}</div><div class="chips${cls ? " " + cls : ""}">${keys.map(([k, n]) => {
    const v = o?.[k]; const pc = v == null ? null : Math.round((N - v) / (N - 1) * 100); const q = k === "Defense" ? qc(null) : qc(pc);
    const fv = fg && RK.fg?.values && RK.fg.values[k] != null && fgv[k] ? fgv[k](RK.fg.values[k]) : null;
    return `<div class="chip ${q.c}" style="--i:${q.i.toFixed(2)}" data-tip="${esc(`${l}: ${n} ranks ${v == null ? DASH : ord(v)} of ${N} MLB teams${fv != null ? `<br>FanGraphs team ${n}: ${fv}` : ""}`)}"><b>${v == null ? DASH : v}<sup>${v == null ? "" : ord(v).slice(-2)}</sup></b><small>${n}</small>${fv != null ? `<span class="fgv">${fv}</span>` : ""}</div>`;
  }).join("")}</div></div>`;
  const pk = [["WHIP", "WHIP"], ["BB/9", "BB/9"], ["K/9", "K/9"], ["H/9", "H/9"], ["HR/9", "HR/9"]];
  const fgSrc = RK.fg && !RK.fg.values ? ` FanGraphs team wRC+, wOBA, BB% and K% are not shown: ${esc(RK.fg.reason || "not available")}.` : RK.fg ? ` Team wRC+, wOBA, BB% and K% values: FanGraphs team batting leaderboard ${RK.fg.season}, as of ${asOfOf(RK.fg.src)}.` : "";
  const ranks = `<section class="card"><h3>Team rankings <i>rank of ${N}, ${T.season}</i></h3>
    ${rg("Hitting", RK.bat, [["R", "R"], ["HR", "HR"], ["SB", "SB"], ["wRC+", "wRC+"], ["wOBA", "wOBA"], ["BB%", "BB%"], ["K%", "K%"]], true, "c4")}
    ${rg("Starting pitching", RK.sp, pk)}
    ${rg("Relief pitching", RK.rp, pk)}
    ${rg("Fielding", RK.fld, [["Defense", "Def"], ["DRS", "DRS"], ["OAA", "OAA"], ["FRP", "FRV"], ["aFRP", "Arm"], ["CFraming", "Frm"], ["RngR", "Rng"]], false, "c4")}
    <div class="src">RosterResource team rankings (FanGraphs), updated ${rr}. 1st = best of 30. Green marks roughly the top 12 teams, the brick tone the bottom 6.${fgSrc}</div></section>`;
  const AQ = { HG: ["Homegrown", "#1d3a63"], T: ["Trade", "#3d6aa8"], FA: ["Free agent", "#7f9cc4"], W: ["Waivers", "#b3c3d9"], R5: ["Rule 5", "#d5dde9"] };
  const aq = T.rosterBreakdown?.acquired || [], tot = aq.reduce((a, x) => a + x.numPlayers, 0) || 1;
  const all = [...(T.lineups?.vsRHP?.players || []), ...(T.bench || []), ...(T.rotation || []), ...(T.bullpen?.pitchers || []), ...(T.injured || []), ...(T.inactive || []),
    ...Object.values(T.minors || {}).flatMap((l) => [l.hitters, l.starters, l.relievers, l.pitchers].flat().filter(Boolean))];
  const n40 = new Set(all.filter((r) => r.roster40).map((r) => r.mlbam ?? r.name)).size;
  const bd = `<section class="card"><h3>Roster breakdown <i>40-man: ${n40} of 40</i></h3>
    <div class="bd">${aq.filter((x) => x.numPlayers).map((x) => { const [l, c] = AQ[x.acquiredcode] || [x.acquiredcode, "#999"]; return `<span style="--c:${c};width:${x.numPlayers / tot * 100}%" data-tip="${esc(esc(l))}: ${x.numPlayers}">${x.numPlayers}</span>`; }).join("")}</div>
    <div class="leg">${aq.map((x) => { const [l, c] = AQ[x.acquiredcode] || [x.acquiredcode, "#999"]; return `<span><i style="--c:${c}"></i>${esc(l)} <b>${x.numPlayers}</b></span>`; }).join("")}</div>
    <div class="leg" style="margin-top:5px">Born: ${(T.rosterBreakdown?.country || []).map((c) => `<span>${esc(c.country)} <b>${c.numPlayers}</b></span>`).join("")}</div>
    <div class="src">How the 40-man roster was acquired and where it was born: RosterResource, updated ${rr}.</div></section>`;
  const tx = T.transactions || [];
  const mv = `<section class="card"><h3>Latest roster moves <i>${tx.length} most recent</i></h3>
    ${tx.map((m) => `<div class="mv"><span class="d">${md(m.date)}</span><span><span class="ps">${esc(m.pos || DASH)}</span><b>${plink(m.fgId, m.pos, esc(m.name))}</b> <span class="mu">${esc(m.description)}</span></span></div>`).join("") || `<div class="mu">No moves listed.</div>`}
    <div class="src">RosterResource, as of ${rr}.</div></section>`;
  const gl = (T.probableStarters || []).filter((g) => g.opponent);
  const sch = `<section class="card"><h3>Upcoming games <i>probable starters</i></h3>
    ${gl.map((g) => { const o = teamFor(g.opponent); return `<div class="gm"><span class="d">${esc(g.label)} ${esc(g.label2)}<small>${g.home ? "home" : "away"}</small></span><img src="${o ? teamLogoUrl(o.id) : ""}" alt=""><span class="p">${g.home ? "vs" : "@"} <b>${esc(o ? o.name : g.opponent)}</b><br><b>${esc(g.starter?.name || "TBD")}</b> <span class="mu">vs ${esc(g.oppStarter?.name || "TBD")}</span></span></div>`; }).join("") || `<div class="mu">No games listed.</div>`}
    <div class="src">${ROUNDN ? `${esc(ROUNDN)}. ` : ""}RosterResource lists ${gl.length} game${gl.length === 1 ? "" : "s"} with an opponent; later games appear as the series is set. Updated ${rr}.</div></section>`;
  const pr = T.prospects?.players || [], orgRank = T.prospects?.orgRank;
  const pros = `<section class="card"><h3>Top prospects <i>${orgRank != null ? `farm system ${ord(orgRank)} of 30` : "FanGraphs prospect list"}</i></h3>
    ${pr.length ? `<div class="pp" style="cursor:default;padding-top:0"><span class="o">#</span><span class="o">Player</span><span class="o" style="text-align:center">FV</span><span class="o" style="text-align:right">Top 100</span></div>` : ""}
    ${pr.map((p) => `<div class="pp" data-tip="${esc(`${esc(p.name)}: ${esc(p.pos || DASH)}, ${esc(p.level || DASH)}, age ${ageF(p.age)}, ETA ${esc(p.eta || DASH)}`)}"><span class="o">${num(p.orgRank)}</span><span><b>${plink(p.fgId, p.pos, esc(p.name))}</b><small>${esc(p.pos || DASH)} · ${esc(p.level || DASH)} · age ${ageF(p.age)} · ETA ${esc(p.eta || DASH)}</small></span><span class="fv">${esc(num(p.fv))}</span><span class="ovr">${p.top100 ? "#" + p.top100 : DASH}</span></div>`).join("") || `<div class="mu">No prospects listed.</div>`}
    <div class="src">FanGraphs prospect list (FV = future value), ${T.prospects?.season || T.season}. Via RosterResource, updated ${rr}.</div></section>`;
  $("side").innerHTML = stand + ranks + sch + bd + mv + pros;
}

/* ===== interactions ===== */
function wire() {
  document.querySelectorAll(".xp").forEach((b) => (b.onclick = () => { const c = b.closest(".card"); c.classList.toggle("open"); b.textContent = c.classList.contains("open") ? "Fewer columns ‹" : "All columns ›"; edges(); }));
  document.querySelectorAll("#hand button").forEach((b) => (b.onclick = () => { HAND = b.dataset.h; const open = $("lineup").classList.contains("open"); $("lineup").outerHTML = lineupCard(); if (open) { $("lineup").classList.add("open"); $("lineup").querySelector(".xp").textContent = "Fewer columns ‹"; } wire(); }));
  document.querySelectorAll("#lvl button").forEach((b) => (b.onclick = () => { LVL = b.dataset.l; const open = $("minors").classList.contains("open"); $("minors").outerHTML = minorsCard(); if (open) $("minors").classList.add("open"); wire(); }));
  document.querySelectorAll("tr.pr[data-href]").forEach((t) => (t.onclick = (e) => { if (!e.target.closest("a")) location.href = t.dataset.href; }));
  document.querySelectorAll(".tw").forEach((t) => (t.onscroll = edges)); edges();
}
function edges() { document.querySelectorAll(".tw").forEach((t) => t.parentNode.classList.toggle("more", t.scrollWidth - t.clientWidth - t.scrollLeft > 2)); }
addEventListener("resize", edges);
const tip = $("tip");
document.addEventListener("mouseover", (e) => { const el = e.target.closest("[data-tip]"); if (!el) { tip.hidden = true; return; } tip.innerHTML = el.dataset.tip; tip.hidden = false; });
document.addEventListener("mousemove", (e) => { if (tip.hidden) return; const w = tip.offsetWidth; tip.style.left = Math.min(innerWidth - w - 8, e.clientX + 14) + "px"; tip.style.top = (e.clientY + 16) + "px"; });

function showState(title, msg) { $("page").hidden = true; $("state").hidden = false; $("state").innerHTML = `<b>${esc(title)}</b>${msg}`; }

async function boot() {
  const q = new URLSearchParams(location.search).get("t");
  const meta = q ? teamFor(String(q).toUpperCase()) : null;
  initNav($("nav"), { search: true, current: meta?.abbr || null });
  if (!meta) { showState(q ? "Unknown team" : "No team chosen", `Pick a team from the Teams menu above or go back to <a href="./"><u>the home page</u></a>.`); return; }
  const acc = accent(meta.colors);
  document.documentElement.style.setProperty("--tc", acc);
  document.documentElement.style.setProperty("--tc2", meta.colors.secondary);
  document.title = `${meta.name} · The Chop`;
  let res;
  try { res = await getTeamDepth(meta.abbr); } catch (e) {
    showState(e.code === "not_built" ? "This depth chart is not built yet" : "The depth chart is unavailable", esc(e.message));
    return;
  }
  if (!res || !res.team) { showState("The depth chart is unavailable", "The server sent no team data. Try again in a moment."); return; }
  T = res.team; SRC = T.sources || {}; SEAS = T.season; HSEAS = T.headlineSeason ?? T.season;
  ROUNDN = T.postseason?.active ? `${T.team.league} ${ROUND[T.postseason.round] || T.postseason.round || "postseason"}` : null;
  L6 = (T.recentLineups || []).slice().reverse();
  BPD = (T.bullpen?.dates || []).slice(0, 6).reverse();
  PROS = new Map();
  for (const p of T.prospects?.players || []) { if (numericId(p.fgId)) PROS.set(String(p.fgId), p); PROS.set("n:" + p.name, p); }
  const photo = meta.ballparkPhoto;
  if (photo) $("bg").querySelector(".photo").style.setProperty("--photo", `url("${photo.url}")`), $("bg").style.setProperty("--photo", `url("${photo.url}")`);
  const mk = $("bg").querySelector(".mark"); mk.src = teamLogoUrl(meta.id); mk.hidden = false;
  $("hlogo").src = teamLogoUrl(meta.id); $("hlogo").alt = meta.name;
  $("tname").textContent = meta.name;
  const st = T.standings || [], i = st.findIndex((s) => s.fgTeamId === T.team.fgTeamId), me = st[i];
  $("tmeta").innerHTML = me ? `<b class="num">${num(me.W)}–${num(me.L)}</b> · ${ord(i + 1)} in ${esc(T.team.league)} ${DIV[T.team.division] || ""}${me.GB ? ` · ${me.GB} GB` : ""} · ${SEAS}${ROUNDN ? ` <span class="tag g">${esc(ROUNDN)}</span>` : ""}` : `${DASH} · ${SEAS}`;
  const rr = fmtDate(SRC.rr?.rrUpdated || SRC.rr?.asOf);
  $("asof").innerHTML = `Depth chart: <b>FanGraphs RosterResource</b>, updated ${rr}<br>Stats: FanGraphs ${HSEAS} regular season, as of ${asOfOf("fg-lb-bat-" + HSEAS)}`;
  const bans = [];
  if (res.refreshError) bans.push(`<div class="ban${/^A refresh is queued/.test(res.refreshError) ? "" : " bad"}"${/^A refresh is queued/.test(res.refreshError) ? "" : ' role="alert"'}>${esc(res.refreshError)} Data as of ${fmtDate(res.asOf)}.</div>`);
  else if (res.stale) bans.push(`<div class="ban"><b>Older copy.</b> This depth chart is older than its normal refresh age (saved ${fmtDate(res.asOf)}; last checked ${fmtDate(res.checkedAt)}).</div>`);
  if (T.lineups?.vsLHP?.published === false) bans.push(`<div class="ban">RosterResource publishes no separate vs LHP lineup for ${esc(T.team.shortName)} right now; the vs LHP view shows the lineup last used against a left-hander.</div>`);
  $("bans").innerHTML = bans.join("");
  $("foottx").innerHTML = `<span class="fa2">Depth chart: <b>FanGraphs RosterResource</b>, updated ${rr} · Stats: <b>FanGraphs</b> ${HSEAS} regular season, as of ${asOfOf("fg-lb-bat-" + HSEAS)}</span>Depth chart, roles, lineups, moves, standings, rankings and prospects: FanGraphs RosterResource. wRC+ and SIERA with percentiles: FanGraphs leaderboards. Headshots and logos: MLB.${photo ? ` Ballpark photo: <a href="${esc(photo.page)}" target="_blank" rel="noopener"><u>${esc(photo.credit)}</u></a>, ${esc(photo.license)}, Wikimedia Commons.` : ""}`;
  $("state").hidden = true; $("page").hidden = false;
  render();
}
boot();
