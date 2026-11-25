// Notificări pe telefon: orarul zilei și serviciul pe școală, la 7:00 (și anunțurile din calendar). Aceeași logică ca în versiunea veche.
import { db, h } from "./core.js?v=20261125b";

export const notifTelSuportat = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const eIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const eInstalata = () => !!(window.navigator.standalone || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches));
export async function abonareCurenta() { try { const reg = await navigator.serviceWorker.getRegistration(); return reg ? await reg.pushManager.getSubscription() : null; } catch (_) { return null; } }
const bytesDinB64 = (b) => { const p = "=".repeat((4 - (b.length % 4)) % 4), r = atob((b + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
const b64DinBuf = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// Cardul din pagina Acasă; returnează elementul (ascuns la conturile fără angajat legat).
export function cardNotificariTelefon() {
  const stareT = h("span", { class: "text" }), scurt = h("span", { class: "scurt" });
  const cO = h("input", { type: "checkbox" }), cS = h("input", { type: "checkbox" }), cE = h("input", { type: "checkbox" });
  const opt = (c, titlu, rest) => h("label", { class: "nt-opt" }, c, h("span", null, h("b", { text: titlu }), rest));
  const bA = h("button", { class: "btn", type: "button", text: "Activează notificările" });
  const bP = h("button", { class: "btn sec", type: "button", text: "Trimite o probă", hidden: true });
  const bO = h("button", { class: "btn neutru", type: "button", text: "Dezactivează", hidden: true });
  const det = h("details", { class: "nt" },
    h("summary", null, h("b", { text: "Notificări de dimineață" }), scurt),
    h("div", { class: "nt-corp" }, h("p", { class: "mic" }, stareT),
      opt(cO, "Orarul zilei", " — la 7:00, în zilele de școală în care ai ore"),
      opt(cS, "Serviciul pe școală", " — la 7:00, în zilele în care ești de serviciu"),
      opt(cE, "E-mail de rezervă", " — dacă nu am notificările active pe telefon, trimite-mi pe e-mail ce am ales"),
      h("div", { class: "rand-btn" }, bA, bP, bO)));
  const box = h("section", { class: "card nt-card", hidden: true, "aria-live": "polite" }, det);

  let setari = { orar: false, serviciu: false, email: true };
  const alese = () => [setari.orar ? "orarul zilei" : "", setari.serviciu ? "serviciul pe școală" : ""].filter(Boolean).join(" și ");
  const faraTel = () => !alese() ? "" : setari.email ? " Până atunci primești ce ai ales pe e-mail." : " Până atunci nu primești nicio notificare.";
  const acum = () => !alese() ? "" : setari.email ? " Acum primești pe e-mail ce ai ales." : " Acum nu primești nicio notificare: activează-le pe telefon.";
  const ios = "Pe iPhone: apasă Partajează, apoi „Adaugă pe ecranul principal”, deschide aplicația de pe ecran și activează notificările de acolo.";
  const arata = async (mesaj) => {
    const supt = notifTelSuportat(), ab = supt ? await abonareCurenta() : null, refuzat = supt && Notification.permission === "denied";
    bA.hidden = !supt || !!ab || refuzat || (eIos() && !eInstalata()); bP.hidden = !ab; bO.hidden = !ab;
    cO.checked = setari.orar; cS.checked = setari.serviciu; cE.checked = setari.email;
    const sc = alese(); scurt.textContent = !sc ? "nu ai ales nimic" : sc.charAt(0).toUpperCase() + sc.slice(1) + (supt && !ab ? " · neactivat pe telefon" : "");
    if (mesaj) stareT.textContent = mesaj;
    else if (!supt) stareT.textContent = eIos() && !eInstalata() ? ios + faraTel() : "Acest browser nu permite notificări." + (!alese() ? " Alege mai jos ce vrei să primești." : setari.email ? " Primești pe e-mail ce ai ales." : " Nu primești nicio notificare.");
    else if (eIos() && !eInstalata()) stareT.textContent = ios + faraTel();
    else if (refuzat) stareT.textContent = "Notificările sunt blocate în setările browserului pentru acest site." + (!alese() ? "" : setari.email ? " Primești pe e-mail ce ai ales." : " Nu primești nicio notificare.");
    else if (!alese()) stareT.textContent = "Nu ai ales nicio notificare. Bifează mai jos ce vrei să primești dimineața, la 7:00." + (ab ? "" : " Apoi activează notificările pe acest telefon.");
    else if (ab) stareT.textContent = "Active pe acest telefon: dimineața, la 7:00, primești " + alese() + ".";
    else stareT.textContent = "Vei primi dimineața, la 7:00: " + alese() + "." + acum();
  };
  const salveaza = (camp, param, cutie) => async () => {
    const dorit = cutie.checked; cO.disabled = cS.disabled = cE.disabled = true;
    const { data: sn, error } = await db.rpc("setari_notificari", { [param]: dorit });
    cO.disabled = cS.disabled = cE.disabled = false;
    if (error || !sn || typeof sn !== "object") { cutie.checked = setari[camp]; return arata("Setarea nu a putut fi salvată. Încearcă din nou."); }
    setari = { orar: !!sn.orar, serviciu: !!sn.serviciu, email: sn.email !== false }; await arata();
  };
  cO.onchange = salveaza("orar", "p_orar", cO); cS.onchange = salveaza("serviciu", "p_serviciu", cS); cE.onchange = salveaza("email", "p_email", cE);
  bA.onclick = async () => {
    bA.disabled = true;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return arata(perm === "denied" ? "Ai blocat notificările. Le poți permite din setările browserului pentru acest site." : "Notificările nu au fost activate.");
      const reg = await navigator.serviceWorker.register("sw.js"); await navigator.serviceWorker.ready;
      const { data: k, error: eK } = await db.functions.invoke("serviciu-notificari", { body: { actiune: "cheie" } });
      if (eK || !k || !k.cheie) return arata("Cheia pentru notificări nu a putut fi încărcată. Încearcă din nou.");
      const veche = await reg.pushManager.getSubscription(); if (veche) await veche.unsubscribe();
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesDinB64(k.cheie) });
      const j = sub.toJSON();
      const { error: eS } = await db.rpc("abonare_push", { p_endpoint: sub.endpoint, p_p256dh: (j.keys && j.keys.p256dh) || b64DinBuf(sub.getKey("p256dh")), p_auth: (j.keys && j.keys.auth) || b64DinBuf(sub.getKey("auth")), p_agent: navigator.userAgent.slice(0, 300) });
      if (eS) { await sub.unsubscribe(); return arata("Abonarea nu a putut fi salvată. Încearcă din nou."); }
      await arata("Gata: notificările sunt active pe acest telefon. Apasă „Trimite o probă” ca să verifici.");
    } catch (_) { await arata("Notificările nu au putut fi activate pe acest telefon."); }
    finally { bA.disabled = false; }
  };
  bP.onclick = async () => {
    bP.disabled = true; stareT.textContent = "Se trimite…";
    const { data: r, error } = await db.functions.invoke("serviciu-notificari", { body: { actiune: "proba" } });
    bP.disabled = false;
    if (error || !r) return arata("Proba nu a putut fi trimisă. Încearcă din nou.");
    arata(r.trimise > 0 ? "Proba a fost trimisă. Dacă nu apare în câteva secunde, verifică setările de notificări ale telefonului." : "Proba nu a ajuns" + (r.coduri && r.coduri.length ? " (cod " + r.coduri.join(", ") + ")" : "") + ". Dezactivează și activează din nou notificările.");
  };
  bO.onclick = async () => {
    bO.disabled = true;
    try { const sub = await abonareCurenta(); if (sub) { const ep = sub.endpoint; await sub.unsubscribe(); await db.from("push_abonari").delete().eq("endpoint", ep); } } catch (_) { /* oprit oricum pe telefon */ }
    bO.disabled = false; arata("Notificările au fost dezactivate pe acest telefon." + (!alese() ? "" : setari.email ? " Primești pe e-mail ce ai ales." : " Nu primești nicio notificare."));
  };
  (async () => {
    if ("serviceWorker" in navigator) { try { await navigator.serviceWorker.register("sw.js"); } catch (_) { /* fără notificări */ } }
    try { const { data: sn } = await db.rpc("setari_notificari"); if (sn && typeof sn === "object") setari = { orar: !!sn.orar, serviciu: !!sn.serviciu, email: sn.email !== false }; } catch (_) { /* valori implicite */ }
    await arata(); box.hidden = false;
  })();
  return box;
}
