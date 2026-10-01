// The Chop player page renderer: the approved draft (design/player-page.html) lifted into mountPlayer(ctx), nearly verbatim.
// ctx = adaptBundle() output {ROLE, DATA, SPL, POPS, LGP, POPSP, SDP} plus team (lib/teams.mjs entry or null).
// boot() reads ?id=&role=, draws the header (nav.js), fetches the bundle (api.js), builds the page on demand when needed, then mounts.
import { initNav } from "../nav.js";
import { getPlayerPage, startBuild, buildStatus, isStatic, teamUrl } from "../api.js";
import { adaptBundle } from "./adapter.js";
import { TEAMS, TEAM_LIST } from "../../lib/teams.mjs";
import { pctTone, pctShown, ord } from "../../lib/pct.mjs";

export function mountPlayer(ctx){
let {DATA,SPL,POPS,LGP,POPSP,SDP}=ctx;
/* the bundle is already in the draft shapes (adapter.js); pitchers read the role-matched league lines and their own percentile counts */
const ROLE=ctx.ROLE,PIT=ROLE==="pit";
const LROLE=y=>PIT&&((DATA.lgmeta||{})[String(y)]||{}).role==="rp"?"relievers":PIT?"starters":"hitters";
const WHO=LROLE(DATA.latest),OPP=PIT?"batters":"pitchers",HANDL=PIT?{L:"vs LHB",R:"vs RHB"}:{L:"vs LHP",R:"vs RHP"};
if(PIT){POPS=POPSP}
const $=id=>document.getElementById(id);
const P=DATA.player,SE=DATA.seasons,CAR=DATA.career,LATEST=DATA.latest,LG=DATA.lgavg,POP=DATA.pop;
/* text from the data is escaped once here (it is written into HTML and attributes); RAW keeps the plain name for the title, alt text and watermark */
const RAW={name:P.name||"",last:P.last||"",team:P.team||""};["name","first","last","team","pos"].forEach(k=>{if(P[k]!=null)P[k]=escH(P[k])});SE.forEach(s=>{if(s.Team!=null)s.Team=escH(s.Team)});
const LGLATEST=Object.assign({"wBsR":0,"Defense":0},LG[String(LATEST)]);
const SRC=`FanGraphs, fetched ${DATA.fetched||"–"}`;
const NQ=y=>(POPS[String(y)]||{}).n,QN=y=>NQ(y)!=null?`${NQ(y)} `:"";
/* league line for a season and stat: that season's league table for his role (hitters, or starters / relievers, D13), wRC+ = 100.
   Hitters vs LHP / RHP: K%, BB% and HR/PA from FanGraphs' team splits leaderboard (30 clubs summed, rates from the summed counts; DATA.lgss),
   labelled with its own source and as-of; any other stat falls back to the all-hitters line, labelled. Pitchers vs LHB / RHB: there is no
   league line by batter hand, so every stat uses the all-starters or all-relievers line, labelled as such. */
function lgAll(y,k){if(+y===DATA.latest&&LGLATEST[k]!=null)return LGLATEST[k];const a=(DATA.lgavg[String(y)]||{})[k];if(a!=null)return a;if(k==="wRC+")return 100;const t=(DATA.lgtrend[String(y)]||{})[k];return t!=null?t:null}
/* a league figure whose source differs from the league file's (lgmeta[y].statSrc, e.g. pitchers' wOBA against from FanGraphs' splits) is labelled with its own source and date */
function lgSrcOf(y,k){const a=(((DATA.lgmeta||{})[String(y)]||{}).statSrc||{})[k];if(!a||!a.length)return "league";const d=a.map(x=>String(x.asOf||"").slice(0,10)).filter(Boolean).sort()[0];return `league (${a[0].source}${d?`, as of ${d}`:""})`}
function lgFor(y,k,side){if(!side||side==="All"){const v=lgAll(y,k);return {v,src:v==null?"not published for this season":lgSrcOf(y,k)}}
  const hd=PIT?(side==="L"?"LHB":"RHB"):(side==="L"?"LHP":"RHP"),ls=(DATA.lgss||{})[String(y)]||{},t=(ls[side]||{})[k];
  if(t!=null)return {v:t,src:escH(`league vs ${hd} (${ls.source||"FanGraphs splits leaderboard"}${ls.asOf?`, as of ${ls.asOf}`:""})`)};
  const v=lgAll(y,k);return {v,src:v==null?"not published for this season":PIT?`league (all ${LROLE(y)}; none published vs ${hd})`:`league (all hitters; none published vs ${hd})`}}
function rowFor(s,side){if(!side||side==="All")return s;const r=(DATA.ss[String(s.Season)]||{})[side];return r?Object.assign({Season:s.Season,Team:s.Team},r):{Season:s.Season,Team:s.Team}}
let TSPLIT="All";
const TOUCH=()=>matchMedia("(hover:none)").matches||innerWidth<760;
let THR=.5,SEL=[LATEST],L=SE[SE.length-1],LGL=LGLATEST,LBL=String(LATEST),ISLATEST=true;
/* ---- stat metadata: d = direction for a hitter (+1 higher better, -1 lower better, 0 style) ---- */
/* signed figure: "+" only when it rounds away from zero, never "-0.0" or "+0" */
const sgn=(v,d=0)=>{const t=Math.abs(v).toFixed(d);return +t===0?t:(v>0?"+":"-")+t};
const f3=v=>v.toFixed(3).replace(/^0/,"").replace(/^-0/,"-"),pc=v=>(v*100).toFixed(1)+"%";
const M={"wRC+":{f:v=>Math.round(v),d:1},"wOBA":{f:f3,d:1},"xwOBA":{f:f3,d:1},"ISO":{f:f3,d:1},"BABIP":{f:f3,d:0},
 "HR/PA":{f:pc,d:1},"K%":{f:pc,d:-1},"BB%":{f:pc,d:1},"SwStr%":{f:pc,d:-1},"CStr%":{f:pc,d:0},"O-Swing%":{f:pc,d:-1},"Z-Swing%":{f:pc,d:0},"Swing%":{f:pc,d:0},
 "O-Contact%":{f:pc,d:1},"Z-Contact%":{f:pc,d:1},"Contact%":{f:pc,d:1},"Zone%":{f:pc,d:0},"F-Strike%":{f:pc,d:0},"GB%":{f:pc,d:0},"LD%":{f:pc,d:1},"FB%":{f:pc,d:0},
 "HR/FB":{f:pc,d:1},"Pull%":{f:pc,d:0},"Cent%":{f:pc,d:0},"Oppo%":{f:pc,d:0},"Soft%":{f:pc,d:-1},"Med%":{f:pc,d:0},"Hard%":{f:pc,d:1},"Barrel%":{f:pc,d:1},"HardHit%":{f:pc,d:1},
 "EV":{f:v=>v.toFixed(1),d:1},"LA":{f:v=>v.toFixed(1)+"°",d:0},"Spd":{f:v=>v.toFixed(1),d:1},
 "wBsR":{f:v=>sgn(v,1),d:1},"Defense":{f:v=>sgn(v,1),d:0},"Sprint":{f:v=>v.toFixed(1)+" ft/s",d:1},"SB/OB":{f:pc,d:1},"Att/PA":{f:pc,d:1},"SB/PA":{f:pc,d:1},"SB%":{f:pc,d:1},"CS%":{f:pc,d:-1},"G":{f:v=>v,d:0},"PA":{f:v=>v.toLocaleString(),d:0},"HR":{f:v=>v,d:0}};
/* D21: Def (FanGraphs' fielding runs with a position adjustment) is never coloured; OAA leads and drives the fielding colour */
const f2=v=>v.toFixed(2),fIP=v=>Math.floor(v+1e-6)+"."+Math.round((v-Math.floor(v+1e-6))*3),cnt=v=>Math.round(v).toLocaleString();
Object.assign(M,{"SIERA":{f:f2,d:-1},"xFIP":{f:f2,d:-1},"FIP":{f:f2,d:-1},"ERA":{f:f2,d:-1},"xERA":{f:f2,d:-1},"WHIP":{f:f2,d:-1},"HR/9":{f:f2,d:-1},"K-BB%":{f:pc,d:1},"C+SwStr%":{f:pc,d:1},"LOB%":{f:pc,d:1},
  "IP":{f:fIP,d:0},"TBF":{f:cnt,d:0},"W":{f:cnt,d:0},"L":{f:cnt,d:0},"GS":{f:cnt,d:0},"SO":{f:cnt,d:0},"ER":{f:cnt,d:0},"FIP-":{f:v=>Math.round(v),d:-1},"xFIP-":{f:v=>Math.round(v),d:-1},"RV":{f:v=>sgn(v,2),d:1},
  /* D18 Savant extras (hitters) and the pitcher running game (D17) */
  "EV50":{f:v=>v.toFixed(1),d:1},"Brl/PA":{f:pc,d:1},"xHR":{f:v=>v.toFixed(1),d:0},"xHR/PA":{f:pc,d:1},"No-doubters":{f:cnt,d:0},"No-doubter%":{f:pc,d:1},
  "Swing-take runs":{f:v=>sgn(v,1),d:1},"Heart runs":{f:v=>sgn(v,1),d:1},"Shadow runs":{f:v=>sgn(v,1),d:1},"Chase runs":{f:v=>sgn(v,1),d:1},"Waste runs":{f:v=>sgn(v,1),d:1},
  "wOBA against":{f:f3,d:-1},"xwOBA against":{f:f3,d:-1},"SB allowed":{f:cnt,d:0},"CS against":{f:cnt,d:0},"SB/100BF":{f:f2,d:-1},"SBA/100BF":{f:f2,d:-1},"pickoffs":{f:cnt,d:0}});
/* a pitcher is judged from his side: strikeouts, whiffs and chases good; contact, hard hits, walks and line drives bad; ground balls slightly good; fly balls neutral (D7, D12) */
if(ROLE==="pit")Object.entries({"K%":1,"BB%":-1,"SwStr%":1,"O-Swing%":1,"Contact%":-1,"Z-Contact%":-1,"O-Contact%":-1,"GB%":.5,"LD%":-1,"FB%":0,"HR/FB":-1,"HardHit%":-1,"Barrel%":-1,"EV":-1,"Hard%":-1,"Soft%":1,"BABIP":0,"HR":0,"CS%":1}).forEach(([k,d])=>{if(M[k])M[k].d=d});
/* luck-driven, mean-reverting stats are never green or muted-bad; unusual values get a neutral violet marker, but only over a long sample (hitters 400 PA, pitchers 100 IP, selected seasons combined) */
const LUCK={"BABIP":.030,"HR/FB":.05,"LOB%":.05};Object.keys(LUCK).forEach(k=>{if(M[k])M[k].d=0});
const fmt=(k,v)=>v==null||(typeof v==="number"&&isNaN(v))?"–":(M[k]?M[k].f(v):v);
/* spread (SD of the qualified group) for stat k: one season = that season's and role's sdBy; several seasons = their spreads weighted by PA (labelled where shown);
   y may be a season, a list of seasons, a combined label like "2024+2025", or omitted (the current selection) */
const ALLY=SE.map(s=>s.Season);
/* where a figure comes from: the row's src id resolved through DATA.sources to "<source>, fetched <date>"; a combined row uses its latest season's;
   unknown = null (never assumed to be FanGraphs) */
function srcOf(row,k){if(!row)return null;let r=row;if(!r.src&&typeof r.Season==="string"){const ys=yrsOf(r.Season);r=SE.find(s=>s.Season===ys[ys.length-1])||r}
  const id=r.src&&r.src[k],s=id&&(DATA.sources||{})[id];if(!s)return null;const d=s.fetchedAt?String(s.fetchedAt).slice(0,10):null;return escH(`${s.label||id}${d?`, fetched ${d}`:""}`)}
function yrsOf(y){if(typeof y==="number")return [y];if(Array.isArray(y))return y;if(typeof y==="string"&&/^\d{4}(\+\d{4})*$/.test(y))return y.split("+").map(Number);return SEL.length?SEL:[LATEST]}
const rowY=row=>row&&row.Season!=null?row.Season:row?ALLY:undefined;
function sdOf(k,y){const ys=yrsOf(y),one=yy=>((DATA.sdBy||{})[String(yy)]||{})[k],fb=()=>IDX.includes(k)&&POP[k]?POP[k].sd:null;if(ys.length===1){const v=one(ys[0]);return v!=null?v:fb()}
  let a=0,w=0;for(const yy of ys){const v=one(yy),r=SE.find(s=>s.Season===yy),wt=r&&r.PA;if(v!=null&&wt){a+=v*wt;w+=wt}}return w?a/w:fb()}
function luck(k,v,lg,row){
  /* D12: a hitter's ground-ball rate is style: an unusual one (over one spread from league) gets its own neutral marker, neither good nor bad */
  if(k==="GB%"&&!PIT){if(v==null||lg==null)return null;const sd=sdOf(k,rowY(row)),df=v-lg;if(!sd||Math.abs(df)<=sd)return null;const up=df>0;return {mark:true,sty:true,up,tip:`unusually ${up?"high":"low"} GB% (league ${fmt(k,lg)}): a style, neither good nor bad`}}
  if(!(k in LUCK)||v==null)return null;const ok=row&&(ROLE==="pit"?row.IP>=100:row.PA>=400);if(!ok)return {mark:false,tip:"small sample — not meaningful yet"};if(lg==null)return null;const sd=sdOf(k,rowY(row)),band=sd||LUCK[k],df=v-lg;if(Math.abs(df)<=band)return null;const up=df>0;return {mark:true,up,tip:`unusually ${up?"high":"low"} ${k} (league ${fmt(k,lg)}) — tends to drift back toward average`}}
/* league-average baseline, SD of qualified ${WHO}, direction from the hitter's side */
function z(k,v,lg,y){const m=M[k],sd=sdOf(k,y);if(v==null||lg==null||!sd||!m||!m.d)return null;return (v-lg)/sd*m.d}
function inten(zz){return Math.min(1,(Math.abs(zz)-THR)/1.5)}
function tint(zz,al=1){if(zz==null||Math.abs(zz)<THR)return "transparent";return `color-mix(in oklab,${zz>0?"var(--good)":"var(--bad)"} ${Math.round((.28+.72*inten(zz))*46*al)}%,transparent)`}
function solid(zz){if(zz==null||Math.abs(zz)<THR)return "var(--neu)";return `color-mix(in oklab,${zz>0?"var(--good)":"var(--bad)"} ${Math.round((.5+.5*inten(zz))*100)}%,#9aa0b2)`}
function ink(zz){return zz==null||Math.abs(zz)<THR?"var(--ink)":`color-mix(in oklab,${zz>0?"var(--good)":"var(--bad)"} 60%,#fff)`}
/* stats whose colour comes from the MLB percentile; running rates are percentile-first (D17); D18 Savant extras carry the build's percentiles too */
const PCTK=ROLE==="pit"?["SIERA","xFIP","FIP","K%","BB%","K-BB%","HardHit%","Barrel%","SB/100BF","SBA/100BF","CS%"]:["wRC+","wOBA","xwOBA","ISO","Barrel%","HardHit%","K%","BB%","SB/OB","Att/PA","SB/PA","SB%","CS%","Sprint","EV50","Brl/PA","xHR/PA","No-doubter%","Swing-take runs","Heart runs","Shadow runs","Chase runs","Waste runs"];
/* percentiles come from the build: one season = that season row's pct (already from the player's side, among that season's qualified group); several seasons = none */
function pctile(k,v,y){if(y===undefined)y=SEL.length===1?SEL[0]:null;if(y==null||v==null||!M[k]||!M[k].d)return null;const r=SE.find(s=>s.Season===+y),p=r&&r.pct?r.pct[k]:null;return pctShown(p)}
/* colour from the percentile where one exists (lib/pct.mjs: 60th faint green to 99th rich; 20th or below muted; between quiet), else from the league-average gap */
/* D12, the same rule as the home and team pages (lib/pct.mjs), judged on the shown integer; the spread rule applies only where no percentile exists */
function qcls(k,v,lg,y,sy){const pc=PCTK.includes(k)?pctile(k,v,y):null;if(pc!=null)return pctTone(pc,"n");const [c,i]=cls(z(k,v,lg,sy!==undefined?sy:y===null?undefined:y));return {c,i,pc:null}}
const diffTxt=(k,v,lg)=>{if(v==null||lg==null)return"";const d=v-lg,s=d>0?"+":"−",a=Math.abs(d);
  return s+(["wRC+"].includes(k)?Math.round(a):["wOBA","xwOBA","ISO","wOBA against","xwOBA against"].includes(k)?f3(a):["EV","Spd","wBsR","Defense"].includes(k)?a.toFixed(1):(a*100).toFixed(1))};
const FORM={"SB/OB":"Steals per time on base = SB ÷ (1B + BB + HBP)","Att/PA":"Steal attempts per PA = (SB + CS) ÷ PA","SB/PA":"SB per PA = SB ÷ PA","SB%":"Steal success rate = SB ÷ (SB + CS)","CS%":"Caught-stealing rate = CS ÷ (SB + CS)"};
const RUNK=Object.keys(FORM);
const NOTE={"Sprint":"<br>Source: Baseball Savant sprint speed (FanGraphs does not publish it); league = mean of players with 10+ competitive runs","SB/OB":"<br>Steals per time on base = SB ÷ (1B + BB + HBP), from FanGraphs counts"};
const tipv=(k,v,lg,extra="")=>`<b>${k} ${fmt(k,v)}</b><br>League avg ${lg!=null?fmt(k,lg):"– (not published for this span)"}${NOTE[k]||""}${extra}`;
/* ---- combining seasons: counts summed; rates recomputed from summed counts where the counts exist (cRates, runRates), otherwise each season's
   own rate weighted by its own denominator (balls in play, pitches, innings, AB-based wOBA weight) or, failing that, by PA ---- */
const SUMK=["2B","3B","IBB","SF","G","PA","AB","H","HR","R","RBI","SB","BB","SO","wBsR","Defense","1B","HBP","W","L","GS","IP","TBF","ER","CS","SV","HLD","DRS","OAA","UZR","xHR","No-doubters","SB allowed","CS against","pickoffs","battersFaced"];
function usageParse(v){const m=String(v||"").match(/([\d.]+)%(?:\s*\(([\d.]+)\))?/);return m?[+m[1],m[2]?+m[2]:null]:null}
function combine(list){if(list.length===1)return list[0];const o={Season:list.map(s=>s.Season).join("+"),Team:list[list.length-1].Team};
  new Set(list.flatMap(s=>Object.keys(s))).forEach(k=>{if(k==="Season"||k==="Team")return;const h=list.filter(s=>s[k]!=null);if(!h.length)return;
    if(SUMK.includes(k)){o[k]=h.reduce((a,s)=>a+s[k],0);return}if(typeof h[0][k]==="object")return;
    if(typeof h[0][k]==="string"){const us=h.map(s=>[usageParse(s[k]),s.PA]).filter(x=>x[0]);if(!us.length)return;const W=us.reduce((a,x)=>a+x[1],0);
      const pct=us.reduce((a,x)=>a+x[0][0]*x[1],0)/W,vv=us.filter(x=>x[0][1]!=null),velo=vv.length?vv.reduce((a,x)=>a+x[0][1]*x[1],0)/vv.reduce((a,x)=>a+x[1],0):null;
      o[k]=pct.toFixed(1)+"%"+(velo!=null?" ("+velo.toFixed(1)+")":"");return}
    const w=h.reduce((a,s)=>a+s.PA,0);o[k]=h.reduce((a,s)=>a+s[k]*s.PA,0)/w});
  if(o.ER!=null&&o.IP){o.ERA=o.ER*9/o.IP;o.WHIP=(o.H+o.BB)/o.IP;o["HR/9"]=o.HR*9/o.IP}if(o.HR!=null&&o.PA)o["HR/PA"]=o.HR/o.PA;return runRates(list,cRates(list,o))}
/* rates with their own denominators, recomputed from summed counts (a count missing in any selected season = a dash):
   ISO = (2B + 2×3B + 3×HR) ÷ AB; BABIP = (H − HR) ÷ (AB − SO − HR + SF); xHR/PA = xHR ÷ PA; No-doubter% = no-doubters ÷ HR;
   wOBA weighted by AB + BB − IBB + SF + HBP; pitchers' SIERA, xFIP and FIP weighted by innings (other pitcher rates by batters faced) */
function cRates(list,o){const all=ks=>ks.every(k=>list.every(s=>s[k]!=null)),r=(n,d)=>d?n/d:null,wt=(k,w)=>list.every(s=>s[k]!=null&&w(s)!=null)?r(list.reduce((a,s)=>a+s[k]*w(s),0),list.reduce((a,s)=>a+w(s),0)):null;
  if(PIT){["SIERA","xFIP","FIP"].forEach(k=>{o[k]=wt(k,s=>s.IP)});
    /* batted-ball rates by balls in play (TBF − BB − HBP − SO − HR); pitch-level rates by pitches thrown where every season has them */
    const bip=s=>[s.TBF,s.BB,s.HBP,s.SO,s.HR].some(x=>x==null)?null:s.TBF-s.BB-s.HBP-s.SO-s.HR;
    ["BABIP","GB%","LD%","FB%","HR/FB"].forEach(k=>{o[k]=wt(k,bip)});
    if(list.every(s=>s.Pitches!=null))["SwStr%","Zone%","O-Swing%"].forEach(k=>{o[k]=wt(k,s=>s.Pitches)});return o}
  o.ISO=all(["2B","3B","HR","AB"])?r(o["2B"]+2*o["3B"]+3*o.HR,o.AB):null;
  o.BABIP=all(["H","HR","AB","SO","SF"])?r(o.H-o.HR,o.AB-o.SO-o.HR+o.SF):null;
  o["xHR/PA"]=all(["xHR","PA"])?r(o.xHR,o.PA):null;o["No-doubter%"]=all(["No-doubters","HR"])?r(o["No-doubters"],o.HR):null;
  o.wOBA=wt("wOBA",s=>[s.AB,s.BB,s.IBB,s.SF,s.HBP].some(x=>x==null)?null:s.AB+s.BB-s.IBB+s.SF+s.HBP);return o}
/* running rates over several seasons: recomputed from the summed counts, each with its own denominator (formulas as lib/statmeta.mjs);
   a count missing in any selected season leaves the combined rate a dash, never a PA-weighted average */
function runRates(list,o){const all=ks=>ks.every(k=>list.every(s=>s[k]!=null)),r=(n,d)=>d?n/d:null;
  if(PIT){const ok1=all(["SB allowed","battersFaced"]),ok2=all(["SB allowed","CS against","battersFaced"]),ok3=all(["SB allowed","CS against"]),sb=o["SB allowed"],cs=o["CS against"],bf=o.battersFaced;
    o["SB/100BF"]=ok1?(bf?100*sb/bf:null):null;o["SBA/100BF"]=ok2?(bf?100*(sb+cs)/bf:null):null;o["CS%"]=ok3?r(cs,sb+cs):null;return o}
  const sb=o.SB,cs=o.CS,pa=o.PA;
  o["SB/OB"]=all(["SB","1B","BB","HBP"])?r(sb,o["1B"]+o.BB+o.HBP):null;
  o["Att/PA"]=all(["SB","CS","PA"])?r(sb+cs,pa):null;o["SB/PA"]=all(["SB","PA"])?r(sb,pa):null;
  o["SB%"]=all(["SB","CS"])?r(sb,sb+cs):null;o["CS%"]=all(["SB","CS"])?r(cs,sb+cs):null;return o}
function combineLg(list){if(list.length===1&&list[0].Season===LATEST)return LGLATEST;const o={"wRC+":100,"wBsR":0,"Defense":0};
  const lgs=list.map(s=>[LG[String(s.Season)]||{},s.PA]);new Set(lgs.flatMap(x=>Object.keys(x[0]))).forEach(k=>{if(lgs.every(x=>x[0][k]!=null)){const W=lgs.reduce((a,x)=>a+x[1],0);o[k]=lgs.reduce((a,x)=>a+x[0][k]*x[1],0)/W}});return o}
/* ================= THE ORBIT ================= */
const $t=$("tip");
document.addEventListener("mousemove",e=>{const t=e.target.closest("[data-tip]");if(!t){$t.style.opacity=0;return}$t.innerHTML=t.dataset.tip;$t.style.opacity=1;
  $t.style.left=Math.min(e.clientX+16,innerWidth-$t.offsetWidth-8)+"px";$t.style.top=Math.min(e.clientY+18,innerHeight-$t.offsetHeight-8)+"px"});
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;");
/* glow class from z (hitter's side): green grows with distance above league; bad only when clearly below (1 SD), and then muted */
function cls(zz){if(zz==null||Math.abs(zz)<THR)return ["n",0];if(zz>0)return ["g",inten(zz)];return zz<=-2*THR?["b",inten(zz)]:["n",0]}
const LABEL={"O-Swing%":"O-Swing%","HardHit%":"HardHit%","C+SwStr%":"CSW%"};
const SUB={"O-Swing%":"chase","wRC+":""};
let RAILK=ROLE==="pit"?"SIERA":"wRC+",OPEN=null;
/* mini trend for tooltips: his line, league line dashed, selected seasons marked */
function mini(k){const pts=SE.map(s=>({y:s.Season,v:s[k],lg:lgAll(s.Season,k)}));const vs=pts.flatMap(p=>[p.v,p.lg]).filter(x=>x!=null);if(!vs.length)return"";
  let lo=Math.min(...vs),hi=Math.max(...vs);const pd=(hi-lo)*.12||1;lo-=pd;hi+=pd;const W=230,H=54,X=i=>4+i/(pts.length-1)*(W-8),Y=v=>H-4-(v-lo)/(hi-lo)*(H-8);
  const path=key=>pts.map((p,i)=>p[key]==null?"":`${i&&pts[i-1][key]!=null?"L":"M"}${X(i).toFixed(1)},${Y(p[key]).toFixed(1)}`).join("");
  return `<svg width="${W}" height="${H+12}" style="display:block;margin-top:6px"><path d="${path("lg")}" fill="none" stroke="#9aa6b8" stroke-dasharray="3 3" stroke-width="1.2"/><path d="${path("v")}" fill="none" stroke="#0c2340" stroke-width="1.8"/>
   ${pts.map((p,i)=>p.v==null?"":`<circle cx="${X(i)}" cy="${Y(p.v)}" r="${SEL.includes(p.y)?3.6:1.8}" fill="${SEL.includes(p.y)?"#16a34a":"#0c2340"}"/>`).join("")}
   <text x="4" y="${H+11}" font-size="9" fill="#95a1b1">${SE[0].Season}</text><text x="${W-4}" y="${H+11}" font-size="9" fill="#95a1b1" text-anchor="end">${SE[SE.length-1].Season}</text></svg>`}
function ptip(k,v,lg,extra=""){const idx=k==="wRC+";
  return esc(`<b>${k} ${fmt(k,v)}</b> · ${LBL}<br>${idx?"100 = league average (park- and league-adjusted)":`League avg ${lg!=null?fmt(k,lg):"–"}${v!=null&&lg!=null?` · <span class="d">${diffTxt(k,v,lg)}</span>`:""}`}${NOTE[k]||""}${extra}
   ${mini(k)}<small>Career by season · dashed = league · click for every season${SEL.length>1&&M[k]&&M[k].d&&!PCTK.includes(k)?"<br>Colour against the qualified spread of those seasons, weighted by PA":""}<br>${srcOf(L,k)||"–"}</small>`)}
function planet(k,size){const v=L[k],lg=k==="wRC+"?100:LGL[k],q=qcls(k,v,lg);
  const sub=q.pc!=null?`<em>${ord(q.pc)} pct</em>`:"",lgs=k==="wRC+"?(q.pc==null?"100 = avg":""):`lg ${fmt(k,lg)}`;
  return `<button class="pl ${size}${CORE.includes(k)?" core":""} ${q.c}" style="--i:${q.i.toFixed(2)}" data-k="${k}" data-tip="${ptip(k,v,lg,q.pc!=null?`<br>${ord(q.pc)} percentile of ${QN(SEL[0])}qualified ${LROLE(SEL[0])} in ${SEL[0]}`:"<br>Percentiles are per season; pick one season to see them")}"><span class="lab">${LABEL[k]||k}</span><b class="num">${fmt(k,v)}</b>${sub}${size==="big"||q.pc==null?`<small>${lgs}</small>`:""}</button>`}
function tierOf(){const v=L[KEY],pc=pctile(KEY,v);if(v==null)return "–";
  if(ROLE==="pit"){const g=LGL.SIERA!=null?LGL.SIERA-v:null,rp=SEL.length&&LROLE(SEL[SEL.length-1])==="relievers",nn=rp?"reliever":"starter",top=rp?"Elite reliever":"Ace",low=rp?"Middle reliever":"Back-end starter";return pc!=null?(pc>=90?top:pc>=70?`Very good ${nn}`:pc>=40?`Solid ${nn}`:pc>=15?low:`Struggling ${nn}`):g==null?(rp?"Reliever":"Starter"):g>=.8?`Very good ${nn}`:g>=.2?`Solid ${nn}`:g>=-.3?low:`Struggling ${nn}`}
  const wr=Math.round(v);return (pc!=null&&pc>=90)||wr>=150?"Elite bat":wr>=125?"Very good bat":wr>=105?"Above-average bat":wr>=95?"League-average bat":"Below-average bat"}
function capHTML(){if(!SEL.length)return "";const pc=pctile(KEY,L[KEY]);
  return `<div class="tier"><small>${LBL}</small>${tierOf()}</div><div class="fact">${pc!=null?`<b style="${pc>=60?"":"color:var(--ink)"}">${ord(pc)} percentile</b> ${KEY} · ${QN(SEL[0])}qualified ${LROLE(SEL[0])}`:`${fmt(KEY,L[KEY])} ${KEY}${KEY==="wRC+"?" · 100 = average":` · league ${fmt(KEY,LGL[KEY])}`}`}</div>`}
const INNER=ROLE==="pit"?["SIERA","xFIP"]:["wRC+","wOBA"],MID=ROLE==="pit"?["K%","BB%","K-BB%","HardHit%","Barrel%"]:["HardHit%","Barrel%","ISO","K%","BB%"],CORE=ROLE==="pit"?["K%","BB%","HardHit%"]:["HardHit%","K%","BB%"],
  MANG=ROLE==="pit"?{"K%":-125,"BB%":140,"K-BB%":-90,"HardHit%":-55,"Barrel%":40}:{"HardHit%":-90,"Barrel%":-55,"ISO":40,"K%":140,"BB%":-125};
const KEY=INNER[0];
/* splits for the selection: one season = that season's split rows; several = combined; every season = the build's career splits */
function splitsSel(){const allSel=SEL.length===SE.length;const pk=side=>{const rows=SE.filter(s=>SEL.includes(s.Season)).map(s=>rowFor(s,side)).filter(r=>r.PA);return rows.length?combine(rows):{}};
  const S={L:allSel&&DATA.splits.Career?DATA.splits.Career.L:pk("L"),R:allSel&&DATA.splits.Career?DATA.splits.Career.R:pk("R")};
  const lgSide=(side,k)=>{const vals=SEL.map(y=>[lgFor(y,k,side),(rowFor({Season:y},side).PA||0)]);if(vals.some(x=>x[0].v==null))return {v:null,src:"not published"};const W=vals.reduce((a,x)=>a+x[1],0)||1;return {v:vals.reduce((a,x)=>a+x[0].v*x[1],0)/W,src:vals[0][0].src}};
  return {S,lgSide,allSel}}
/* cards on the outer ring: ang = direction from the photo, rx/ry = how far toward the stage edge (1 = flush at 0 or 180 degrees; corners use 2 so they settle into the corners).
   The side slots beside the big circles (180 and 0 degrees) hold the narrowest cards, so the orbit still fits a 1280-wide window */
const CL=(ROLE==="pit"?[{id:"mix",n:"Pitch mix",ang:-124},{id:"res",n:"Results against",ang:180},{id:"career",n:"Career stats",ang:124},{id:"disc",n:"Plate discipline against",ang:-56},{id:"hands",n:"vs LHB / RHB",ang:0},{id:"batted",n:"Batted ball against",ang:56}]:[
 {id:"pitch",n:"vs pitch types",ang:-124},
 {id:"hands",n:"vs L / R",ang:180},
 {id:"speed",n:"Speed & defense",ang:124},
 {id:"disc",n:"Plate discipline",ang:-56},
 {id:"batted",n:"Batted ball",ang:0},
 {id:"career",n:"Career stats",ang:56}]).map(c=>Object.assign({rx:Math.abs(c.ang)%180?2:1,ry:Math.abs(c.ang)%180?2:1},c));
/* a tile button. pq: the value is the selection's own figure, so a stat with a percentile (PCTK) takes the percentile colour and shows its ordinal (D12, D17) */
const bt=(lab,k,v,lg,zz,sub,dk=k,pq=false)=>{const pp=pq&&PCTK.includes(dk)?pctile(dk,L[dk]):null,pt=pp!=null?pctTone(pp,"n"):null;let [c,i]=pt?[pt.c,pt.i]:cls(zz);const lk=luck(dk,v,lg,L),mk=lk&&lk.mark;return `<span class="bt ${c}${mk?(lk.sty?" sty":" lk"):""}" data-k="${dk}"${lk?` data-tip="${esc(lk.tip)}"`:""} style="--i:${i.toFixed(2)};--g:${c==="g"?`rgba(34,197,94,${(.10+.26*i).toFixed(2)})`:c==="b"?`rgba(176,88,63,${(.07+.07*i).toFixed(2)})`:mk?(lk.sty?"rgba(71,85,105,.10)":"rgba(139,92,246,.13)"):"transparent"}"><span class="l">${lab}</span><b class="v num">${fmt(k,v)}${mk?`<span class="lka">${lk.up?"↑":"↓"}</span>`:""}${pp!=null?` <small>${ord(pp)}</small>`:""}</b><span class="lg">${sub!=null?sub:`lg ${fmt(k,lg)}`}</span></span>`};
const lgz=k=>k==="wBsR"||k==="Defense"?0:LGL[k];
function clusterP(c){let b=[],hint="every season",n=3;
  if(c.id==="mix"){return `<button class="cl mixcard${OPEN==="mix"?" on":""}" data-cl="mix" style="width:340px"><div class="t">${c.n}<i>${LBL} · share · mph · runs saved/100</i></div>${mixList(mixItemsP(mixSel()),false,null,4)}</button>`}
  if(c.id==="disc"){n=2;b=[["O-Swing%","Chase"],["SwStr%","SwStr%"],["C+SwStr%","CSW%"],["Zone%","Zone%"]].map(([k,nm])=>bt(nm,k,L[k],LGL[k],M[k].d?z(k,L[k],LGL[k]):null))}
  if(c.id==="res"){n=2;b=[["FIP","FIP"],["wOBA against","wOBA"]].map(([k,nm])=>bt(nm,k,L[k],LGL[k],z(k,L[k],LGL[k]),undefined,k,true));hint="every season"}
  if(c.id==="hands"){const {S,lgSide}=splitsSel();n=2;b=["L","R"].map(sd=>{const lg=lgSide(sd,"wOBA against").v;return bt(`wOBA ${HANDL[sd]}`,"wOBA against",S[sd]["wOBA against"],lg,z("wOBA against",S[sd]["wOBA against"],lg),`${S[sd].PA||"–"} TBF · lg ${fmt("wOBA",lg)}`)});hint="every season"}
  if(c.id==="batted"){b=[["GB%","GB%"],["LD%","LD%"],["FB%","FB%"],["HR/FB","HR/FB"],["BABIP","BABIP"],["LOB%","LOB%"]].map(([k,nm])=>bt(nm,k,L[k],LGL[k],M[k].d?z(k,L[k],LGL[k]):null))}
  if(c.id==="career"){const best=[...SE].filter(s=>s.IP>=40&&s.SIERA!=null).sort((a,x)=>a.SIERA-x.SIERA)[0]||SE[0],cl=careerLg("FIP","All");
    b=[bt("Career FIP","FIP",CAR.FIP,cl,z("FIP",CAR.FIP,cl),`${fmt("IP",CAR.IP)} IP`),bt(`Best SIERA ${best.Season}`,"SIERA",best.SIERA,lgAll(best.Season,"SIERA"),z("SIERA",best.SIERA,lgAll(best.Season,"SIERA"))),bt("Seasons","G",SE.length,null,null,`${SE[0].Season}–${SE[SE.length-1].Season}`)];hint="All · vs L · vs R"}
  return `<button class="cl${OPEN===c.id?" on":""}" data-cl="${c.id}"><div class="t">${c.n}<i>${hint}</i></div><div class="bts" style="--n:${n}">${b.join("")}</div></button>`}
function clusterCard(c){if(ROLE==="pit")return clusterP(c);let b=[],hint="every season";
  if(c.id==="pitch"){const items=mixSelH().map(x=>({n:x.n,u:x.u,sub:"",side:fmt("RV",x.v),subc:x.v!=null&&x.v>=.5?"g":x.v!=null&&x.v<=-1?"b":"",tip:`${x.n}: ${Math.round(x.u*100)}% of pitches seen · ${fmt("RV",x.v)} runs per 100 vs it (0 = average) · ${LBL}`}));
    return `<button class="cl${OPEN==="pitch"?" on":""}" data-cl="pitch" style="width:320px"><div class="t">${c.n}<i>${LBL} · share seen · runs gained/100</i></div>${mixList(items,false,null,4)}</button>`}
  if(c.id==="hands"){const {S}=splitsSel();b=["L","R"].map(sd=>bt(`wRC+ vs ${sd}HP`,"wRC+",S[sd]["wRC+"],100,z("wRC+",S[sd]["wRC+"],100),`${S[sd].PA||"–"} PA`));hint="every season"}
  if(c.id==="disc"){b=[["O-Swing%","Chase"],["SwStr%","SwStr%"],["Z-Contact%","Z-Contact%"]].map(([k,n])=>bt(n,k,L[k],LGL[k],z(k,L[k],LGL[k])))}
  if(c.id==="batted"){b=[["HR/FB","HR/FB"],["BABIP","BABIP"],["EV","Exit velo"],["FB%","Fly ball%"]].map(([k,n])=>bt(n,k,L[k],LGL[k],M[k].d?z(k,L[k],LGL[k]):null))}
  if(c.id==="speed"){b=[["Sprint","Sprint"],["Att/PA","Att/PA"],["SB%","SB%"]].map(([k,n])=>{const v=k==="Sprint"&&L[k]!=null?+L[k].toFixed(1):L[k];return bt(n,k==="Sprint"?"EV":k,v,lgz(k),z(k,L[k],lgz(k)),`${k==="Sprint"?"ft/s · ":""}lg ${fmt(k==="Sprint"?"EV":k,lgz(k))}`,k,true)}).concat(field3());hint=`${LBL} · fielding ${fieldNow().span||"–"}`}
  if(c.id==="career"){const best=[...SE].filter(s=>s["wRC+"]!=null).sort((a,x)=>x["wRC+"]-a["wRC+"])[0]||SE[SE.length-1];
    b=[bt("Career","wRC+",CAR["wRC+"],100,z("wRC+",CAR["wRC+"],100,ALLY),`${fmt("PA",CAR.PA)} PA`),bt(`Best ${best.Season}`,"wRC+",best["wRC+"],100,z("wRC+",best["wRC+"],100),"wRC+"),bt("Seasons","G",SE.length,null,null,`${SE[0].Season}–${SE[SE.length-1].Season}`)];hint="All · vs L · vs R"}
  return `<button class="cl${OPEN===c.id?" on":""}" data-cl="${c.id}"><div class="t">${c.n}<i>${hint}</i></div><div class="bts" style="--n:${c.id==="batted"||c.id==="hands"?2:c.id==="speed"?4:3}">${b.join("")}</div></button>`}
/* D21 fielding. OAA leads: shown as OAA per 1,000 innings at his primary position with his percentile within that position (FanGraphs' qualified
   fielders at the same rate, from the build), the raw OAA count and innings beside it uncoloured, DRS beside it with a flag when the two disagree.
   Def is never coloured. The tile defaults to the build's three-season block (fielding3yr); once a single season is picked, that season's fieldingPct.
   The OAA and innings shown beside the rate are always the pair it was made from (the build's rateOAA / rateInn): rateFrom "board" = FanGraphs'
   fielding-board figures, "player" = his OAA in whole outs over his innings; catchers have no OAA percentile. */
const F3Y=DATA.fielding3yr||null;let FUSER=false;
const fsrc=k=>{const s=(DATA.sources||{})[k];return s&&s.fetchedAt?String(s.fetchedAt).slice(0,10):null};
const FLDSRC=k=>`FanGraphs fielding leaderboard (qualified)${fsrc(k)?`, fetched ${fsrc(k)}`:""}`;
const fpc=pctShown;
const fcls=p=>{const t=pctTone(p,"n");return [t.c,t.i]};
const fr=v=>v==null?"–":sgn(v,1),finn=v=>v==null?"–":Math.round(v).toLocaleString();
const fwhy=f=>f&&(typeof f.why==="string"?f.why:f.why&&f.why.OAA)||"no percentile published";
/* what the fielding button shows: the build's three-season block by default; a picked single season's fieldingPct; several picked seasons combined
   (rate = summed OAA ÷ summed innings at his primary position over those seasons, only innings from rows with an OAA, no percentile).
   DRS is always taken at the same position(s) and seasons as the OAA shown, so the disagreement flag compares like with like. */
const fldRows=(yrs,pos)=>SE.filter(s=>yrs.includes(s.Season)).flatMap(s=>(s.fielding||[]).filter(f=>f.pos===pos));
const drsAt=(yrs,pos)=>{const r=fldRows(yrs,pos);return r.length&&r.every(f=>f.DRS!=null)?r.reduce((a,f)=>a+f.DRS,0):null};
const onlyP=yrs=>!SE.filter(s=>yrs.includes(s.Season)).some(s=>(s.fielding||[]).some(f=>f.pos!=="P"));
function fieldNow(){const lbl=ys=>ys.length>1?`${ys[0]}–${String(ys[ys.length-1]).slice(2)}`:String(ys[0]);
  if(FUSER&&SEL.length===1){const one=SE.find(s=>s.Season===SEL[0]),f=one&&one.fieldingPct,yrs=[SEL[0]];if(onlyP(yrs))return {dh:1,span:lbl(yrs)};
    return f?{pos:f.pos,inn:f.rateInn??f.inn,OAA:f.rateOAA??f.OAA,rate:f.oaaPer1000,rateFrom:f.rateFrom,pct:f.pct,why:f.why,src:f.src,span:lbl(yrs),played:null,inSpan:null,DRS:drsAt(yrs,f.pos)}:{none:1,span:lbl(yrs),DRS:null}}
  if(FUSER&&SEL.length>1){const yrs=[...SEL];if(onlyP(yrs))return {dh:1,span:lbl(yrs)};const by={};SE.filter(s=>yrs.includes(s.Season)).forEach(s=>(s.fielding||[]).forEach(f=>{if(f.pos==="P"||f.pos==="OF"||f.inn==null)return;(by[f.pos]||=[]).push(f)}));
    const pos=Object.keys(by).sort((a,b)=>by[b].reduce((x,f)=>x+f.inn,0)-by[a].reduce((x,f)=>x+f.inn,0))[0];if(!pos)return {none:1,span:lbl(yrs),DRS:null};
    const wo=by[pos].filter(f=>f.OAA!=null),inn=wo.reduce((a,f)=>a+f.inn,0),OAA=wo.length?wo.reduce((a,f)=>a+f.OAA,0):null;
    return {pos,inn:wo.length?inn:null,OAA,rate:OAA!=null&&inn?OAA/inn*1000:null,rateFrom:"player",pct:null,why:"percentiles are per season or for the three-season block; pick one season or the default view",src:null,combined:1,span:lbl(yrs),played:null,inSpan:null,DRS:drsAt(yrs,pos)}}
  if(!F3Y){const yrs=SE.slice(-3).map(s=>s.Season);return onlyP(yrs)?{dh:1,span:lbl(yrs)}:{none:1,span:lbl(yrs),DRS:null}}
  const yrs=[];for(let y=F3Y.span[0];y<=F3Y.span[1];y++)yrs.push(y);const b=(F3Y.byPos||{})[F3Y.primary]||null,span=lbl(yrs);if(onlyP(yrs))return {dh:1,span};
  return b?{pos:F3Y.primary,inn:b.rateInn??b.inn,OAA:b.rateOAA??b.OAA,rate:b.oaaPer1000,rateFrom:b.rateFrom,pct:b.pct,why:b.why,src:b.src||F3Y.src,span,played:F3Y.seasonsPlayed,inSpan:F3Y.seasonsInSpan,DRS:drsAt(yrs,F3Y.primary)}:{none:1,span,DRS:null}}
function field3(){const f=fieldNow();if(f.pos!=null)f.pos=escH(f.pos);
  if(f.dh)return [`<span class="bt n" data-k="OAA" data-tip="${esc(`No fielding at a position in ${f.span}: designated hitter`)}" style="--i:0;--g:transparent"><span class="l">Position · ${f.span}</span><b class="v num">DH</b><span class="lg">no fielding</span></span>`];
  const dis=f.OAA!=null&&f.DRS!=null&&Math.sign(f.OAA)*Math.sign(f.DRS)<0&&Math.abs(f.OAA)>=3&&Math.abs(f.DRS)>=3;
  const drs=`DRS ${fmt("DRS",f.DRS)}${dis?" ⚑ disagrees":""}`;
  if(f.none||f.pos==="C"){const why=f.pos==="C"?"Catchers have no OAA, so no OAA percentile":"No OAA at a fielding position in this span";
    return [`<span class="bt n" data-k="OAA" data-tip="${esc(`${why}. ${drs}.`)}" style="--i:0;--g:transparent"><span class="l">OAA ${f.span}</span><b class="v num">–</b><span class="lg">${drs}</span></span>`]}
  const p=fpc(f.pct),[c,i]=fcls(f.pct),brd=f.rateFrom==="board",n=f.played!=null&&f.inSpan!=null&&f.played<f.inSpan?` · ${f.played} of ${f.inSpan} seasons`:"";
  const tip=`<b>OAA per 1,000 innings at ${f.pos}: ${fr(f.rate)}</b> · ${f.span}${n}<br>${p!=null?`${ord(p)} percentile among qualified ${f.pos} (FanGraphs' qualified fielders, same rate)`:`No percentile: ${fwhy(f)}`}<br>Raw OAA ${fmt("OAA",f.OAA)} in ${finn(f.inn)} innings${brd?" (FanGraphs' fielding-board figures, the ones the rate uses)":f.combined?" (summed over the picked seasons at that position)":""}<br>${drs} at ${f.pos}, same seasons${dis?" (DRS and OAA disagree)":""} · Def is never coloured<br>${f.src?FLDSRC(f.src):"OAA and innings: FanGraphs player fielding"}`;
  return [`<span class="bt ${c}" data-k="OAA" data-tip="${esc(tip)}" style="--i:${i.toFixed(2)};--g:${c==="g"?`rgba(34,197,94,${(.10+.26*i).toFixed(2)})`:c==="b"?`rgba(176,88,63,${(.07+.07*i).toFixed(2)})`:"transparent"}"><span class="l">OAA/1000 ${f.pos} · ${f.span}</span><b class="v num">${fr(f.rate)}${p!=null?` <small>${ord(p)}</small>`:""}</b><span class="lg">${fmt("OAA",f.OAA)} OAA · ${finn(f.inn)} inn${n}<span class="drs"><br>${drs}</span></span></span>`]}
/* expanded fielding table: every season and position (inn, OAA, OAA/1000 with its percentile, DRS, UZR through 2024), then the three-season block */
function fieldTable(){const rows=[];const cell=(f0,yr)=>{const f=Object.assign({},f0,{pos:escH(f0.pos)});const p=fpc(f.pct!=null&&typeof f.pct==="object"?f.pct.OAA:f.pct),[c,i]=fcls(p),cat=f.pos==="C",tot=f.pos==="OF";
    const tip=`${yr} ${f.pos} · OAA/1000 ${fr(f.oaaPer1000)}${p!=null?` · ${ord(p)} percentile among qualified ${f.pos}${f.pctN?` (${f.pctN})`:""}`:` · no percentile: ${cat?"catchers have no OAA":tot?"percentiles are by LF, CF or RF":fwhy(f)}`}${f.rateFrom==="board"?" · OAA and innings are FanGraphs' fielding-board figures":""} · ${FLDSRC(f.pctSrc||f.src)}`;
    return `<td class="num st">${finn(f.rateInn??f.inn)}</td><td class="num st">${fmt("OAA",f.rateOAA??f.OAA)}</td><td class="num ${p!=null?c:"st"}" style="--i:${i.toFixed(2)}" data-tip="${esc(tip)}">${fr(f.oaaPer1000)}${p!=null?`<small class="li">${ord(p)} pct</small>`:""}</td>`};
  /* the OF total is left out when he played only one outfield spot (it would repeat that row) */
  const ofOne=list=>list.filter(f=>["LF","CF","RF"].includes(f.pos)).length===1;
  for(const s of SE){const all=(s.fielding||[]).filter(f=>f.pos!=="P"),fl=all.filter(f=>!(f.pos==="OF"&&ofOne(all)));fl.forEach((f,j)=>rows.push(`<tr class="${SEL.includes(s.Season)?"sel":""}"><td class="sy">${j?"":s.Season}</td><td class="st" style="text-align:left">${escH(f.pos)}${f.rateFrom==="board"?" <small>board</small>":""}</td>${cell(f,s.Season)}<td class="num st">${fmt("DRS",f.DRS)}</td><td class="num st">${s.Season<=2024&&f.UZR!=null?fmt("UZR",f.UZR):"–"}</td></tr>`))}
  if(F3Y&&F3Y.byPos)Object.entries(F3Y.byPos).filter(([pos],_,arr)=>!(pos==="OF"&&arr.filter(([p])=>["LF","CF","RF"].includes(p)).length===1)).forEach(([pos,b],j)=>rows.push(`<tr class="tot"><td class="sy">${j?"":`${F3Y.span[0]}–${String(F3Y.span[1]).slice(2)}`}</td><td class="st" style="text-align:left">${pos}${b.seasonsPlayed!=null&&F3Y.seasonsInSpan&&b.seasonsPlayed<F3Y.seasonsInSpan?` <small>${b.seasonsPlayed} of ${F3Y.seasonsInSpan}</small>`:""}${b.rateFrom==="board"?" <small>board</small>":""}</td>${cell(Object.assign({pos},b),"three seasons")}<td class="num st">${fmt("DRS",drsAt(F3Y.span[0]<=F3Y.span[1]?Array.from({length:F3Y.span[1]-F3Y.span[0]+1},(_,i)=>F3Y.span[0]+i):[],pos))}</td><td class="num st">–</td></tr>`));
  if(!rows.length)return "";
  return `<h5 class="sx">Fielding by position · OAA per 1,000 innings with his percentile within the position</h5><div class="twrap fld"><div class="tw"><table class="ct"><thead><tr><th class="sy">Season</th><th style="text-align:left">Pos</th><th>Inn</th><th>OAA</th><th>OAA/1000</th><th>DRS</th><th>UZR (to 2024)</th></tr></thead><tbody>${rows.join("")}</tbody></table></div></div>`}
const PTSP=[["FA","Four-seam","fb"],["SI","Sinker","fb"],["FC","Cutter","fb"],["SLO","Slider","br"],["ST","Sweeper","br"],["CUO","Curveball","br"],["KC","Knuckle curve","br"],["CV","Slurve","br"],["CH","Changeup","os"],["FS","Splitter","os"],["FO","Forkball","os"],["SC","Screwball","os"],["KN","Knuckleball","br"],["EP","Eephus","os"]];
/* per-pitch figures from the build (pfx codes): a pitcher row carries pitches[code] {usage, velo, hMov, vMov, spin, rv100, whiff, putAway, whiffPct, putAwayPct, lgWhiff, lgPutAway};
   a hitter row carries pitchesSeen[code] {usage, rv100} */
const PK=(r,c)=>((PIT?r.pitches:r.pitchesSeen)||{})[c]||{};
function pitchesOf(r){return PTSP.map(([c,n,fam])=>{const p=PK(r,c);return {c,n,fam,u:p.usage??null,v:p.velo??null,x:p.hMov??null,zv:p.vMov??null,sp:p.spin??null,rv:p.rv100??null,wh:p.whiff??null,pa:p.putAway??null}}).filter(p=>p.u!=null&&p.u>=.005).sort((a,b)=>b.u-a.u)}
/* pitch mix for the selected seasons (D14). One season = that season's own FanGraphs mix. Several = each pitch's share weighted by the season's
   batters faced / plate appearances (FanGraphs season rows carry no pitch count), a pitch not thrown or seen that season counting as zero;
   velocity, spin, movement and runs/100 are weighted by how many of that pitch each season contributed. */
function selRows(){return SE.filter(s=>SEL.includes(s.Season))}
function wavg(rows,w,f){let a=0,b=0;rows.forEach((s,i)=>{const v=f(s,i);if(v!=null&&w[i]>0){a+=v*w[i];b+=w[i]}});return b?a/b:null}
function mixSel(){const rows=selRows();if(!rows.length)return [];if(rows.length===1)return pitchesOf(rows[0]);const W=rows.reduce((a,s)=>a+(s.PA||0),0)||1;
  return PTSP.map(([c,n,fam])=>{const w=rows.map(s=>(PK(s,c).usage||0)*(s.PA||0)),g=key=>wavg(rows,w,s=>PK(s,c)[key]??null);
    return {c,n,fam,u:w.reduce((a,b)=>a+b,0)/W,v:g("velo"),x:g("hMov"),zv:g("vMov"),sp:g("spin"),rv:g("rv100"),wh:null,pa:null}}).filter(p=>p.u>=.005).sort((a,b)=>b.u-a.u)}
/* pitches a hitter has seen (FanGraphs pfx classification): share weighted by PA across the selection, his runs gained per 100 weighted by pitches of that type */
function mixSelH(){const rows=selRows();if(!rows.length)return [];const W=rows.reduce((a,s)=>a+(s.PA||0),0)||1;
  return PTSP.map(([k,n])=>{const w=rows.map(s=>(PK(s,k).usage||0)*(s.PA||0));
    return {k,n,u:w.reduce((a,b)=>a+b,0)/W,v:wavg(rows,w,s=>PK(s,k).rv100??null)}}).filter(x=>x.u>0).sort((a,x)=>x.u-a.u)}
const mixItemsP=ps=>ps.map(p=>({n:p.n,u:p.u,sub:p.v!=null?p.v.toFixed(1):"–",side:p.rv!=null?fmt("RV",p.rv):"–",subc:p.rv!=null&&p.rv>=.5?"g":p.rv!=null&&p.rv<=-1?"b":"",
  tip:`${p.n}: ${Math.round(p.u*100)}% of pitches · ${p.v!=null?p.v.toFixed(1)+" mph":"–"} · ${p.rv!=null?fmt("RV",p.rv)+(ROLE==="pit"?" runs saved per 100":" runs gained per 100"):"–"} · ${LBL}`}));
/* pitch mix as a ranked list: one row per pitch by share, its name beside its own bar and the share at the bar's end; pitches under 5% fold into one "Other" row (hover for each) */
function mixList(items,big,hd,top){if(!items.length)return `<div class="pml${big?" big":""}"><div class="pmr"><span class="pmn">–</span></div></div>`;
  /* top = the most rows the orbit card shows: its leading pitches, the rest folded into "Other" (every pitch is one click away in the expanded view) */
  const lim=top||99,main=items.filter((x,i)=>x.u>=.05&&i<lim),tiny=items.filter((x,i)=>!(x.u>=.05&&i<lim));
  if(tiny.length===1)main.push(tiny[0]);else if(tiny.length)main.push({n:"Other",u:tiny.reduce((a,x)=>a+x.u,0),sub:"",side:"",oth:1,tip:tiny.map(x=>x.tip).join("<br>")});
  const mx=Math.max(...main.map(x=>x.u));
  return `<div class="pml${big?" big":""}">${hd&&(hd[0]||hd[1])?`<div class="pmr pmh"><span></span><span></span><span class="pmv">${hd[0]}</span><span class="pms">${hd[1]}</span></div>`:""}${main.map(x=>`<div class="pmr${x.oth?" oth":""}" data-tip="${esc(x.tip||x.n)}"><span class="pmn">${x.n}</span><span class="pmt"><i style="width:calc((100% - 46px)*${(x.u/mx).toFixed(3)})"></i><b class="num">${Math.round(x.u*100)}%</b></span><span class="pmv num">${x.sub||""}</span><span class="pms num ${x.subc||""}">${x.side||""}</span></div>`).join("")}</div>`}
/* D25: panel heading = player's full name + small team logo (same source as the header logo), linking to his team's page (D23) */
function NAMELOGO(){if(!TID)return P.name;const im=`<img class="tlg" src="https://www.mlbstatic.com/team-logos/team-cap-on-light/${TID}.svg" alt="${P.team||""}" title="${P.team||""}">`;return `${P.name}${TA?`<a class="tlg-a" href="${teamUrl(TA)}" title="${P.team||TA} team page">${im}</a>`:im}`}
function statsP(src){const c=k=>L[k]==null?"–":Math.round(L[k]).toLocaleString(),RP=CAR.G!=null&&CAR.GS!=null&&CAR.GS<CAR.G/2,
  cols=RP?[["G","G"],["SV","SV"],["HLD","HLD"],["IP","IP"],["SO","K"],["BB","BB"],["HR","HR"],["WHIP","WHIP"]]:[["GS","GS"],["W","W"],["L","L"],["IP","IP"],["SO","K"],["BB","BB"],["HR","HR"],["WHIP","WHIP"]];
  /* a career mostly in relief (D13) leads with saves, holds and games instead of starts */
  const big=RP?[[c("SV"),"Saves"],[c("HLD"),"Holds"],[`${c("W")}–${c("L")}`,"Won–lost"],[c("G"),"Games"],[fmt("IP",L.IP),"Innings"],[c("SO"),"Strikeouts"]]:[[`${c("W")}–${c("L")}`,"Won–lost"],[c("G"),"Games"],[fmt("IP",L.IP),"Innings"],[c("GS"),"Starts"],[c("SO"),"Strikeouts"],[fmt("WHIP",L.WHIP),"WHIP"]];
  const cell=(s,k)=>`<td class="num">${s[k]==null?"–":["WHIP","IP"].includes(k)?fmt(k,s[k]):Math.round(s[k])}</td>`;
  const rows=SE.map(s=>`<tr class="${SEL.includes(s.Season)?"sel":""}"><td>${s.Season}</td><td class="tmn">${s.Team??"–"}</td>${cols.map(([k])=>cell(s,k)).join("")}</tr>`).join("");
  return `<h3>${NAMELOGO()}<span class="tag">${LBL}</span></h3>
   <div class="hs6">${big.map(([v,n])=>`<div><b class="num">${v}</b><span>${n}</span></div>`).join("")}</div>
   <div class="hsx">${RP?`<span>WHIP <b class="num">${fmt("WHIP",L.WHIP)}</b></span>`:""}<span>Walks <b class="num">${c("BB")}</b></span><span>HR allowed <b class="num">${c("HR")}</b></span><span>Hits <b class="num">${c("H")}</b></span></div>
   <h5>Every season</h5><div class="pl2w"><table class="pl2"><thead><tr><th>Year</th><th></th>${cols.map(([k,n])=>`<th>${n}</th>`).join("")}</tr></thead><tbody>${rows}<tr class="tot"><td>Career</td><td></td>${cols.map(([k])=>cell(CAR,k)).join("")}</tr></tbody></table></div>
   ${src} ${SEL.length>1?"Counts are summed; WHIP recomputed from the summed totals. ":""}The plain line; how it stacks up is on the left.</p>`}
function panelHTML(){const src=`<p class="src">${SRC}.`;
  if(!SEL.length)return `<h3>Pick a season</h3><p class="lead">Choose one or more seasons above; <b>All</b> selects every season.</p>`;
  if(ROLE==="pit")return statsP(src);
  const c=k=>L[k]==null?"–":Math.round(L[k]).toLocaleString();
    const rows=SE.map(s=>`<tr class="${SEL.includes(s.Season)?"sel":""}"><td>${s.Season}</td><td class="tmn">${s.Team??"–"}</td>${["G","PA","HR","R","RBI","SB"].map(k=>`<td class="num">${s[k]??"–"}</td>`).join("")}${["BB","SO"].map(k=>`<td class="num">${s[k]??"–"}</td>`).join("")}</tr>`).join("");
    const tot=`<tr class="tot"><td>Career</td><td></td>${["G","PA","HR","R","RBI","SB"].map(k=>`<td class="num">${CAR[k]!=null?Math.round(CAR[k]).toLocaleString():"–"}</td>`).join("")}${["BB","SO"].map(k=>`<td class="num">${CAR[k]!=null?Math.round(CAR[k]).toLocaleString():"–"}</td>`).join("")}</tr>`;
    return `<h3>${NAMELOGO()}<span class="tag">${LBL}</span></h3>
     <div class="hs6">${[["HR","Home runs"],["RBI","RBI"],["R","Runs"],["SB","Steals"],["G","Games"],["PA","Plate app."]].map(([k,n])=>`<div><b class="num">${c(k)}</b><span>${n}</span></div>`).join("")}</div>
     <div class="hsx"><span>Hits <b class="num">${c("H")}</b></span><span>Walks <b class="num">${c("BB")}</b></span><span>Strikeouts <b class="num">${c("SO")}</b></span></div>
     <h5>Every season</h5><div class="pl2w"><table class="pl2"><thead><tr><th>Year</th><th></th><th>G</th><th>PA</th><th>HR</th><th>R</th><th>RBI</th><th>SB</th><th>BB</th><th>SO</th></tr></thead><tbody>${rows}${tot}</tbody></table></div>
     ${src} ${SEL.length>1?"Counts are summed and rates combined over the selected seasons. ":""}The plain line; how it stacks up is on the left.</p>`}
/* ================= EXPANDED VIEWS (D15): what opens depends on what was clicked ================= */
/* standard view columns: every core and advanced stat, every season; the switch turns every row and column to that split (D9) */
const CGRP=ROLE==="pit"?[["",["PA","IP"]],["Run prevention",["ERA","FIP","xFIP","SIERA"]],["Strikeouts & walks",["K%","BB%","K-BB%","SwStr%"]],["Contact against",["wOBA against","xwOBA against","HardHit%","Barrel%"]],["Batted ball",["GB%","LD%","FB%","HR/FB","BABIP","LOB%"]]]:[["",["PA"]],["How good",["wOBA","xwOBA","wRC+"]],["Discipline",["K%","BB%","SwStr%"]],["Power",["ISO","HR","HR/PA"]],["Contact quality",["EV","Barrel%","HardHit%"]],["Batted ball",["GB%","LD%","FB%","HR/FB","BABIP","Pull%"]]];
function splitRow(y,sd){const a=((SPL.seasons[String(y)]||{})["vs "+sd])||{},b=((DATA.ss[String(y)]||{})[sd])||{};
  const o={Season:y};["HardHit%","Barrel%","xwOBA","EV"].forEach(k=>{if(b[k]!=null)o[k]=b[k]});Object.keys(a).forEach(k=>{if(k!=="Split")o[k]=a[k]});
  if(o.HR!=null&&o.PA)o["HR/PA"]=o.HR/o.PA;return o}
/* league line for season y, stat k, side sd: 100-indexed stats = 100, run values (wBsR, Def) = 0, else lgFor */
const ZERO=["wBsR","Defense"],IDX=["wRC+","FIP-","xFIP-"];
function lgOf(y,k,sd){if(IDX.includes(k))return {v:100,src:"100 = average"};if(ZERO.includes(k))return {v:0,src:"league (runs above average)"};return lgFor(y,k,!sd||sd==="All"?null:sd)}
function careerLg(k,sd){if(IDX.includes(k))return 100;if(ZERO.includes(k))return 0;let W=0,S=0;for(const s of SE){const r=sd==="All"?s:splitRow(s.Season,sd),l=lgOf(s.Season,k,sd).v;if(!r.PA)continue;if(l==null)return null;W+=r.PA;S+=l*r.PA}return W?S/W:null}
/* the indexed run-prevention stats colour on the same 15-point scale the old results panel used */
if(ROLE==="pit")["FIP-","xFIP-"].forEach(k=>{if(!POP[k])POP[k]={sd:15}});
Object.assign(M,{"IFFB%":{f:pc,d:0},"SB":{f:cnt,d:0},"CS":{f:cnt,d:0},"DRS":{f:v=>sgn(v,0),d:0},"OAA":{f:v=>sgn(v,0),d:0},"UZR":{f:v=>sgn(v,1),d:0}});
const LB=k=>k==="PA"&&ROLE==="pit"?"TBF":({"C+SwStr%":"CSW%","Defense":"Def","Sprint":"Sprint","wOBA against":"wOBA","xwOBA against":"xwOBA","Swing-take runs":"All zones","Heart runs":"Heart","Shadow runs":"Shadow","Chase runs":"Chase","Waste runs":"Waste","SB allowed":"SB","CS against":"CS","pickoffs":"Pickoffs"}[k]||k);
function tcell(k,v,lg,src,tipHead,y=null,inl=false,hk=false,gs=false,row=null){const d=M[k]&&M[k].d;const q=d&&v!=null?qcls(k,v,lg,y,rowY(row)):{c:"n",i:0,pc:null},c=q.c,i=q.i,lk=luck(k,v,lg,row),mk=lk&&lk.mark,so=srcOf(row,k);
  const tip=v==null?`${tipHead} · ${LB(k)}: not published`:`${tipHead} · <b>${LB(k)} ${fmt(k,v)}</b>${q.pc!=null?` · <b>${ord(q.pc)} percentile</b> of qualified ${y!=null?LROLE(y):WHO}`:""}${IDX.includes(k)?" · 100 = average":lg!=null?` · ${src} ${fmt(k,lg)}`:" · no league line published"}${RUNK.includes(k)&&ROLE!=="pit"?` · ${FORM[k]}`:""}${lk?` · <b>${lk.tip}</b>`:d?"":" · style or count, uncoloured"}${so?` · ${so}`:""}`;
  const li=inl&&!IDX.includes(k)&&lg!=null&&!["PA","G","SB","CS"].includes(k)?`<small class="li">lg ${fmt(k,lg)}</small>`:"";
  /* D3, D7: where Savant also publishes a figure (wOBA against, EV, Barrel%...), its value is a labelled alternative under FanGraphs' figure */
  const al=row&&row.alt&&row.alt[k]&&row.alt[k].value!=null?row.alt[k]:null,asd=al&&(DATA.sources||{})[al.src],alp=al?pctShown(al.pct):null;
  const alt=al?`<small class="li" data-tip="${esc(`${tipHead} · Baseball Savant's ${LB(k)} <b>${fmt(k,al.value)}</b>${alp!=null?` · ${ord(alp)} percentile`:""} · Savant${asd&&asd.fetchedAt?`, fetched ${String(asd.fetchedAt).slice(0,10)}`:""}`)}">Savant ${fmt(k,al.value)}</small>`:"";
  return `<td class="num ${d?c:"st"}${mk?(lk.sty?" sty":" lk"):""}${hk?" hk":""}${gs?" gs":""}" style="--i:${i.toFixed(2)}" data-tip="${esc(tip)}">${fmt(k,v)}${mk?`<span class="lka">${lk.up?"↑":"↓"}</span>`:""}${li}${alt}</td>`}
const CHS=ROLE==="pit"?["SIERA","xFIP","FIP","K%","BB%","K-BB%","SwStr%","HardHit%","Barrel%","GB%","HR/FB","BABIP","LOB%","wOBA against"]:["wRC+","wOBA","xwOBA","ISO","HR/PA","K%","BB%","Barrel%","HardHit%","BABIP","HR/FB","SwStr%"];
const LRK=ROLE==="pit"?["PA","wOBA against","FIP","K%","BB%","K-BB%","HardHit%","GB%"]:["PA","wOBA","wRC+","ISO","HR/PA","K%","BB%","HardHit%"];
const VIEWS=ROLE==="pit"?{
  career:{t:"Season by season",s:"every core and advanced stat",g:CGRP,split:1,chart:CHS,def:"SIERA"},
  disc:{t:"Plate discipline against",s:"how batters swing and make contact against him",g:[["",["PA"]],["Swings",["O-Swing%","Z-Swing%","Swing%"]],["Contact",["O-Contact%","Z-Contact%","Contact%"]],["Strikes",["SwStr%","C+SwStr%","CStr%","F-Strike%","Zone%"]],["Outcome",["K%","BB%"]]],split:1,inl:1,chart:["O-Swing%","SwStr%","C+SwStr%","Contact%","Z-Contact%","F-Strike%","Zone%","K%","BB%"],def:"O-Swing%"},
  batted:{t:"Batted ball against",s:"what batters do when they hit him",g:[["",["PA"]],["Launch",["GB%","LD%","FB%","IFFB%"]],["Results",["HR/FB","BABIP"]],["Direction",["Pull%","Cent%","Oppo%"]],["Contact",["Soft%","Med%","Hard%"]],["Quality against",["EV","Barrel%","HardHit%"]]],split:1,inl:1,chart:["GB%","LD%","FB%","HR/FB","BABIP","EV","Barrel%","HardHit%"],def:"GB%"},
  res:{t:"Results against",s:"run prevention and contact against",g:[["",["PA","IP"]],["Run prevention",["FIP","xFIP","SIERA","xERA"]],["Indexed · 100 = average",["FIP-","xFIP-"]],["Against",["wOBA against","xwOBA against","BABIP","HR/FB","HR/9","WHIP"]],["Stranding",["LOB%"]],["Running game",["SB allowed","CS against","SB/100BF","SBA/100BF","CS%","pickoffs"]]],split:1,inl:1,chart:["FIP","xFIP","SIERA","wOBA against","BABIP","LOB%","HR/FB","SB/100BF","SBA/100BF","CS%"],def:"FIP"},
  hands:{t:"vs LHB / RHB",s:"his line against each side, every season",hands:1},
  mix:{t:"Pitch mix",s:"each pitch, every season",pitch:1}
  }:{
  career:{t:"Season by season",s:"every core and advanced stat",g:CGRP,split:1,chart:CHS,def:"wRC+"},
  disc:{t:"Plate discipline",s:"swings, contact and how he is pitched",g:[["",["PA"]],["Swings",["O-Swing%","Z-Swing%","Swing%"]],["Contact",["O-Contact%","Z-Contact%","Contact%"]],["Strikes",["SwStr%","CStr%","F-Strike%","Zone%"]],["Outcome",["K%","BB%"]],["Swing/take runs by zone · runs gained",["Swing-take runs","Heart runs","Shadow runs","Chase runs","Waste runs"]]],split:1,inl:1,chart:["O-Swing%","Z-Swing%","Swing%","O-Contact%","Z-Contact%","Contact%","SwStr%","Zone%","F-Strike%","K%","BB%","Swing-take runs"],def:"O-Swing%"},
  batted:{t:"Batted ball",s:"launch, direction and how hard",g:[["",["PA"]],["Launch",["GB%","LD%","FB%","IFFB%"]],["Results",["HR/FB","BABIP"]],["Direction",["Pull%","Cent%","Oppo%"]],["Contact",["Soft%","Med%","Hard%"]],["Quality",["EV","Barrel%","HardHit%"]],["Savant · power",["EV50","Brl/PA","xHR","xHR/PA","No-doubters","No-doubter%"]]],split:1,inl:1,chart:["HR/FB","BABIP","GB%","LD%","FB%","Pull%","EV","Barrel%","HardHit%","EV50","Brl/PA","xHR/PA","No-doubter%"],def:"HR/FB"},
  speed:{t:"Speed &amp; defense",s:"running and fielding",g:[["",["G","PA"]],["Running",["Spd","Sprint","SB","CS","SB/OB","Att/PA","SB/PA","SB%","CS%","wBsR"]],[`Fielding · ${P.pos}`,["DRS","OAA","UZR","Defense"]]],inl:1,chart:["Sprint","Spd","SB/OB","Att/PA","SB/PA","SB%","CS%","wBsR","Defense"],def:"Sprint"},
  hands:{t:"vs L / R",s:"his line against each side, every season",hands:1},
  pitch:{t:"vs pitch types",s:"what he sees and how he does against it, every season",pitch:1}};
const NOTES={
  career:()=>`HR/PA = HR ÷ PA. BABIP, pull% and counts are uncoloured (luck-driven or style). Violet = unusually high or low (only over 400+ PA, or 100+ IP for pitchers); these tend to revert toward average, so they are not good or bad.`,
  disc:()=>`FanGraphs plate-discipline figures. Style stats (how often he swings, how he is pitched) are uncoloured. FanGraphs' vs L / vs R splits publish only some of these columns; the rest show a dash.${ROLE==="pit"?"":" CSW% is not in the hitter data, so called strikes (CStr%) show on their own. Swing/take run values by zone (runs gained by his swing and take decisions in the heart, shadow, chase and waste zones) are Baseball Savant's; they are not split by hand."}`,
  batted:()=>`${ROLE==="pit"?"League line = all starters, or all relievers in a season he mostly relieved (D13).":`${P.bats!=="L"?"Right-handed hitter: pull = left field.":"Left-handed hitter: pull = right field."} EV50 (average of his hardest-hit half), barrels per PA, expected home runs and no-doubters are Baseball Savant's; they are not split by hand.`} Launch mix and direction are style, uncoloured. Violet = unusually high or low (only over 400+ PA, or 100+ IP for pitchers); these tend to revert toward average, so they are not good or bad.`,
  res:()=>`FanGraphs run-prevention figures. wOBA against = FanGraphs' vs-left and vs-right lines combined by plate appearances; xwOBA against is Baseball Savant's. FIP- and xFIP-: 100 = league average, lower is better. SIERA is not published per batter hand, so it shows a dash in the split views. Running game: stolen bases and caught stealing against him are MLB's official counts (FanGraphs publishes none for pitchers), per 100 batters faced; fewer steals is better for him, a higher caught-stealing rate is better. Violet = unusually high or low (only over 400+ PA, or 100+ IP for pitchers); these tend to revert toward average, so they are not good or bad.`,
  speed:()=>`Running rates from FanGraphs counts: steals per time on base = SB ÷ (1B + BB + HBP); steal attempts per PA = (SB + CS) ÷ PA; SB per PA = SB ÷ PA; success rate = SB ÷ (SB + CS); caught rate = CS ÷ (SB + CS). Running rates are coloured by his MLB percentile among qualified hitters that season. wBsR is runs above average, so league = 0. Sprint speed is Baseball Savant's (FanGraphs does not publish it). Fielding (D21): OAA (outs above average) leads, as OAA per 1,000 innings at each position, coloured by his percentile among FanGraphs' qualified fielders at that position at the same rate (every player is ranked, no qualifying gate); the raw OAA and innings sit beside it uncoloured. Where FanGraphs' fielding board lists him, its OAA and innings are used (marked "board") so the count matches the rate. The outfield total and catchers get no OAA percentile. The main tile shows his last three fielding seasons until one season is picked. DRS sits beside OAA, flagged when the two disagree; UZR is published through 2024. Source: FanGraphs fielding leaderboards (qualified)${fsrc("fg-fld-"+LATEST)?`, fetched ${fsrc("fg-fld-"+LATEST)}`:""}. Def includes FanGraphs' position adjustment, so it is never coloured. Position shown is his current listed position (${P.pos||"–"}).`};
/* one season-by-season table from column groups; a column may carry its own side (the handedness view) */
function vTable(v,sd){const cols=v.g.flatMap(([g,ks],gi)=>ks.map((k,j)=>typeof k==="string"?{k,sd,gs:gi>0&&j===0}:Object.assign({gs:gi>0&&j===0},k)));
  const nmOf=s=>s==="All"?`All ${OPP}`:HANDL[s];const rowOf=(y,s)=>s==="All"?SE.find(x=>x.Season===y):splitRow(y,s);
  const carOf={};const car=s=>{if(!carOf[s]){if(s==="All")carOf[s]=CAR;else{const c=Object.assign({},DATA.splits.Career&&DATA.splits.Career[s]?DATA.splits.Career[s]:combine(SE.map(x=>splitRow(x.Season,s)).filter(r=>r.PA)));if(c.HR!=null&&c.PA&&c["HR/PA"]==null)c["HR/PA"]=c.HR/c.PA;carOf[s]=c}}return carOf[s]};
  const hl=k=>!!v.chart&&k===RAILK;
  const body=SE.map(s=>{const y=s.Season,pa0=rowOf(y,cols[0].sd).PA;return `<tr class="${SEL.includes(y)?"sel":""}${pa0&&pa0<100?" lowpa":""}"><td class="sy">${y}</td>${cols.map(c=>{const r=rowOf(y,c.sd),lg=lgOf(y,c.k,c.sd);
    return c.k==="PA"?`<td class="num st pa${c.gs?" gs":""}" data-tip="${esc(`${y} ${nmOf(c.sd)}: ${r.PA||"–"} ${LB("PA")}${r.PA&&r.PA<100?" · small sample, read with care":""}`)}">${fmt("PA",r.PA)}</td>`:tcell(c.k,r[c.k],lg.v,lg.src,`${y} ${nmOf(c.sd)}`,c.sd==="All"?y:null,v.inl,hl(c.k),c.gs,r)}).join("")}</tr>`}).join("");
  const tot=`<tr class="tot"><td class="sy">Career</td>${cols.map(c=>c.k==="PA"?`<td class="num st${c.gs?" gs":""}">${fmt("PA",car(c.sd).PA)}</td>`:tcell(c.k,car(c.sd)[c.k],careerLg(c.k,c.sd),"league (PA-weighted)",`Career ${nmOf(c.sd)}`,null,v.inl,hl(c.k),c.gs,car(c.sd))).join("")}</tr>`;
  return `<div class="twrap"><div class="tw"><table class="ct"><thead><tr><th class="grp sy"></th>${v.g.map(([g,ks],gi)=>`<th class="grp${gi?" gs":""}" colspan="${ks.length}">${g}</th>`).join("")}</tr>
   <tr><th class="sy">Season</th>${cols.map(c=>`<th class="${hl(c.k)?"hk":""}${c.gs?" gs":""}">${LB(c.k)}</th>`).join("")}</tr></thead><tbody>${body}${tot}</tbody></table></div></div>`}
/* small multiple for one pitch: share of pitches as bars (selected seasons navy), runs per 100 as the line */
function pitchSvg(us,rv,W,H){const n=SE.length,bw=Math.min(24,(W-20)/n*.62),X=i=>10+(i+.5)*(W-44)/n,um=Math.max(.01,...us),rr=Math.max(1.5,...rv.filter(v=>v!=null).map(Math.abs)),YR=v=>24-v/rr*16;
  const bars=SE.map((s,i)=>{const u=us[i]||0,h=u/um*(H-58);return `<rect x="${X(i)-bw/2}" y="${H-h}" width="${bw}" height="${h}" rx="3" fill="${SEL.includes(s.Season)?"var(--navy)":"#b9c3d4"}"/><text x="${X(i)}" y="${H-h-3}" text-anchor="middle" class="bl">${u?Math.round(u*100)+"%":""}</text><text x="${X(i)}" y="${H+12}" text-anchor="middle" class="yl">${String(s.Season).slice(2)}</text>`}).join("");
  const line=rv.map((v,i)=>v==null?"":`${i&&rv[i-1]!=null?"L":"M"}${X(i).toFixed(1)},${YR(v).toFixed(1)}`).join(""),li=rv.map((v,i)=>v==null?-1:i).filter(i=>i>=0).pop();
  const dots=rv.map((v,i)=>v==null?"":`<circle cx="${X(i)}" cy="${YR(v)}" r="3.4" fill="${v>=.5?"#16a34a":v<=-1?"#b8a49c":"#8f9bb0"}" stroke="#fff" stroke-width="1.2"><title>${SE[i].Season}: ${fmt("RV",v)} runs ${ROLE==="pit"?"saved":"gained"} per 100</title></circle>`).join("");
  return `<svg viewBox="0 0 ${W} ${H+16}" width="100%"><line x1="6" x2="${W-4}" y1="${YR(0)}" y2="${YR(0)}" stroke="#9aa6b8" stroke-dasharray="3 3"/><text x="4" y="8" class="zl">${ROLE==="pit"?"runs saved":"runs gained"} /100</text>${bars}<path d="${line}" fill="none" stroke="#16a34a" stroke-width="1.8"/>${dots}${li!=null&&li>=0?`<text x="${W-2}" y="${YR(rv[li])+3}" text-anchor="end" class="rl">${fmt("RV",rv[li])}</text>`:""}</svg>`}
/* pitch-by-season view: one card per pitch, its chart and a table of every season (never split by hand, D9) */
function pitchView(){const pit=ROLE==="pit",rvq=v=>v==null?'class="num"':v>=.5?`class="num g" style="--i:${Math.min(1,(v-.5)/2).toFixed(2)}"`:v<=-1?'class="num b"':'class="num"';
  const q=(v,lg,hi)=>{if(v==null||lg==null)return 'class="num"';const r=v/lg;return r>=1+hi?`class="num g" style="--i:${Math.min(1,(r-1-hi)/.5).toFixed(2)}"`:r<=1-2*hi?'class="num b"':'class="num"'};
  const d="<td class=\"num st\">–</td>",brk=(x,zv)=>x==null?d+d:`<td class="num st">${Math.abs(x).toFixed(1)} <small>${x===0?"":(P.throws==="L"?x>0:x<0)?"arm":"glove"}</small></td><td class="num st">${zv!=null?zv.toFixed(1):"–"}</td>`;
  let cards;
  /* Savant whiff% and put-away% per pitch: coloured by the build's percentile among qualified pitchers throwing that pitch type that season */
  const qp=p=>{const t=pctTone(p);return t.c==="g"?`class="num g" style="--i:${t.i.toFixed(2)}"`:t.c==="b"?`class="num b" style="--i:${t.i.toFixed(2)}"`:'class="num"'},pp=p=>pctShown(p)!=null?` · ${ord(pctShown(p))} percentile among qualified pitchers' same pitch`:"",
    ars=y=>{const s=(DATA.sources||{})[`sav-arsenal_pit-${y}`];return s?` · ${s.label||"Baseball Savant pitch arsenal"}${s.fetchedAt?`, fetched ${String(s.fetchedAt).slice(0,10)}`:""}`:""};
  if(pit){const list=PTSP.map(([c,n,fam])=>({c,n,fam,car:SE.reduce((a,s)=>a+(PK(s,c).usage||0)*(s.PA||0),0)})).filter(p=>p.car>0&&SE.some(s=>(PK(s,p.c).usage||0)>=.02)).sort((a,b)=>b.car-a.car),TW=SE.reduce((a,s)=>a+(s.PA||0),0)||1;
    cards=list.map(p=>{const rows=SE.map(s=>{const k=PK(s,p.c),u=k.usage,on=u!=null&&u>=.005,y=s.Season,lw=k.lgWhiff,lp=k.lgPutAway,wh=k.whiff,pa=k.putAway;
        if(!on)return `<tr class="${SEL.includes(y)?"sel":""}"><td class="sy">${y}</td><td class="num st" data-tip="${esc(`${y}: not thrown`)}">–</td>${d.repeat(7)}</tr>`;
        return `<tr class="${SEL.includes(y)?"sel":""}"><td class="sy">${y}</td><td class="num"><b>${Math.round(u*100)}%</b></td><td class="num st">${k.velo!=null?k.velo.toFixed(1):"–"}</td><td class="num st">${k.spin!=null?Math.round(k.spin):"–"}</td>${brk(k.hMov,k.vMov)}
          <td ${wh!=null?qp(k.whiffPct):'class="num"'} data-tip="${esc(`${y} ${p.n} whiff% ${wh!=null?pc(wh):"– (not published)"}${lw!=null?" · league "+pc(lw):""}${wh!=null?pp(k.whiffPct):""}${ars(y)}`)}">${wh!=null?pc(wh):"–"}</td><td ${pa!=null?qp(k.putAwayPct):'class="num"'} data-tip="${esc(`${y} ${p.n} put-away% ${pa!=null?pc(pa):"– (not published)"}${lp!=null?" · league "+pc(lp):""}${pa!=null?pp(k.putAwayPct):""}${ars(y)}`)}">${pa!=null?pc(pa):"–"}</td><td ${rvq(k.rv100??null)}>${k.rv100!=null?fmt("RV",k.rv100):"–"}</td></tr>`}).join("");
      return `<div class="smc pcard"><div class="smt">${p.n}<small>${Math.round(p.car/TW*100)}% of his career pitches</small></div>${pitchSvg(SE.map(s=>PK(s,p.c).usage||0),SE.map(s=>PK(s,p.c).rv100??null),480,104)}
        <div class="twrap"><div class="tw"><table class="ct"><thead><tr><th class="sy">Season</th><th>Share</th><th>mph</th><th>Spin rpm</th><th>H break in</th><th>V break in</th><th>Whiff%</th><th>Put-away%</th><th>Runs saved/100</th></tr></thead><tbody>${rows}</tbody></table></div></div></div>`}).join("")}
  else{const list=PTSP.map(([k,n])=>({k,n,car:SE.reduce((a,s)=>a+(PK(s,k).usage||0)*(s.PA||0),0)})).filter(p=>p.car>0&&SE.some(s=>(PK(s,p.k).usage||0)>=.01)).sort((a,b)=>b.car-a.car),TW=SE.reduce((a,s)=>a+(s.PA||0),0)||1;
    cards=list.map(p=>{const rows=SE.map(s=>{const x=PK(s,p.k),y=s.Season;if(x.usage==null)return `<tr class="${SEL.includes(y)?"sel":""}"><td class="sy">${y}</td>${d.repeat(2)}</tr>`;
        return `<tr class="${SEL.includes(y)?"sel":""}"><td class="sy">${y}</td><td class="num"><b>${(x.usage*100).toFixed(1)}%</b></td><td ${rvq(x.rv100??null)} data-tip="${esc(`${y} vs ${p.n} · <b>${x.rv100!=null?fmt("RV",x.rv100):"–"}</b> runs gained per 100 pitches (0 = average)`)}">${x.rv100!=null?fmt("RV",x.rv100):"–"}</td></tr>`}).join("");
      return `<div class="smc pcard"><div class="smt">${p.n}<small>${Math.round(p.car/TW*100)}% of pitches he has seen</small></div>${pitchSvg(SE.map(s=>PK(s,p.k).usage||0),SE.map(s=>PK(s,p.k).rv100??null),480,104)}
        <div class="twrap"><div class="tw"><table class="ct"><thead><tr><th class="sy">Season</th><th>Share seen</th><th>His runs gained/100 vs it</th></tr></thead><tbody>${rows}</tbody></table></div></div></div>`}).join("")}
  return `<p class="sub">Bars = share of ${pit?"his pitches":"pitches he has seen"} each season (selected seasons in the darker team colour); the green line = ${pit?"runs saved per 100 pitches, above 0 = good for him":"runs gained per 100 pitches seen, above 0 = good for him"}. Usage is style, so it stays uncoloured.</p>
   <div class="swipe">Swipe each table sideways for every column →</div><div class="pcg${pit?"":" nar"}">${cards}</div>
   <p class="src">${pit?`FanGraphs pitch-tracking (pfx) classification: share, velocity, spin, movement (inches; FanGraphs' horizontal break is from the catcher's view, negative = toward third base, so it is shown as arm side or glove side for his throwing hand) and pitch value per 100 pitches (positive = good for the pitcher). Whiff% and put-away% per pitch are Baseball Savant's pitch-arsenal figures (FanGraphs has none${(()=>{const d=SE.map(s=>(DATA.sources||{})[`sav-arsenal_pit-${s.Season}`]).filter(x=>x&&x.fetchedAt).map(x=>String(x.fetchedAt).slice(0,10)).sort();return d.length?`; fetched ${d[0]===d[d.length-1]?d[0]:`${d[0]} to ${d[d.length-1]}`}`:""})()}), coloured by his percentile among qualified pitchers' same pitch type that season; hover for the league figure. Savant's own usage shares differ slightly from FanGraphs'; FanGraphs' are shown.`:`FanGraphs pitch-tracking (pfx) classification: share of pitches he has seen and his pitch values (runs above average per 100 pitches of that type, 0 = average). Velocity, spin, movement, whiff% and put-away% are not in the hitter data.`} ${SRC}.</p>`}
function viewHTML(){const v=VIEWS[OPEN];if(!v)return "";const sd=v.split?TSPLIT:"All",span=`${SE[0].Season}–${SE[SE.length-1].Season}`;
  const segB=v.split?`<div class="seg">${[["All","All"],["L","vs L"],["R","vs R"]].map(([x,t])=>`<button data-ts="${x}" class="${sd===x?"on":""}" title="${x==="All"?`All ${OPP}`:x==="L"?`vs left-handed ${OPP}`:`vs right-handed ${OPP}`}">${t}</button>`).join("")}</div>`:"";
  const hd=`<div class="sh"><h3><span class="who">${P.name}<i>#${NO} · ${P.team||"–"}</i></span><span class="sep">·</span>${v.t}<small>${v.s} · ${span}</small></h3>${segB}<button class="x" data-close>✕ close</button></div>`;
  if(v.pitch)return hd+pitchView();
  const g=v.hands?["L","R"].map(s=>[`${HANDL[s]}`,LRK.map(k=>({k,sd:s}))]):v.g,vv=Object.assign({},v,{g});
  const nm=v.hands?`${HANDL.L} and ${HANDL.R} side by side`:sd==="All"?`vs all ${OPP}`:`${HANDL[sd]}`;
  const hasPct=!v.hands&&sd==="All"&&g.some(([,ks])=>ks.some(k=>PCTK.includes(k)));
  const sub=`<p class="sub">${v.split||v.hands?`<b>${nm}</b>, every season${sd==="All"||v.hands?"":`, the same columns as All`}. `:""}Green = ${hasPct?`his MLB percentile among qualified ${WHO} that season for ${PCTK.filter(k=>g.some(([,ks])=>ks.includes(k))).join(", ")}; other stats compare with that season's league average`:`clearly better than that season's league line${v.hands?" for the same side":sd==="All"?"":` ${HANDL[sd]}`}`}; below average stays quiet${v.inl?"; the small figure under each number is that season's league average":""}. ${v.chart?`Highlighted column: <b>${LB(RAILK)}</b>, charted above. `:""}${TOUCH()?"Tap":"Hover"} a cell for its league figure.</p>`;
  const chart=v.chart?`<div id="rail"><div class="top" id="rtop"></div><div id="rplot"></div></div>`:"";
  const note=v.hands?`${SPL.source}; HardHit% from the same FanGraphs splits. ${PIT?`FanGraphs publishes no league line by batter hand, so each season is coloured against the all-starters or all-relievers line for his role that season (hover shows which).`:`K%, BB% and HR/PA are coloured against the league-wide ${HANDL.L} / ${HANDL.R} line (FanGraphs' team splits leaderboard, 30 clubs summed); other stats against the all-hitters line (hover shows which).`} Seasons under 100 ${LB("PA")} ${HANDL.L} are faded.`:`${sd==="All"?`${SRC}; season lines from the FanGraphs player page.`:`${SPL.source}; HardHit% from the same FanGraphs splits.`} ${(NOTES[OPEN]||(()=>""))()} Seasons under 100 ${LB("PA")} are faded.`;
  return hd+chart+sub+`<div class="swipe">Swipe the table sideways for every column →</div>`+vTable(vv,sd)+(OPEN==="speed"?fieldTable():"")+`<p class="src">${note} Selected seasons (${LBL}) are highlighted.</p>${ROLE==="pit"&&!v.hands?`<p class="src">Pitcher page: each season is judged within his role that season (D13): league line = all starters, or all relievers in a season he mostly relieved (FanGraphs leaderboards); percentiles among that season's qualified starters or relievers.</p>`:""}`}
function sheetEdge(){document.querySelectorAll("#sheet .tw").forEach(w=>{const f=()=>w.parentNode.classList.toggle("rmore",w.scrollLeft+w.clientWidth<w.scrollWidth-2);w.onscroll=f;f();
  /* keep the latest selected season in sight when the table scrolls inside the view */
  const r=[...w.querySelectorAll("tr.sel")].pop(),h=w.querySelector("thead");if(r&&h&&w.clientHeight<w.scrollHeight&&r.offsetTop+r.offsetHeight>w.clientHeight)w.scrollTop=r.offsetTop+r.offsetHeight-w.clientHeight+(w.querySelector("tr.tot")?w.querySelector("tr.tot").offsetHeight:0);
  /* and the highlighted (clicked) column, when it sits past the right edge */
  const k=w.querySelector("th.hk");if(k&&k.offsetLeft+k.offsetWidth>w.clientWidth)w.scrollLeft=k.offsetLeft-w.clientWidth/2+k.offsetWidth/2;f()})}
/* career rail: the pinned stat by season, league line, gap shaded green where he is better */
function rail(){if(!$("rplot"))return;const v=VIEWS[OPEN];if(!v||!v.chart)return;const k=RAILK,d0=M[k].d||1,sd=v.split?TSPLIT:"All";
  const pts=SE.map(s=>{const r=sd==="All"?s:splitRow(s.Season,sd);return {y:s.Season,v:r[k]??null,lg:lgOf(s.Season,k,sd).v,pc:sd==="All"&&PCTK.includes(k)?pctile(k,r[k],s.Season):null}});
  $("rtop").innerHTML=`<b>Chart</b><span class="pick">${v.chart.map(x=>`<button class="yr${x===k?" on":""}" data-chart="${x}">${x}</button>`).join("")}</span><span class="key">${sd==="All"&&PCTK.includes(k)?"labels above dots = MLB percentile that season":""}</span>`;
  const el=$("rplot"),W=el.clientWidth,H=el.clientHeight;if(!W||!H)return;
  const vs=pts.flatMap(p=>[p.v,p.lg]).filter(x=>x!=null);if(!vs.length){el.innerHTML=`<span class="yt" style="left:0;top:50%;width:auto">No ${k} in the ${sd==="All"?"":"split "}data</span>`;return}
  let lo=Math.min(...vs),hi=Math.max(...vs);const pd=(hi-lo)*.12||1;lo-=pd;hi+=pd;
  const n=pts.length,X=i=>n>1?i/(n-1)*W:W/2,Y=v=>(1-(v-lo)/(hi-lo))*H;
  const line=key=>pts.map((p,i)=>p[key]==null?"":`${i&&pts[i-1][key]!=null?"L":"M"}${X(i).toFixed(1)},${Y(p[key]).toFixed(1)}`).join("");
  let sh="";for(let i=0;i<n-1;i++){const p=pts[i],q=pts[i+1];if([p.v,p.lg,q.v,q.lg].some(x=>x==null)||!M[k].d)continue;const g0=(p.v-p.lg)*d0,g1=(q.v-q.lg)*d0;
    const poly=(x0,a0,b0,x1,a1,b1,g)=>`<polygon points="${x0},${Y(a0)} ${x1},${Y(a1)} ${x1},${Y(b1)} ${x0},${Y(b0)}" fill="${g?"#22c55e":"#b8a49c"}" opacity="${g?.18:.12}"/>`;
    if(g0*g1>=0)sh+=poly(X(i),p.v,p.lg,X(i+1),q.v,q.lg,(g0+g1)>=0);else{const t=g0/(g0-g1),xm=X(i)+t*(X(i+1)-X(i)),vm=p.v+t*(q.v-p.v);sh+=poly(X(i),p.v,p.lg,xm,vm,vm,g0>0)+poly(xm,vm,vm,X(i+1),q.v,q.lg,g1>0)}}
  const raw=(hi-lo)/3,pw=Math.pow(10,Math.floor(Math.log10(raw))),st=[1,2,2.5,5,10].map(m=>m*pw).find(x=>x>=raw);const ticks=[];for(let v=Math.ceil(lo/st)*st;v<=hi;v+=st)ticks.push(+v.toFixed(6));
  const tk=v=>M[k].f===pc?(v*100).toFixed(v*100%1?1:0)+"%":["wOBA","ISO","xwOBA","BABIP"].includes(k)?f3(v):Math.round(v);
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}">${ticks.map(t=>`<line x1="0" x2="${W}" y1="${Y(t)}" y2="${Y(t)}" stroke="rgba(12,35,64,.06)"/>`).join("")}${sh}
    <path d="${line("lg")}" fill="none" stroke="#9aa6b8" stroke-width="1.3" stroke-dasharray="4 3"/><path d="${line("v")}" fill="none" stroke="var(--navy)" stroke-width="2.2" stroke-linejoin="round"/></svg>
    ${ticks.map(t=>`<span class="yt" style="top:${Y(t)}px">${tk(t)}</span>`).join("")}${k==="Sprint"?`<span class="yt yu" style="top:-12px">ft/s</span>`:""}
    ${pts.map((p,i)=>{if(p.v==null)return "";const on=SEL.includes(p.y),q=qcls(k,p.v,p.lg,sd==="All"?p.y:null,p.y),r=on?13:9;
      const bg=q.c==="g"?`color-mix(in oklab,#16a34a ${Math.round(55+45*q.i)}%,#cfd6df)`:q.c==="b"?"#c98f7c":"#8f9bb0";
      return `<button class="dot" data-y="${p.y}" style="left:${X(i)}px;top:${Y(p.v)}px;width:${r}px;height:${r}px;background:${bg};box-shadow:0 0 0 2px #fff${on?",0 0 0 4px var(--navy)":""}" data-tip="${esc(`<b>${p.y} ${k} ${fmt(k,p.v)}</b>${p.pc!=null?`<br>${ord(p.pc)} percentile of ${QN(p.y)}qualified ${LROLE(p.y)}`:""}<br>League ${p.lg!=null?fmt(k,p.lg):"– (not published)"}<br>${srcOf(SE.find(s=>s.Season===p.y),k)||"–"}`)}"></button>${p.pc!=null?`<span class="pc ${q.c==="g"?"g":q.c==="b"?"b":""}" style="left:${X(i)}px;top:${Y(p.v)-9}px${i===0?";transform:translate(-3px,-100%)":""}">${ord(p.pc)}</span>`:""}`}).join("")}
    ${pts.map((p,i)=>`<span class="yl${SEL.includes(p.y)?" on":""}" style="left:${X(i)}px">${W<520&&n>6?"’"+String(p.y).slice(2):p.y}</span>`).join("")}${(()=>{const iv=pts.map((p,i)=>p.v==null?-1:i).filter(i=>i>=0).pop(),il=pts.map((p,i)=>p.lg==null?-1:i).filter(i=>i>=0).pop();
      return (iv!=null?`<span class="el" style="left:${X(iv)+12}px;top:${Y(pts[iv].v)}px">${P.last}${sd==="All"?"":" "+HANDL[sd]}</span>`:"")+(il!=null?`<span class="el lgl" style="left:${X(il)+12}px;top:${Y(pts[il].lg)}px">league</span>`:"")})()}`}
/* orbit geometry (PLAYER-PAGE-ORBIT-FIT). Cards sit on an outer ellipse that fills the stage (clamped inside it), scaled cs = 0.8-1 so their text stays
   readable; the photo, the percentile circles and the caption scale together by s, which starts at the stage's own scale (1100 x 680 design space) and
   steps down until nothing touches (6px clear between every circle, card, caption and the corner label). Circles never drop below the size their fixed
   type needs (below 0.8 the type inside the circles shrinks with them, --pf, to 0.875 at most). If no s down to 0.5 fits, or the window is under ORBMINW, the page goes flat (the phone layout): the cutoff is wherever it truly stops fitting
   (checked 2026-10-01 with an overlap check: pitchers (Skenes, a reliever, Ohtani) fit at 1280 x 720, 1366 x 768 and 1440 x 900 now that the pitcher's
   side "Results against" card is two columns wide like the hitter's side cards; hitters (Judge, Ozuna, Turner, Ohtani) fit at 1280 x 720 too since the
   orbit's Speed & defense card sizes its tiles to their content and keeps the fielding tile's OAA and DRS on one line (player.css), so it clears the caption). */
const ORBMINW=1200;let ISFLAT=false;const FLAT=()=>ISFLAT;
function layout(){ISFLAT=innerWidth<ORBMINW;document.body.classList.toggle("flat",ISFLAT);if(!ISFLAT&&!orbit()){ISFLAT=true;document.body.classList.add("flat")}
  const st=$("stage");const items=st.querySelectorAll(".pl,.cl,.sun");
  if(FLAT()){$("rings").innerHTML="";st.style.removeProperty("--pf");st.style.removeProperty("--cs");items.forEach(e=>{e.style.left=e.style.top=e.style.width=e.style.height="";if(e.classList.contains("cl"))e.style.transform=""});const cp=$("cap");cp.style.left=cp.style.top=cp.style.transform=""}}
function orbit(){const st=$("stage");
  const W=st.clientWidth,H=st.clientHeight,kx=W/1100,ky=H/680,s0=Math.min(kx,ky),cs=Math.min(1,Math.max(.8,s0)),cx=W/2,cy=H/2+8*Math.min(1,s0),GAP=6;
  st.style.setProperty("--cs",cs); /* lets the tiles' small secondary lines stay 9.5px on screen after the card scale (set before the cards are measured) */
  if(!W||!H)return false;
  /* cards: fixed pixel boxes on the outer ellipse, clamped to the stage */
  const lay=st.querySelector(".layer"),lb={x:lay.offsetLeft,y:lay.offsetTop,w:lay.offsetWidth,h:lay.offsetHeight};
  /* reach f (0-1): how far the cards stand out toward the stage edges; big stages keep them close to the orbit, tight ones push them into the corners */
  const els=[...st.querySelectorAll(".cl")].map(e=>({e,c:CL.find(x=>x.id===e.dataset.cl),w:e.offsetWidth*cs,h:e.offsetHeight*cs}));
  const place=f=>els.map(({e,c,w,h})=>{const a=c.ang*Math.PI/180,m=1+(c.rx-1)*f,side=c.rx===1?.8+.2*f:1;
    let x=Math.min(W-w/2-4,Math.max(w/2+4,cx+Math.cos(a)*(W/2-w/2-4)*m*side)),y=Math.min(H-h/2-2,Math.max(h/2+2,cy+Math.sin(a)*(H/2-h/2-2)*(1+(c.ry-1)*f)));
    /* a card in the label's column starts below the corner label */
    if(x-w/2<lb.x+lb.w+GAP&&y-h/2<lb.y+lb.h+GAP)y=Math.max(y,lb.y+lb.h+GAP+1+h/2);
    return {e,x,y,w,h}});
  const REACH=[0,.25,.5,.75,1].map(f=>{const cards=place(f);return {cards,boxes:cards.map(c=>({x:c.x-c.w/2,y:c.y-c.h/2,w:c.w,h:c.h})).concat([lb])}});
  const cp=$("cap"),capW=cp.offsetWidth,capH=cp.offsetHeight;
  const R0=[190,150],R1=[322,230];
  const rr=(a,b)=>Math.max(a.x-(b.x+b.w),b.x-(a.x+a.w),a.y-(b.y+b.h),b.y-(a.y+a.h));
  const cr=(c,r)=>Math.hypot(c.x-Math.max(r.x,Math.min(c.x,r.x+r.w)),c.y-Math.max(r.y,Math.min(c.y,r.y+r.h)))-c.r;
  const geo=s=>{const ps=Math.max(s,.7),sunD=196*Math.max(s,.7),bigD=138*ps,sr=sunD/2+9,
      bx=Math.max(R0[0]*s,sr+bigD/2+GAP+1),pl=[{x:cx,y:cy,r:sr,sun:1}];
    pl.push({x:cx-bx,y:cy,r:bigD/2},{x:cx+bx,y:cy,r:bigD/2});
    const csc=Math.max(.85,Math.min(1,s)),cap={x:cx-capW*csc/2,y:cy+sunD/2+Math.max(26*s,18),w:capW*csc,h:capH*csc};
    /* each small circle starts on the middle ring and slides outward along its own angle until it clears the photo, the big circles and the caption */
    st.querySelectorAll(".pl.mid").forEach(e=>{const a=MANG[e.dataset.k]*Math.PI/180,r=(CORE.includes(e.dataset.k)?100:82)*ps/2;let k=s*.7,x,y;
      for(;k<3;k+=.01){x=cx+Math.cos(a)*R1[0]*k;y=cy+Math.sin(a)*R1[1]*k;if(pl.every(q=>Math.hypot(x-q.x,y-q.y)-q.r-r>=GAP+1)&&cr({x,y,r},cap)>=GAP+1)break}
      pl.push({e,x,y,r})});
    return {s,ps,sunD,bigD,bx,pl,cap,csc}};
  const fits=(g,boxes)=>{const rs=boxes.concat([g.cap]);
    for(let i=0;i<g.pl.length;i++){const p=g.pl[i];if(p.x-p.r<0||p.x+p.r>W||p.y-p.r<0||p.y+p.r>H)return false;
      for(let j=i+1;j<g.pl.length;j++){const q=g.pl[j];if(Math.hypot(p.x-q.x,p.y-q.y)-p.r-q.r<GAP)return false}
      for(let k=0;k<rs.length;k++)if(cr(p,rs[k])<GAP)return false}
    if(g.cap.y+g.cap.h>H)return false;
    for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++)if(rr(rs[i],rs[j])<GAP)return false;
    return true};
  let g=null,cards=null;for(let s=s0;s>=.5&&!g;s-=.01){const t=geo(s);for(const r of REACH)if(fits(t,r.boxes)){g=t;cards=r.cards;break}}
  if(!g)return false;
  const s=g.s;
  $("rings").innerHTML=[[g.bx,g.bx*R0[1]/R0[0]],[R1[0]*s,R1[1]*s],[(W/2)*.84,(H/2)*.86]].map((r,i)=>`<ellipse class="r${i+1}" cx="${cx}" cy="${cy}" rx="${r[0]}" ry="${r[1]}"/>`).join("");
  const put=(e,x,y,d)=>{e.style.left=x+"px";e.style.top=y+"px";if(d){e.style.width=e.style.height=d+"px"}};
  put($("sun"),cx,cy,g.sunD);cp.style.left=cx+"px";cp.style.top=g.cap.y+"px";cp.style.transform="translateX(-50%) scale("+g.csc+")";cp.style.transformOrigin="50% 0";
  st.querySelectorAll(".pl.big").forEach((e,i)=>put(e,i?g.pl[2].x:g.pl[1].x,cy,g.bigD));
  g.pl.filter(p=>p.e).forEach(p=>put(p.e,p.x,p.y,p.r*2));
  cards.forEach(c=>{put(c.e,c.x,c.y);c.e.style.transform=`translate(-50%,-50%) scale(${cs})`});
  st.style.setProperty("--s",s);st.style.setProperty("--pf",Math.min(1,g.ps/.8).toFixed(3));return true}
function render(){$("inner").innerHTML=INNER.map(k=>planet(k,"big")).join("");$("midr").innerHTML=MID.map(k=>planet(k,"mid")).join("");
  $("outer").innerHTML=CL.map(clusterCard).join("");$("panel").innerHTML=panelHTML().replace(/<p class="src">(?![\s\S]*<p class="src">)/,'<p class="src"><span class="seal" aria-hidden="true"></span>');$("cap").innerHTML=capHTML();
  const sh=$("sheet");sh.hidden=!VIEWS[OPEN];sh.innerHTML=viewHTML();layout();rail();sheetEdge();panelEdge();document.documentElement.style.setProperty("--q",richQ())}
/* the panel's every-season table scrolls inside its box with the Career row pinned at the bottom (player.css .pl2w); it opens
   scrolled so the latest selected season (by default the newest) sits just above that row */
function panelEdge(){const w=document.querySelector("#panel .pl2w");if(!w||w.scrollHeight<=w.clientHeight)return;
  const r=[...w.querySelectorAll("tr.sel")].pop(),t=w.querySelector("tr.tot");if(!r){w.scrollTop=w.scrollHeight;return}
  w.scrollTop=Math.max(0,r.offsetTop+r.offsetHeight-w.clientHeight+(t?t.offsetHeight:0))}
/* D27: headline percentile for the selected seasons: wRC+ (hitters) or SIERA (starters). One season = that season's percentile;
   several = each season's percentile weighted by PA (hitters) or IP (pitchers). None = no richness, calm team tint only. */
function headPct(){if(!SEL.length)return null;if(SEL.length===1)return pctile(KEY,L[KEY]);let a=0,w=0;
  SE.filter(s=>SEL.includes(s.Season)).forEach(s=>{const p=pctile(KEY,s[KEY],s.Season),wt=ROLE==="pit"?s.IP:s.PA;if(p!=null&&wt){a+=p*wt;w+=wt}});return w?a/w:null}
/* richness 0..1: nothing up to the 50th percentile, rising smoothly to full at the 97th */
function richQ(){const p=headPct();if(p==null)return 0;const t=Math.max(0,Math.min(1,(p-50)/47));return +(t*t*(3-2*t)).toFixed(3)}
/* identity: team colours, logo, ballpark photo and credit from lib/teams.mjs (D16, D27); ink colours are his primary colour kept dark enough to read */
const TM=ctx.team||null,TA=TM?TM.abbr:null,TID=TM?TM.id:P.teamId,C1=TM?TM.colors.primary:"#0c2340",C2=TM?TM.colors.secondary:"#1d3a63",PARK=TM?TM.ballparkPhoto:null,NO=P.number??"–";
const RS=document.documentElement.style;/* a red team accent sits next to the brick "bad" tone (D12), so red-primary teams (PHI, STL, CIN, LAA, WSH, BOS...) take their secondary colour for ink and accents
   (chips, headings, pitch bars), or a dark navy when the secondary is light or red too; the background wash keeps both team colours (D27) */
const hsl=h=>{const m=/^#?([0-9a-f]{6})$/i.exec(h||"");if(!m)return null;const n=parseInt(m[1],16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;
  if(!d)return {h:0,s:0,l};const s=d/(1-Math.abs(2*l-1));let hh=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;hh*=60;if(hh<0)hh+=360;return {h:hh,s,l}};
const isRed=c=>{const x=hsl(c);return !!x&&x.s>.35&&(x.h<45||x.h>330)};
const INK=!isRed(C1)?C1:(!isRed(C2)&&hsl(C2)&&hsl(C2).l<.5?C2:"#1d2b44");
RS.setProperty("--navy",`oklch(from ${INK} min(l,.32) c h)`);RS.setProperty("--navy2",`oklch(from ${INK} calc(min(l,.32) + .1) c h)`);document.title=`${RAW.name} · The Chop`;
const TLA=$("tlogo"),TLI=TLA.querySelector("img");if(TID){TLI.src=`https://www.mlbstatic.com/team-logos/team-cap-on-light/${TID}.svg`;TLI.alt=RAW.team;TLI.hidden=false;const mk=document.querySelector("#bg .mark");mk.src=`https://www.mlbstatic.com/team-logos/${TID}.svg`;mk.hidden=false}
if(TA){TLA.href=teamUrl(TA);TLA.title=`${P.team||TA} team page`}else TLA.removeAttribute("href");
if(PARK)document.querySelector("#bg .photo").style.backgroundImage=`url("${PARK.url}")`;document.querySelector(".sun img").src=`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:silo:current.png/w_600,q_auto:best/v1/people/${P.mlbam}/headshot/silo/current`;document.querySelector(".sun img").alt=RAW.name;
/* Ohtani (D6): one page, a Hitting / Pitching switch that reloads the page in the other role */
const ROLES=DATA.roles||[ROLE];if(ROLES.includes("bat")&&ROLES.includes("pit")){$("pswitch").innerHTML=[["bat","Hitting"],["pit","Pitching"]].map(([r,t])=>`<a href="./player.html?id=${encodeURIComponent(P.fgId)}&amp;role=${r}" class="${r===ROLE?"on":""}"${r===ROLE?' aria-current="page"':""}>${t}</a>`).join("");$("pswitch").hidden=false}
$("layerwho").textContent=`MLB percentile among qualified ${WHO}, that season`;
RS.setProperty("--tc1",C1);RS.setProperty("--tc2",C2);
const PCRED=PARK?`Ballpark photo: <a href="${PARK.page}" target="_blank" rel="noopener">${PARK.credit}</a>, ${PARK.license}, via Wikimedia Commons`:"Ballpark photo: none for this team";
/* footer: every source behind the figures on this page, each with its fetch date (per-season files of one source grouped, with their date range) */
const SRCLIST=(()=>{const ids=new Set();[...SE,CAR].forEach(r=>Object.values(r.src||{}).forEach(id=>id&&ids.add(id)));SE.forEach(s=>(s.fielding||[]).forEach(f=>f.pctSrc&&ids.add(f.pctSrc)));
  /* per-pitch Savant whiff% / put-away% carry no src entry: credit the season's arsenal file wherever a pitch has one */
  if(PIT)SE.forEach(s=>{if(Object.values(s.pitches||{}).some(p=>p&&(p.whiff!=null||p.putAway!=null))&&(DATA.sources||{})[`sav-arsenal_pit-${s.Season}`])ids.add(`sav-arsenal_pit-${s.Season}`)});
  const g=new Map();for(const id of ids){const s=(DATA.sources||{})[id];if(!s)continue;const lb=String(s.label||id).replace(/\s+\d{4}(-\d{4})?$/,"");const d=s.fetchedAt?String(s.fetchedAt).slice(0,10):null;const e=g.get(lb)||{lo:null,hi:null};if(d){if(!e.lo||d<e.lo)e.lo=d;if(!e.hi||d>e.hi)e.hi=d}g.set(lb,e)}
  return [...g].map(([lb,e])=>`<b>${escH(lb)}</b>${e.hi?` (fetched ${e.lo===e.hi?e.hi:`${e.lo} to ${e.hi}`})`:""}`).join(" · ")})();
$("ftx").innerHTML=`Sources: ${SRCLIST||"–"} · percentiles among qualified ${WHO} each season, FanGraphs leaderboards<small>Headshots and team logos: MLB · ${PCRED}</small>`;
$("nm").innerHTML=`${P.name}<i>#${NO}</i>`;$("no").textContent="#"+NO;
$("wm").textContent=RAW.last;$("nbar").innerHTML=`${TID?`<img src="https://www.mlbstatic.com/team-logos/team-cap-on-light/${TID}.svg" alt="">`:""}<b>${P.name}</b><span>#${NO} · ${P.pos||"–"} · ${P.team||"–"}</span>`;
const nbarF=()=>$("nbar").classList.toggle("on",document.querySelector("header").getBoundingClientRect().bottom<0);document.addEventListener("scroll",nbarF,{capture:true,passive:true});
$("meta").innerHTML=[`${P.team||"–"}`,`<b>${P.pos||"–"}</b>`,`B/T <b>${escH(P.bats||"–")}/${escH(P.throws||"–")}</b>`,`Age <b>${P.age??"–"}</b>`,`${escH(P.height||"–")}, ${P.weight??"–"} lb`,`debut ${escH(P.debut||"–")}`].map(x=>`<span class="ms">${x}</span>`).join(" · ");
/* season chips (D14): default latest; All selects all, All again clears */
function setSel(sel){SEL=[...sel].sort((a,b)=>a-b);document.body.classList.toggle("nosel",!SEL.length);
  if(SEL.length){const list=SE.filter(s=>SEL.includes(s.Season));L=combine(list);LGL=combineLg(list);ISLATEST=SEL.length===1&&SEL[0]===LATEST;
    LBL=SEL.length===SE.length?`Career ${SEL[0]}–${String(SEL[SEL.length-1]).slice(2)}`:SEL.length<=3?SEL.join(" + "):SEL.length+" seasons";}
  else{L={};LGL={};ISLATEST=false;LBL="no season"}
  document.querySelectorAll(".yr[data-y]").forEach(b=>b.classList.toggle("on",SEL.includes(+b.dataset.y)));$("yall").classList.toggle("on",SEL.length===SE.length);
  $("showing").innerHTML=SEL.length?`<b>${LBL}</b> · ${(ROLE==="pit"?fmt("IP",L.IP)+" IP":fmt("PA",L.PA)+" PA")}${SEL.length>1?(PIT?" · rates weighted by batters faced (SIERA, xFIP, FIP by innings)":" · rates from summed counts, else weighted by PA"):""} · ${SRC}`:`<b>Pick one or more seasons</b>`;render()}
$("seasons").innerHTML=`<span class="k">Season</span>${SE.map(s=>`<button class="yr" data-y="${s.Season}" data-tip="${ROLE==="pit"?`${fmt("GS",s.GS)} GS · ${fmt("IP",s.IP)} IP`:`${fmt("G",s.G)} G · ${fmt("PA",s.PA)} PA · ${fmt("wRC+",s["wRC+"])} wRC+`}">${s.Season}</button>`).join("")}<button class="yr" id="yall">All</button>`;
/* on phones the chips are one sideways-scrolling row; start it at the latest season */
requestAnimationFrame(()=>{const ch=$("seasons");ch.scrollLeft=ch.scrollWidth;fadeChips()});
/* a short fade on whichever edge of the season chips has more off-screen, so a cut-off chip reads as scrollable */
function fadeChips(){const ch=$("seasons");ch.classList.toggle("fl",ch.scrollLeft>2);ch.classList.toggle("fr",ch.scrollLeft+ch.clientWidth<ch.scrollWidth-2)}
$("seasons").addEventListener("scroll",fadeChips,{passive:true});addEventListener("resize",fadeChips);
$("seasons").onclick=e=>{const b=e.target.closest(".yr");if(!b)return;FUSER=true;if(b.id==="yall"){setSel(SEL.length===SE.length?[]:SE.map(s=>s.Season));return}
  const y=+b.dataset.y;setSel(SEL.includes(y)?SEL.filter(x=>x!==y):SEL.concat(y))};
/* open the view for what was clicked: a core stat opens the standard view charting that stat; a card opens its own view, charting the button clicked */
function openView(id,k){const v=VIEWS[id];if(!v)return;OPEN=id;if(v.chart)RAILK=v.chart.includes(k)?k:v.def;render();$("sheet").scrollTop=0;if(FLAT())$("sheet").scrollIntoView({behavior:"smooth"})}
document.addEventListener("click",e=>{const ts=e.target.closest("[data-ts]");if(ts){TSPLIT=ts.dataset.ts;render();return}
  const ch=e.target.closest("[data-chart]");if(ch){RAILK=ch.dataset.chart;render();return}
  const p=e.target.closest(".pl");if(p){openView("career",p.dataset.k);return}
  const c=e.target.closest(".cl");if(c){const b=e.target.closest(".bt[data-k]");openView(c.dataset.cl,b&&b.dataset.k);return}
  if(e.target.closest("[data-close]")){OPEN=null;render();return}
  const d=e.target.closest("#rplot .dot");if(d){FUSER=true;setSel([+d.dataset.y]);return}});
addEventListener("keydown",e=>{if(e.key==="Escape"&&OPEN){OPEN=null;render()}});
addEventListener("resize",()=>{layout();rail();sheetEdge();panelEdge()});
const HP=new URLSearchParams(location.hash.slice(1));if(HP.get("ts"))TSPLIT=HP.get("ts");if(VIEWS[HP.get("open")]){const v=VIEWS[HP.get("open")];OPEN=HP.get("open");RAILK=v.chart?(v.chart.includes(HP.get("rail"))?HP.get("rail"):v.def):RAILK}
if(HP.get("sel"))FUSER=true;setSel(HP.get("sel")?HP.get("sel").split(",").map(Number):[LATEST]);
/* the cards are measured for the orbit fit, so lay out again once the web fonts have arrived and changed their widths */
if(document.fonts)document.fonts.ready.then(()=>{layout();rail();sheetEdge()});
}

/* ---------------- page boot: header, fetch, on-demand build, mount ---------------- */
const escH = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** His team's identity entry (lib/teams.mjs) by MLB team id, else by MLB or FanGraphs abbreviation. */
export function teamFor(player) {
  if (!player) return null;
  return TEAM_LIST.find((t) => player.teamId != null && t.id === player.teamId)
    || TEAMS[player.teamAbbr] || TEAM_LIST.find((t) => t.fgAbbr === player.teamAbbr) || null;
}

function showState(html) {
  const st = document.getElementById("state");
  st.innerHTML = html;
  st.hidden = false;
  document.body.classList.add("loading");
}

// The player's name from a server message such as "Aaron Judge's hitting page is not built yet." or "Building Aaron Judge's page."
const nameFrom = (msg) => (String(msg || "").match(/^(?:Building )?(.+?)'s (?:hitting |pitching )?page/) || [])[1] || null;

function mount(bundle) {
  const ctx = adaptBundle(bundle);
  ctx.team = teamFor(ctx.DATA.player);
  document.getElementById("state").hidden = true;
  document.body.classList.remove("loading");
  mountPlayer(ctx);
}

async function buildFlow(id, role, name) {
  const who = name || "this player";
  const wait = (s) => {
    const q = s && s.state === "queued" && s.position ? `<p class="q">Number ${s.position} in line.</p>` : s && s.state === "running" ? `<p class="q">Building it now.</p>` : "";
    showState(`<h2><span class="spin"></span>Building his page…</h2><p>${escH(who)}'s page has not been built yet, so The Chop is building it from the league data it already has. It takes a few seconds.</p>${q}`);
  };
  // A failed build can be started again (the server lets a failed job restart): the button reruns this flow in place.
  const failed = (msg) => {
    showState(`<h2>Page not available</h2><p>${escH(msg || `${who}'s page could not be built.`)}</p><p><button type="button" class="retry">Try again</button></p>`);
    const b = document.querySelector("#state .retry");
    if (b) b.onclick = () => buildFlow(id, role, name);
  };
  wait(null);
  let s;
  try { s = await startBuild(id, role); } catch (e) { failed(e.message); return; }
  const until = Date.now() + 5 * 60 * 1000; // builds are offline (60 s each, two at a time); past 5 minutes, stop polling and say so
  for (;;) {
    if (s.state === "failed") { failed(s.message); return; }
    if (s.state === "done") break;
    wait(s);
    if (Date.now() > until) { failed(`Building ${who}'s page took too long (over 5 minutes), so The Chop stopped waiting. Try again later.`); return; }
    await sleep(2000);
    try { s = await buildStatus(id); } catch (e) { failed(e.message); return; }
  }
  try { mount(await getPlayerPage(id, role)); }
  catch (e) { failed(e.code === "not_built" ? `${who}'s ${role === "pit" ? "pitching" : "hitting"} page could not be built.` : e.message); }
}

// Static site: the exported search list (the same ./data/search.json api.js searches) carries every player's name, so an unbuilt page can name him.
async function staticName(id) {
  try {
    const raw = await (await fetch("./data/search.json")).json();
    const list = Array.isArray(raw) ? raw : raw.players || [];
    return (list.find((p) => String(p.fgId) === String(id)) || {}).name || null;
  } catch { return null; }
}

/** Entry point for player.html: ?id=<FanGraphs id>&role=bat|pit */
export async function boot() {
  const nav = document.getElementById("nav");
  initNav(nav, { search: true });
  const logo = nav.querySelector(".tclogo"), slot = document.getElementById("logoslot");
  if (logo && slot) slot.replaceWith(logo);
  const qs = new URLSearchParams(location.search);
  const id = qs.get("id"), role = qs.get("role") === "pit" ? "pit" : "bat";
  if (!id || !/^\d+$/.test(id)) { showState(`<h2>No player chosen</h2><p>Search for a player by name above, or pick a team.</p>`); return; }
  try {
    mount(await getPlayerPage(id, role));
  } catch (e) {
    const name = nameFrom(e.message);
    if (e.code === "league_unavailable") { showState(`<h2>Page not available</h2><p>${escH(e.message)}</p><p><button type="button" class="retry">Try again</button></p>`); const b = document.querySelector("#state .retry"); if (b) b.onclick = () => location.reload(); console.error(e); return; }
    if (e.status === 404 && e.code === "not_built" && e.body?.canBuild && !isStatic) return buildFlow(id, role, name);
    if (isStatic && e.status === 404) { const nm = name || await staticName(id); showState(`<h2>Not on the public site yet</h2><p>${escH(nm || `Player ${id}`)}'s page is not on the public site yet.</p>`); return; }
    showState(`<h2>Page not available</h2><p>${escH(e.status === 404 ? e.message || `${name || `Player ${id}`}'s page is not built.` : `${name || `Player ${id}`}'s page could not be loaded: ${e.message}`)}</p>`);
    console.error(e);
  }
}
