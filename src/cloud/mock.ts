// Backend GIẢ LẬP — chỉ dùng cho kiểm thử tự động (VITE_AUTH_MODE=mock).
// "Đám mây" được mô phỏng bằng localStorage với khoá riêng, và "đăng nhập Google"
// là một hộp chọn email. Không bao giờ được đưa vào bản chạy thật.
import type { AuthUser, Backend, CloudDoc } from "./types";

const CLOUD = "mock-cloud:";
const SESSION = "mock-session";

export function createMockBackend(): Backend {
  const listeners = new Set<(u: AuthUser | null) => void>();
  const current = (): AuthUser | null => {
    try {
      const v = localStorage.getItem(SESSION);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  };
  const emit = () => listeners.forEach((l) => l(current()));
  return {
    configured: true,
    onAuth(cb) {
      listeners.add(cb);
      setTimeout(() => cb(current()), 50);
      return () => listeners.delete(cb);
    },
    async signInWithGoogle() {
      const email = window.prompt("[Mock] Nhập Gmail để đăng nhập", "ban.a@gmail.com");
      if (!email) throw Object.assign(new Error("closed"), { code: "auth/popup-closed-by-user" });
      const uid = "mock_" + email.replace(/[^a-z0-9]/gi, "_");
      localStorage.setItem(SESSION, JSON.stringify({ uid, email, name: email.split("@")[0] }));
      emit();
    },
    async signOut() {
      localStorage.removeItem(SESSION);
      emit();
    },
    async load(uid) {
      await new Promise((r) => setTimeout(r, 120));
      const v = localStorage.getItem(CLOUD + uid);
      return v ? (JSON.parse(v) as CloudDoc) : null;
    },
    async save(uid, doc) {
      localStorage.setItem(CLOUD + uid, JSON.stringify(doc));
    },
    subscribe() {
      return () => {};
    },
  };
}
