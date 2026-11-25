// Tema: automat (după dispozitiv), luminos sau întunecat. Se ține minte pe acest dispozitiv (aceeași cheie ca în versiunea veche).
export function temaAleasa() { try { const s = localStorage.getItem("tema"); return s === "luminos" || s === "intunecat" ? s : "auto"; } catch (_) { return "auto"; } }
export function aplicaTema(t) {
  if (t === "luminos" || t === "intunecat") document.documentElement.dataset.tema = t; else delete document.documentElement.dataset.tema;
  try { if (t === "auto") localStorage.removeItem("tema"); else localStorage.setItem("tema", t); } catch (_) { /* fără memorare */ }
  window.dispatchEvent(new CustomEvent("tema"));
}
export const esteIntunecat = () => { const t = temaAleasa(); return t === "intunecat" || (t === "auto" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches); };
export const comutaTema = () => aplicaTema(esteIntunecat() ? "luminos" : "intunecat");
