// Ecranele de intrare: autentificare, creare cont, completarea datelor, parola uitată, parola nouă.
import { db, h, $ } from "./core.js?v=20261125b";
import { camp, arataMesaj, mesaj } from "./ui.js?v=20261125b";

export const MESAJ_ASTEPTARE = "Contul tău a fost creat și așteaptă aprobarea administratorului. Vei putea intra după aprobare.";
export const MESAJ_FARA_ACCES = "Contul tău nu are acces la platformă. Contactează administratorul.";
export const MESAJ_EROARE_CONEXIUNE = "Nu am putut verifica contul din cauza unei probleme de conectare. Verifică data și ora dispozitivului (să fie setate automat), așteaptă un minut și încearcă din nou.";

export const intrare = { recuperare: false, mesajRamas: "", dupaParolaNoua: null };
const radacina = () => $("radacina");
function monteaza(...carduri) {
  radacina().replaceChildren(h("div", { class: "intrare" }, h("div", { class: "carte" },
    h("img", { class: "sigla", src: "sigla.webp", alt: "Liceul Tehnologic „Victor Mihăilescu Craiu” Belcești", width: 900, height: 677 }),
    h("h1", { text: "Spațiul digital al școlii" }), ...carduri,
    h("p", { class: "legal" }, h("a", { href: "confidentialitate.html", text: "Confidențialitate" }), " · ", h("a", { href: "termeni.html", text: "Termeni" })))));
}
const mesajRoluri = (el) => el.setAttribute("role", "alert");
const eroareSesiune = (e) => e && (e.status === 401 || /JWT|expired/i.test(e.message || ""));

export function arataLogin(text) {
  const m = text || intrare.mesajRamas || "";
  const msg = mesaj(m, m === MESAJ_ASTEPTARE ? "info" : ""); mesajRoluri(msg);
  const intra = h("section", null), creeaza = h("section", { hidden: true });
  const fila = (care) => {
    const eIntra = care === "intra";
    bI.setAttribute("aria-selected", String(eIntra)); bC.setAttribute("aria-selected", String(!eIntra));
    intra.hidden = !eIntra; creeaza.hidden = eIntra; intrare.mesajRamas = ""; arataMesaj(msg, "");
  };
  const bI = h("button", { type: "button", role: "tab", "aria-selected": "true", text: "Intră în cont", onclick: () => fila("intra") });
  const bC = h("button", { type: "button", role: "tab", "aria-selected": "false", text: "Creează cont", onclick: () => fila("creeaza") });

  const email = h("input", { type: "email", autocomplete: "username", inputMode: "email", required: true });
  const parola = h("input", { type: "password", autocomplete: "current-password", required: true });
  const btn = h("button", { class: "btn lat", type: "submit", text: "Intră în cont" });
  intra.append(
    h("button", { class: "btn sec lat", type: "button", text: "Continuă cu Google", onclick: intraCuGoogle }),
    h("div", { class: "sep", text: "sau cu e-mail" }),
    h("form", { onsubmit: async (ev) => {
      ev.preventDefault(); intrare.mesajRamas = ""; arataMesaj(msg, ""); btn.disabled = true;
      const { error } = await db.auth.signInWithPassword({ email: email.value.trim(), password: parola.value });
      btn.disabled = false;
      if (error) arataMesaj(msg, (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message || ""))
        ? "Adresa de e-mail nu este confirmată. Deschide linkul din e-mailul primit (verifică și dosarul Spam)."
        : "E-mail sau parolă incorectă.");
      parola.value = "";
    } }, camp("E-mail", email), camp("Parolă", parola), btn,
      h("div", { class: "rand-btn" }, h("button", { class: "btn text", type: "button", text: "Am uitat parola", onclick: () => arataUitat(email.value.trim()) }))));

  const ce = h("input", { type: "email", autocomplete: "username", inputMode: "email", required: true });
  const cp = h("input", { type: "password", autocomplete: "new-password", minLength: 8, required: true });
  const cp2 = h("input", { type: "password", autocomplete: "new-password", minLength: 8, required: true });
  const cb = h("button", { class: "btn lat", type: "submit", text: "Creează cont cu e-mail" });
  creeaza.append(
    h("p", { class: "sub" }, h("b", { text: "Prima dată aici? " }), "Îți creezi contul în trei pași:"),
    h("ol", null, h("li", { text: "Apasă „Creează cont cu Google”." }), h("li", { text: "Completează numele tău real și funcția." }), h("li", { text: "Așteaptă ca administratorul să îți aprobe contul. După aprobare poți intra." })),
    h("button", { class: "btn lat", type: "button", text: "Creează cont cu Google", onclick: intraCuGoogle }),
    h("div", { class: "sep", text: "sau cu alt e-mail" }),
    h("form", { onsubmit: async (ev) => {
      ev.preventDefault(); intrare.mesajRamas = "";
      if (cp.value.length < 8) return arataMesaj(msg, "Parola trebuie să aibă cel puțin 8 caractere.");
      if (cp.value !== cp2.value) return arataMesaj(msg, "Parolele nu coincid.");
      cb.disabled = true;
      const { data, error } = await db.auth.signUp({ email: ce.value.trim(), password: cp.value, options: { emailRedirectTo: "https://liceul-belcesti.org/" } });
      cb.disabled = false; cp.value = ""; cp2.value = "";
      if (error) return arataMesaj(msg, /rate|limit/i.test(error.message || "") ? "Prea multe încercări. Încearcă din nou peste puțin timp." : "Contul nu a putut fi creat. Verifică e-mailul și încearcă din nou.");
      if (data && data.session) return;
      arataMesaj(msg, "Ți-am trimis un e-mail. Deschide linkul din el pentru a confirma adresa, apoi intră în cont. Dacă nu îl găsești, verifică și dosarul Spam și marchează mesajul ca „Nu este spam”.", "info");
    } }, camp("E-mail", ce), camp("Parolă (minimum 8 caractere)", cp), camp("Repetă parola", cp2), cb));

  monteaza(h("div", { class: "card" }, msg, h("div", { class: "segment", role: "tablist", style: "margin-bottom:16px" }, bI, bC), intra, creeaza));
  email.focus();
}

async function intraCuGoogle() {
  intrare.mesajRamas = "";
  const { error } = await db.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "https://liceul-belcesti.org/", queryParams: { prompt: "select_account" } } });
  if (error) arataLogin("Autentificarea cu Google nu a reușit. Încearcă din nou.");
}

export function arataUitat(emailInitial) {
  const msg = mesaj("", ""); const email = h("input", { type: "email", autocomplete: "username", inputMode: "email", required: true, value: emailInitial || "" });
  const btn = h("button", { class: "btn lat", type: "submit", text: "Trimite linkul" });
  monteaza(h("div", { class: "card" }, h("h2", { text: "Ai uitat parola?" }), h("p", { class: "sub", text: "Scrie adresa de e-mail a contului. Îți trimitem un link pentru a alege o parolă nouă." }), msg,
    h("form", { onsubmit: async (ev) => {
      ev.preventDefault(); arataMesaj(msg, ""); btn.disabled = true;
      const { error } = await db.auth.resetPasswordForEmail(email.value.trim());
      btn.disabled = false;
      if (error) return arataMesaj(msg, error.status === 429 || /rate|limit|seconds/i.test(error.message || "") ? "Prea multe încercări. Încearcă din nou peste puțin timp." : "Nu s-a putut trimite acum. Încearcă din nou.");
      // același mesaj indiferent dacă adresa are cont, ca să nu se poată afla cine are cont
      arataMesaj(msg, "Dacă există un cont cu această adresă, ți-am trimis un e-mail cu linkul pentru parola nouă. Dacă nu îl găsești, verifică și dosarul Spam.", "ok");
    } }, camp("E-mail", email), btn, h("div", { class: "rand-btn" }, h("button", { class: "btn neutru", type: "button", text: "Înapoi", onclick: () => { intrare.mesajRamas = ""; arataLogin(); } })))));
  email.focus();
}

export function arataParolaNoua() {
  const msg = mesaj("", ""); const p1 = h("input", { type: "password", autocomplete: "new-password", minLength: 8, required: true }), p2 = h("input", { type: "password", autocomplete: "new-password", minLength: 8, required: true });
  const btn = h("button", { class: "btn lat", type: "submit", text: "Salvează parola și intră" });
  monteaza(h("div", { class: "card" }, h("h2", { text: "Alege parola nouă" }), h("p", { class: "sub", text: "Parola trebuie să aibă cel puțin 8 caractere." }), msg,
    h("form", { onsubmit: async (ev) => {
      ev.preventDefault(); arataMesaj(msg, "");
      if (p1.value.length < 8) return arataMesaj(msg, "Parola trebuie să aibă cel puțin 8 caractere.");
      if (p1.value !== p2.value) return arataMesaj(msg, "Parolele nu coincid.");
      btn.disabled = true; intrare.recuperare = false; // evenimentul de după schimbare trebuie să ducă în aplicație
      const { error } = await db.auth.updateUser({ password: p1.value });
      btn.disabled = false;
      if (error) {
        intrare.recuperare = true;
        return arataMesaj(msg, /same|different/i.test(error.message || "") ? "Alege o parolă diferită de cea veche."
          : /weak|short|least/i.test(error.message || "") ? "Parola este prea slabă. Alege una mai lungă sau mai variată."
          : "Parola nu a putut fi schimbată. Linkul poate fi expirat; cere alt link de la „Am uitat parola”.");
      }
      intrare.recuperare = false; intrare.mesajRamas = "";
      const { data } = await db.auth.getSession();
      if (intrare.dupaParolaNoua) intrare.dupaParolaNoua(data && data.session);
    } }, camp("Parola nouă (minimum 8 caractere)", p1), camp("Repetă parola", p2), btn,
      h("div", { class: "rand-btn" }, h("button", { class: "btn neutru", type: "button", text: "Renunț", onclick: async () => { intrare.recuperare = false; intrare.mesajRamas = ""; await db.auth.signOut(); arataLogin(); } })))));
  p1.focus();
}

const DETALII = { profesor: "Funcția / disciplina (ex. profesor de geografie)", parinte: "Numele copilului și clasa (ex. Popescu Ion, clasa a V-a A)", elev: "Clasa (ex. a IX-a B)" };
export function arataCompletare(profil) {
  const msg = mesaj("", "");
  const nume = h("input", { type: "text", autocomplete: "name", maxLength: 100, minLength: 5, required: true, value: (profil.nume || "").includes("@") ? "" : profil.nume || "" });
  const calitate = h("select", { required: true }, h("option", { value: "", text: "Alege..." }), h("option", { value: "profesor", text: "Profesor / personal al școlii" }), h("option", { value: "parinte", text: "Părinte" }), h("option", { value: "elev", text: "Elev" }));
  const detalii = h("input", { type: "text", maxLength: 200 }); const etDet = h("span", { text: "Detalii" });
  calitate.addEventListener("change", () => { etDet.textContent = DETALII[calitate.value] || "Detalii"; detalii.required = !!calitate.value; });
  const btn = h("button", { class: "btn lat", type: "submit", text: "Trimite pentru aprobare" });
  monteaza(h("div", { class: "card" }, h("h2", { text: "Încă un pas" }), h("p", { class: "sub", text: "Completează datele reale, ca administratorul să îți poată aproba contul." }), msg,
    h("form", { onsubmit: async (ev) => {
      ev.preventDefault(); arataMesaj(msg, ""); btn.disabled = true;
      const trimite = () => db.rpc("completeaza_profil", { p_nume: nume.value, p_calitate: calitate.value, p_detalii: detalii.value });
      let { error } = await trimite();
      if (eroareSesiune(error)) { await db.auth.refreshSession(); ({ error } = await trimite()); }
      btn.disabled = false;
      if (eroareSesiune(error)) return arataMesaj(msg, "Sesiunea a expirat. Apasă Renunț, intră din nou cu e-mailul și parola și completează datele.");
      if (error) return arataMesaj(msg, "Datele nu au putut fi salvate. Scrie numele și prenumele complet și încearcă din nou.");
      intrare.mesajRamas = MESAJ_ASTEPTARE; await db.auth.signOut(); arataLogin(MESAJ_ASTEPTARE);
    } }, camp("Nume și prenume", nume), camp("Ești", calitate), h("label", { class: "camp" }, etDet, detalii), btn,
      h("div", { class: "rand-btn" }, h("button", { class: "btn neutru", type: "button", text: "Renunț", onclick: async () => { intrare.mesajRamas = ""; await db.auth.signOut(); arataLogin(); } })))));
  nume.focus();
}
