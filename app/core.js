// Nucleul aplicației: conexiunea la baza de date, ajutoare mici, rolurile și modulele.
export const db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
export const $ = (id) => document.getElementById(id);

// h("div", { class: "x", onclick: fn, "aria-label": "..." }, "text", altElement)
export function h(tag, props, ...copii) {
  const e = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k === "html") e.innerHTML = v; // doar pentru pictograme proprii, niciodată text din baza de date
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else if (k in e && k !== "list" && k !== "style" && typeof v !== "object") { try { e[k] = v; } catch (_) { e.setAttribute(k, v); } }
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of copii.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}

// Înlocuiește conținutul unui element; ignoră null/false și aplatizează listele (replaceChildren nativ nu face asta).
export function umple(parinte, ...copii) {
  parinte.replaceChildren(...copii.flat(2).filter((x) => x != null && x !== false).map((x) => (x.nodeType ? x : document.createTextNode(String(x)))));
  return parinte;
}

// ---------- Date (zi/lună/an) ----------
export const p2 = (n) => String(n).padStart(2, "0");
export const iso = (d) => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
export const dinIso = (s) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
export const azi = () => iso(new Date());
export const fmtData = (s) => (s ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4) : "");
export const LUNI = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
export const ZILE = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
export const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// ---------- Roluri și module ----------
export const ETICHETE_ROL = {
  administrator: "Administrator", director: "Director", director_adjunct: "Director adjunct", secretariat: "Secretariat", contabilitate: "Contabilitate",
  profesor: "Profesor", parinte: "Părinte", elev: "Elev"
};
const PE_ROL = {
  director: ["utilizatori", "azi", "pontaj", "structura", "anunturi", "orar", "cereri", "evaluare", "altfel", "serviciu", "ecrane", "registru", "calendar", "wifi"],
  director_adjunct: ["utilizatori", "azi", "pontaj", "structura", "anunturi", "orar", "cereri", "evaluare", "altfel", "serviciu", "ecrane", "registru", "calendar", "wifi"],
  secretariat: ["azi", "pontaj", "structura", "anunturi", "orar", "altfel", "serviciu", "registru", "calendar"],
  contabilitate: ["pontaj", "structura", "anunturi", "calendar"],
  profesor: ["pontaj", "orarmeu", "calendar", "cereri", "evaluare", "altfel", "anunturi", "wifi"],
  parinte: ["anunturi", "orar"],
  elev: ["anunturi", "orar"]
};
// culoarea pictogramei (--k) și ordinea de pe pagina principală
export const MODULE = {
  azi: { titlu: "Azi în școală", desc: "Cine lipsește, ore neacoperite, suplinitori", k: "#0b7f8a", ico: "scoala" },
  utilizatori: { titlu: "Utilizatori", desc: "Aprobă conturi și atribuie roluri", k: "#4d6fd0", ico: "utilizatori" },
  orarmeu: { titlu: "Orarul meu", desc: "Orele și serviciul tău pe școală", k: "#0b7f8a", ico: "orar" },
  calendar: { titlu: "Calendarul meu", desc: "Mementouri și taskuri", k: "#2f5fd0", ico: "calendar" },
  anunturi: { titlu: "Anunțuri", desc: "Informări de la școală", k: "#d97706", ico: "anunturi" },
  cereri: { titlu: "Cereri de învoire", desc: "Cere o învoire și vezi răspunsul", k: "#7c4dcc", ico: "cerere" },
  documente: { titlu: "Documentele mele", desc: "Documente repartizate ție", k: "#b45f06", ico: "dosar" },
  evaluare: { titlu: "Evaluare", desc: "Teste pentru clasele tale", k: "#2e9a52", ico: "bifa" },
  pontaj: { titlu: "Pontaj", desc: "Prezența lunară", k: "#5b7a82", ico: "ceas" },
  altfel: { titlu: "Școala Altfel și Săptămâna Verde", desc: "Programul celor două săptămâni", k: "#c93a55", ico: "stea" },
  serviciu: { titlu: "Serviciu pe școală", desc: "Zone, clase și scutiri", k: "#5b7a82", ico: "scut" },
  structura: { titlu: "Structura anului școlar", desc: "Cursuri, vacanțe, practică", k: "#4d6fd0", ico: "straturi" },
  orar: { titlu: "Orar", desc: "Orarul profesorilor și al claselor", k: "#0b7f8a", ico: "orar2" },
  ecrane: { titlu: "Ecrane pentru cancelarie", desc: "Linkuri pentru televizoare", k: "#5b7a82", ico: "ecran" },
  registru: { titlu: "Registratură", desc: "Registrul documentelor", k: "#b45f06", ico: "carte" },
  wifi: { titlu: "Parola mea de Wi‑Fi", desc: "Parola ta pentru Wi‑Fi-ul școlii", k: "#5b7a82", ico: "wifi" }
};
export const ORDINE = ["azi", "utilizatori", "orarmeu", "calendar", "anunturi", "cereri", "documente", "evaluare", "pontaj", "altfel", "serviciu", "structura", "orar", "ecrane", "registru", "wifi"];

export function moduleleMele(roluri) {
  const set = new Set();
  roluri.forEach((r) => (r === "administrator" ? Object.keys(MODULE) : PE_ROL[r] || []).forEach((k) => set.add(k)));
  if (!set.size) set.add("anunturi");
  return ORDINE.filter((k) => set.has(k) && MODULE[k]);
}
export function titluModul(id, roluri) {
  const gest = roluri.some((r) => ["administrator", "director", "director_adjunct"].includes(r));
  if (id === "wifi" && gest) return "Wi‑Fi";
  return MODULE[id] ? MODULE[id].titlu : id;
}
export function descriereModul(id, roluri) {
  const admin = roluri.some((r) => ["administrator", "director", "director_adjunct", "secretariat", "contabilitate"].includes(r));
  if (id === "pontaj" && !admin) return "Pontajele închise ale tale";
  if (id === "altfel" && !roluri.some((r) => ["administrator", "director", "director_adjunct", "secretariat"].includes(r))) return "Activitățile tale";
  if (id === "wifi" && roluri.some((r) => ["administrator", "director", "director_adjunct"].includes(r))) return "Conturile de Wi‑Fi ale profesorilor";
  return MODULE[id] ? MODULE[id].desc : "";
}

// ---------- Starea utilizatorului curent ----------
export const stare = { id: null, email: "", nume: "", roluri: [], angajat: false, rolActiv: "", notif: { anunturi: 0, cereri: 0, documente: 0, utilizatori: 0, total: 0 } };
export const rolurileVazute = () => (stare.rolActiv && stare.roluri.includes(stare.rolActiv) ? [stare.rolActiv] : stare.roluri);
export const modulePentruVedere = () => moduleleMele(rolurileVazute());
export const poate = (...roluri) => roluri.some((r) => stare.roluri.includes(r));

// ---------- Notificări (clopoțel, insigne) ----------
let ruleaza = false, dinNou = false;
export async function actualizeazaNotificari() {
  if (ruleaza) { dinNou = true; return; }
  ruleaza = true;
  try { await incarcaNotificari(); } finally { ruleaza = false; }
  if (dinNou) { dinNou = false; actualizeazaNotificari(); }
}
async function incarcaNotificari() {
  if (!stare.id) return;
  const m = moduleleMele(stare.roluri), a = azi();
  const decide = poate("administrator", "director", "director_adjunct") && m.includes("cereri");
  const areCereri = m.includes("cereri"), areDoc = m.includes("documente"), areAnunturi = m.includes("anunturi");
  const gestUtil = poate("administrator", "director", "director_adjunct");
  const [an, ci, cd, cm, cn, dn, ut] = await Promise.all([
    areAnunturi ? db.from("anunturi").select("id, creat_de, expira_la").is("sters_la", null) : { data: [] },
    areAnunturi ? db.from("anunturi_citite").select("anunt_id, necitit") : { data: [] },
    decide ? db.rpc("cereri_de_decis_v2") : { data: [] },
    areCereri ? db.rpc("cereri_pentru_mine") : { data: [] },
    areCereri ? db.rpc("cereri_decise_nevazute") : { data: 0 },
    areDoc ? db.rpc("registru_nevazute") : { data: 0 },
    gestUtil ? db.from("profiluri").select("id", { count: "exact", head: true }).eq("activ", false).eq("completat", true).is("sters_la", null) : { count: 0 }
  ]);
  if (an.error || ci.error) return;
  const citite = new Set((ci.data || []).filter((x) => !x.necitit).map((x) => x.anunt_id));
  const anunturi = (an.data || []).filter((x) => x.creat_de !== stare.id && !citite.has(x.id) && (!x.expira_la || x.expira_la >= a)).length;
  const deDecis = cd.error || !Array.isArray(cd.data) ? 0 : cd.data.length;
  const deRaspuns = cm.error || !Array.isArray(cm.data) ? 0 : cm.data.filter((x) => x.stare_cerere === "in_asteptare" && x.stare_mea === "in_asteptare").length;
  const decise = cn.error || typeof cn.data !== "number" ? 0 : cn.data;
  const cereri = deDecis + deRaspuns + decise;
  const documente = dn.error || typeof dn.data !== "number" ? 0 : dn.data;
  const utilizatori = ut.error ? 0 : ut.count || 0;
  stare.notif = { anunturi, cereri, documente, utilizatori, total: anunturi + cereri + documente };
  window.dispatchEvent(new CustomEvent("notificari"));
}
