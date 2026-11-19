// Notificări pe telefon pentru platforma școlii. Nu păstrează pagini în memorie și nu interceptează cereri.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { text: e.data ? e.data.text() : "" }; }
  const titlu = d.titlu || "Spațiul virtual al școlii";
  e.waitUntil(self.registration.showNotification(titlu, {
    body: d.text || "",
    icon: "icon-192.png",
    tag: d.eticheta || undefined,
    renotify: false,
    data: { url: d.url || "/" }
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
    for (const c of lista) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
