import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CloudCheck, Loader2, LockKeyhole, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import Logo from "../components/Logo";
import { backendConfigured, signIn, startGuest, useSession } from "../cloud/session";
import { friendlyError } from "../cloud";
import { useStore } from "../store/useStore";

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/hom-nay";
  const demo = params.get("demo") === "1";
  const { status, ready, user } = useSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const done = useRef(false);

  // đăng nhập xong + đã nạp dữ liệu -> chuyển trang
  useEffect(() => {
    if (status !== "signedIn" || !ready || done.current) return;
    done.current = true;
    const st = useStore.getState();
    if (demo) {
      if (
        !st.profile ||
        window.confirm("Tài khoản của bạn đã có dữ liệu. Thay toàn bộ bằng dữ liệu mẫu để xem thử?")
      )
        st.loadDemo();
      nav("/hom-nay", { replace: true });
      return;
    }
    nav(st.profile ? next : "/bat-dau", { replace: true });
  }, [status, ready, demo, next, nav]);

  const tryGuest = () => {
    startGuest();
    const st = useStore.getState();
    if (demo || !st.profile) {
      if (demo) st.loadDemo();
      nav(demo ? "/hom-nay" : "/bat-dau", { replace: true });
    } else nav("/hom-nay", { replace: true });
  };
  const isGuest = status === "guest";

  const login = async () => {
    setErr("");
    setBusy(true);
    try {
      await signIn();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const waiting = busy || (status === "signedIn" && !ready) || status === "loading";


  return (
    <div className="min-h-dvh blob-bg flex flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 h-16 flex items-center">
        <Link to="/" className="focus-ring rounded-xl" aria-label="Về trang giới thiệu">
          <Logo />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="card w-full max-w-md p-6 md:p-8 pop-in">
          <h1 className="text-2xl md:text-3xl font-extrabold">
            {isGuest ? "Lưu dữ liệu vào tài khoản" : "Đăng nhập / Đăng ký"}
          </h1>
          <p className="mt-2 text-ink-2">
            {isGuest
              ? "Đăng nhập Gmail – toàn bộ lịch, task và thống kê bạn vừa dùng thử sẽ được chuyển vào tài khoản."
              : "Dùng tài khoản Gmail của bạn. Lần đầu đăng nhập, Smart Life sẽ tự tạo tài khoản mới – không cần mật khẩu riêng."}
          </p>

          {!backendConfigured ? (
            <div className="mt-6 rounded-2xl bg-amber-soft border border-amber-line p-4 text-sm" role="alert">
              <b>Chưa cấu hình đăng nhập.</b> Hãy điền thông tin Firebase vào file <code>src/firebase.config.ts</code> (xem README).
            </div>
          ) : (
            <button
              className="btn w-full mt-6 py-3.5 text-base bg-inverse text-on-inverse hover:opacity-90 shadow-lg"
              onClick={login}
              disabled={waiting}
            >
              {waiting ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
              {status === "signedIn" && !ready
                ? `Đang tải dữ liệu của ${user?.email ?? "bạn"}…`
                : busy
                  ? "Đang mở cửa sổ Google…"
                  : "Tiếp tục với Google"}
            </button>
          )}

          {!isGuest && (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-ink-3">
                <span className="flex-1 border-t border-line" /> hoặc <span className="flex-1 border-t border-line" />
              </div>
              <button className="btn btn-ghost w-full py-3" onClick={tryGuest}>
                <Sparkles size={18} className="text-brand" /> {demo ? "Xem thử với dữ liệu mẫu" : "Dùng thử không cần tài khoản"}
              </button>
              <p className="mt-2 text-xs text-ink-3 text-center">Dữ liệu dùng thử lưu trên máy này. Đăng nhập sau vẫn giữ được.</p>
            </>
          )}

          {err && (
            <p className="mt-3 text-sm text-danger bg-danger-soft rounded-xl p-3" role="alert">
              {err}
            </p>
          )}

          <ul className="mt-6 space-y-2.5 text-sm text-ink-2">
            <li className="flex gap-2.5">
              <LockKeyhole size={18} className="text-brand shrink-0" />
              Mỗi tài khoản có dữ liệu riêng – người khác không xem được lịch của bạn.
            </li>
            <li className="flex gap-2.5">
              <CloudCheck size={18} className="text-brand shrink-0" />
              Lịch, task và thống kê được lưu trên đám mây: đổi máy vẫn còn nguyên.
            </li>
            <li className="flex gap-2.5">
              <ShieldCheck size={18} className="text-brand shrink-0" />
              Smart Life chỉ dùng tên, email và ảnh đại diện Google của bạn.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
