// Calendarul meu: mementouri și taskuri private, cu anunț pe telefon la ora aleasă.
import { db, h, umple, azi as aziIso, iso, dinIso, fmtData, LUNI, ZILE, cap1 } from "../core.js?v=20261125c";
import { capPagina, svgIcon, fereastra, inchideFereastra, confirma, camp, mesaj, arataMesaj } from "../ui.js?v=20261125c";
import { notifTelSuportat, abonareCurenta } from "../notif-tel.js?v=20261125c";

const LIT = ["L", "M", "M", "J", "V", "S", "D"];
const ANUNT = { 0: "la ora stabilită", 15: "cu 15 minute înainte", 60: "cu o oră înainte", 1440: "cu o zi înainte" };
const ziuaScrisa = (s) => ZILE[dinIso(s).getDay()] + ", " + fmtData(s);

export async function randeaza(zona) {
  const a = new Date();
  const S = { luna: new Date(a.getFullYear(), a.getMonth(), 1), sel: aziIso(), elemente: [], start: null, deschise: [] };
  const msg = mesaj("", "");
  const corp = h("div");
  const ghid = h("details", { class: "ghid" }, h("summary", { text: "Cum folosești calendarul" }), h("ol", null,
    h("li", { text: "Apasă pe o zi din calendar; dedesubt vezi ce ai notat pe ea." }),
    h("li", { text: "Apasă „Adaugă pe această zi”, scrie titlul și, dacă vrei, ora și o notă." }),
    h("li", null, h("b", { text: "Memento" }), " este ceva de ținut minte. ", h("b", { text: "Task" }), " este ceva de făcut: îl bifezi când e gata, iar dacă ziua a trecut și nu e bifat, apare cu roșu."),
    h("li", { text: "La „Notificare pe telefon” alegi când vrei să fii anunțat (la oră, cu 15 minute, cu o oră sau cu o zi înainte). Notificările pe telefon le activezi o singură dată, la „Notificări de dimineață” de pe pagina principală." }),
    h("li", { text: "Apasă pe un element ca să-l modifici sau să-l ștergi. Punctele de pe zile arată: turcoaz memento, portocaliu task, roșu task întârziat." }),
    h("li", { text: "Totul este doar al tău; nimeni altcineva nu vede ce notezi aici." })));
  try { ghid.open = localStorage.getItem("calendar-ghid") !== "inchis"; } catch (_) { ghid.open = true; }
  ghid.addEventListener("toggle", () => { try { localStorage.setItem("calendar-ghid", ghid.open ? "deschis" : "inchis"); } catch (_) { /* fără memorare */ } });

  umple(zona, capPagina("Calendarul meu", "Mementouri și taskuri doar ale tale; nimeni altcineva nu le vede.",
    [h("button", { class: "btn", type: "button", onclick: () => formular(null, S.sel), text: "Adaugă" })]), ghid, msg, corp);

  async function incarca() {
    const prima = new Date(S.luna.getFullYear(), S.luna.getMonth(), 1);
    const start = new Date(prima); start.setDate(1 - ((prima.getDay() + 6) % 7));
    const sfarsit = new Date(start); sfarsit.setDate(start.getDate() + 41);
    const [r1, r2] = await Promise.all([db.rpc("calendar_lista", { p_de: iso(start), p_pana: iso(sfarsit) }), db.rpc("calendar_taskuri_deschise")]);
    if (r1.error) { arataMesaj(msg, "Calendarul nu a putut fi încărcat. Încearcă din nou."); return false; }
    S.elemente = r1.data || []; S.start = start; S.deschise = r2.error ? [] : r2.data || [];
    return true;
  }
  async function actualizeaza() { arataMesaj(msg, ""); if (await incarca()) deseneaza(); }

  function rand(e, cuData) {
    const a = aziIso(), intarziat = e.tip === "task" && !e.gata && e.data < a;
    const meta = [];
    if (cuData) meta.push(ziuaScrisa(e.data));
    if (e.ora) meta.push("ora " + e.ora);
    if (e.anunt_min !== null && e.anunt_min !== undefined) meta.push("Notificare " + ANUNT[e.anunt_min]);
    if (e.tip === "memento" && !e.ora && !cuData) meta.push("toată ziua");
    const bifa = e.tip === "task" ? h("button", { class: "bifa", type: "button", role: "checkbox", "aria-checked": String(!!e.gata), "aria-label": "Task făcut: " + e.titlu, onclick: async (ev) => {
      const b = ev.currentTarget; b.disabled = true;
      const { error } = await db.rpc("calendar_gata", { p_id: e.id, p_gata: !e.gata });
      if (error) { b.disabled = false; return arataMesaj(msg, "Nu s-a putut salva. Încearcă din nou."); }
      actualizeaza();
    } }, svgIcon("bifa2", 16)) : h("span", { class: "bifa", style: "border-color:transparent;color:var(--accent)", "aria-hidden": "true" }, svgIcon("anunturi", 18));
    return h("div", { class: "cal-el" + (e.gata ? " gata" : "") + (intarziat ? " intarziat" : "") }, bifa,
      h("button", { class: "corp", type: "button", onclick: () => formular(e) }, h("div", { class: "titlu", text: e.titlu }),
        meta.length || intarziat ? h("div", { class: "meta", text: (intarziat ? "Întârziat · " : "") + meta.join(" · ") }) : null,
        e.nota ? h("div", { class: "meta", text: e.nota }) : null));
  }

  function deseneaza() {
    const L = S.luna, a = aziIso(), pe = {};
    S.elemente.forEach((e) => { (pe[e.data] = pe[e.data] || []).push(e); });
    const muta = (n) => { S.luna = new Date(L.getFullYear(), L.getMonth() + n, 1); const x = new Date(); S.sel = S.luna.getFullYear() === x.getFullYear() && S.luna.getMonth() === x.getMonth() ? aziIso() : iso(S.luna); actualizeaza(); };
    const bara = h("div", { class: "cal-luna" },
      h("button", { class: "buton-icon", type: "button", "aria-label": "Luna anterioară", onclick: () => muta(-1) }, svgIcon("stanga")),
      h("h2", { text: LUNI[L.getMonth()] + " " + L.getFullYear() }),
      h("div", { style: "display:flex;gap:8px" },
        h("button", { class: "btn neutru mic", type: "button", text: "Azi", onclick: () => { const x = new Date(); S.luna = new Date(x.getFullYear(), x.getMonth(), 1); S.sel = aziIso(); actualizeaza(); } }),
        h("button", { class: "buton-icon", type: "button", "aria-label": "Luna următoare", onclick: () => muta(1) }, svgIcon("dreapta"))));
    const zile = h("div", { class: "cal-zile" }, LIT.map((l) => h("div", { class: "eticheta", text: l })));
    for (let i = 0; i < 42; i++) {
      const d = new Date(S.start); d.setDate(S.start.getDate() + i);
      const f = iso(d), lista = pe[f] || [];
      const taskuri = lista.filter((e) => e.tip === "task");
      const puncte = [];
      if (lista.some((e) => e.tip === "memento")) puncte.push(h("i", { class: "p memento" }));
      if (taskuri.some((e) => !e.gata && f >= a) || (taskuri.length && taskuri.every((e) => e.gata))) puncte.push(h("i", { class: "p task" }));
      if (taskuri.some((e) => !e.gata && f < a)) puncte.push(h("i", { class: "p intarziat" }));
      zile.append(h("button", { class: "cal-zi" + (d.getMonth() !== L.getMonth() ? " alta" : "") + (f === a ? " azi" : ""), type: "button", "aria-pressed": String(f === S.sel),
        "aria-label": ziuaScrisa(f) + (lista.length ? ", " + lista.length + (lista.length === 1 ? " element" : " elemente") : ""),
        onclick: () => { S.sel = f; if (d.getMonth() !== L.getMonth()) { S.luna = new Date(d.getFullYear(), d.getMonth(), 1); actualizeaza(); } else deseneaza(); } },
        h("span", { text: String(d.getDate()) }), h("span", { class: "puncte" }, puncte)));
    }
    const ziua = pe[S.sel] || [];
    const intarziate = S.deschise.filter((e) => e.data < a);
    const stanga = h("div", { class: "card" }, bara, zile,
      h("p", { class: "gol-mic", style: "margin-top:10px" }, h("i", { class: "p memento", style: "display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px" }), "memento   ",
        h("i", { class: "p task", style: "display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 4px 0 10px" }), "task   ",
        h("i", { class: "p intarziat", style: "display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 4px 0 10px" }), "task întârziat"));
    const dreapta = h("div", null,
      h("div", { class: "card" }, h("div", { class: "cap" }, h("h2", { text: ziuaScrisa(S.sel) + (S.sel === a ? " (azi)" : "") })),
        !ziua.length ? h("p", { class: "gol-mic", text: "Nimic notat pe această zi." }) : ziua.map((e) => rand(e, false)),
        h("div", { class: "rand-btn" }, h("button", { class: "btn sec", type: "button", onclick: () => formular(null, S.sel), text: "Adaugă pe această zi" }))),
      intarziate.length ? h("div", { class: "card" }, h("div", { class: "cap" }, h("h2", { text: "Taskuri întârziate" }), h("span", { class: "badge", text: String(intarziate.length) })), intarziate.map((e) => rand(e, true))) : null);
    umple(corp, h("div", { class: "grila egal" }, stanga, dreapta));
  }

  function formular(e, dataImplicita) {
    const tip = h("select", null, h("option", { value: "memento", text: "Memento (ceva de ținut minte)" }), h("option", { value: "task", text: "Task (ceva de făcut, se bifează)" }));
    tip.value = e ? e.tip : "memento";
    const titlu = h("input", { type: "text", maxLength: 120, value: e ? e.titlu : "", autocomplete: "off" });
    const data = h("input", { type: "date", value: e ? e.data : dataImplicita || aziIso(), min: "2020-01-01", max: "2100-12-31" });
    const ora = h("input", { type: "time", value: e && e.ora ? e.ora : "" });
    const anunt = h("select", null, h("option", { value: "", text: "Fără anunț" }), Object.keys(ANUNT).map((k) => h("option", { value: k, text: "Anunță-mă " + ANUNT[k] })));
    anunt.value = e && e.anunt_min !== null && e.anunt_min !== undefined ? String(e.anunt_min) : "";
    const indiciu = h("p", { class: "ajutor" });
    const nota = h("textarea", { maxLength: 1000, value: e && e.nota ? e.nota : "" });
    const m = mesaj("", "");
    const salveaza = h("button", { class: "btn", type: "submit", text: "Salvează" });
    let activ = null;
    const arataIndiciu = async () => {
      if (anunt.value === "") { indiciu.textContent = ""; return; }
      if (activ === null) { try { activ = notifTelSuportat() && !!(await abonareCurenta()); } catch (_) { activ = false; } }
      indiciu.textContent = (activ ? "Primești notificare pe acest telefon." : "Notificările nu sunt active pe acest telefon: le activezi din pagina principală, la „Notificări de dimineață”. Până atunci anunțul vine pe e-mail.") + (ora.value ? "" : " Fără oră stabilită, se socotește ora 8:00.");
    };
    anunt.addEventListener("change", arataIndiciu); ora.addEventListener("input", arataIndiciu); arataIndiciu();
    const formul = h("form", { novalidate: true, onsubmit: async (ev) => {
      ev.preventDefault(); arataMesaj(m, "");
      if (!titlu.value.trim()) { arataMesaj(m, "Scrie un titlu."); titlu.focus(); return; }
      if (!data.value) return arataMesaj(m, "Alege data.");
      salveaza.disabled = true;
      const { error } = await db.rpc("calendar_salveaza", { p_id: e ? e.id : null, p_tip: tip.value, p_titlu: titlu.value.trim(), p_nota: nota.value.trim() || null, p_data: data.value, p_ora: ora.value || null, p_anunt_min: anunt.value === "" ? null : Number(anunt.value) });
      salveaza.disabled = false;
      if (error) return arataMesaj(m, "Nu s-a putut salva. Verifică datele și încearcă din nou.");
      const d = dinIso(data.value); S.luna = new Date(d.getFullYear(), d.getMonth(), 1); S.sel = data.value;
      inchideFereastra(); actualizeaza();
    } }, m, camp("Ce adaugi", tip), camp("Titlu", titlu),
      h("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:12px" }, camp("Data", data), camp("Ora (nu e obligatorie)", ora)),
      camp("Notificare pe telefon", anunt), indiciu, camp("Notă (nu e obligatorie)", nota),
      h("div", { class: "rand-btn" }, salveaza, h("button", { class: "btn neutru", type: "button", text: "Renunță", onclick: inchideFereastra }),
        e ? h("button", { class: "btn pericol", type: "button", text: "Șterge", onclick: async () => {
          inchideFereastra();
          if (!(await confirma("Ștergi elementul?", "„" + e.titlu + "” va fi șters definitiv.", "Șterge", true))) return;
          const { error } = await db.rpc("calendar_sterge", { p_id: e.id });
          if (error) return arataMesaj(msg, "Nu s-a putut șterge. Încearcă din nou.");
          actualizeaza();
        } }) : null));
    fereastra(e ? "Modifică" : "Element nou", formul, { focus: "input[type=text]" });
  }

  await actualizeaza();
}
