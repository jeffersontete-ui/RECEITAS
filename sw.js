/* ============================================================================
   sw.js — Service worker do Módulo Receitas.
   Deixa o app funcionar OFFLINE depois da primeira visita:
     • App shell (HTML/CSS/JS/CSV) é pré-cacheado na instalação.
     • Bibliotecas de CDN (pdf.js, mammoth, tesseract, html2canvas, jsPDF,
       Google Fonts) são cacheadas na primeira vez que são usadas.
   Estratégia: cache-first com atualização em segundo plano.
   ============================================================================ */
/* Ao publicar uma nova versão, basta subir este número: o cache antigo é
   descartado e todos os navegadores recebem os arquivos novos. */
const VERSION = "v3";
const APP_CACHE = "receitas-app-" + VERSION;
const RUNTIME_CACHE = "receitas-runtime-" + VERSION;

// Recursos locais (relativos ao escopo — funciona em subpasta do GitHub Pages).
const SHELL = [
  "", "index.html", "manifest.webmanifest",
  "assets/css/app.css", "assets/css/receita.css",
  "assets/js/fonts.js", "assets/js/stamp.js", "assets/js/models.js",
  "assets/js/format.js", "assets/js/templates.js", "assets/js/importer.js",
  "assets/js/export.js", "assets/js/dupla.js", "assets/js/app.js",
  "assets/icon.svg", "assets/img/hero.png",
  "data/medicos.csv", "data/clientes.csv", "data/medicamentos.csv",
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    const urls = SHELL.map(u => new URL(u, self.registration.scope).toString());
    await Promise.allSettled(urls.map(u => cache.add(u).catch(() => null)));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== APP_CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navegação: tenta rede, cai para index.html do cache (offline).
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try { return await fetch(req); }
      catch (_) {
        const cache = await caches.open(APP_CACHE);
        return (await cache.match(new URL("index.html", self.registration.scope).toString()))
            || (await cache.match(req)) || Response.error();
      }
    })());
    return;
  }

  // Arquivos do próprio app (HTML/CSS/JS/CSV): REDE PRIMEIRO.
  // Isto evita o problema clássico de publicar uma atualização e o navegador
  // continuar rodando a versão antiga guardada no cache. O cache vira apenas
  // a rede de segurança para uso offline.
  if (sameOrigin) {
    event.respondWith((async () => {
      const cache = await caches.open(APP_CACHE);
      try {
        const res = await fetch(req, { cache: "no-cache" });
        if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
      } catch (_) {
        return (await cache.match(req)) ||
               (await cache.match(req, { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }

  // Bibliotecas de CDN: cache-first, atualizando em segundo plano.
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
