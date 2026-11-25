// Logica orarului propriu: ce se întâmplă într-o zi (ore, zile libere, vacanțe, practică, suplinire, serviciu).
// Folosită de pagina Acasă și, mai târziu, de modulul „Orarul meu”.
import { db, iso, dinIso } from "./core.js?v=20261125b";

export const ZL7 = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
export const ziSapt = (d) => (d.getDay() + 6) % 7; // 0 = luni … 6 = duminică
export const hm = (m) => Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0");
export const stOra = (ora) => 480 + (ora - 1) * 60; // ora 1 începe la 8:00; 50 de minute + pauză de 10
export const intervalOra = (ora) => hm(stOra(ora)) + "–" + hm(stOra(ora) + 50);
export const stPauza = (k) => stOra(k) + 50; // pauza k este între ora k și ora k+1
const TIP_LIBER = { legala: "Zi liberă legală", men: "Zi liberă stabilită de minister" };
export const ordClasa = (x, y) => { const f = (c) => { const m = /^(\d+)(.*)$/.exec(c); return m ? [Number(m[1]), m[2]] : [99, c]; }; const p = f(x), q = f(y); return p[0] - q[0] || p[1].localeCompare(q[1], "ro", { numeric: true }); };
export const anulScolarZilei = () => { const d = new Date(); const y = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1; return y + "–" + (y + 1); };

export async function incarcaDateOrar() {
  const [r1, r2, r3, r4] = await Promise.all([db.rpc("orar_propriu_disc"), db.rpc("serviciu_al_meu"), db.rpc("orar_calendar"), db.rpc("nume_angajat_propriu")]);
  if (r1.error || !r1.data || !r1.data.length) return null;
  const data = r1.data;
  let sv = r2 && !r2.error && r2.data ? r2.data : [];
  const idAn = (sv.find((x) => x.denumire === anulScolarZilei()) || sv[0] || {}).an_id; sv = sv.filter((x) => x.an_id === idAn);
  const cal = r3 && !r3.error && r3.data && r3.data.structura ? r3.data : { structura: [], libere: [], practica: [] };
  const ani = []; data.forEach((r) => { if (!ani.find((x) => x.id === r.an_id)) ani.push({ id: r.an_id, den: r.denumire }); });
  return { data, sv, cal, ani, numeProf: r4 && r4.data };
}
export async function incarcaPlanZi(f) {
  const { data, error } = await db.rpc("plan_propriu", { p_de: f, p_pana: f });
  return error || !Array.isArray(data) ? [] : data.filter((x) => x.data === f);
}

const anPentru = (f, cal, ani) => {
  const interv = new Map(); cal.structura.forEach((x) => { const v = interv.get(x.an_id) || [x.de_la, x.pana_la]; interv.set(x.an_id, [x.de_la < v[0] ? x.de_la : v[0], x.pana_la > v[1] ? x.pana_la : v[1]]); });
  const g = ani.find((x) => interv.has(x.id) && interv.get(x.id)[0] <= f && f <= interv.get(x.id)[1]);
  return g ? g.id : ani[0].id;
};
export function infoZi(d, cal, claseMele) {
  const f = iso(d), w = ziSapt(d);
  const lib = cal.libere.find((x) => x.data === f);
  const per = cal.structura.filter((x) => x.de_la <= f && f <= x.pana_la);
  const vac = per.find((x) => /vacanta/.test(x.tip));
  const alt = per.find((x) => x.tip === "scoala_altfel" || x.tip === "saptamana_verde");
  const cur = per.find((x) => x.tip === "cursuri");
  const prim = cal.structura.length ? cal.structura.reduce((m, x) => (x.de_la < m ? x.de_la : m), "9999") : "0000";
  const practica = [...new Map(cal.practica.filter((x) => x.de_la <= f && f <= x.pana_la && (claseMele.has(x.clasa) || x.al_meu)).map((x) => [x.clasa, x])).values()].sort((x, y) => ordClasa(x.clasa, y.clasa));
  const i = { f, w, modul: cur ? cur.denumire : "", practica, suspendat: false, tip: "cursuri", titlu: "", sub: "" };
  if (lib) Object.assign(i, { suspendat: true, tip: "liber", titlu: lib.motiv || "Zi liberă", sub: TIP_LIBER[lib.tip] || "Zi liberă" });
  else if (w > 4) Object.assign(i, { suspendat: true, tip: "weekend", titlu: ZL7[w], sub: "Weekend" });
  else if (vac) Object.assign(i, { suspendat: true, tip: "vacanta", titlu: vac.denumire, sub: "Nu se țin ore" });
  else if (alt) Object.assign(i, { suspendat: true, tip: "program", titlu: alt.denumire, sub: "Program special – orele nu se țin după orar" });
  else if (!per.length) Object.assign(i, { suspendat: true, tip: "afara", titlu: f < prim ? "Înainte de începutul anului școlar" : "În afara anului școlar", sub: "Nu se țin ore" });
  return i;
};
const locSv = (x) => [x.sediu && x.sediu !== "Centru" ? x.sediu : "", x.corp && x.corp !== "Corp unic" && x.corp !== x.zona ? x.corp : "", x.zona].filter(Boolean).filter((v, i, a) => v !== a[i - 1]).join(" · ");
const svPauze = (rows) => { const g = new Map(); rows.filter((x) => x.pauza).forEach((x) => { const o = g.get(x.pauza) || g.set(x.pauza, { pauza: x.pauza, locuri: [], note: [] }).get(x.pauza); const l = locSv(x); if (l && !o.locuri.includes(l)) o.locuri.push(l); if (x.nota) o.note.push(x.nota); }); return [...g.values()].sort((a, b) => a.pauza - b.pauza); };
const svSchimburi = (rows) => rows.filter((x) => !x.pauza && x.schimb).map((x) => ({ loc: locSv(x), text: (x.schimb === "dimineata" ? "dimineața" : x.schimb === "dupa_amiaza" ? "după-amiaza" : x.schimb) + (x.ore_interval ? " · " + x.ore_interval : ""), nota: x.nota }));
export const textPlan = (p) => p.mod === "inlocuitor" ? "Ora ta este preluată de " + p.inlocuitor : p.mod === "neacoperita" ? "Ora ta nu are încă suplinitor" : p.mod === "pleaca" ? "Clasa pleacă acasă" + (p.de_la_ora ? " de la ora " + p.de_la_ora : "") : "Clasa vine" + (p.de_la_ora ? " de la ora " + p.de_la_ora : " mai târziu");
export const detOra = (r) => (r.eticheta || r.clasa) + (r.text || r.complet ? " · " + (r.text || r.complet) : "");

// Rezumatul unei zile pentru pagina Acasă
export function rezumatZi(date, dataZi, plan, acum) {
  const { data, cal, ani, sv } = date;
  const w = ziSapt(dataZi), f = iso(dataZi), mN = acum.getHours() * 60 + acum.getMinutes();
  const id = anPentru(f, cal, ani);
  const ore = data.filter((r) => r.an_id === id);
  const claseMele = new Set(ore.map((r) => r.clasa));
  const info = infoZi(dataZi, cal, claseMele);
  const prac = new Set(info.practica.map((x) => x.clasa));
  let lista = [];
  if (!info.suspendat && w <= 4) {
    const baza = ore.filter((r) => r.zi === w + 1).map((r) => { const p = plan.find((x) => x.eu_absent && x.ora === r.ora && x.clasa === r.clasa); return p ? { ...r, plan: p } : r; });
    const sup = plan.filter((x) => x.eu_inlocuitor && x.mod === "inlocuitor").map((x) => ({ an_id: id, zi: w + 1, ora: x.ora, clasa: x.clasa, text: "Suplinire · în locul lui " + x.absent, sup: true }));
    lista = [...baza, ...sup].sort((x, y) => x.ora - y.ora || String(x.clasa).localeCompare(String(y.clasa), "ro"));
  }
  const active = lista.filter((r) => !prac.has(r.clasa) && !r.plan);
  const svR = info.suspendat ? [] : (sv || []).filter((x) => x.zi === w + 1);
  const cur = active.find((r) => mN >= stOra(r.ora) && mN < stOra(r.ora) + 50);
  const urm = cur ? null : active.find((r) => stOra(r.ora) > mN);
  return { info, lista, active, prac, cur, urm, mN, svP: svPauze(svR), svS: svSchimburi(svR) };
}
