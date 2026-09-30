// Service worker tối giản: chỉ dùng để hiện thông báo hệ thống (nhắc uống nước,
// deadline) trên điện thoại và mở lại Smart Life khi bấm vào thông báo.
// Không lưu cache nên website luôn tải bản mới nhất.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow(self.registration.scope);
    }),
  );
});
