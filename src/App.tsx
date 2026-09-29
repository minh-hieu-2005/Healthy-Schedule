import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, Link } from "react-router-dom";
import { BarChart3, CalendarCheck2, Crown, ListTodo, Settings as SettingsIcon } from "lucide-react";
import { computeTodayPlan, todaySig, useStore } from "./store/useStore";
import { summarize } from "./engine/predict";
import { todayStr } from "./engine/time";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Today from "./pages/Today";
import Tasks from "./pages/Tasks";
import Premium from "./pages/Premium";
import Settings from "./pages/Settings";
import Logo from "./components/Logo";

// Trang thống kê dùng thư viện biểu đồ khá nặng -> chỉ tải khi mở trang
const Stats = lazy(() => import("./pages/Stats"));

const NAV = [
  { to: "/hom-nay", label: "Hôm nay", icon: CalendarCheck2 },
  { to: "/task", label: "Task", icon: ListTodo },
  { to: "/thong-ke", label: "Thống kê", icon: BarChart3 },
  { to: "/premium", label: "Premium", icon: Crown },
  { to: "/cai-dat", label: "Cài đặt", icon: SettingsIcon },
];

/** Giữ lịch hôm nay và nhật ký luôn khớp với dữ liệu mới nhất. */
function usePlanSync() {
  const state = useStore();
  const { profile, tasks, premium, studyAtSchool, urgentDates, logs, plans, checks } = state;
  const today = todayStr();

  useEffect(() => {
    if (!profile) return;
    const s = useStore.getState();
    const stored = s.plans[today];
    if (!stored || stored.sig !== todaySig(s, today)) s.savePlan(computeTodayPlan(s, today));
  }, [profile, tasks, premium, studyAtSchool, urgentDates, logs, today]);

  useEffect(() => {
    const plan = plans[today];
    if (!plan) return;
    const log = summarize(plan, new Set(checks[today] ?? []), tasks);
    const s = useStore.getState();
    if (JSON.stringify(s.logs[today]) !== JSON.stringify(log)) s.saveLog(log);
  }, [plans, checks, tasks, today]);
}

function AppShell({ children }: { children: ReactNode }) {
  const premium = useStore((s) => s.premium);
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
          {premium ? (
            <span className="chip bg-lime text-ink">
              <Crown size={14} /> Premium
            </span>
          ) : (
            <Link to="/premium" className="btn btn-lime text-sm py-2 px-3.5">
              <Crown size={15} /> Nâng cấp
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-5 md:pt-8">{children}</main>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]"
        aria-label="Điều hướng chính"
      >
        <div className="grid grid-cols-5">
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
    </div>
  );
}

function RequireProfile({ children }: { children: ReactNode }) {
  const profile = useStore((s) => s.profile);
  if (!profile) return <Navigate to="/" replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  usePlanSync();
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/bat-dau" element={<Onboarding />} />
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
      <Route path="/premium" element={<RequireProfile><Premium /></RequireProfile>} />
      <Route path="/cai-dat" element={<RequireProfile><Settings /></RequireProfile>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
