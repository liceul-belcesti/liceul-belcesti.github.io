// Componente comune: pictograme, ferestre, mesaje, antet de pagină.
import { h } from "./core.js?v=20261125b";

const P = {
  acasa: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  scoala: '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M10 21v-5h4v5"/>',
  utilizatori: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 010 6.4M18.5 14.8c1.7.7 2.8 2.3 3 5.2"/>',
  orar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M9 9v12"/>',
  orar2: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 13h2M12 13h2M16 13h2M8 17h2M12 17h2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  anunturi: '<path d="M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1z"/><path d="M15 9a4 4 0 010 6M18 6.5a8 8 0 010 11"/>',
  cerere: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  dosar: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  bifa: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  bifa2: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  ceas: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  stea: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5l-5.4 3 1.2-6L3.3 9.3l6.1-.7z"/>',
  scut: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  straturi: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  ecran: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  carte: '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11"/>',
  wifi: '<path d="M2 9a15 15 0 0120 0M5 12.5a10.5 10.5 0 0114 0M8.5 16a5.5 5.5 0 017 0"/><circle cx="12" cy="19.5" r="1"/>',
  cont: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
  clopot: '<path d="M6 16v-5a6 6 0 1112 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
  luna: '<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/>',
  soare: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  iesire: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
  inapoi: '<path d="M15 5l-7 7 7 7"/>',
  stanga: '<path d="M15 5l-7 7 7 7"/>',
  dreapta: '<path d="M9 5l7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  inchide: '<path d="M6 6l12 12M18 6L6 18"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  reimprospateaza: '<path d="M20 12a8 8 0 11-2.3-5.6M20 4v5h-5"/>'
};
export function icon(nume, marime) {
  const m = marime || 20;
  return h("span", { class: "pict", "aria-hidden": "true", html: '<svg width="' + m + '" height="' + m + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (P[nume] || "") + "</svg>" });
}
export const svgIcon = (nume, marime) => icon(nume, marime).firstChild;
export const pictogramaExista = (n) => !!P[n];

// Antetul unei pagini de modul: buton înapoi (telefon), titlu, subtitlu, acțiuni.
export function capPagina(titlu, sub, actiuni, inapoiLa) {
  const st = h("div", { class: "st" },
    h("button", { class: "inapoi", type: "button", "aria-label": "Înapoi", onclick: () => { if (inapoiLa) location.hash = inapoiLa; else history.length > 1 ? history.back() : (location.hash = "#/"); } }, svgIcon("inapoi")),
    h("div", null, h("h1", { text: titlu }), sub ? h("p", { class: "sub", text: sub }) : null));
  return h("div", { class: "cap-pagina" }, st, actiuni && actiuni.length ? h("div", { class: "dr" }, actiuni) : null);
}

export function mesaj(text, tip) { return h("div", { class: "mesaj" + (tip ? " " + tip : ""), role: tip === "ok" ? "status" : "alert", text: text || "" }); }
export function arataMesaj(el, text, tip) { el.className = "mesaj" + (tip ? " " + tip : ""); el.textContent = text || ""; }

// Fereastră modală: pe telefon foaie din partea de jos, pe laptop dialog în centru.
export function fereastra(titlu, corp, optiuni) {
  inchideFereastra();
  const o = optiuni || {};
  const foaie = h("div", { class: "foaie", role: "dialog", "aria-modal": "true", "aria-label": titlu }, titlu ? h("h2", { text: titlu }) : null, corp);
  const fundal = h("div", { class: "fundal", id: "fereastra-activa", onclick: (ev) => { if (ev.target === fundal) inchideFereastra(); } }, foaie);
  document.body.append(fundal);
  const prima = foaie.querySelector(o.focus || "input, select, textarea, button");
  if (prima) prima.focus();
  return fundal;
}
export function inchideFereastra() { const f = document.getElementById("fereastra-activa"); if (f) f.remove(); }
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") inchideFereastra(); });

// Confirmare simplă (în loc de confirm() al browserului)
export function confirma(titlu, text, buton, pericol) {
  return new Promise((rezolva) => {
    const inchide = (v) => { inchideFereastra(); rezolva(v); };
    const corp = h("div", null,
      h("p", { class: "mic", text }),
      h("div", { class: "rand-btn" },
        h("button", { class: "btn" + (pericol ? " pericol" : ""), type: "button", onclick: () => inchide(true), text: buton || "Da" }),
        h("button", { class: "btn neutru", type: "button", onclick: () => inchide(false), text: "Renunț" })));
    const f = fereastra(titlu, corp);
    f.addEventListener("click", (ev) => { if (ev.target === f) rezolva(false); });
  });
}

export function camp(eticheta, control, ajutor) {
  return h("label", { class: "camp" }, h("span", { text: eticheta }), control, ajutor ? h("p", { class: "ajutor", text: ajutor }) : null);
}
