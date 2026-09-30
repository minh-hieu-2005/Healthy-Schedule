// Thông báo hệ thống của trình duyệt (hiện cả khi bạn đang ở tab / ứng dụng khác).
const BASE = import.meta.env.BASE_URL;
let reg: ServiceWorkerRegistration | null = null;

export type NotifyPermission = NotificationPermission | "unsupported";

export const notifySupported = () => typeof window !== "undefined" && "Notification" in window;

export const notifyPermission = (): NotifyPermission =>
  notifySupported() ? Notification.permission : "unsupported";

export async function registerServiceWorker() {
  try {
    if ("serviceWorker" in navigator) reg = await navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE });
  } catch {
    reg = null; // không sao: vẫn dùng được thông báo trong trang
  }
}

export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (!notifySupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function systemNotify(title: string, body: string, tag: string): Promise<boolean> {
  if (notifyPermission() !== "granted") return false;
  const opts: NotificationOptions = { body, tag, icon: `${BASE}icon-192.png`, badge: `${BASE}icon-192.png` };
  try {
    if (reg) {
      await reg.showNotification(title, opts);
      return true;
    }
    new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}
