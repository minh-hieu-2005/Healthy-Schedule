// Service worker của Smart Life
//  - Lưu sẵn giao diện (HTML, JS, CSS, font, icon) để mở được như ứng dụng, kể cả khi mất mạng.
//  - Trang HTML: ưu tiên mạng (luôn lấy bản mới nhất), mất mạng thì dùng bản đã lưu.
//  - File trong /assets/ có mã băm trong tên nên không bao giờ đổi -> dùng bản đã lưu cho nhanh.
//  - Dữ liệu tài khoản (Firebase) KHÔNG đi qua đây; Firebase + bản sao trên máy tự lo phần đó.
//  - Bấm vào thông báo hệ thống -> mở lại Smart Life.
const CACHE = "smart-life-v3";
const SCOPE = self.registration.scope; // .../Healthy-Schedule/
const INDEX = new URL("index.html", SCOPE).href;
const SHELL = ["", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "favicon.svg"].map(
  (p) => new URL(p, SCOPE).href,
);

const save = (req, res) => {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
};

/** Lưu sẵn trang chính + các file JS/CSS nó cần ngay lần đầu. */
async function precache() {
  const cache = await caches.open(CACHE);
  await Promise.all(SHELL.map((u) => cache.add(new Request(u, { cache: "reload" })).catch(() => {})));
  try {
    const html = await (await fetch(SCOPE, { cache: "reload" })).text();
    const assets = [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)].map((m) => new URL(m[1], SCOPE).href);
    await Promise.all(assets.map((u) => cache.add(u).catch(() => {})));
  } catch {
    /* đang mất mạng: sẽ lưu dần khi dùng */
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return; // Firebase, Google… để trình duyệt tự xử lý

  // Trang HTML: mạng trước, mất mạng thì dùng bản đã lưu
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => save(INDEX, res))
        .catch(async () => (await caches.match(INDEX)) || (await caches.match(SCOPE)) || Response.error()),
    );
    return;
  }

  // /assets/ (tên có mã băm): dùng bản đã lưu, chưa có thì tải rồi lưu
  if (url.pathname.includes("/assets/")) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => save(req, res))));
    return;
  }

  // icon, ảnh, manifest: trả bản đã lưu ngay, đồng thời cập nhật ngầm
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => save(req, res))
        .catch(() => hit || Response.error());
      return hit || net;
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow(new URL("#/hom-nay", SCOPE).href);
    }),
  );
});
