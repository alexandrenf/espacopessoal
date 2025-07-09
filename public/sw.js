if (!self.define) {
  let s,
    e = {};
  const t = (t, i) => (
    (t = new URL(t + ".js", i).href),
    e[t] ||
      new Promise((e) => {
        if ("document" in self) {
          const s = document.createElement("script");
          ((s.src = t), (s.onload = e), document.head.appendChild(s));
        } else ((s = t), importScripts(t), e());
      }).then(() => {
        let s = e[t];
        if (!s) throw new Error(`Module ${t} didn’t register its module`);
        return s;
      })
  );
  self.define = (i, n) => {
    const c =
      s ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (e[c]) return;
    let a = {};
    const r = (s) => t(s, c),
      f = { module: { uri: c }, exports: a, require: r };
    e[c] = Promise.all(i.map((s) => f[s] || r(s))).then((s) => (n(...s), a));
  };
}
define(["./workbox-3cafb6cd"], function (s) {
  "use strict";
  (importScripts(),
    self.skipWaiting(),
    s.clientsClaim(),
    s.precacheAndRoute(
      [
        {
          url: "/_next/app-build-manifest.json",
          revision: "4a05d7b341539cdc9fbb6c8e3d724105",
        },
        {
          url: "/_next/static/chunks/1299-a91989836b0e6763.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/1684-88cc874486328700.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/3455-4db37a12e2b425ab.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/3572-df5dc6c8f413ab0b.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/4bd1b696-19dd2c186ba49657.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/54a60aa6-f9d1a8d732e96ffa.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/5530-c49accab6a6fdb77.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/6116-8295f0735b2db3fe.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/619edb50-3b927bb59ad13359.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/6320-af6784e008d3970e.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/6671-934920cce1d61c2a.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/6702-cbc8e79e3b0c604f.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/6718-f5c4146ca7c47136.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/6874-7306fc49bcc5c2a5.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/6be7e44c-008bd8473f2df85a.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/70e0d97a-7bfeed817e720f44.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/712-9ace9aa06446fc76.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/7645-3297720a17c0dfc0.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/7928-4083bcf2c0bb5de2.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/7958-9cd3222f94b7c5af.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/890-aabb075d4272f03c.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/8e1d74a4-9fa265eaf9d1f692.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/9-1a17b8b57e03a12b.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/9321-df9a63d854bdbe0b.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/9359-74c77fd80a6205c4.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/9501-b527279ea66953a9.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/9547-7c685622ae6b0f9a.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-eeb7c8fa3cd92c6c.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/api/auth/%5B...nextauth%5D/route-38e8774d38f1fe29.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/api/notifications/process/route-806fc506a92b1488.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/api/trpc/%5Btrpc%5D/route-d89d92e99a60466a.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/api/ws/route-467cc6e67b4216ff.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/documents/%5BdocumentId%5D/page-4eba719d13971b87.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/documents/shared/%5Burl%5D/page-3db3e70c258cc389.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/home/page-39c588a3ad1f7b08.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/layout-d64aea855f07e041.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/lista/page-5ba21c355cdee4c4.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/not-found-bc9ec002302050da.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/notas/%5Burl%5D/page-769a87c098901510.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/notas/page-c5e8ffaf89742d9f.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/notas/view/%5Burl%5D/page-1e366c6fa5933a86.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/page-5d530eb8d05c8712.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/privacy/page-0a4fc8ae90cd515b.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/profile/loading-c0fb0508fd07bc04.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/profile/page-33e73ba34240b784.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/app/terms/page-60bdb16a7d97ecb9.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/framework-2c2be674e67eda3d.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/main-5c36253b59576499.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/main-app-0b7072609ff2128a.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/pages/_app-5d1abe03d322390c.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/pages/_error-3b2a1d523de49635.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-a29a06628dd26f8a.js",
          revision: "hZT8555twf-UbQsFHxBIw",
        },
        {
          url: "/_next/static/css/3aa1b106d9338de0.css",
          revision: "3aa1b106d9338de0",
        },
        {
          url: "/_next/static/css/a3314296bcac7191.css",
          revision: "a3314296bcac7191",
        },
        {
          url: "/_next/static/css/d38261e715b3739d.css",
          revision: "d38261e715b3739d",
        },
        {
          url: "/_next/static/hZT8555twf-UbQsFHxBIw/_buildManifest.js",
          revision: "d22b0f2e19795812e7554637c361f759",
        },
        {
          url: "/_next/static/hZT8555twf-UbQsFHxBIw/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/media/028c0d39d2e8f589-s.p.woff2",
          revision: "c47061a6ce9601b5dea8da0c9e847f79",
        },
        { url: "/favicon.ico", revision: "1005f789f08c08c08c0e4278e40b21a4" },
        {
          url: "/icons/icon-128x128.png",
          revision: "61a792851f1b2e60979dffad2bf40649",
        },
        {
          url: "/icons/icon-144x144.png",
          revision: "98e4e0560af1a4b13a9f1ef9497284fc",
        },
        {
          url: "/icons/icon-152x152.png",
          revision: "75fc7004eded605c85bb18be5d1204e5",
        },
        {
          url: "/icons/icon-192x192.png",
          revision: "b0a8ff3be02ad667bf7f296686bb940c",
        },
        {
          url: "/icons/icon-384x384.png",
          revision: "935c8770e3d79383f562e96afe40a66d",
        },
        {
          url: "/icons/icon-512x512.png",
          revision: "0ea16124568221a8249fabb070faacb4",
        },
        {
          url: "/icons/icon-72x72.png",
          revision: "0b90ef54211ebdcf541c360ff305101c",
        },
        {
          url: "/icons/icon-96x96.png",
          revision: "db57333305087c5b2f0157f2b16bffa8",
        },
        { url: "/manifest.json", revision: "fb2b06a95dd359947ae7dcf6d2f04976" },
        {
          url: "/splash/apple-splash-2048-2732.png",
          revision: "d49ba365711d03bdaa5ab6a2baecb1dc",
        },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    s.cleanupOutdatedCaches(),
    s.registerRoute(
      "/",
      new s.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({
              request: s,
              response: e,
              event: t,
              state: i,
            }) =>
              e && "opaqueredirect" === e.type
                ? new Response(e.body, {
                    status: 200,
                    statusText: "OK",
                    headers: e.headers,
                  })
                : e,
          },
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /^https:\/\/fonts\./,
      new s.CacheFirst({
        cacheName: "google-fonts",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET",
    ));
});
