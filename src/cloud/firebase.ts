// Backend thật: Firebase Authentication (Google) + Cloud Firestore.
import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
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
      await signInWithPopup(auth, provider);
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
