// Pornirea aplicației: verifică sesiunea, apoi arată intrarea sau cadrul aplicației.
import { db, $, stare } from "./core.js?v=20261125c";
import * as auth from "./auth.js?v=20261125c";
import { pornesteCadru, actualizeazaUtilizator } from "./shell.js?v=20261125c";
import { actualizeazaNotificari } from "./core.js?v=20261125c";

let mesajRamas = "";
async function verificaAcces(sesiune) {
  if (!sesiune) { stare.id = null; return auth.arataLogin(auth.intrare.mesajRamas); }
  const { data, error } = await db.from("profiluri").select("nume, roluri, activ, completat, sters_la, angajat_nume").eq("id", sesiune.user.id).maybeSingle();
  if (data && data.sters_la) { auth.intrare.mesajRamas = "Contul tău a fost șters. Contactează administratorul."; await db.auth.signOut(); return auth.arataLogin(auth.intrare.mesajRamas); }
  if (error || !data) { auth.intrare.mesajRamas = error ? auth.MESAJ_EROARE_CONEXIUNE : auth.MESAJ_FARA_ACCES; await db.auth.signOut(); return auth.arataLogin(auth.intrare.mesajRamas); }
  if (!data.activ) {
    if (!data.completat) { auth.intrare.mesajRamas = ""; return auth.arataCompletare(data); }
    auth.intrare.mesajRamas = auth.MESAJ_ASTEPTARE; await db.auth.signOut(); return auth.arataLogin(auth.MESAJ_ASTEPTARE);
  }
  auth.intrare.mesajRamas = "";
  const deja = stare.id === sesiune.user.id && $("continut");
  stare.id = sesiune.user.id; stare.email = sesiune.user.email || ""; stare.nume = (data.nume || "").trim(); stare.roluri = data.roluri || []; stare.angajat = !!data.angajat_nume;
  try { const r = localStorage.getItem("rolActiv"); stare.rolActiv = r && stare.roluri.includes(r) ? r : ""; } catch (_) { stare.rolActiv = ""; }
  if (deja) { actualizeazaUtilizator(); return; } // reverificare (revenire în filă): nu te mutăm din pagina curentă
  pornesteCadru($("radacina"));
  actualizeazaNotificari();
  setInterval(() => { if (!document.hidden && stare.id) actualizeazaNotificari(); }, 300000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && stare.id) actualizeazaNotificari(); });
}
auth.intrare.dupaParolaNoua = verificaAcces;

// Erori întoarse în adresă (Google/Supabase)
(function () {
  const text = location.search + "&" + location.hash.replace(/^#/, "");
  if (/error(_code)?=/.test(text)) {
    auth.intrare.mesajRamas = /signup_disabled/.test(text) ? "Crearea de conturi noi nu este deschisă momentan. Contactează administratorul școlii." : "Autentificarea nu a reușit. Încearcă din nou sau contactează administratorul.";
    history.replaceState(null, "", location.pathname);
  }
})();
// Link de confirmare din e-mail (adresa școlii): confirmăm contul și intrăm direct.
(function () {
  const q = new URLSearchParams(location.search), th = q.get("token_hash"), tip = q.get("type");
  if (!th || !/^(signup|recovery|magiclink|magic_link|invite|email_change|email)$/.test(tip || "")) return;
  history.replaceState(null, "", location.pathname);
  if (tip === "recovery") auth.intrare.recuperare = true;
  db.auth.verifyOtp({ token_hash: th, type: tip === "magic_link" ? "magiclink" : tip }).then(({ error }) => {
    if (error) {
      auth.intrare.recuperare = false;
      auth.intrare.mesajRamas = tip === "recovery" ? "Linkul pentru parola nouă a expirat sau a fost deja folosit. Apasă „Am uitat parola” și cere alt link." : "Linkul din e-mail a expirat sau a fost deja folosit. Intră cu e-mail și parolă sau cere alt link.";
      auth.arataLogin(auth.intrare.mesajRamas);
    } else if (tip === "recovery") auth.arataParolaNoua();
  });
})();
// setTimeout: evită apelurile către Supabase direct în callback-ul de autentificare
db.auth.onAuthStateChange((_ev, sesiune) => setTimeout(() => {
  if (auth.intrare.recuperare) { if (sesiune) auth.arataParolaNoua(); return; }
  verificaAcces(sesiune);
}, 0));
