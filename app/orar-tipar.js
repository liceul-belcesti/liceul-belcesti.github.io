// Grila orarului, blocul „Serviciu pe școală”, legenda și tipărirea (A4 pe lățime, alb-negru).
// Folosit de „Orarul meu” și, mai târziu, de ecranul de orar al administratorului.
import { h } from "./core.js?v=20261125c";
import { hm, intervalOra, locSv, ordClasa } from "./orar-logic.js?v=20261125c";

const ZILE5 = ["Luni", "Marți", "Miercuri", "Joi", "Vineri"];
const nuanta = (c) => { let n = 0; for (const ch of String(c)) n = (n * 31 + ch.charCodeAt(0)) % 360; return n; };
const nivelClasa = (c) => (/CP/.test(c) ? 0 : parseInt((/\d+/.exec(c) || ["99"])[0], 10));

// Câte ore se afișează: profesorii au cel mult 7 ore pe zi; învățătorii lucrează dimineața (8–12) sau după-amiaza (12–16 / 12–17)
export function limiteOrar(ore) {
  if (!ore.length) return { de: 1, max: 7 };
  const mx = Math.max(...ore.map((r) => r.ora)), mn = Math.min(...ore.map((r) => r.ora));
  if (ore.every((r) => nivelClasa(r.clasa) <= 4)) return mn >= 5 ? { de: 5, max: Math.max(8, mx) } : { de: 1, max: Math.max(4, mx) };
  return { de: 1, max: Math.max(7, mx) };
}

// celula(zi 1-5, ora) întoarce o listă: text sau [prescurtare, clasă]
export function grilaOrar(celula, max, viu, de) {
  de = de || 1;
  const acum = new Date(), ziAz = (acum.getDay() + 6) % 7, minAz = acum.getHours() * 60 + acum.getMinutes();
  const cap = [h("th")];
  for (let o = de; o <= max; o++) cap.push(h("th", null, String(o), h("small", { text: intervalOra(o) })));
  const randuri = ZILE5.map((zn, i) => {
    const celule = [h("th", { class: viu && i === ziAz ? "azi" : "", text: zn })];
    for (let o = de; o <= max; o++) {
      const v = celula(i + 1, o), st0 = 480 + (o - 1) * 60;
      const td = h("td", { class: (v.length ? "plin" : "") + (viu && v.length && i === ziAz && minAz >= st0 && minAz < st0 + 50 ? " acum" : "") });
      if (v.length) td.style.setProperty("--h", nuanta(Array.isArray(v[0]) ? v[0][1] : v[0]));
      v.forEach((x, k) => { if (k) td.append(h("br")); if (Array.isArray(x)) td.append(h("span", { class: "ab", text: x[0] }), h("br"), x[1]); else td.append(x); });
      celule.push(td);
    }
    return h("tr", null, celule);
  });
  return h("table", { class: "orar-g" }, h("thead", null, h("tr", null, cap)), h("tbody", null, randuri));
}

// Serviciul pe școală, sub orar (și la tipărire): pauzele pe zile, plus schimburile întregi (învățători).
export function blocServiciu(sv) {
  const pz = (sv || []).filter((x) => x.pauza && x.zi >= 1 && x.zi <= 5), sc = (sv || []).filter((x) => !x.pauza && x.schimb && x.zi >= 1 && x.zi <= 5);
  if (!pz.length && !sc.length) return null;
  const d = h("div", { class: "orar-sv" }, h("p", { class: "orar-sv-t", text: "Serviciu pe școală" }));
  if (pz.length) {
    const mn = Math.min(...pz.map((x) => x.pauza)), mx = Math.max(...pz.map((x) => x.pauza));
    const cap = [h("th", { text: "Pauza" })];
    for (let k = mn; k <= mx; k++) cap.push(h("th", null, k + "–" + (k + 1), h("small", { text: hm(480 + (k - 1) * 60 + 50) + "–" + hm(480 + k * 60) })));
    const randuri = ZILE5.map((zn, i) => {
      const celule = [h("th", { text: zn })];
      for (let k = mn; k <= mx; k++) { const l = [...new Set(pz.filter((x) => x.zi === i + 1 && x.pauza === k).map(locSv).filter(Boolean))]; celule.push(h("td", { class: l.length ? "plin" : "", text: l.join("; ") })); }
      return h("tr", null, celule);
    });
    d.append(h("table", { class: "orar-g orar-g-sv" }, h("thead", null, h("tr", null, cap)), h("tbody", null, randuri)));
  }
  sc.sort((a, b) => a.zi - b.zi).forEach((x) => d.append(h("p", { class: "orar-sv-sch", text: ZILE5[x.zi - 1] + ": " + (x.schimb === "dimineata" ? "dimineața" : x.schimb === "dupa_amiaza" ? "după-amiaza" : x.schimb) + (x.ore_interval ? " (" + x.ore_interval + ")" : "") + (locSv(x) ? " · " + locSv(x) : "") + (x.nota ? " · " + x.nota : "") })));
  return d;
}

// Legenda de sub orar: prescurtare – denumire completă (doar materiile din pagina respectivă)
export function legendaOrar(items) {
  const m = new Map(); (items || []).forEach((x) => { if (x && x[0]) m.set(x[0], x[1]); });
  if (!m.size) return null;
  return h("div", { class: "orar-leg" }, [...m].sort((a, b) => a[1].localeCompare(b[1], "ro")).map(([sc, c]) => h("p", null, h("b", { text: sc }), " – " + c)));
}

const STIL_TIPAR = `
#tipar-orar { display:none; }
@media print {
  body.tipar-orar > :not(#tipar-orar) { display:none !important; }
  body.tipar-orar { background:#fff !important; }
  body.tipar-orar #tipar-orar { display:block; color:#000; font-family:Arial, Helvetica, sans-serif; }
  #tipar-orar .pag-orar { break-after:page; page-break-after:always; height:176mm; max-height:176mm; overflow:hidden; box-sizing:border-box; }
  #tipar-orar .pag-orar:last-child { break-after:auto; page-break-after:auto; }
  #tipar-orar .po-cap { display:flex; align-items:center; gap:8mm; padding-bottom:2mm; border-bottom:1.2mm solid #1c7fc4; }
  #tipar-orar .po-logo { height:19mm; width:auto; display:block; }
  #tipar-orar .po-scoala { font-family:Georgia, "Times New Roman", serif; font-weight:700; color:#12275a; line-height:1.15; margin:0; }
  #tipar-orar .po-scoala .l1 { display:block; font-size:11pt; letter-spacing:.14em; }
  #tipar-orar .po-scoala .l2 { display:block; font-size:18pt; font-weight:800; letter-spacing:.01em; }
  #tipar-orar .po-scoala .l3 { display:block; font-size:10.5pt; letter-spacing:.5em; margin-top:.5mm; }
  #tipar-orar .po-titlu { text-align:center; font-weight:800; font-size:15pt; color:#1c7fc4; letter-spacing:.03em; text-transform:uppercase; margin:4mm 0 0; }
  #tipar-orar .po-nume { text-align:center; font-weight:800; font-size:19pt; color:#12275a; margin:0 0 1mm; text-transform:uppercase; }
  #tipar-orar .po-sub { text-align:center; font-size:10.5pt; color:#555; margin:0 0 3mm; }
  #tipar-orar table { width:100%; border-collapse:collapse; table-layout:fixed; }
  #tipar-orar th, #tipar-orar td { border:.7pt solid #8aa9c4; padding:1mm 1mm; text-align:center; vertical-align:middle; font-size:11pt; color:#111; background:#fff; }
  #tipar-orar thead th { background:#1c7fc4 !important; color:#fff !important; font-weight:800; border-color:#1c7fc4; }
  #tipar-orar thead th small { display:block; font-weight:400; font-size:8pt; color:#e3f0fa !important; }
  #tipar-orar tbody th { width:26mm; font-weight:800; text-align:left; padding-left:3mm; background:#e6f1fa !important; color:#12275a !important; }
  #tipar-orar .ab { font-weight:800; font-size:10.5pt; color:#12275a; }
  #tipar-orar .orar-sv { margin:2mm 0 0; }
  #tipar-orar .orar-sv-t { margin:0 0 1mm; font-weight:800; font-size:10pt; color:#12275a; text-transform:uppercase; letter-spacing:.03em; }
  #tipar-orar .orar-g-sv th, #tipar-orar .orar-g-sv td { font-size:8.5pt; padding:.5mm .8mm; line-height:1.15; }
  #tipar-orar .orar-g-sv thead th small { font-size:7pt; }
  #tipar-orar .orar-g-sv tbody td { height:5mm; }
  #tipar-orar .orar-g-sv tbody th { padding-left:2mm; }
  #tipar-orar .cu-sv > table:not(.orar-g-sv) tbody td { height:9mm; }
  #tipar-orar .orar-g-sv td.plin { font-weight:700; }
  #tipar-orar .doar-sv .orar-sv { margin:4mm 0 0; }
  #tipar-orar .doar-sv .orar-g-sv th, #tipar-orar .doar-sv .orar-g-sv td { font-size:11pt; padding:1mm; line-height:1.2; }
  #tipar-orar .doar-sv .orar-g-sv thead th small { font-size:8pt; }
  #tipar-orar .doar-sv .orar-g-sv tbody td { height:16mm; }
  #tipar-orar .doar-sv .orar-sv-sch { font-size:11pt; margin:3mm 0 0; }
  #tipar-orar .orar-sv-sch { margin:1mm 0 0; font-size:9pt; color:#111; }
  #tipar-orar .orar-leg { columns:3; column-gap:6mm; margin:4mm 0 0; font-size:8.5pt; color:#111; line-height:1.2; border-top:.5pt solid #8aa9c4; padding-top:1.5mm; }
  #tipar-orar .orar-leg p { margin:0 0 .8mm; break-inside:avoid; }
  #tipar-orar .orar-leg b { color:#12275a; }
  #tipar-orar tbody td { height:14mm; font-weight:700; background:#fff !important; line-height:1.15; }
}`;

// pagini: [{ titlu, sub, celula, max, de, sv, leg, mod }]; fiecare pagină = un profesor sau o clasă.
// mod: „fara” = fără serviciu; „sv” = numai serviciul; altfel orarul cu serviciul (dacă există).
export function tiparesteOrar(pagini, an) {
  const vechi = document.getElementById("tipar-orar"); if (vechi) vechi.remove();
  const stil = h("style", { id: "tipar-orar-stil", text: STIL_TIPAR + "\n@media print { @page { size:A4 landscape; margin:15mm; } }" });
  document.getElementById("tipar-orar-stil")?.remove(); document.head.append(stil);
  const cont = h("div", { id: "tipar-orar" });
  pagini.forEach((p) => {
    const doarSv = p.mod === "sv";
    const pg = h("section", { class: "pag-orar" },
      h("div", { class: "po-cap" }, h("img", { class: "po-logo", src: "logo-sigla.png", alt: "" }),
        h("p", { class: "po-scoala" }, h("span", { class: "l1", text: "LICEUL TEHNOLOGIC" }), h("span", { class: "l2", text: "VICTOR MIHĂILESCU CRAIU" }), h("span", { class: "l3", text: "BELCEȘTI" }))),
      h("p", { class: "po-titlu", text: doarSv ? "Serviciul pe școală" : p.titlu }),
      p.sub ? h("p", { class: "po-nume", text: p.sub }) : null,
      h("p", { class: "po-sub", text: an ? "Anul școlar " + an : "" }));
    if (!doarSv) pg.append(grilaOrar(p.celula, p.max, false, p.de));
    const bsv = p.mod === "fara" ? null : blocServiciu(p.sv);
    if (bsv) { pg.classList.add(doarSv ? "doar-sv" : "cu-sv"); if (doarSv) bsv.querySelector(".orar-sv-t").remove(); pg.append(bsv); }
    else if (doarSv) pg.append(h("p", { class: "po-sub", text: "Fără serviciu pe școală în acest an școlar." }));
    const lg = doarSv ? null : legendaOrar(p.leg); if (lg) pg.append(lg);
    cont.append(pg);
  });
  document.body.append(cont); document.body.classList.add("tipar-orar");
  const curata = () => { document.body.classList.remove("tipar-orar"); document.getElementById("tipar-orar")?.remove(); document.getElementById("tipar-orar-stil")?.remove(); window.removeEventListener("afterprint", curata); };
  window.addEventListener("afterprint", curata);
  window.print();
  setTimeout(curata, 1500);
}

// Butonul „Tipărește orarul”: orarul fără serviciu, orarul cu serviciu sau numai serviciul (variantele care nu au ce arăta lipsesc)
export function barTiparOrar(areOre, areSv, tipareste) {
  const opt = [];
  if (areOre) opt.push(["fara", "Orarul fără serviciul pe școală"]);
  if (areOre && areSv) opt.push(["cu", "Orarul cu serviciul pe școală"]);
  if (areSv) opt.push(["sv", "Numai serviciul pe școală"]);
  if (!opt.length) return null;
  const b = h("button", { class: "btn neutru", type: "button", "aria-haspopup": opt.length > 1 ? "menu" : null, "aria-expanded": opt.length > 1 ? "false" : null, text: "Tipărește orarul" });
  if (opt.length === 1) { b.addEventListener("click", () => tipareste(opt[0][0])); return h("div", { class: "tipar-bara" }, b); }
  const meniu = h("div", { class: "tipar-meniu", role: "menu", hidden: true }, opt.map(([m, et]) => h("button", { type: "button", role: "menuitem", text: et, onclick: () => { meniu.hidden = true; b.setAttribute("aria-expanded", "false"); tipareste(m); } })));
  b.addEventListener("click", (ev) => { ev.stopPropagation(); meniu.hidden = !meniu.hidden; b.setAttribute("aria-expanded", String(!meniu.hidden)); });
  document.addEventListener("click", () => { meniu.hidden = true; b.setAttribute("aria-expanded", "false"); });
  return h("div", { class: "tipar-bara" }, b, meniu);
}

// Pagina de tipărit a profesorului, plecând de la orele lui (rânduri { zi, ora, clasa, scurt, complet })
export function paginaProfesor(ore, sv, numeProf, mod) {
  const { de, max } = limiteOrar(ore);
  return { titlu: "Orarul profesorului", sub: numeProf || "", sv: sv || [], mod, max, de, leg: ore.filter((r) => r.scurt).map((r) => [r.scurt, r.complet]),
    celula: (z, o) => ore.filter((r) => r.zi === z && r.ora === o).map((r) => (r.scurt ? [r.scurt, r.clasa] : r.clasa)) };
}
export { ordClasa };
