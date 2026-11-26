// Orarul meu: ziua (cu ora curentă și linia timpului) și săptămâna, serviciul pe școală, practica, suplinirile, tipărirea.
import { db, h, umple, iso, dinIso, fmtData, LUNI } from "../core.js?v=20261125c";
import { capPagina, svgIcon, mesaj, arataMesaj } from "../ui.js?v=20261125c";
import { ZL7, ziSapt, hm, stOra, intervalOra, stPauza, intervalPauza, textPlan, detOra, textSv, rezumatZi, adauga, luSapt, oraS, durata, ordClasa, anulScolarZilei, locSv } from "../orar-logic.js?v=20261125c";
import { barTiparOrar, tiparesteOrar, paginaProfesor } from "../orar-tipar.js?v=20261125c";

const ZL = ZL7.slice(0, 5);
const el = (cls, ...copii) => h("div", { class: cls }, ...copii);
const sp = (cls, text) => h("span", { class: cls, text });
const textData = (d) => ZL7[ziSapt(d)] + ", " + fmtData(iso(d));
const aziD = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };

async function incarca() {
  const [r1, r2, r3, r4] = await Promise.all([db.rpc("orar_propriu_disc"), db.rpc("serviciu_al_meu"), db.rpc("orar_calendar"), db.rpc("nume_angajat_propriu")]);
  if (r1.error) return { eroare: true };
  const data = r1.data || [];
  let sv = r2 && !r2.error && r2.data ? r2.data : [];
  const idAn = (sv.find((x) => x.denumire === anulScolarZilei()) || sv[0] || {}).an_id; sv = sv.filter((x) => x.an_id === idAn);
  const cal = r3 && !r3.error && r3.data && r3.data.structura ? r3.data : { structura: [], libere: [], practica: [] };
  const ani = []; data.forEach((r) => { if (!ani.find((x) => x.id === r.an_id)) ani.push({ id: r.an_id, den: r.denumire }); });
  return { data, sv, cal, ani, numeProf: r4 && r4.data };
}

// Serviciul pe școală, în cuvinte, pe zile. Pauza 1 este dintre ora 1 și ora 2.
function cardServiciu(rows, titlu) {
  if (!rows || !rows.length) return null;
  const azi = (new Date().getDay() + 6) % 7 + 1;
  const card = h("section", { class: "card om-sv-card" }, h("div", { class: "cap" }, h("h2", { text: titlu })));
  for (let zi = 1; zi <= 5; zi++) {
    const dz = rows.filter((r) => r.zi === zi); if (!dz.length) continue;
    const grupe = new Map();
    dz.forEach((r) => { const k = locSv(r); const g = grupe.get(k) || grupe.set(k, { pauze: [], schimburi: [], note: [], intervale: new Map() }).get(k); if (r.pauza) g.pauze.push(r.pauza); if (r.schimb) { g.schimburi.push(r.schimb); if (r.ore_interval) g.intervale.set(r.schimb, r.ore_interval); } if (r.nota) g.note.push(r.nota); });
    const bucati = [...grupe.entries()].map(([k, g]) => {
      const p = [...new Set(g.pauze)].sort((a, b) => a - b).map((n) => n + "–" + (n + 1));
      const parti = [];
      if (p.length) parti.push((p.length === 1 ? "pauza " : "pauzele ") + p.join(", "));
      g.schimburi.forEach((sc) => { const iv = g.intervale.get(sc) || ""; parti.push((sc === "dimineata" ? "toată dimineața" : sc === "dupa_amiaza" ? "după-amiaza" : sc) + (iv ? " (" + iv + ")" : "")); });
      return (k ? k + ": " : "") + parti.join(", ") + (g.note.length ? " (" + g.note.join("; ") + ")" : "");
    });
    card.append(h("div", { class: "om-sv-rand" + (zi === azi ? " azi" : "") }, sp("zi", ZL[zi - 1] + (zi === azi ? " · azi" : "")), sp("tx", bucati.join(" · "))));
  }
  return card;
}

export async function randeaza(zona) {
  const msg = mesaj("", "");
  const corp = h("div");
  const actiuni = h("div", { class: "om-tipar" });
  umple(zona, capPagina("Orarul meu", "", [actiuni]), msg, corp);
  let vii = true, date = null, ultima = 0;
  const S = { mod: "zile", sel: aziD() };
  const planC = new Map(), planT = new Map();
  let cartePrincipal = null, undeDeseneaza = null;

  const scrieSub = () => { const sub = zona.querySelector(".cap-pagina .sub"); if (!date) return; const t = [date.numeProf, (date.ani[0] || {}).den].filter(Boolean).join(" · "); if (sub) sub.textContent = t; else if (t) zona.querySelector(".cap-pagina h1").after(h("p", { class: "sub", text: t })); };

  function incarcaPlan(lu) {
    const k = iso(lu), t = planT.get(k); if (t && Date.now() - t < 90000) return;
    planT.set(k, Date.now());
    const zileS = Array.from({ length: 5 }, (_, i) => iso(adauga(lu, i)));
    db.rpc("plan_propriu", { p_de: k, p_pana: zileS[4] }).then(({ data: rez, error }) => {
      if (error || !Array.isArray(rez) || !vii) return;
      const inainte = JSON.stringify(zileS.map((f) => planC.get(f) || []));
      zileS.forEach((f) => planC.set(f, rez.filter((x) => x.data === f)));
      if (JSON.stringify(zileS.map((f) => planC.get(f) || [])) !== inainte && undeDeseneaza) undeDeseneaza();
    }).catch(() => {});
  }
  const rez = (d) => {
    const acum = new Date(), eAzi = iso(d) === iso(aziD());
    const r = rezumatZi(date, d, planC.get(iso(d)) || [], acum);
    if (!eAzi) { r.cur = null; r.urm = null; }
    return { ...r, eAzi };
  };

  const aviz = (info, faraZi) => {
    const lista = [];
    if (!faraZi && info.suspendat && info.tip !== "weekend") lista.push(h("div", { class: "om-aviz t-" + info.tip }, h("b", { text: info.titlu }), sp("", info.sub)));
    if (info.practica.length) lista.push(h("div", { class: "om-aviz t-practica" }, h("b", { text: "Practică" }), sp("", (info.practica.length === 1 ? "Clasa " : "Clasele ") + info.practica.map((x) => x.clasa).join(", ") + " " + (info.practica.length === 1 ? "este" : "sunt") + " la practică" + (info.practica.some((x) => x.al_meu) ? " · ești coordonator" : ""))));
    return lista.length ? el("om-avize", lista) : null;
  };
  const clasaDisc = (r) => [sp("om-clasa", r.eticheta || r.clasa), (r.text || r.complet) ? sp("om-disc", r.text || r.complet) : null];

  // ---------------- Ziua
  function ziua(contin) {
    const r = rez(S.sel), { info, lista, active, prac, cur, urm, mN, svR, svP, svS, eAzi, ore } = r;
    const claseMele = new Set(ore.map((x) => x.clasa));
    const hero = h("section", { class: "erou om-hero" + (info.suspendat ? " sus t-" + info.tip : ""), "aria-label": "Rezumatul zilei" });
    const top = h("div", { class: "cap" }, sp("et", cur ? "ACUM" : urm ? "URMEAZĂ" : info.suspendat ? info.sub.toUpperCase() : "ORARUL ZILEI"), sp("dr", textData(S.sel) + (info.modul ? " · " + info.modul : "")));
    hero.append(top);
    if (cur || urm) {
      const x = cur || urm;
      hero.append(h("div", { class: "mare text", text: x.eticheta || x.clasa }), (x.text || x.complet) ? h("div", { class: "sub", text: x.text || x.complet }) : null,
        h("div", { class: "om-meta-h", text: intervalOra(x.ora) + " · ora " + x.ora }));
      if (cur) hero.append(h("div", { class: "om-bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 50, "aria-valuenow": mN - stOra(cur.ora) }, h("i", { style: "width:" + Math.round(((mN - stOra(cur.ora)) / 50) * 100) + "%" })), h("div", { class: "om-mic", text: "Mai sunt " + (stOra(cur.ora) + 50 - mN) + " min din oră" }));
      else hero.append(h("div", { class: "om-mic", text: "Începe peste " + durata(stOra(urm.ora) - mN) }));
    } else if (info.suspendat) hero.append(h("div", { class: "mare text", text: info.titlu }));
    else if (!lista.length) hero.append(h("div", { class: "mare text", text: "Nicio oră în această zi" }));
    else if (eAzi && active.length) hero.append(h("div", { class: "mare text", text: "Orele de azi s-au încheiat" }));
    else hero.append(h("div", { class: "mare text", text: active.length ? oraS(active.length) : "Nicio oră de predat" }), active.length ? h("div", { class: "sub", text: "de la " + intervalOra(active[0].ora).split("–")[0] + " până la " + intervalOra(active[active.length - 1].ora).split("–")[1] }) : null);
    if (svR.length) hero.append(h("div", { class: "sv" }, svgIcon("pin", 18), h("span", { text: "Serviciu pe școală · " + [...svS.map((x) => x.text), ...(svP.length ? [(svP.length === 1 ? "pauza " : "pauzele ") + svP.map((g) => g.pauza + "–" + (g.pauza + 1)).join(", ")] : [])].join(" · ") })));
    if (active.length) hero.append(h("div", { class: "om-chips" }, sp("", oraS(active.length) + (eAzi ? " azi" : "")), sp("", "de la " + intervalOra(active[0].ora).split("–")[0]), sp("", "până la " + intervalOra(active[active.length - 1].ora).split("–")[1])));
    contin.push(hero);
    const av = aviz(info, true); if (av) contin.push(av);

    // zilele săptămânii (pastile)
    const lu = luSapt(S.sel), azi = aziD();
    contin.push(h("div", { class: "om-zile", role: "group", "aria-label": "Zilele săptămânii" }, [0, 1, 2, 3, 4].map((k) => {
      const d = adauga(lu, k), rz = rez(d), inf = rz.info, n = inf.suspendat ? 0 : rz.lista.length;
      const pct = h("span", { class: "om-pct" });
      if (inf.suspendat) pct.append(h("i", { class: "x" })); else for (let q = 0; q < n; q++) pct.append(h("i"));
      return h("button", { class: "om-zi" + (iso(d) === iso(azi) ? " azi" : "") + (inf.suspendat ? " sus" : ""), type: "button", "aria-pressed": String(iso(d) === iso(S.sel)),
        "aria-label": ZL[k] + " " + d.getDate() + ", " + (inf.suspendat ? inf.titlu : oraS(n)), onclick: () => { S.sel = d; deseneaza(); } }, h("b", { text: ZL[k] }), sp("nr", String(d.getDate())), pct);
    })));

    // linia timpului
    const tl = el("om-tl");
    svS.forEach((x) => tl.append(h("div", { class: "om-ora serv schimb" }, el("om-t"), el("om-card", sp("om-disc", "Serviciu pe școală · " + x.text), [x.loc, x.nota].filter(Boolean).length ? sp("om-meta", [x.loc, x.nota].filter(Boolean).join(" · ")) : null))));
    let ps = 0;
    const pAcum = (g) => eAzi && mN >= stPauza(g.pauza) && mN < stPauza(g.pauza) + 10, pTrecuta = (g) => eAzi && mN >= stPauza(g.pauza) + 10;
    const verso = (limita) => { while (ps < svP.length && svP[ps].pauza < limita) { const g = svP[ps++], a = pAcum(g); const iv = intervalPauza(g.pauza).split("–");
      tl.append(h("div", { class: "om-ora serv" + (a ? " acum" : "") + (pTrecuta(g) ? " trecut" : "") }, el("om-t", h("b", { text: iv[0] }), sp("", iv[1])),
        el("om-card", el("rd", svgIcon("pin", 18), sp("om-disc", textSv(g))), el("om-meta", sp("", "pauza " + g.pauza + "–" + (g.pauza + 1)), a ? sp("om-tag", "acum") : null)))); } };
    if (!lista.length && !svR.length && info.tip !== "weekend") tl.append(el("om-gol", info.suspendat ? "Nu sunt ore în această zi." : "Nicio oră în ziua de " + ZL7[info.w].toLowerCase() + "."));
    lista.forEach((x, k) => {
      verso(x.ora);
      if (k && x.ora - lista[k - 1].ora > 1) { const g = x.ora - lista[k - 1].ora - 1; tl.append(el("om-fereastra", h("b", { text: "Fereastră" }), sp("", oraS(g) + " · " + intervalOra(lista[k - 1].ora + 1).split("–")[0] + "–" + intervalOra(x.ora - 1).split("–")[1]))); }
      const lp = prac.has(x.clasa) || !!x.plan, eCur = x === cur, eUrm = x === urm, eTrecut = eAzi && !lp && !eCur && stOra(x.ora) + 50 <= mN;
      const iv = intervalOra(x.ora).split("–");
      tl.append(h("div", { class: "om-ora" + (eCur ? " acum" : "") + (eUrm ? " urm" : "") + (eTrecut ? " trecut" : "") + (lp ? " lapr" : "") }, el("om-t", h("b", { text: iv[0] }), sp("", iv[1])),
        el("om-card", el("rd", clasaDisc(x)), el("om-meta", sp("", "ora " + x.ora), lp ? sp("om-nota", x.plan ? textPlan(x.plan) : "clasa este la practică") : eCur ? sp("om-tag", "acum") : eUrm ? sp("om-tag", "urmează") : null, x.sup ? sp("om-nota", "suplinire") : null))));
    });
    verso(99);
    contin.push(tl);
    return { ore, claseMele };
  }

  // ---------------- Săptămâna
  function saptamana(contin) {
    const lu = luSapt(S.sel), vi = adauga(lu, 4), azi = aziD();
    const zile = [0, 1, 2, 3, 4].map((k) => { const d = adauga(lu, k); return { d, k, r: rez(d) }; });
    const tot = zile.reduce((s, z) => s + (z.r.info.suspendat ? 0 : z.r.active.length), 0);
    contin.push(el("om-sapt-cap", h("b", { text: fmtData(iso(lu)) + " – " + fmtData(iso(vi)) }), sp("", oraS(tot) + " de predat în această săptămână")));
    zile.forEach(({ d, k, r }) => {
      const { info, lista, prac, svR, svP, svS } = r, esteAzi = iso(d) === iso(azi);
      const infoR = { ...info, practica: info.practica.filter((p) => lista.some((x) => x.clasa === p.clasa) || p.al_meu) };
      const card = h("section", { class: "om-zc" + (esteAzi ? " azi" : "") + (info.suspendat ? " sus" : "") },
        el("om-zc-cap", el("om-zc-t", h("b", { text: ZL[k] }), sp("", fmtData(iso(d)))), el("om-zc-r", esteAzi ? sp("om-tag", "azi") : null, sp("om-zc-n", info.suspendat ? info.titlu : (lista.length ? oraS(lista.length) : (svR.length ? "fără ore" : "liber"))))));
      const av = aviz(infoR, false); if (av) card.append(av);
      svS.forEach((x) => card.append(el("om-sr sv", sp("t", ""), sp("om-disc", "Serviciu pe școală · " + [x.loc, x.text].filter(Boolean).join(" · ")))));
      [...lista.map((x) => ({ t: stOra(x.ora), x })), ...svP.map((g) => ({ t: stPauza(g.pauza) - 1, g }))].sort((a, b) => a.t - b.t).forEach(({ x, g }) => {
        if (g) { card.append(el("om-sr sv", sp("t", intervalPauza(g.pauza).split("–")[0]), sp("om-disc", textSv(g) + " · pauza " + g.pauza + "–" + (g.pauza + 1)))); return; }
        const lp = prac.has(x.clasa) || !!x.plan;
        card.append(el("om-sr" + (lp ? " lapr" : ""), sp("t", intervalOra(x.ora).split("–")[0]), sp("om-clasa mic", x.eticheta || x.clasa), sp("om-disc", lp ? (x.plan ? textPlan(x.plan) : "este la practică") : (x.text || x.complet || "Ora " + x.ora))));
      });
      card.append(h("button", { class: "btn text om-vezi", type: "button", text: "Deschide ziua ›", onclick: () => { S.sel = d; S.mod = "zile"; deseneaza(); window.scrollTo({ top: 0, behavior: "smooth" }); } }));
      contin.push(card);
    });
    return { ore: zile[0].r.ore, claseMele: null };
  }

  // ---------------- Desenarea paginii
  function deseneaza() {
    if (!date || !vii) return;
    incarcaPlan(luSapt(S.sel));
    const fSel = iso(S.sel), eAzi = fSel === iso(aziD()), luS = luSapt(S.sel);
    const bAzi = h("button", { class: "btn neutru mic", type: "button", text: "Azi", disabled: eAzi && S.mod === "zile", onclick: () => { S.sel = aziD(); deseneaza(); } });
    const pas = S.mod === "zile" ? 1 : 7;
    const inp = h("input", { type: "date", value: fSel, "aria-label": "Alege o zi din an", onchange: (ev) => { if (ev.target.value) { S.sel = dinIso(ev.target.value); deseneaza(); } } });
    const comut = h("div", { class: "segment om-comut", role: "group", "aria-label": "Vedere" }, [["zile", "Ziua"], ["sapt", "Săptămâna"]].map(([k, et]) => h("button", { type: "button", "aria-pressed": String(S.mod === k), text: et, onclick: () => { S.mod = k; deseneaza(); } })));
    const nav = el("om-nav", h("button", { class: "buton-icon", type: "button", "aria-label": S.mod === "zile" ? "Ziua precedentă" : "Săptămâna precedentă", onclick: () => { S.sel = S.mod === "zile" ? adauga(S.sel, -1) : adauga(luS, -7); deseneaza(); } }, svgIcon("stanga")),
      inp, h("button", { class: "buton-icon", type: "button", "aria-label": S.mod === "zile" ? "Ziua următoare" : "Săptămâna următoare", onclick: () => { S.sel = S.mod === "zile" ? adauga(S.sel, 1) : adauga(luS, 7); deseneaza(); } }, svgIcon("dreapta")));
    const principal = [el("om-sus", comut, bAzi, nav)];
    const { ore } = S.mod === "zile" ? ziua(principal) : saptamana(principal);
    principal.push(h("p", { class: "om-mic2", text: "Ore de 50 de minute, cu pauze de 10 minute, începând cu 8:00." }));
    const nrc = new Map(); ore.forEach((x) => nrc.set(x.clasa, (nrc.get(x.clasa) || 0) + 1));
    const lateral = [cardServiciu(date.sv, "Serviciul meu pe școală"),
      nrc.size ? h("section", { class: "card om-clase" }, h("div", { class: "cap" }, h("h2", { text: "Ore pe clase" })), el("om-chip-rand", [...nrc].sort((x, y) => ordClasa(x[0], y[0])).map(([c, n]) => sp("chip", c + " · " + n)))) : null];
    umple(corp, h("div", { class: "om-grila" }, h("div", { class: "om-princ" }, principal), h("div", { class: "om-lat" }, lateral)));
    // butonul „Tipărește orarul”
    const idAn = rez(S.sel).id, oreAn = date.data.filter((x) => x.an_id === idAn), denAn = (date.ani.find((x) => x.id === idAn) || {}).den;
    const svAn = date.sv.some((x) => x.zi >= 1 && x.zi <= 5 && (x.pauza || x.schimb));
    const bb = barTiparOrar(oreAn.length > 0, svAn, (m) => tiparesteOrar([paginaProfesor(oreAn, date.sv, date.numeProf, m)], denAn));
    umple(actiuni, bb);
    scrieSub();
  }
  undeDeseneaza = deseneaza;

  async function porneste(tacut) {
    const d = await incarca(); if (!vii) return;
    if (d.eroare) { if (!tacut) arataMesaj(msg, "Orarul nu a putut fi încărcat. Încearcă din nou."); return; }
    arataMesaj(msg, ""); ultima = Date.now();
    const sem = (x) => JSON.stringify([x.data, x.sv, x.cal]);
    if (date && sem(date) === sem(d)) return;
    date = d;
    if (!d.data.length) { // fără ore: doar serviciul, dacă există
      const cs = cardServiciu(d.sv, "Serviciul meu pe școală");
      const svAn = d.sv.some((x) => x.zi >= 1 && x.zi <= 5 && (x.pauza || x.schimb));
      umple(corp, cs || h("div", { class: "card gol-stare" }, h("b", { text: "Nu există încă un orar pentru contul tău" }), "Dacă ești profesor, cere administratorului să îți lege contul de numele tău din lista de angajați."));
      umple(actiuni, barTiparOrar(false, svAn, (m) => tiparesteOrar([{ titlu: "Serviciul pe școală", sub: d.numeProf || "", sv: d.sv, mod: "sv" }], (d.sv.find((x) => x.denumire) || {}).denumire || anulScolarZilei())));
      return;
    }
    deseneaza();
  }

  const reimprospata = () => { if (!document.hidden && vii && Date.now() - ultima > 120000) porneste(true); };
  const ceas = setInterval(() => { if (!document.hidden && date && date.data.length && iso(S.sel) === iso(aziD())) deseneaza(); }, 60000);
  const mare = setInterval(() => { if (!document.hidden && vii) porneste(true); }, 300000);
  document.addEventListener("visibilitychange", reimprospata); window.addEventListener("focus", reimprospata);
  await porneste(false);
  return () => { vii = false; clearInterval(ceas); clearInterval(mare); document.removeEventListener("visibilitychange", reimprospata); window.removeEventListener("focus", reimprospata); };
}
