import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CloudCheck, CloudOff, Loader2, LogOut, Settings as SettingsIcon } from "lucide-react";
import { signOut, useSession, type SyncState } from "../cloud/session";

export function Avatar({ size = 36 }: { size?: number }) {
  const user = useSession((s) => s.user);
  const [broken, setBroken] = useState(false);
  if (!user) return null;
  const initials = (user.name || user.email)
    .split(/\s+/)
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();
  return user.photo && !broken ? (
    <img
      src={user.photo}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="rounded-full object-cover bg-brand-soft"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="rounded-full bg-brand text-white font-bold flex items-center justify-center"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {initials}
    </span>
  );
}

export const SYNC_LABEL: Record<SyncState, string> = {
  idle: "Đang kết nối…",
  saving: "Đang lưu…",
  saved: "Đã lưu lên tài khoản",
  offline: "Mất mạng – sẽ lưu khi có mạng lại",
  error: "Chưa lưu được lên tài khoản",
};

export function SyncBadge() {
  const sync = useSession((s) => s.sync);
  const Icon = sync === "saving" || sync === "idle" ? Loader2 : sync === "saved" ? CloudCheck : CloudOff;
  return (
    <span className={`flex items-center gap-1.5 text-xs ${sync === "error" || sync === "offline" ? "text-[#b8431a]" : "text-ink-3"}`}>
      <Icon size={14} className={sync === "saving" || sync === "idle" ? "animate-spin" : ""} />
      {SYNC_LABEL[sync]}
    </span>
  );
}

export default function UserMenu() {
  const user = useSession((s) => s.user);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  return (
    <div className="relative" ref={ref}>
      <button
        className="focus-ring rounded-full ring-2 ring-white shadow"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tài khoản ${user.email}`}
      >
        <Avatar />
      </button>
      {open && (
        <div role="menu" className="pop-in absolute right-0 mt-2 w-72 card p-2 shadow-2xl z-50">
          <div className="flex items-center gap-3 p-3">
            <Avatar size={42} />
            <div className="min-w-0">
              <p className="font-bold truncate">{user.name}</p>
              <p className="text-sm text-ink-3 truncate">{user.email}</p>
            </div>
          </div>
          <div className="px-3 pb-2">
            <SyncBadge />
          </div>
          <div className="border-t border-line my-1" />
          <Link
            role="menuitem"
            to="/cai-dat"
            onClick={() => setOpen(false)}
            className="focus-ring flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-brand-soft"
          >
            <SettingsIcon size={17} /> Cài đặt
          </Link>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="focus-ring w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#c2361a] hover:bg-coral-soft"
          >
            <LogOut size={17} /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
