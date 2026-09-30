import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, Check, Flame, ListPlus, MousePointerClick, PartyPopper, Share2, Smartphone, X } from "lucide-react";
import { useStore } from "../../store/useStore";
import { useInstall } from "../../store/ui";
import { notifyPermission, requestNotifyPermission, systemNotify } from "../../lib/notify";
import { motivation, weekRecap } from "../../engine/motivation";
import { addDays, fmtDateShort, fmtDuration, fmtHours, todayStr, weekday } from "../../engine/time";

/** "Bắt đầu với Smart Life": 4 bước đầu tiên cho người mới. */
export function GettingStarted({ onAddTask }: { onAddTask: () => void }) {
  const hasTask = useStore((s) => s.tasks.length > 0);
  const hasCheck = useStore((s) => Object.values(s.checks).some((c) => c.length > 0));
  const hide = useStore((s) => s.prefs.hideGettingStarted);
  const setPrefs = useStore((s) => s.setPrefs);
  const { installed, installOrGuide } = useInstall();
  const [perm, setPerm] = useState(notifyPermission());

  const steps = [
    { id: "task", icon: ListPlus, title: "Thêm task đầu tiên", done: hasTask, action: onAddTask, label: "Thêm" },
    { id: "tick", icon: MousePointerClick, title: "Tick một hoạt động đã làm trên lịch", done: hasCheck },
    {
      id: "notify",
      icon: BellRing,
      title: "Bật thông báo nhắc nhở",
      done: perm === "granted" || perm === "unsupported",
      action: async () => {
        const p = await requestNotifyPermission();
        setPerm(p);
        if (p === "granted") void systemNotify("Smart Life", "Đã bật thông báo! 🎉", "welcome");
      },
      label: perm === "denied" ? undefined : "Bật",
      note: perm === "denied" ? "Trình duyệt đang chặn – bật lại trong cài đặt trang web" : undefined,
    },
    {
      id: "install",
      icon: Smartphone,
      title: "Cài Smart Life lên màn hình chính",
      done: installed,
      action: () => void installOrGuide(),
      label: "Tải về",
    },
  ];
  const doneN = steps.filter((s) => s.done).length;
  if (hide || doneN === steps.length) return null;

  return (
    <section className="card p-5" aria-label="Bắt đầu với Smart Life">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">Bắt đầu với Smart Life</h2>
        <button
          className="focus-ring rounded-full p-1 text-ink-3 hover:bg-brand-soft"
          onClick={() => setPrefs({ hideGettingStarted: true })}
          aria-label="Ẩn hướng dẫn"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-sunken overflow-hidden" aria-hidden="true">
        <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${(doneN / steps.length) * 100}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-ink-3">
        {doneN}/{steps.length} bước
      </p>
      <ul className="mt-3 space-y-2">
        {steps.map((st) => (
          <li key={st.id} className="flex items-center gap-3">
            <span
              className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${
                st.done ? "bg-ok-soft text-ok" : "bg-brand-soft text-brand"
              }`}
            >
              {st.done ? <Check size={16} strokeWidth={3} /> : <st.icon size={16} />}
            </span>
            <span className={`flex-1 text-sm ${st.done ? "line-through text-ink-3" : "font-semibold"}`}>
              {st.title}
              {st.note && <span className="block text-xs font-normal text-ink-3">{st.note}</span>}
            </span>
            {!st.done && st.action && st.label && (
              <button className="btn btn-ghost text-xs py-1.5 px-3" onClick={st.action}>
                {st.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Chip chuỗi ngày 🔥 trên thẻ tổng quan. */
export function StreakChip() {
  const logs = useStore((s) => s.logs);
  const sleepActual = useStore((s) => s.sleepActual);
  const water = useStore((s) => s.water);
  const goal = useStore((s) => s.reminders.waterGoal);
  const tasks = useStore((s) => s.tasks);
  const target = useStore((s) => s.profile?.sleepTarget ?? 480);
  const m = useMemo(
    () => motivation({ logs, sleepActual, water, waterGoal: goal, tasks, sleepTarget: target }),
    [logs, sleepActual, water, goal, tasks, target],
  );
  if (m.streak <= 0) return null;
  return (
    <Link
      to="/thong-ke?muc=thanh-tich"
      className="chip bg-coral-soft text-hot hover:opacity-90"
      title="Số ngày liên tiếp bạn hoàn thành ít nhất 70% lịch"
    >
      <Flame size={14} /> Chuỗi {m.streak} ngày
    </Link>
  );
}

/** Chúc mừng khi xong hết task hôm nay (1 lần mỗi ngày). */
export function Celebration({ allDone }: { allDone: boolean }) {
  const today = todayStr();
  const celebrated = useStore((s) => !!s.celebrated[today]);
  const markCelebrated = useStore((s) => s.markCelebrated);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (allDone && !celebrated) {
      setShow(true);
      markCelebrated(today);
    }
  }, [allDone, celebrated, markCelebrated, today]);
  if (!show) return null;
  const colors = ["#6c47ff", "#d4ff3a", "#ff6b4a", "#1baf7a", "#eda100", "#e87ba4"];
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-5 bg-night/60" role="dialog" aria-modal="true" aria-label="Chúc mừng">
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 48 }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              background: colors[i % colors.length],
              animationDelay: `${(i % 12) * 0.12}s`,
              animationDuration: `${2.4 + (i % 5) * 0.3}s`,
            }}
          />
        ))}
      </div>
      <div className="card p-7 max-w-sm text-center pop-in relative">
        <PartyPopper size={52} className="mx-auto text-brand" />
        <h2 className="mt-3 text-2xl font-extrabold">Xong hết việc hôm nay!</h2>
        <p className="mt-2 text-ink-2">Bạn đã hoàn thành tất cả task trong lịch. Giờ thì nghỉ ngơi, giải trí và ngủ đủ giấc nhé 😴</p>
        <button className="btn btn-primary mt-5 w-full" onClick={() => setShow(false)}>
          Tuyệt vời!
        </button>
      </div>
    </div>
  );
}

/** Thẻ tổng kết tuần trước (hiện 1 lần mỗi tuần). */
export function WeeklyRecapCard() {
  const s = useStore();
  const today = todayStr();
  const lastMonday = addDays(today, -((weekday(today) + 6) % 7) - 7);
  const recap = useMemo(
    () =>
      weekRecap(
        { logs: s.logs, sleepActual: s.sleepActual, water: s.water, waterGoal: s.reminders.waterGoal, tasks: s.tasks, sleepTarget: s.profile?.sleepTarget ?? 480 },
        lastMonday,
      ),
    [s.logs, s.sleepActual, s.water, s.reminders.waterGoal, s.tasks, s.profile, lastMonday],
  );
  const [copied, setCopied] = useState(false);
  if (s.recapSeen === lastMonday || recap.days < 3) return null;
  const text =
    `📊 Tuần ${fmtDateShort(recap.from)}–${fmtDateShort(recap.to)} của mình trên Smart Life:\n` +
    `✅ Hoàn thành ${Math.round(recap.completion * 100)}% lịch\n` +
    `🎯 Làm task ${fmtDuration(recap.taskDoneMin)}\n` +
    (recap.avgSleepActual ? `😴 Ngủ trung bình ${fmtHours(recap.avgSleepActual)}\n` : "") +
    `💧 ${recap.waterDays} ngày uống đủ nước`;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      /* người dùng huỷ chia sẻ */
    }
  };
  return (
    <section className="card p-5 bg-night text-white border-0 relative overflow-hidden" aria-label="Tổng kết tuần trước">
      <button
        className="absolute top-3 right-3 focus-ring rounded-full p-1.5 text-white/70 hover:bg-white/10"
        onClick={() => s.setRecapSeen(lastMonday)}
        aria-label="Đóng tổng kết tuần"
      >
        <X size={16} />
      </button>
      <p className="text-sm font-semibold text-lime">📊 Tổng kết tuần trước</p>
      <p className="text-xs text-white/60">
        {fmtDateShort(recap.from)} – {fmtDateShort(recap.to)}
      </p>
      <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ["Hoàn thành lịch", `${Math.round(recap.completion * 100)}%`],
          ["Làm task", fmtDuration(recap.taskDoneMin)],
          ["Ngủ thực tế TB", recap.avgSleepActual ? fmtHours(recap.avgSleepActual) : "–"],
          ["Uống đủ nước", `${recap.waterDays}/7 ngày`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white/10 p-2.5">
            <dt className="text-[11px] text-white/60">{k}</dt>
            <dd className="font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn btn-lime text-sm py-2" onClick={share}>
          <Share2 size={16} /> {copied ? "Đã sao chép!" : "Chia sẻ"}
        </button>
        <Link to="/thong-ke" className="btn bg-white/10 text-white text-sm py-2 hover:bg-white/20" onClick={() => s.setRecapSeen(lastMonday)}>
          Xem chi tiết
        </Link>
      </div>
    </section>
  );
}
