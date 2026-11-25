// Cadrul aplicației: bară laterală (laptop), bară de jos (telefon), rute, meniul contului, clopoțel.
import { db, h, umple, $, stare, modulePentruVedere, moduleleMele, MODULE, titluModul, descriereModul, ETICHETE_ROL, rolurileVazute, actualizeazaNotificari } from "./core.js";
import { svgIcon, icon, fereastra, inchideFereastra, capPagina } from "./ui.js";
import { temaAleasa, aplicaTema } from "./tema.js";

// Modulele rescrise în aspectul nou. Celelalte se deschid, deocamdată, în versiunea veche (aceeași autentificare).
const RESCRISE = {
  calendar: () => import("./module/calendar.js")
};
let curat = null, versiune = 0;

export function pornesteCadru(radacina) {
  const nav = h("nav", { class: "bl-nav", "aria-label": "Module", id: "bl-nav" });
  const numeUser = h("button", { class: "nume", type: "button", onclick: deschideContul }, h("b", { id: "bl-nume" }), h("small", { id: "bl-rol" }));
  const avatarL = h("button", { class: "avatar", id: "bl-avatar", type: "button", "aria-label": "Contul meu", onclick: deschideContul });
  const lateral = h("aside", { class: "bara-laterala", "aria-label": "Meniu" },
    h("div", { class: "bl-sigla" }, h("span", { class: "bl-logo", "aria-hidden": "true", text: "VM" }), h("b", null, "Spațiul virtual", h("br"), "al școlii")),
    nav, h("div", { class: "bl-user" }, avatarL, numeUser,
      h("button", { class: "buton-icon gol", type: "button", "aria-label": "Ieși din cont", title: "Ieși din cont", onclick: iesire }, svgIcon("iesire"))));
  const jos = h("nav", { class: "nav-jos", id: "nav-jos", "aria-label": "Navigare principală" });
  const continut = h("main", { class: "continut", id: "continut", tabindex: "-1" });
  radacina.replaceChildren(h("div", { class: "aplicatie" }, lateral, continut, jos));
  window.addEventListener("hashchange", ruteaza);
  window.addEventListener("notificari", () => { deseneazaNavigarea(); });
  window.addEventListener("storage", (ev) => { if (ev.key === "tema") window.dispatchEvent(new CustomEvent("tema")); });
  actualizeazaUtilizator();
  deseneazaNavigarea();
  ruteaza();
}

export function actualizeazaUtilizator() {
  const n = (stare.nume || "").trim();
  const nume = $("bl-nume"); if (!nume) return;
  nume.textContent = n || "Contul meu"; $("bl-rol").textContent = stare.roluri.map((r) => ETICHETE_ROL[r] || r).join(" · ");
  $("bl-avatar").textContent = n ? n.charAt(0).toUpperCase() : "•";
}

export const ruta = () => { const m = /^#\/m\/([a-z0-9]+)/.exec(location.hash); return m ? m[1] : ""; };
export const naviga = (id) => { location.hash = id ? "#/m/" + id : "#/"; };

function deseneazaNavigarea() {
  const nav = $("bl-nav"); if (!nav) return;
  const roluri = rolurileVazute(), module = moduleleMele(roluri), curent = ruta();
  const nr = (id) => ({ anunturi: stare.notif.anunturi, cereri: stare.notif.cereri, documente: stare.notif.documente, utilizatori: stare.notif.utilizatori })[id] || 0;
  umple(nav, 
    h("button", { class: "bl-item", type: "button", "data-k": "", "aria-current": curent === "" ? "page" : null, onclick: () => naviga("") }, svgIcon("acasa"), h("span", { class: "t", text: "Acasă" })),
    ...module.map((id) => h("button", { class: "bl-item", type: "button", "data-k": id, "aria-current": curent === id ? "page" : null, onclick: () => naviga(id) },
      svgIcon(MODULE[id].ico), h("span", { class: "t", text: titluModul(id, roluri) }), nr(id) > 0 ? h("span", { class: "badge", "aria-label": nr(id) + " noi", text: String(nr(id)) }) : null)));
  // bara de jos (telefon): Acasă, Orar, Calendar, Cont
  const jos = $("nav-jos"); if (!jos) return;
  const orar = module.includes("orarmeu") ? "orarmeu" : module.includes("orar") ? "orar" : "";
  const buton = (k, ico, eticheta, fa, curentAici) => h("button", { type: "button", "aria-label": eticheta, "aria-current": curentAici ? "page" : null, onclick: fa }, svgIcon(ico, 22), h("span", { class: "et", text: eticheta }));
  umple(jos, 
    buton("", "acasa", "Acasă", () => naviga(""), curent === ""),
    orar ? buton(orar, "orar", "Orar", () => naviga(orar), curent === orar) : null,
    module.includes("calendar") ? buton("calendar", "calendar", "Calendar", () => naviga("calendar"), curent === "calendar") : null,
    buton("cont", "cont", "Cont", deschideContul, false));
}

async function ruteaza() {
  const id = ruta(), v = ++versiune, zona = $("continut"); if (!zona) return;
  if (curat) { try { curat(); } catch (_) { /* nimic */ } curat = null; }
  deseneazaNavigarea();
  if (id && !moduleleMele(rolurileVazute()).includes(id)) { location.hash = "#/"; return; }
  umple(zona); window.scrollTo(0, 0);
  document.title = (id ? titluModul(id, rolurileVazute()) + " · " : "") + "Spațiul digital al școlii";
  try {
    if (!id) { const m = await import("./acasa.js"); if (v !== versiune) return; curat = (await m.randeaza(zona)) || null; }
    else if (RESCRISE[id]) { const m = await RESCRISE[id](); if (v !== versiune) return; curat = (await m.randeaza(zona)) || null; }
    else zona.append(modulVechi(id));
  } catch (e) {
    console.error(e);
    umple(zona, capPagina("Ceva nu a mers", null), h("div", { class: "card" }, h("p", { text: "Pagina nu a putut fi încărcată. Încearcă din nou." }), h("button", { class: "btn", type: "button", text: "Reîncarcă", onclick: () => location.reload() })));
  }
}

// Modul încă nerescris: se deschide în versiunea veche, care folosește aceeași autentificare.
function modulVechi(id) {
  const roluri = rolurileVazute();
  return h("div", null, capPagina(titluModul(id, roluri), descriereModul(id, roluri)),
    h("div", { class: "card" }, h("h2", { text: "Acest modul se mută în aspectul nou" }),
      h("p", { class: "mic", text: "Până se termină mutarea, îl deschizi în versiunea veche. Rămâi conectat și datele sunt aceleași." }),
      h("div", { class: "rand-btn" }, h("button", { class: "btn", type: "button", text: "Deschide în versiunea veche", onclick: () => { try { sessionStorage.setItem("vedere", id); } catch (_) { /* fără memorare */ } location.href = "index.html"; } }))));
}

async function iesire() { stare.id = null; await db.auth.signOut(); }

export function deschideContul() {
  const tema = temaAleasa(), roluri = stare.roluri;
  const corp = h("div", null, h("p", { class: "mic", text: stare.email }), roluri.length ? h("span", { class: "chip", text: roluri.map((r) => ETICHETE_ROL[r] || r).join(" · ") }) : null);
  if (roluri.length > 1) {
    corp.append(h("h3", { text: "Vezi platforma ca" }));
    const seg = h("div", { class: "segment", role: "group", "aria-label": "Vezi platforma ca" });
    [["", "Toate"], ...roluri.map((r) => [r, ETICHETE_ROL[r] || r])].forEach(([v, t]) => seg.append(h("button", { type: "button", "aria-pressed": String((stare.rolActiv || "") === v), text: t, onclick: () => {
      stare.rolActiv = v; try { v ? localStorage.setItem("rolActiv", v) : localStorage.removeItem("rolActiv"); } catch (_) { /* fără memorare */ }
      inchideFereastra(); deseneazaNavigarea(); if (ruta()) naviga(""); else ruteaza();
    } })));
    corp.append(seg);
  }
  corp.append(h("h3", { text: "Aspect" }));
  const segT = h("div", { class: "segment", role: "group", "aria-label": "Tema" });
  [["auto", "Automat"], ["luminos", "Luminos"], ["intunecat", "Întunecat"]].forEach(([k, t]) => segT.append(h("button", { type: "button", "aria-pressed": String(tema === k), text: t, onclick: (ev) => { aplicaTema(k); segT.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === ev.currentTarget))); } })));
  corp.append(segT, h("h3", { text: "Cont" }),
    h("div", { class: "rand-btn", style: "flex-direction:column" },
      h("button", { class: "btn neutru", type: "button", text: "Reîmprospătează pagina", onclick: () => location.reload() }),
      h("button", { class: "btn neutru", type: "button", text: "Versiunea veche a platformei", onclick: () => { location.href = "index.html"; } }),
      h("button", { class: "btn pericol", type: "button", text: "Ieși din cont", onclick: () => { inchideFereastra(); iesire(); } })));
  fereastra(stare.nume || "Contul meu", corp);
}

// Meniul clopoțelului: ce așteaptă atenția ta
export function deschideClopot(ancora) {
  const vechi = document.getElementById("meniu-clopot"); if (vechi) { vechi.remove(); return; }
  const n = stare.notif, intrari = [["Cereri de învoire", "cereri", n.cereri], ["Anunțuri noi", "anunturi", n.anunturi], ["Documente repartizate", "documente", n.documente]].filter((x) => x[2] > 0);
  if (intrari.length < 2) return naviga(intrari.length ? intrari[0][1] : "anunturi");
  const m = h("div", { class: "meniu-clopot", id: "meniu-clopot" }); const r = ancora.getBoundingClientRect();
  m.style.top = r.bottom + 6 + "px"; m.style.left = Math.max(8, Math.min(r.left - 150, window.innerWidth - 250)) + "px";
  intrari.forEach(([t, k, c]) => m.append(h("button", { type: "button", text: t + " (" + c + ")", onclick: () => { m.remove(); naviga(k); } })));
  document.body.append(m);
  setTimeout(() => document.addEventListener("click", function f() { m.remove(); document.removeEventListener("click", f); }, { once: true }), 0);
}
