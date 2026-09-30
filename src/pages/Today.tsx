import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  BrainCircuit,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Info,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { computeTodayPlan, peakFor, useStore } from "../store/useStore";
import { planRange, lastOverloadBefore, OVERLOAD_GAP_DAYS, overloadAllowedOn } from "../engine/scheduler";
import { predict } from "../engine/predict";
import type { Block, DayPlan, PlanWarning, Task } from "../engine/types";
import {
  addDays,
  diffDays,
  fmtDateShort,
  fmtDuration,
  fmtHours,
  fmtTime,
  relDayLabel,
  todayStr,
  WEEKDAY_SHORT,
  weekday,
} from "../engine/time";
import { sleepMinutes } from "../engine/motivation";
import { CAT, LEVEL_META, PRIORITY_META } from "../lib/categories";
import { ProgressRing, SectionTitle } from "../components/ui";
import TaskForm from "../components/TaskForm";
import QuickAdd from "../components/QuickAdd";
import NowNext, { useNowMin } from "../components/today/NowNext";
import BlockSheet from "../components/today/BlockSheet";
import { SleepCheckIn, WaterTracker } from "../components/today/Health";
import { Celebration, GettingStarted, StreakChip, WeeklyRecapCard } from "../components/today/Motivation";

const SKIP_LABEL = (key: string, plan: DayPlan | undefined, fallback: Record<string, string>) =>
  plan?.blocks.find((b) => b.key === key)?.title ?? fallback[key] ?? key;

export default function Today() {
  const s = useStore();
  const today = todayStr();
  const loc = useLocation();
  const [date, setDate] = useState(today);
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<Block | null>(null);
  const quickRef = useRef<HTMLDivElement>(null);

  // mở trang từ thông báo "Xem lịch" -> luôn về hôm nay
  useEffect(() => {
    setDate(todayStr());
  }, [loc.key]);

  // lối tắt "Thêm task" từ biểu tượng ứng dụng (nhấn giữ icon): #/hom-nay?them=1
  const nav = useNavigate();
  useEffect(() => {
    if (new URLSearchParams(loc.search).has("them")) {
      setAdding(true);
      nav("/hom-nay", { replace: true });
    }
  }, [loc.search, nav]);

  const peak = useMemo(() => peakFor(s.logs, today), [s.logs, today]);
  const range = useMemo(
    () =>
      s.profile
        ? planRange(
            { profile: s.profile, tasks: s.tasks, logs: s.logs, today, peak, overrides: s.overrides, todayPlan: s.plans[today] },
            7,
          )
        : [],
    [s.profile, s.tasks, s.logs, s.plans, s.overrides, today, peak],
  );
  const offset = diffDays(today, date);
  const plan: DayPlan | undefined = offset >= 0 ? range[offset] : s.plans[date];
  const tomorrowPred = useMemo(() => predict(s.logs, addDays(today, 1)), [s.logs, today]);

  const checked = new Set(s.checks[date] ?? []);
  const taskMap = new Map(s.tasks.map((t) => [t.id, t]));
  const isDone = (b: Block) =>
    checked.has(b.key) || (!!b.taskId && !!taskMap.get(b.taskId)?.done && taskMap.get(b.taskId)?.doneDate === date);
  const canCheck = offset <= 0;

  const toggle = (b: Block) => {
    const t = b.taskId ? taskMap.get(b.taskId) : undefined;
    if (t?.done && t.doneDate === date && !checked.has(b.key)) {
      s.setTaskDone(t.id, false);
      return;
    }
    s.toggleCheck(date, b.key);
  };

  const days = Array.from({ length: 10 }, (_, i) => addDays(today, i - 3));
  const lastOv = lastOverloadBefore(s.logs, today);

  // xong hết task của hôm nay -> chúc mừng
  const todayPlan = s.plans[today];
  const todayTaskBlocks = (todayPlan?.blocks ?? []).filter((b) => b.cat === "task" && !b.missed);
  const todayChecked = new Set(s.checks[today] ?? []);
  const allTasksDone =
    todayTaskBlocks.length > 0 &&
    todayTaskBlocks.every((b) => todayChecked.has(b.key) || !!taskMap.get(b.taskId!)?.done) &&
    (todayPlan?.unfit.length ?? 0) === 0;

  if (!plan) {
    return (
      <div className="space-y-5">
        <DayStrip days={days} date={date} setDate={setDate} today={today} plans={s.plans} />
        <div className="card p-8 text-center text-ink-2">Không có dữ liệu lịch cho ngày {fmtDateShort(date)}.</div>
      </div>
    );
  }

  const total = plan.blocks.length;
  const doneCount = plan.blocks.filter(isDone).length;
  const taskMin = plan.blocks.filter((b) => b.cat === "task").reduce((a, b) => a + b.end - b.start, 0);
  const lv = LEVEL_META[plan.level];
  const hour = new Date().getHours();
  const hello = hour < 11 ? "Chào buổi sáng" : hour < 14 ? "Chào buổi trưa" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const isToday = date === today;
  const lastNight = s.sleepActual[date];
  const showSleepCheck = isToday && !lastNight && hour < 14;
  const addTask = () => {
    if (window.matchMedia("(min-width: 640px)").matches) setAdding(true);
    else {
      quickRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      quickRef.current?.querySelector("input")?.focus();
    }
  };

  return (
    <div className="space-y-5">
      <DayStrip days={days} date={date} setDate={setDate} today={today} plans={s.plans} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          {/* Tổng quan ngày */}
          <section className="card p-5 md:p-6 blob-bg">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-3">
                  {isToday ? `${hello}${s.profile?.name ? `, ${s.profile.name}` : ""} 👋` : relDayLabel(date, today)}
                </p>
                <h1 className="text-2xl md:text-3xl font-extrabold mt-0.5">
                  {isToday ? "Lịch hôm nay" : `Lịch ${relDayLabel(date, today).toLowerCase()}`}
                  <span className="text-ink-3 font-bold text-lg md:text-xl"> · {fmtDateShort(date)}</span>
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`chip ${lv.cls}`}>
                    {lv.emoji} {plan.levelName}
                  </span>
                  {isToday && <StreakChip />}
                  <span className="text-sm text-ink-2">{lv.desc}</span>
                </div>
              </div>
              <ProgressRing value={total ? doneCount / total : 0} size={72} />
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-2 md:gap-3">
              <Stat
                label="Giấc ngủ"
                value={fmtHours(plan.sleepMin)}
                sub={
                  isToday && lastNight
                    ? `Đêm qua: ${fmtHours(sleepMinutes(lastNight))}`
                    : `${fmtTime(plan.bed)} → ${fmtTime(plan.wake)}`
                }
                danger={plan.sleepMin <= 360 && plan.sleepMin < (s.profile?.sleepTarget ?? 480)}
              />
              <Stat label="Làm task" value={fmtDuration(taskMin)} sub={`${plan.blocks.filter((b) => b.cat === "task").length} phiên`} />
              <Stat label="Thời gian trống" value={fmtDuration(plan.freeMin)} sub={`${doneCount}/${total} đã xong`} />
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={addTask}>
                <Plus size={18} /> Thêm task
              </button>
              {isToday && (
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    const st = useStore.getState();
                    st.savePlan(computeTodayPlan(st, today));
                  }}
                  title="Xếp lại phần còn lại của ngày, giữ nguyên những gì đã xong"
                >
                  <RefreshCw size={17} /> Xếp lại phần còn lại
                </button>
              )}
            </div>
          </section>

          <div ref={quickRef}>
            <QuickAdd />
          </div>

          {isToday && <NowNext plan={plan} isDone={isDone} onToggle={toggle} onOpen={setDetail} taskMap={taskMap} />}
          {showSleepCheck && <SleepCheckIn date={date} />}
          {isToday && <WeeklyRecapCard />}

          {plan.warnings.length > 0 && (
            <section className="space-y-2.5" aria-label="Cảnh báo và thông báo">
              {plan.warnings.map((w, i) => (
                <WarningCard key={i} w={w} />
              ))}
            </section>
          )}

          <Timeline
            plan={plan}
            date={date}
            isToday={isToday}
            canCheck={canCheck}
            isDone={isDone}
            onToggle={toggle}
            onOpen={setDetail}
            taskMap={taskMap}
            onAdd={addTask}
          />
        </div>

        {/* Cột phải */}
        <aside className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 items-start">
          <GettingStarted onAddTask={addTask} />
          {isToday && <WaterTracker date={today} />}
          <PredictionCard pred={tomorrowPred} />
          <UpcomingCard tasks={s.tasks} today={today} range={range} />
          <section className="card p-5">
            <h2 className="font-bold flex items-center gap-2">
              <ShieldAlert size={18} className="text-brand" /> Quy tắc bảo vệ sức khoẻ
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-2">
              <li>• Luôn giữ tối thiểu 6 tiếng ngủ mỗi đêm.</li>
              <li>• Mỗi {OVERLOAD_GAP_DAYS} ngày chỉ được quá tải 1 lần.</li>
              <li>
                • Lần quá tải gần nhất:{" "}
                <b className="text-ink">
                  {lastOv ? (diffDays(lastOv, today) <= 1 ? `${relDayLabel(lastOv, today)} (${fmtDateShort(lastOv)})` : relDayLabel(lastOv, today)) : "chưa có"}
                </b>
              </li>
              <li>
                • Hôm nay:{" "}
                {overloadAllowedOn(today, lastOv) ? (
                  <b className="text-ok">được phép quá tải nếu cần</b>
                ) : (
                  <b className="text-hot">không được quá tải</b>
                )}
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <TaskForm open={adding} onClose={() => setAdding(false)} defaultDate={date} />
      <BlockSheet block={detail} date={date} onClose={() => setDetail(null)} />
      <Celebration allDone={allTasksDone} />
    </div>
  );
}

function DayStrip({
  days,
  date,
  setDate,
  today,
  plans,
}: {
  days: string[];
  date: string;
  setDate: (d: string) => void;
  today: string;
  plans: Record<string, DayPlan>;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1" role="tablist" aria-label="Chọn ngày">
      {days.map((d) => {
        const active = d === date;
        const past = d < today;
        const disabled = past && !plans[d];
        return (
          <button
            key={d}
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => setDate(d)}
            className={`focus-ring shrink-0 w-[3.6rem] rounded-2xl py-2 text-center transition-colors border ${
              active
                ? "bg-inverse text-on-inverse border-inverse"
                : d === today
                  ? "bg-lime border-lime text-on-lime"
                  : "bg-card border-line text-ink-2 hover:bg-brand-soft"
            } ${disabled ? "opacity-35" : ""}`}
          >
            <span className="block text-[11px] font-semibold opacity-80">{d === today ? "Nay" : WEEKDAY_SHORT[weekday(d)]}</span>
            <span className="block text-lg font-extrabold leading-tight">{Number(d.slice(8))}</span>
          </button>
        );
      })}
    </div>
  );
}

function Stat({ label, value, sub, danger }: { label: string; value: string; sub: string; danger?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${danger ? "bg-danger-soft" : "bg-card/80 border border-line"}`}>
      <dt className="text-xs font-semibold text-ink-3">{label}</dt>
      <dd className={`text-base md:text-xl font-extrabold ${danger ? "text-danger" : ""}`}>{value}</dd>
      <dd className="text-[11px] md:text-xs text-ink-3">{sub}</dd>
    </div>
  );
}

const WARN_STYLE = {
  danger: { cls: "bg-danger-soft border-danger-line", icon: AlertTriangle, ic: "text-danger" },
  warning: { cls: "bg-amber-soft border-amber-line", icon: AlertTriangle, ic: "text-amber" },
  info: { cls: "bg-info-soft border-info-line", icon: Info, ic: "text-info" },
  success: { cls: "bg-ok-soft border-ok-line", icon: Check, ic: "text-ok" },
};

function WarningCard({ w }: { w: PlanWarning }) {
  const st = WARN_STYLE[w.kind];
  return (
    <div className={`rounded-2xl border p-4 flex gap-3 ${st.cls}`} role={w.kind === "danger" ? "alert" : "status"}>
      <st.icon size={20} className={`shrink-0 mt-0.5 ${st.ic}`} />
      <div className="min-w-0">
        <p className="font-semibold text-sm md:text-base">{w.title}</p>
        {w.detail && <p className="text-sm text-ink-2 mt-0.5 whitespace-pre-line">{w.detail}</p>}
      </div>
    </div>
  );
}

const NO_SKIP: string[] = [];

const DEFAULT_NAMES: Record<string, string> = {
  "meal:breakfast": "Bữa sáng",
  "meal:lunch": "Bữa trưa",
  "meal:dinner": "Bữa tối",
  exercise: "Tập luyện",
  fun: "Giải trí",
};

function Timeline({
  plan,
  date,
  isToday,
  canCheck,
  isDone,
  onToggle,
  onOpen,
  taskMap,
  onAdd,
}: {
  plan: DayPlan;
  date: string;
  isToday: boolean;
  canCheck: boolean;
  isDone: (b: Block) => boolean;
  onToggle: (b: Block) => void;
  onOpen: (b: Block) => void;
  taskMap: Map<string, Task>;
  onAdd: () => void;
}) {
  const now = useNowMin();
  const compact = useStore((s) => s.prefs.compact);
  const setPrefs = useStore((s) => s.setPrefs);
  // chọn giá trị gốc từ store rồi mới tính toán (tránh tạo mảng/đối tượng mới mỗi lần render)
  const skipRaw = useStore((s) => s.overrides[date]?.skip);
  const skip = skipRaw ?? NO_SKIP;
  const skipBlock = useStore((s) => s.skipBlock);
  const commitments = useStore((s) => s.profile?.commitments);
  const exerciseKind = useStore((s) => s.profile?.exercise.kind);
  const commitNames = useMemo(
    () => ({
      ...Object.fromEntries((commitments ?? []).map((c) => [`commit:${c.id}`, c.label])),
      ...(exerciseKind ? { exercise: exerciseKind } : {}),
    }),
    [commitments, exerciseKind],
  );
  const [showPast, setShowPast] = useState(false);

  const visible = plan.blocks.filter((b) => !(compact && b.cat === "commute"));
  const past = isToday ? visible.filter((b) => b.end <= now && b.cat !== "sleep") : [];
  const rest = isToday ? visible.filter((b) => !(b.end <= now && b.cat !== "sleep")) : visible;
  const pastDone = past.filter(isDone).length;
  const noTasks = !plan.blocks.some((b) => b.cat === "task");

  const rows: React.ReactNode[] = [];
  let cursor = isToday ? Math.max(plan.wake, past.length ? Math.max(...past.map((b) => b.end)) : plan.wake) : plan.wake;
  let nowShown = !isToday;
  rest.forEach((b, i) => {
    if (b.start - cursor >= 20 && b.cat !== "sleep") {
      if (!nowShown && now < b.start && now >= cursor) {
        rows.push(<NowLine key={`now-${i}`} now={now} />);
        nowShown = true;
      }
      rows.push(
        <li key={`gap-${i}`} className="flex items-center gap-3 py-1 pl-[4.25rem] text-xs text-ink-3">
          <span className="flex-1 border-t border-dashed border-line" />
          Trống {fmtDuration(b.start - cursor)} · {fmtTime(cursor)}–{fmtTime(b.start)}
          <span className="flex-1 border-t border-dashed border-line" />
        </li>,
      );
    }
    if (!nowShown && now < b.start) {
      rows.push(<NowLine key={`now-b-${i}`} now={now} />);
      nowShown = true;
    }
    rows.push(
      <BlockRow
        key={b.key}
        b={b}
        done={isDone(b)}
        canCheck={canCheck}
        onToggle={() => onToggle(b)}
        onOpen={() => onOpen(b)}
        task={b.taskId ? taskMap.get(b.taskId) : undefined}
      />,
    );
    cursor = Math.max(cursor, b.end);
  });

  return (
    <section className="card p-4 md:p-5">
      <SectionTitle
        action={
          <button
            className="focus-ring flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-2 hover:bg-brand-soft"
            onClick={() => setPrefs({ compact: !compact })}
            aria-pressed={compact}
            title="Ẩn các chặng di chuyển cho gọn"
          >
            {compact ? <Eye size={14} /> : <EyeOff size={14} />} {compact ? "Hiện di chuyển" : "Gọn hơn"}
          </button>
        }
      >
        Thời gian biểu
      </SectionTitle>

      {past.length > 0 && (
        <div className="mb-2">
          <button
            className="focus-ring w-full flex items-center gap-2 rounded-2xl bg-sunken px-3 py-2.5 text-sm font-semibold text-ink-2"
            onClick={() => setShowPast(!showPast)}
            aria-expanded={showPast}
          >
            <ChevronDown size={16} className={`transition-transform ${showPast ? "rotate-180" : ""}`} />
            Đã qua · {past.length} hoạt động
            <span className="ml-auto text-xs font-normal">
              {pastDone}/{past.length} đã tick
            </span>
          </button>
          {showPast && (
            <ol className="mt-1.5 space-y-1.5">
              {past.map((b) => (
                <BlockRow
                  key={b.key}
                  b={b}
                  done={isDone(b)}
                  canCheck={canCheck}
                  onToggle={() => onToggle(b)}
                  onOpen={() => onOpen(b)}
                  task={b.taskId ? taskMap.get(b.taskId) : undefined}
                />
              ))}
            </ol>
          )}
        </div>
      )}

      {noTasks && (
        <button
          onClick={onAdd}
          className="focus-ring mb-3 w-full rounded-2xl border-2 border-dashed border-brand/40 p-4 text-left hover:bg-brand-soft transition-colors"
        >
          <span className="font-bold text-brand flex items-center gap-2">
            <Plus size={18} /> {isToday ? "Hôm nay chưa có task nào" : "Chưa có task cho ngày này"}
          </span>
          <span className="block text-sm text-ink-2 mt-0.5">
            Thêm bài tập, deadline hay việc cần làm – Smart Life sẽ tự tìm giờ trống phù hợp.
          </span>
        </button>
      )}

      <ol className="space-y-1.5">{rows}</ol>

      {skip.length > 0 && (
        <div className="mt-3 rounded-2xl bg-sunken p-3 text-sm">
          <p className="font-semibold text-ink-2">Đã bỏ qua {relDayLabel(date, todayStr()).toLowerCase()}:</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {skip.map((k) => (
              <button
                key={k}
                className="focus-ring chip bg-card border border-line text-ink-2 hover:border-brand"
                onClick={() => skipBlock(date, k, false)}
                title="Hoàn tác"
              >
                {SKIP_LABEL(k, useStore.getState().plans[date], { ...DEFAULT_NAMES, ...commitNames })} <RotateCcw size={12} />
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-ink-3">Mẹo: bấm vào một hoạt động để làm ngay, đổi giờ, dời sang mai hoặc bỏ qua.</p>
    </section>
  );
}

function NowLine({ now }: { now: number }) {
  return (
    <li className="flex items-center gap-2 py-1" aria-label={`Bây giờ ${fmtTime(now)}`}>
      <span className="w-14 text-right text-xs font-bold text-coral">{fmtTime(now)}</span>
      <span className="h-2.5 w-2.5 rounded-full bg-coral" />
      <span className="flex-1 border-t-2 border-coral" />
    </li>
  );
}

function BlockRow({
  b,
  done,
  canCheck,
  onToggle,
  onOpen,
  task,
}: {
  b: Block;
  done: boolean;
  canCheck: boolean;
  onToggle: () => void;
  onOpen: () => void;
  task?: Task;
}) {
  const m = CAT[b.cat];
  const len = b.end - b.start;
  const subs = task?.subtasks ?? [];
  return (
    <li className="flex items-stretch gap-2">
      <div className="w-14 shrink-0 text-right pt-3">
        <span className="text-sm font-bold">{fmtTime(b.start)}</span>
        <span className="block text-[11px] text-ink-3">{fmtTime(b.end)}</span>
      </div>
      <div
        className={`flex-1 min-w-0 flex items-center gap-3 rounded-2xl p-3 border transition-opacity ${done ? "opacity-60" : ""} ${
          b.missed ? "border-dashed border-hot-line" : b.userSet ? "border-brand/40" : "border-transparent"
        }`}
        style={{ background: m.tint }}
      >
        <span className="h-9 w-9 shrink-0 rounded-xl bg-card/80 flex items-center justify-center" style={{ color: m.color }}>
          <m.icon size={18} />
        </span>
        <button className="focus-ring flex-1 min-w-0 text-left rounded-lg" onClick={onOpen}>
          <span className={`block font-semibold leading-snug line-clamp-2 break-words ${done ? "line-through" : ""}`}>{b.title}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2 mt-0.5">
            <span>{fmtDuration(len)}</span>
            {task && task.priority === "high" && <span className={`chip ${PRIORITY_META.high.cls}`}>Ưu tiên cao</span>}
            {task && (
              <span>
                · Hạn {task.deadlineTime} {fmtDateShort(task.deadlineDate)}
              </span>
            )}
            {subs.length > 0 && (
              <span className="chip bg-card/80 text-ink-2">
                ☑ {subs.filter((x) => x.done).length}/{subs.length}
              </span>
            )}
            {task?.repeat && task.repeat !== "none" && <span title="Task lặp lại">🔁</span>}
            {b.userSet && <span className="chip bg-card/80 text-brand">📌 Bạn đã chọn giờ</span>}
            {b.shortened && b.note && <span className="chip bg-card/80 text-hot">{b.note}</span>}
            {!b.shortened && b.note && <span className="text-ink-3">{b.note}</span>}
            {b.missed && <span className="chip bg-card text-hot">Bỏ lỡ – đã xếp lại</span>}
          </span>
        </button>
        {canCheck && !b.missed && (
          <button
            onClick={onToggle}
            aria-pressed={done}
            aria-label={done ? `Bỏ đánh dấu ${b.title}` : `Đánh dấu đã xong ${b.title}`}
            className={`focus-ring h-8 w-8 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
              done ? "bg-brand border-brand text-white" : "bg-card border-control hover:border-brand"
            }`}
          >
            {done && <Check size={16} strokeWidth={3} />}
          </button>
        )}
      </div>
    </li>
  );
}

function PredictionCard({ pred }: { pred: ReturnType<typeof predict> }) {
  // chưa đủ dữ liệu -> không chiếm chỗ; thẻ "Bắt đầu với Smart Life" sẽ hướng dẫn
  if (!pred.enoughData)
    return (
      <section className="card p-4 flex items-center gap-3 text-sm">
        <BrainCircuit size={20} className="text-brand shrink-0" />
        <p className="text-ink-2">
          <b className="text-ink">Dự đoán giờ năng suất</b> sẽ mở sau {Math.max(1, 3 - pred.sampleDays)} ngày nữa khi bạn tick checklist task.
        </p>
      </section>
    );
  return (
    <section className="card p-5 bg-night text-white border-0">
      <h2 className="font-bold flex items-center gap-2">
        <BrainCircuit size={18} className="text-lime" /> Dự đoán cho ngày mai
      </h2>
      <p className="mt-3 text-sm text-white/70">Khung giờ năng suất nhất</p>
      <p className="text-3xl font-extrabold text-lime">
        {pred.peakStart}:00 – {pred.peakEnd}:00
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/10 p-2.5">
          <p className="text-white/60 text-xs">Làm việc tập trung</p>
          <p className="font-bold">Khoảng {fmtDuration(pred.expectedFocusMin)}</p>
        </div>
        <div className="rounded-xl bg-white/10 p-2.5">
          <p className="text-white/60 text-xs">Tỉ lệ hoàn thành 7 ngày</p>
          <p className="font-bold">{Math.round(pred.completionRate * 100)}%</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-white/70 leading-relaxed">{pred.tip}</p>
      <Link to="/thong-ke" className="mt-4 inline-block text-sm font-semibold text-lime hover:underline">
        Xem thống kê chi tiết →
      </Link>
    </section>
  );
}

function UpcomingCard({ tasks, today, range }: { tasks: Task[]; today: string; range: DayPlan[] }) {
  const pending = tasks
    .filter((t) => !t.done)
    .sort((a, b) => `${a.deadlineDate}${a.deadlineTime}`.localeCompare(`${b.deadlineDate}${b.deadlineTime}`))
    .slice(0, 5);
  const firstDay = (id: string) => range.find((p) => p.blocks.some((b) => b.taskId === id && !b.missed))?.date;
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Deadline sắp tới</h2>
        <Link to="/task" className="text-sm font-semibold text-brand hover:underline">
          Tất cả
        </Link>
      </div>
      {pending.length === 0 ? (
        <p className="mt-3 text-sm text-ink-3">Không còn deadline nào. Tận hưởng thôi! 🎉</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {pending.map((t) => {
            const left = diffDays(today, t.deadlineDate);
            const on = firstDay(t.id);
            return (
              <li key={t.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 chip ${left < 0 ? "bg-danger-soft text-danger" : left === 0 ? "bg-coral-soft text-hot" : "bg-brand-soft text-brand-dark"}`}
                >
                  {left < 0 ? "Quá hạn" : left === 0 ? "Hôm nay" : `${left} ngày`}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{t.title}</p>
                  <p className="text-xs text-ink-3">
                    {fmtDuration(t.estimate)} · {on ? `xếp vào ${relDayLabel(on, today).toLowerCase()}` : "chưa xếp được trong 7 ngày"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
