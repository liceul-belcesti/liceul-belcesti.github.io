// Pagina Acasă: salut, cardul „Azi”, orele zilei, calendarul de azi, anunțuri noi, notificările pe telefon și casetele modulelor (telefon).
import { db, h, umple, stare, azi, iso, fmtData, ZILE, p2, modulePentruVedere, rolurileVazute, MODULE, titluModul, descriereModul, poate, actualizeazaNotificari } from "./core.js?v=20261125b";
import { svgIcon } from "./ui.js?v=20261125b";
import { esteIntunecat, comutaTema } from "./tema.js?v=20261125b";
import { naviga, deschideContul, deschideClopot } from "./shell.js?v=20261125b";
import { incarcaDateOrar, incarcaPlanZi, rezumatZi, hm, stOra, intervalOra, stPauza, textPlan, detOra } from "./orar-logic.js?v=20261125b";
import { cardNotificariTelefon } from "./notif-tel.js?v=20261125b";

const salutZi = () => { const o = new Date().getHours(); return o >= 5 && o < 12 ? "Bună dimineața" : o >= 12 && o < 18 ? "Bună ziua" : "Bună seara"; };

export async function randeaza(zona) {
  let orar = null, plan = [], gataOrar = false, vii = true;
  const sectiuni = { erou: h("section", { class: "erou ascuns", role: "button", tabindex: 0 }),
    cal: h("section", { class: "card ascuns", "aria-label": "În calendarul tău azi" }), anunt: h("section", { class: "card ascuns", "aria-label": "Anunțuri" }) };

  // ----- antet: data, temă, clopoțel, salut
  const data = h("span", { class: "acasa-data" });
  const avatar = h("button", { class: "avatar mobil-doar", type: "button", "aria-label": "Contul meu", onclick: deschideContul, text: (stare.nume || "•").trim().charAt(0).toUpperCase() });
  const tema = h("button", { class: "buton-icon tema-btn", type: "button", onclick: () => comutaTema() });
  const clopot = h("button", { class: "buton-icon", type: "button", "aria-label": "Notificări" }, svgIcon("clopot", 22), h("span", { class: "nr ascuns" }));
  clopot.addEventListener("click", (ev) => { ev.stopPropagation(); deschideClopot(clopot); });
  const salut = h("h1", { class: "salut" });
  const actualizeazaAntet = () => {
    const d = new Date(); data.textContent = ZILE[d.getDay()] + ", " + p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + "/" + d.getFullYear();
    salut.textContent = salutZi() + ", " + (stare.nume || "").trim();
    const i = esteIntunecat(); umple(tema, svgIcon(i ? "soare" : "luna")); tema.setAttribute("aria-label", i ? "Temă luminoasă" : "Temă întunecată");
    const t = stare.notif.total, nr = clopot.querySelector(".nr");
    nr.textContent = t > 99 ? "99+" : String(t); nr.classList.toggle("ascuns", t < 1);
    clopot.setAttribute("aria-label", t ? t + " notificări" : "Notificări");
    clopot.hidden = !poate("administrator", "director", "director_adjunct", "secretariat", "contabilitate", "profesor") && stare.notif.total < 1 && !modulePentruVedere().includes("anunturi");
  };
  actualizeazaAntet();

  const notif = stare.angajat ? cardNotificariTelefon() : null;
  const casete = h("div", { class: "casete" });
  const tiles = () => {
    const roluri = rolurileVazute(), n = stare.notif;
    const nr = (id) => ({ anunturi: n.anunturi, cereri: n.cereri, documente: n.documente, utilizatori: n.utilizatori })[id] || 0;
    umple(casete, ...modulePentruVedere().map((id) => h("button", { class: "casa", type: "button", style: "--k:" + MODULE[id].k, onclick: () => naviga(id) },
      h("span", { class: "ico" }, svgIcon(MODULE[id].ico, 22)), h("span", null, h("b", { text: titluModul(id, roluri) }), h("small", { text: descriereModul(id, roluri) })),
      nr(id) > 0 ? h("span", { class: "nr", text: String(nr(id)) }) : null)));
  };
  tiles();

  umple(zona, 
    h("div", { class: "acasa-cap" }, h("div", { class: "st" }, avatar, data), h("div", { class: "dr" }, tema, clopot), salut),
    h("div", { class: "grila egal acasa-grila" }, sectiuni.erou, sectiuni.cal, sectiuni.anunt),
    notif ? h("div", { style: "margin-top:12px" }, notif) : null,
    h("div", { class: "mobil-doar" }, h("h2", { class: "sect", text: "Modulele tale" }), casete));

  // ----- cardul mare „Azi”, cu orele zilei în el
  function deseneazaOrar() {
    const { erou } = sectiuni;
    if (!orar) { erou.classList.add("ascuns"); return; }
    const acum = new Date(), r = rezumatZi(orar, new Date(acum.getFullYear(), acum.getMonth(), acum.getDate()), plan, acum);
    const { info, lista, active, prac, cur, urm, mN, svP, svS } = r;
    const facute = info.suspendat ? 0 : active.filter((x) => stOra(x.ora) + 50 <= mN).length;
    let et = "AZI", dr = "", mare = "", sub = "", text = false;
    if (info.suspendat) { mare = info.titlu; sub = info.sub; text = true; }
    else if (!active.length) { mare = "Nicio oră de predat"; text = true; }
    else if (cur) { et = "ORA CURENTĂ"; dr = "până la " + hm(stOra(cur.ora) + 50); mare = hm(stOra(cur.ora)); sub = "Ora " + cur.ora + " · " + detOra(cur); }
    else if (urm) { et = "URMĂTOAREA ORĂ"; const m = stOra(urm.ora) - mN; dr = "peste " + (m < 60 ? m + " min" : Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : "")); mare = hm(stOra(urm.ora)); sub = "Ora " + urm.ora + " · " + detOra(urm); }
    else { mare = "Gata pe azi"; sub = "Orele de azi s-au încheiat"; text = true; }
    const sv = [];
    svP.forEach((g) => sv.push("pauza " + g.pauza + "–" + (g.pauza + 1) + (g.locuri.length ? ", " + g.locuri.join(", ") : "")));
    svS.forEach((x) => sv.push(x.text + (x.loc ? ", " + x.loc : "")));
    const arataOre = !info.suspendat && lista.length > 0;
    umple(erou,
      h("div", { class: "cap" }, h("span", { class: "et", text: et }), h("span", { class: "dr", text: dr })),
      h("div", { class: "mare" + (text ? " text" : ""), text: mare }), sub ? h("div", { class: "sub", text: sub }) : null,
      sv.length ? h("div", { class: "sv" }, svgIcon("pin", 18), h("span", { text: "Serviciu · " + sv.join(" · ") })) : null,
      arataOre ? h("div", { class: "casute-ore", role: "list", "aria-label": "Orele de azi" }, lista.map((x) => {
        const practica = prac.has(x.clasa), gata = !practica && !x.plan && stOra(x.ora) + 50 <= mN, eAcum = x === cur, eUrm = x === urm;
        const nota = practica ? "practică" : x.plan ? textPlan(x.plan) : "";
        return h("div", { class: "casuta" + (gata ? " gata" : "") + (eAcum ? " acum" : "") + (eUrm ? " urm" : ""), role: "listitem" },
          h("div", { class: "rd" }, h("span", { class: "no", text: "Ora " + x.ora }),
            gata ? h("span", { class: "bif" }, svgIcon("bifa2", 14)) : eAcum ? h("span", { class: "tag", text: "ACUM" }) : eUrm ? h("span", { class: "tag", text: "URMEAZĂ" }) : null),
          h("div", { class: "ti", text: intervalOra(x.ora) }), h("div", { class: "cl", text: detOra(x) }), nota ? h("div", { class: "nt2", text: nota }) : null);
      })) : null);
    erou.setAttribute("aria-label", "Azi: " + et.toLowerCase() + " " + mare + (sub ? ", " + sub : "") + (arataOre ? ". " + facute + " din " + active.length + " ore făcute" : "") + ". Deschide orarul meu.");
    erou.classList.remove("ascuns");
    if (!erou.dataset.legat) {
      erou.dataset.legat = "1"; const mergi = () => naviga(moduleDisponibil());
      erou.addEventListener("click", mergi); erou.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); mergi(); } });
    }
  }
  const moduleDisponibil = () => (modulePentruVedere().includes("orarmeu") ? "orarmeu" : "orar");

  // ----- calendar azi și anunțuri
  async function incarcaCalendar() {
    const sec = sectiuni.cal; if (!modulePentruVedere().includes("calendar")) { sec.classList.add("ascuns"); return; }
    const a = azi();
    const [r1, r2] = await Promise.all([db.rpc("calendar_lista", { p_de: a, p_pana: a }), db.rpc("calendar_taskuri_deschise")]);
    if (!vii || r1.error || r2.error) return;
    const dinZi = (r1.data || []).filter((x) => !x.gata), intarziate = (r2.data || []).filter((x) => x.data < a);
    const randuri = [...dinZi.map((x) => ({ x, rosu: false })), ...intarziate.map((x) => ({ x, rosu: true }))];
    const mergi = () => naviga("calendar");
    umple(sec, h("div", { class: "cap" }, h("h2", { text: "În calendarul tău azi" }), h("button", { class: "btn text", type: "button", text: "Vezi tot", onclick: mergi })),
      !randuri.length ? h("p", { class: "gol-mic", text: "Nimic planificat pentru azi." }) : null,
      randuri.slice(0, 5).map(({ x, rosu }) => h("button", { class: "rand-azi" + (rosu ? " rosu" : ""), type: "button", onclick: mergi },
        h("span", { class: "tp", text: rosu ? "Întârziat" : x.ora ? x.ora : x.tip === "task" ? "Task" : "Azi" }),
        h("span", { class: "tx" }, x.titlu, rosu ? h("small", { text: "Task din " + fmtData(x.data) }) : null))),
      randuri.length > 5 ? h("p", { class: "gol-mic", text: "+ încă " + (randuri.length - 5) + " în calendar" }) : null);
    sec.classList.remove("ascuns");
  }
  async function incarcaAnunturi() {
    const sec = sectiuni.anunt; if (!modulePentruVedere().includes("anunturi")) { sec.classList.add("ascuns"); return; }
    const a = new Date().toISOString().slice(0, 10);
    const [r1, r2] = await Promise.all([db.from("anunturi").select("id, titlu, important, expira_la, creat_la, creat_de").is("sters_la", null).order("creat_la", { ascending: false }).limit(40), db.from("anunturi_citite").select("anunt_id, necitit")]);
    if (!vii || r1.error || !r1.data) return;
    const cit = new Map((r2.data || []).map((x) => [x.anunt_id, x]));
    const valabile = r1.data.filter((x) => !x.expira_la || x.expira_la >= a);
    const noi = valabile.filter((x) => x.creat_de !== stare.id && (!cit.get(x.id) || cit.get(x.id).necitit));
    const aratate = (noi.length ? noi : valabile).slice(0, 4), mergi = () => naviga("anunturi");
    umple(sec, h("div", { class: "cap" }, h("h2", { text: noi.length ? "Anunțuri noi" : "Anunțuri" }),
      noi.length ? h("span", { class: "badge", text: noi.length + (noi.length === 1 ? " nou" : " noi") }) : h("button", { class: "btn text", type: "button", text: "Vezi tot", onclick: mergi })),
      !aratate.length ? h("p", { class: "gol-mic", text: "Nu există anunțuri." }) : null,
      aratate.map((x) => h("button", { class: "rand-azi anunt", type: "button", onclick: mergi }, h("span", { class: "tx" }, x.titlu, h("small", { text: (noi.includes(x) ? "Anunț nou" : "Citit") + " · " + fmtData(x.creat_la.slice(0, 10)) })))));
    sec.classList.remove("ascuns");
  }
  async function incarcaOrar() {
    if (!stare.angajat) return;
    try {
      const d = await incarcaDateOrar(); if (!vii) return;
      orar = d; plan = d ? await incarcaPlanZi(azi()) : []; gataOrar = true; deseneazaOrar();
    } catch (_) { /* rămâne ce se vedea */ }
  }
  let ultima = 0;
  const reincarca = (fortat) => {
    if (document.hidden || !vii) return; if (!fortat && Date.now() - ultima < 120000) { deseneazaOrar(); return; }
    ultima = Date.now(); incarcaOrar(); incarcaCalendar().catch(() => {}); incarcaAnunturi().catch(() => {}); actualizeazaNotificari();
  };
  const laNotificari = () => { actualizeazaAntet(); tiles(); };
  const laTema = () => actualizeazaAntet();
  const laRevenire = () => reincarca(false);
  window.addEventListener("notificari", laNotificari); window.addEventListener("tema", laTema);
  document.addEventListener("visibilitychange", laRevenire); window.addEventListener("focus", laRevenire);
  const ceas = setInterval(() => { if (!document.hidden) { actualizeazaAntet(); deseneazaOrar(); } }, 60000);
  const mare = setInterval(() => reincarca(true), 300000);
  reincarca(true);
  return () => { vii = false; clearInterval(ceas); clearInterval(mare); window.removeEventListener("notificari", laNotificari); window.removeEventListener("tema", laTema); document.removeEventListener("visibilitychange", laRevenire); window.removeEventListener("focus", laRevenire); };
}
