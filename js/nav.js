// Shared header for every page: G2 logo (home link, D24), search-as-you-type (D23) and the Teams popover.
// Usage: initNav(document.getElementById("nav"), { search: true }); a page may also call attachSearch() for a second box.
import { searchPlayers, getTeams, teamLogoUrl, headshotUrl, playerUrl, teamUrl } from "./api.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const DASH = "–";

function mark(name, q) {
  const k = norm(q.trim());
  const i = k ? norm(name).indexOf(k) : -1;
  return i < 0 ? esc(name) : esc(name.slice(0, i)) + "<mark>" + esc(name.slice(i, i + k.length)) + "</mark>" + esc(name.slice(i + k.length));
}
const years = (p) => (p.firstSeason ? (p.firstSeason === p.lastSeason ? `${p.firstSeason}` : `${p.firstSeason}${DASH}${p.lastSeason}`) : "");

/** Wire a text input and a dropdown element into the type-ahead search. */
export function attachSearch(input, dd, { teams = new Map() } = {}) {
  let timer = null, ctl = null, hits = [], sel = 0, seq = 0;
  const close = () => { dd.hidden = true; };
  const render = (q, note) => {
    if (note) { dd.innerHTML = `<div class="none">${esc(note)}</div>`; dd.hidden = false; return; }
    if (!hits.length) { dd.innerHTML = `<div class="none">No player matches “${esc(q)}”.</div>`; dd.hidden = false; return; }
    dd.innerHTML = hits.map((p, i) => {
      const t = p.teamId ? `<img class="tl" src="${teamLogoUrl(p.teamId)}" alt="">` : "";
      const lastTag = p.lastClub && p.team ? `<span class="last">last: ${esc(p.team)}</span>` : "";
      const club = p.team && !p.lastClub ? `<span class="ab">${esc(p.team)}</span>` : "";
      const unbuilt = p.built === false ? `<span class="last">not on the public site yet</span>` : "";
      const href = p.built === false ? "#" : playerUrl(p, p.builtRoles?.[0] ?? p.roles?.[0]); // static: a built role
      return `<a href="${href}" class="${i === sel ? "on" : ""}" data-i="${i}"><img class="hs" src="${headshotUrl(p.mlbam)}" alt="" loading="lazy">`
        + `<span><b>${mark(p.name, q)}</b><small>${t}${club}${lastTag}<span>${esc(p.pos || DASH)}</span>${unbuilt}</small></span><span class="yrs">${years(p)}</span></a>`;
    }).join("");
    dd.hidden = false;
  };
  const run = async () => {
    const q = input.value.trim();
    if (!q) { close(); return; }
    ctl?.abort();
    ctl = new AbortController();
    const mine = ++seq;
    try {
      const r = await searchPlayers(q, { signal: ctl.signal });
      if (mine !== seq) return;
      hits = r.results || []; sel = 0; render(q);
    } catch (e) {
      if (e.name === "AbortError" || mine !== seq) return;
      hits = [];
      render(q, e.status === 400 ? "Keep typing a name." : "Search is unavailable right now.");
    }
  };
  input.addEventListener("input", () => {
    clearTimeout(timer);
    if (!input.value.trim()) { ctl?.abort(); seq++; close(); return; } // emptied: drop any in-flight answer so it cannot reopen the list
    timer = setTimeout(run, 120);
  });
  input.addEventListener("focus", () => { if (input.value.trim() && dd.innerHTML) dd.hidden = false; });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { close(); return; }
    if (dd.hidden || !hits.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      sel = (sel + (e.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length;
      [...dd.children].forEach((a, i) => a.classList.toggle("on", i === sel));
      dd.children[sel]?.scrollIntoView({ block: "nearest" });
      e.preventDefault();
    } else if (e.key === "Enter") {
      const a = dd.children[sel];
      if (a && a.getAttribute("href") !== "#") location.href = a.getAttribute("href");
      e.preventDefault();
    }
  });
  dd.addEventListener("mousedown", (e) => e.preventDefault()); // keep focus so the click lands
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) close(); });
}

const DIVS = [["East", "E"], ["Central", "C"], ["West", "W"]];
/** Division grouping of /api/teams entries: {lg:{East:[team]}}. Division text looks like "American League East". */
export function groupTeams(teams) {
  const out = {};
  for (const t of teams) {
    const lg = /^American/.test(t.league || t.division) ? "American League" : "National League";
    const dv = (String(t.division).match(/(East|Central|West)$/) || [])[1] || "East";
    ((out[lg] ||= {})[dv] ||= []).push(t);
  }
  for (const l of Object.values(out)) for (const d of Object.values(l)) d.sort((a, b) => a.abbr.localeCompare(b.abbr));
  return out;
}
export const DIVISIONS = DIVS.map((d) => d[0]);

export function teamsPopHTML(teams, current) {
  const g = groupTeams(teams);
  return ["American League", "National League"].map((lg) => `<div><h5>${lg}</h5><div class="dv">${DIVISIONS.map((dv) =>
    `<div><i>${dv}</i>${(g[lg]?.[dv] || []).map((t) => `<a class="tm${t.abbr === current ? " on" : ""}" href="${teamUrl(t.abbr)}" title="${esc(t.name)}"><img src="${teamLogoUrl(t.id)}" alt="">${esc(t.abbr)}</a>`).join("")}</div>`).join("")}</div></div>`).join("");
}

/** Build the header into `host`. Options: search (default true), current (team abbreviation to highlight). */
export function initNav(host, { search = true, current = null } = {}) {
  host.className = "bar";
  host.innerHTML = `<a class="tclogo" href="./" title="The Chop home" aria-label="The Chop home"><img class="lg-full" src="./img/thechop-g2-small.svg" alt="The Chop"><img class="lg-icon" src="./img/thechop-g2-icon.svg" alt="The Chop"></a>`
    + (search ? `<div class="search"><svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="q" placeholder="Search players (name)" autocomplete="off" aria-label="Search players"><div class="dd" id="dd" hidden></div></div>` : "")
    + `<div class="teams"><button class="tbtn" id="tbtn" type="button" aria-expanded="false"><img id="tbtnLogo" src="" alt="" hidden><span>Teams ▾</span></button><div class="tpop" id="tpop" hidden></div></div>`;
  const pop = host.querySelector("#tpop"), btn = host.querySelector("#tbtn");
  if (search) attachSearch(host.querySelector("#q"), host.querySelector("#dd"));
  getTeams().then((r) => {
    pop.innerHTML = teamsPopHTML(r.teams, current);
    const me = r.teams.find((t) => t.abbr === current);
    const lg = host.querySelector("#tbtnLogo");
    if (me) { lg.src = teamLogoUrl(me.id); lg.hidden = false; }
  }).catch(() => { pop.innerHTML = `<div class="none">Teams are unavailable right now.</div>`; });
  document.addEventListener("click", (e) => {
    if (e.target.closest("#tbtn")) { pop.hidden = !pop.hidden; btn.setAttribute("aria-expanded", String(!pop.hidden)); }
    else if (!e.target.closest("#tpop")) { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); }
  });
}
