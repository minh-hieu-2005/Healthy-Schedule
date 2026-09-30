import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, Link } from "react-router-dom";
import { BarChart3, CalendarCheck2, ListTodo, Loader2, Settings as SettingsIcon } from "lucide-react";
import { computeTodayPlan, todaySig, useStore } from "./store/useStore";
import { summarize } from "./engine/predict";
import { todayStr } from "./engine/time";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Today from "./pages/Today";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Logo from "./components/Logo";
import UserMenu from "./components/UserMenu";
import ReminderCenter from "./components/ReminderCenter";
import { useSession } from "./cloud/session";

// Trang thống kê dùng thư viện biểu đồ khá nặng -> chỉ tải khi mở trang
const Stats = lazy(() => import("./pages/Stats"));

const NAV = [
  { to: "/hom-nay", label: "Hôm nay", icon: CalendarCheck2 },
  { to: "/task", label: "Task", icon: ListTodo },
  { to: "/thong-ke", label: "Thống kê", icon: BarChart3 },
  { to: "/cai-dat", label: "Cài đặt", icon: SettingsIcon },
];

/** Giữ lịch hôm nay và nhật ký luôn khớp với dữ liệu mới nhất. */
function usePlanSync() {
  const state = useStore();
  const { profile, tasks, logs, plans, checks } = state;
  const today = todayStr();

  useEffect(() => {
    if (!profile) return;
    const s = useStore.getState();
    const stored = s.plans[today];
    if (!stored || stored.sig !== todaySig(s, today)) s.savePlan(computeTodayPlan(s, today));
  }, [profile, tasks, logs, today]);

  useEffect(() => {
    const plan = plans[today];
    if (!plan) return;
    const log = summarize(plan, new Set(checks[today] ?? []), tasks);
    const s = useStore.getState();
    if (JSON.stringify(s.logs[today]) !== JSON.stringify(log)) s.saveLog(log);
  }, [plans, checks, tasks, today]);
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="sticky top-0 z-40 bg-bg/85 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="focus-ring rounded-xl" aria-label="Smart Life – trang giới thiệu">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-1" aria-label="Điều hướng chính">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `focus-ring flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive ? "bg-ink text-white" : "text-ink-2 hover:bg-brand-soft"
                  }`
                }
              >
                <n.icon size={17} />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <UserMenu />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-5 md:pt-8">{children}</main>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]"
        aria-label="Điều hướng chính"
      >
        <div className="grid grid-cols-4">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `focus-ring flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                  isActive ? "text-brand" : "text-ink-3"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`rounded-full px-3 py-0.5 ${isActive ? "bg-brand-soft" : ""}`}>
                    <n.icon size={20} />
                  </span>
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      <ReminderCenter />
    </div>
  );
}

export function Splash({ text = "Đang tải dữ liệu của bạn…" }: { text?: string }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 blob-bg">
      <Logo />
      <p className="flex items-center gap-2 text-ink-2" role="status">
        <Loader2 size={18} className="animate-spin" /> {text}
      </p>
    </div>
  );
}

/** Chỉ cho vào khi đã đăng nhập và dữ liệu của tài khoản đã nạp xong. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { status, ready } = useSession();
  const loc = useLocation();
  if (status === "loading" || (status === "signedIn" && !ready)) return <Splash />;
  if (status === "signedOut")
    return <Navigate to={`/dang-nhap?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return <>{children}</>;
}

function RequireProfile({ children }: { children: ReactNode }) {
  const profile = useStore((s) => s.profile);
  return (
    <RequireAuth>
      {profile ? <AppShell>{children}</AppShell> : <Navigate to="/bat-dau" replace />}
    </RequireAuth>
  );
}

export default function App() {
  usePlanSync();
  const { pathname } = useLocation();
  // Lưu ý: dùng dấu ngoặc {} để effect KHÔNG trả về giá trị. Ở Chrome bản mới,
  // window.scrollTo() trả về Promise; nếu trả về từ effect, React sẽ lỗi khi chuyển trang.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dang-nhap" element={<Login />} />
      <Route path="/bat-dau" element={<RequireAuth><Onboarding /></RequireAuth>} />
      <Route path="/hom-nay" element={<RequireProfile><Today /></RequireProfile>} />
      <Route path="/task" element={<RequireProfile><Tasks /></RequireProfile>} />
      <Route
        path="/thong-ke"
        element={
          <RequireProfile>
            <Suspense fallback={<div className="card p-8 text-center text-ink-3">Đang tải biểu đồ…</div>}>
              <Stats />
            </Suspense>
          </RequireProfile>
        }
      />
      <Route path="/cai-dat" element={<RequireProfile><Settings /></RequireProfile>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
