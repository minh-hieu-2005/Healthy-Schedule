// Backend thật: Firebase Authentication (Google) + Cloud Firestore.
import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from "firebase/auth";
import { doc, getDoc, getFirestore, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseConfig } from "../firebase.config";
import type { Backend, CloudDoc } from "./types";

export function createFirebaseBackend(): Backend {
  const configured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
  if (!configured) {
    const notReady = () => Promise.reject(new Error("Firebase chưa được cấu hình (src/firebase.config.ts)."));
    return {
      configured: false,
      onAuth: (cb) => {
        cb(null);
        return () => {};
      },
      signInWithGoogle: notReady,
      signOut: async () => {},
      load: notReady,
      save: notReady,
      subscribe: () => () => {},
    };
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  auth.languageCode = "vi";
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  // hoàn tất đăng nhập kiểu chuyển trang (dùng khi cửa sổ bật lên bị chặn, vd. trong ứng dụng đã cài trên iPhone)
  void getRedirectResult(auth).catch(() => {});

  return {
    configured: true,
    onAuth(cb) {
      return onAuthStateChanged(auth, (u) =>
        cb(
          u
            ? {
                uid: u.uid,
                email: u.email ?? "",
                name: u.displayName ?? u.email?.split("@")[0] ?? "Bạn",
                photo: u.photoURL ?? undefined,
              }
            : null,
        ),
      );
    },
    async signInWithGoogle() {
      await setPersistence(auth, browserLocalPersistence);
      try {
        await signInWithPopup(auth, provider);
      } catch (e) {
        const code = (e as { code?: string })?.code ?? "";
        const standalone =
          window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
        // cửa sổ bật lên bị chặn / không hỗ trợ -> chuyển sang đăng nhập bằng cách chuyển trang
        if (
          code.includes("popup-blocked") ||
          code.includes("operation-not-supported") ||
          (standalone && (code.includes("internal-error") || code.includes("web-storage-unsupported")))
        ) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw e;
      }
    },
    async signOut() {
      await fbSignOut(auth);
    },
    async load(uid) {
      const snap = await getDoc(doc(db, "users", uid));
      if (!snap.exists()) return null;
      const d = snap.data();
      return typeof d.data === "string" ? { data: d.data, updatedAt: Number(d.updatedAt) || 0 } : null;
    },
    async save(uid, cloud: CloudDoc, meta) {
      await setDoc(doc(db, "users", uid), {
        data: cloud.data,
        updatedAt: cloud.updatedAt,
        email: meta.email,
        name: meta.name,
        savedAt: serverTimestamp(),
      });
    },
    subscribe(uid, cb) {
      return onSnapshot(doc(db, "users", uid), (snap) => {
        if (snap.metadata.hasPendingWrites || !snap.exists()) return;
        const d = snap.data();
        if (typeof d.data === "string") cb({ data: d.data, updatedAt: Number(d.updatedAt) || 0 });
      });
    },
  };
}
