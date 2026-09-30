// Trạng thái giao diện tạm thời (không lưu lên tài khoản):
// hộp thông báo 🔔, đồng hồ tập trung, lời mời cài app.
import { create } from "zustand";
import type { Reminder } from "../engine/reminders";

export interface InboxItem extends Reminder {
  at: number;
  read: boolean;
}

interface InboxState {
  items: InboxItem[];
  /** nhắc nhở đang hiện dạng toast ở cuối màn hình */
  toast: InboxItem[];
  push: (r: Reminder[]) => void;
  dismissToast: (id?: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
}

export const useInbox = create<InboxState>()((set) => ({
  items: [],
  toast: [],
  push: (rs) =>
    set((s) => {
      const fresh = rs
        .filter((r) => !s.items.some((x) => x.id === r.id && Date.now() - x.at < 60000))
        .map((r) => ({ ...r, at: Date.now(), read: false }));
      return { items: [...fresh, ...s.items].slice(0, 30), toast: [...s.toast, ...fresh] };
    }),
  dismissToast: (id) => set((s) => ({ toast: id ? s.toast.filter((t) => t.id !== id) : [] })),
  markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id), toast: s.toast.filter((t) => t.id !== id) })),
}));

export interface FocusSession {
  date: string;
  blockKey: string;
  taskId?: string;
  title: string;
  /** thời điểm kết thúc dự kiến (ms) */
  endAt: number;
  startedAt: number;
  pausedLeft?: number; // còn lại (ms) khi tạm dừng
  minimized: boolean;
}

interface FocusState {
  session: FocusSession | null;
  start: (s: Omit<FocusSession, "startedAt" | "minimized">) => void;
  pause: () => void;
  resume: () => void;
  minimize: (v: boolean) => void;
  stop: () => void;
}

export const useFocus = create<FocusState>()((set) => ({
  session: null,
  start: (s) => set({ session: { ...s, startedAt: Date.now(), minimized: false } }),
  pause: () =>
    set((st) => (st.session && st.session.pausedLeft === undefined ? { session: { ...st.session, pausedLeft: Math.max(0, st.session.endAt - Date.now()) } } : st)),
  resume: () =>
    set((st) =>
      st.session && st.session.pausedLeft !== undefined
        ? { session: { ...st.session, endAt: Date.now() + st.session.pausedLeft, pausedLeft: undefined } }
        : st,
    ),
  minimize: (v) => set((st) => (st.session ? { session: { ...st.session, minimized: v } } : st)),
  stop: () => set({ session: null }),
}));

// ---- Cài đặt như ứng dụng (PWA) ----
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallState {
  canInstall: boolean;
  installed: boolean;
  install: () => Promise<boolean>;
}

let deferred: BeforeInstallPromptEvent | null = null;

export const useInstall = create<InstallState>()((set) => ({
  canInstall: false,
  installed:
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true),
  install: async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const r = await deferred.userChoice;
    deferred = null;
    set({ canInstall: false, installed: r.outcome === "accepted" });
    return r.outcome === "accepted";
  },
}));

export function listenInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    useInstall.setState({ canInstall: true });
  });
  window.addEventListener("appinstalled", () => useInstall.setState({ installed: true, canInstall: false }));
}

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
