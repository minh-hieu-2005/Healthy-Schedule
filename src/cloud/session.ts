// Phiên đăng nhập + đồng bộ dữ liệu theo từng tài khoản.
//
// Mỗi tài khoản Google có một bản dữ liệu riêng:
//  - trên đám mây: Firestore  users/{uid}   (chỉ chủ tài khoản đọc/ghi được)
//  - bản sao trên máy: localStorage "smart-life:u:{uid}" (mở nhanh, dùng được khi mất mạng)
// Hai người dùng chung một máy vẫn không thấy dữ liệu của nhau vì khoá khác nhau
// và dữ liệu trên màn hình bị xoá ngay khi đăng xuất.
//
// Chế độ DÙNG THỬ (không cần tài khoản): dữ liệu chỉ lưu trên máy
// ("smart-life:guest"). Khi đăng nhập Gmail, dữ liệu dùng thử được chuyển vào tài khoản.
import { create } from "zustand";
import { backend, friendlyError, type AuthUser, type CloudDoc } from "./index";
import { DATA_KEYS, pickData, useStore, type AppState, type UserData } from "../store/useStore";

export type SyncState = "idle" | "saving" | "saved" | "offline" | "error" | "local";

interface SessionState {
  status: "loading" | "signedOut" | "signedIn" | "guest";
  user: AuthUser | null;
  /** dữ liệu của tài khoản đã được nạp xong */
  ready: boolean;
  sync: SyncState;
  error?: string;
}

export const useSession = create<SessionState>()(() => ({
  status: "loading",
  user: null,
  ready: false,
  sync: "idle",
}));

const LOCAL = (uid: string) => `smart-life:u:${uid}`;
const LEGACY = "smart-life-v1"; // dữ liệu của phiên bản cũ (chưa có tài khoản)
const GUEST = "smart-life:guest";
const MODE = "smart-life:mode";
const MERGE = "smart-life:merge-guest";
const GUEST_USER: AuthUser = { uid: "guest", email: "", name: "Bạn" };

let unsubStore: (() => void) | null = null;
let unsubRemote: (() => void) | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let applying = false;
let lastApplied = 0;
let lastWritten = 0;
let started = false;

const safeGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const safeSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* bộ nhớ đầy hoặc bị chặn: vẫn còn bản trên đám mây */
  }
};

function readLocal(uid: string): CloudDoc | null {
  const v = safeGet(LOCAL(uid));
  if (!v) return null;
  try {
    const d = JSON.parse(v) as CloudDoc;
    return typeof d.data === "string" ? d : null;
  } catch {
    return null;
  }
}

function filterData(raw: Record<string, unknown>): Partial<UserData> {
  return Object.fromEntries(DATA_KEYS.filter((k) => k in raw).map((k) => [k, raw[k]])) as Partial<UserData>;
}

function apply(doc: CloudDoc) {
  try {
    const raw = JSON.parse(doc.data) as Record<string, unknown>;
    applying = true;
    useStore.getState().hydrate(filterData(raw));
    lastApplied = Math.max(lastApplied, doc.updatedAt);
  } catch (e) {
    console.error("Không đọc được dữ liệu tài khoản", e);
  } finally {
    applying = false;
  }
}

async function pushNow() {
  const user = useSession.getState().user;
  if (!user) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const doc: CloudDoc = { data: JSON.stringify(pickData(useStore.getState())), updatedAt: Date.now() };
  if (useSession.getState().status === "guest") {
    safeSet(GUEST, JSON.stringify(doc));
    useSession.setState({ sync: "local" });
    return;
  }
  lastWritten = doc.updatedAt;
  lastApplied = doc.updatedAt;
  safeSet(LOCAL(user.uid), JSON.stringify(doc));
  useSession.setState({ sync: "saving" });
  try {
    await backend.save(user.uid, doc, { email: user.email, name: user.name });
    if (useSession.getState().user?.uid === user.uid) useSession.setState({ sync: "saved", error: undefined });
  } catch (e) {
    useSession.setState({ sync: navigator.onLine ? "error" : "offline", error: friendlyError(e) });
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  useSession.setState({ sync: "saving" });
  saveTimer = setTimeout(() => void pushNow(), 1200);
}

const dataChanged = (a: AppState, b: AppState) => DATA_KEYS.some((k) => a[k] !== b[k]);

function stopUser() {
  unsubStore?.();
  unsubRemote?.();
  unsubStore = unsubRemote = null;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  lastApplied = lastWritten = 0;
}

async function onSignedIn(u: AuthUser) {
  useSession.setState({ status: "signedIn", user: u, ready: false, sync: "idle", error: undefined });
  useStore.getState().resetAll();

  // 1) bản sao trên máy -> hiện ngay
  const local = readLocal(u.uid);
  if (local) apply(local);

  // 2) bản trên đám mây -> dùng nếu mới hơn
  let needPush = false;
  try {
    const remote = await backend.load(u.uid);
    if (useSession.getState().user?.uid !== u.uid) return; // đã đổi tài khoản giữa chừng
    if (remote && (!local || remote.updatedAt > local.updatedAt)) apply(remote);
    else if (!remote && local) needPush = true;
    else if (!remote && !local) needPush = importLegacy(u);
    if (mergeGuestInto(u, remote)) needPush = true;
    useSession.setState({ sync: "saved" });
  } catch (e) {
    useSession.setState({ sync: navigator.onLine ? "error" : "offline", error: friendlyError(e) });
  }

  // 3) tự lưu khi dữ liệu thay đổi, nghe thay đổi từ thiết bị khác
  unsubStore = useStore.subscribe((s, prev) => {
    if (!applying && dataChanged(s, prev)) scheduleSave();
  });
  unsubRemote = backend.subscribe(u.uid, (doc) => {
    if (doc.updatedAt > lastApplied && doc.updatedAt !== lastWritten && !saveTimer) apply(doc);
  });
  useSession.setState({ ready: true });
  if (needPush) void pushNow();
}

/** Vừa đăng nhập từ chế độ dùng thử -> chuyển dữ liệu dùng thử vào tài khoản. */
function mergeGuestInto(u: AuthUser, remote: CloudDoc | null): boolean {
  const pending = safeGet(MERGE) === "1";
  try {
    localStorage.removeItem(MERGE);
    localStorage.removeItem(MODE);
  } catch {
    /* bỏ qua */
  }
  if (!pending) return false;
  let guest: CloudDoc | null = null;
  try {
    const v = safeGet(GUEST);
    guest = v ? (JSON.parse(v) as CloudDoc) : null;
  } catch {
    guest = null;
  }
  if (!guest) return false;
  let hasGuestProfile = false;
  try {
    hasGuestProfile = !!(JSON.parse(guest.data) as { profile?: unknown }).profile;
  } catch {
    return false;
  }
  if (!hasGuestProfile) return false;
  // dữ liệu tài khoản (đã nạp ở bước trước) có hồ sơ chưa
  const remoteHasProfile = !!remote && !!useStore.getState().profile;
  const ok =
    !remoteHasProfile ||
    window.confirm(
      `Tài khoản ${u.email} đã có dữ liệu từ trước.\nThay bằng dữ liệu bạn vừa dùng thử? (Bấm "Huỷ" để giữ dữ liệu cũ của tài khoản)`,
    );
  try {
    localStorage.removeItem(GUEST);
  } catch {
    /* bỏ qua */
  }
  if (!ok) return false;
  apply({ ...guest, updatedAt: Date.now() });
  return true;
}

/** Dữ liệu của phiên bản cũ (chưa có tài khoản) -> hỏi để chuyển vào tài khoản. */
function importLegacy(u: AuthUser): boolean {
  const v = safeGet(LEGACY);
  if (!v) return false;
  try {
    const st = (JSON.parse(v) as { state?: Record<string, unknown> }).state;
    if (!st?.profile) return false;
    const ok = window.confirm(
      `Trên máy này có dữ liệu Smart Life cũ (từ trước khi có tài khoản).\nChuyển dữ liệu đó vào tài khoản ${u.email}?`,
    );
    if (!ok) return false;
    applying = true;
    useStore.getState().hydrate(filterData(st));
    applying = false;
    localStorage.removeItem(LEGACY);
    return true;
  } catch {
    return false;
  }
}

/** Gọi 1 lần khi ứng dụng khởi động. */
export function startSession() {
  if (started) return;
  started = true;
  backend.onAuth((u) => {
    const cur = useSession.getState().user;
    if (u && cur?.uid === u.uid && useSession.getState().status === "signedIn") return;
    stopUser();
    if (!u) {
      if (safeGet(MODE) === "guest") return startGuestSession();
      useStore.getState().resetAll();
      useSession.setState({ status: "signedOut", user: null, ready: false, sync: "idle" });
      return;
    }
    void onSignedIn(u);
  });
  // lưu ngay khi rời trang / chuyển tab để không mất thay đổi
  const flush = () => {
    if (saveTimer) void pushNow();
  };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("online", () => {
    if (useSession.getState().status === "signedIn") void pushNow();
  });
}

function startGuestSession() {
  stopUser();
  useSession.setState({ status: "guest", user: GUEST_USER, ready: false, sync: "local", error: undefined });
  useStore.getState().resetAll();
  const v = safeGet(GUEST);
  if (v) {
    try {
      apply(JSON.parse(v) as CloudDoc);
    } catch {
      /* dữ liệu hỏng -> bắt đầu lại */
    }
  }
  unsubStore = useStore.subscribe((s, prev) => {
    if (!applying && dataChanged(s, prev)) scheduleSave();
  });
  useSession.setState({ ready: true });
}

/** Dùng thử không cần tài khoản (dữ liệu chỉ lưu trên máy này). */
export function startGuest() {
  safeSet(MODE, "guest");
  startGuestSession();
}

/** Thoát chế độ dùng thử và xoá dữ liệu dùng thử trên máy. */
export function exitGuest() {
  stopUser();
  try {
    localStorage.removeItem(GUEST);
    localStorage.removeItem(MODE);
  } catch {
    /* bỏ qua */
  }
  useStore.getState().resetAll();
  useSession.setState({ status: "signedOut", user: null, ready: false, sync: "idle" });
}

export async function signIn() {
  if (useSession.getState().status === "guest") {
    if (saveTimer) await pushNow();
    safeSet(MERGE, "1");
  }
  try {
    await backend.signInWithGoogle();
  } catch (e) {
    try {
      localStorage.removeItem(MERGE);
    } catch {
      /* bỏ qua */
    }
    throw e;
  }
}

export async function signOut() {
  if (saveTimer) await pushNow();
  stopUser();
  await backend.signOut();
}

export const backendConfigured = backend.configured;
