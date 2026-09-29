import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BrainCircuit,
  Check,
  Crown,
  Info,
  Lock,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Zap,
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
  nowMin,
  relDayLabel,
  todayStr,
  WEEKDAY_SHORT,
  weekday,
} from "../engine/time";
import { CAT, LEVEL_META, PRIORITY_META } from "../lib/categories";
import { Modal, ProgressRing, SectionTitle, Toggle } from "../components/ui";
import TaskForm from "../components/TaskForm";
import { alternativesFor } from "../engine/suggestions";

export default function Today() {
  const s = useStore();
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<Block | null>(null);

  const peak = useMemo(() => peakFor(s.logs, today), [s.logs, today]);
  const range = useMemo(
    () =>
      s.profile
        ? planRange(
            {
              profile: s.profile,
              tasks: s.tasks,
              premium: s.premium,
              studyAtSchool: s.studyAtSchool,
              urgentDates: s.urgentDates,
              logs: s.logs,
              today,
              peak,
              todayPlan: s.plans[today],
            },
            7,
          )
        : [],
    [s.profile, s.tasks, s.premium, s.studyAtSchool, s.urgentDates, s.logs, s.plans, today, peak],
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

  if (!plan) {
    return (
      <div>
        <DayStrip days={days} date={date} setDate={setDate} today={today} plans={s.plans} />
        <div className="card p-8 text-center text-ink-2">Không có dữ liệu lịch cho ngày {fmtDateShort(date)}.</div>
      </div>
    );
  }

  const total = plan.blocks.length;
  const doneCount = plan.blocks.filter(isDone).length;
  const taskMin = plan.blocks.filter((b) => b.cat === "task").reduce((a, b) => a + b.end - b.start, 0);
  const lv = LEVEL_META[plan.level];
  const urgentOn = s.urgentDates.includes(date);
  const hour = new Date().getHours();
  const hello = hour < 11 ? "Chào buổi sáng" : hour < 14 ? "Chào buổi trưa" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  return (
    <div className="space-y-5">
      <DayStrip days={days} date={date} setDate={setDate} today={today} plans={s.plans} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* Tổng quan ngày */}
          <section className="card p-5 md:p-6 blob-bg">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-3">
                  {date === today ? `${hello}${s.profile?.name ? `, ${s.profile.name}` : ""} 👋` : relDayLabel(date, today)}
                </p>
                <h1 className="text-2xl md:text-3xl font-extrabold mt-0.5">
                  {date === today ? "Lịch hôm nay" : `Lịch ${relDayLabel(date, today).toLowerCase()}`}
                  <span className="text-ink-3 font-bold text-lg md:text-xl"> · {fmtDateShort(date)}</span>
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`chip ${lv.cls}`}>
                    {lv.emoji} {plan.levelName}
                  </span>
                  <span className="text-sm text-ink-2">{lv.desc}</span>
                </div>
              </div>
              <ProgressRing value={total ? doneCount / total : 0} size={72} />
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-2 md:gap-3">
              <Stat label="Giấc ngủ" value={fmtHours(plan.sleepMin)} sub={`${fmtTime(plan.bed)} → ${fmtTime(plan.wake)}`} danger={plan.sleepMin < 360} />
              <Stat label="Làm task" value={fmtDuration(taskMin)} sub={`${plan.blocks.filter((b) => b.cat === "task").length} phiên`} />
              <Stat label="Thời gian trống" value={fmtDuration(plan.freeMin)} sub={`${doneCount}/${total} đã xong`} />
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={() => setAdding(true)}>
                <Plus size={18} /> Thêm task
              </button>
              {date === today && (
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    const st = useStore.getState();
                    st.savePlan(computeTodayPlan(st, today));
                  }}
                  title="Xếp lại phần còn lại của ngày, giữ nguyên những gì đã xong"
                >
                  <RefreshCw size={17} /> Xếp lại lịch
                </button>
              )}
              {offset >= 0 && (
                <div className="flex items-center gap-2.5 rounded-full bg-white border border-line pl-3.5 pr-1.5 py-1">
                  <Zap size={16} className="text-coral" />
                  <span className="text-sm font-semibold">Rất gấp</span>
                  {s.premium ? (
                    <Toggle checked={urgentOn} onChange={() => s.toggleUrgent(date)} label="Chế độ rất gấp" />
                  ) : (
                    <Link to="/premium" className="chip bg-lime text-ink" title="Tính năng Premium">
                      <Lock size={12} /> Premium
                    </Link>
                  )}
                </div>
              )}
            </div>
          </section>

          {plan.warnings.length > 0 && (
            <section className="space-y-2.5" aria-label="Cảnh báo và thông báo">
              {plan.warnings.map((w, i) => (
                <WarningCard key={i} w={w} />
              ))}
            </section>
          )}

          {plan.suggestions.length > 0 &&
            (s.premium ? (
              <section className="card p-5">
                <SectionTitle>
                  <span className="flex items-center gap-2">
                    <Sparkles size={18} className="text-brand" /> Gợi ý thay thế cho hôm nay
                  </span>
                </SectionTitle>
                <div className="grid sm:grid-cols-2 gap-3">
                  {plan.suggestions.map((sg) => (
                    <div key={sg.id} className="rounded-2xl p-4" style={{ background: CAT[sg.forCat].tint }}>
                      <p className="font-semibold text-sm">{sg.title}</p>
                      <ul className="mt-2 space-y-1 text-sm text-ink-2">
                        {sg.options.map((o) => (
                          <li key={o}>• {o}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <Link to="/premium" className="card p-4 flex items-center gap-3 hover:border-brand transition-colors">
                <span className="h-10 w-10 rounded-2xl bg-lime flex items-center justify-center shrink-0">
                  <Crown size={20} />
                </span>
                <span className="flex-1 text-sm">
                  <b>Có {plan.suggestions.length} gợi ý thay thế</b> cho những hoạt động bị rút gọn hôm nay (đặt món ship, cardio nhẹ…).
                  <span className="text-brand font-semibold"> Mở khoá với Premium →</span>
                </span>
              </Link>
            ))}

          {/* Thời gian biểu */}
          <section className="card p-4 md:p-5">
            <SectionTitle>Thời gian biểu</SectionTitle>
            <Timeline
              plan={plan}
              isToday={date === today}
              canCheck={canCheck}
              isDone={isDone}
              onToggle={toggle}
              onOpen={setDetail}
              taskMap={taskMap}
            />
          </section>
        </div>

        {/* Cột phải */}
        <aside className="space-y-5">
          <PredictionCard pred={tomorrowPred} />
          <UpcomingCard tasks={s.tasks} today={today} range={range} />
          <section className="card p-5">
            <h2 className="font-bold flex items-center gap-2">
              <ShieldAlert size={18} className="text-brand" /> Quy tắc bảo vệ sức khoẻ
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-2">
              <li>• Mỗi {OVERLOAD_GAP_DAYS} ngày chỉ được quá tải 1 lần.</li>
              <li>
                • Lần quá tải gần nhất:{" "}
                <b className="text-ink">{lastOv ? (diffDays(lastOv, today) <= 1 ? `${relDayLabel(lastOv, today)} (${fmtDateShort(lastOv)})` : relDayLabel(lastOv, today)) : "chưa có"}</b>
              </li>
              <li>
                • Hôm nay:{" "}
                {overloadAllowedOn(today, lastOv) ? (
                  <b className="text-[#0f7a55]">được phép quá tải nếu cần</b>
                ) : (
                  <b className="text-[#b8431a]">không được quá tải</b>
                )}
              </li>
              <li>• Bản miễn phí luôn giữ tối thiểu 6 tiếng ngủ.</li>
            </ul>
          </section>
        </aside>
      </div>

      <TaskForm open={adding} onClose={() => setAdding(false)} defaultDate={date} />
      <BlockDetail block={detail} onClose={() => setDetail(null)} date={date} taskMap={taskMap} />
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
                ? "bg-ink text-white border-ink"
                : d === today
                  ? "bg-lime border-lime text-ink"
                  : "bg-white border-line text-ink-2 hover:bg-brand-soft"
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
    <div className={`rounded-2xl p-3 ${danger ? "bg-[#ffe1e1]" : "bg-white/80 border border-line"}`}>
      <dt className="text-xs font-semibold text-ink-3">{label}</dt>
      <dd className={`text-base md:text-xl font-extrabold ${danger ? "text-[#b3261e]" : ""}`}>{value}</dd>
      <dd className="text-[11px] md:text-xs text-ink-3">{sub}</dd>
    </div>
  );
}

const WARN_STYLE = {
  danger: { cls: "bg-[#ffe9e7] border-[#f7c3bd]", icon: AlertTriangle, ic: "text-[#b3261e]" },
  warning: { cls: "bg-[#fff4e5] border-[#f6d7a8]", icon: AlertTriangle, ic: "text-[#b86e00]" },
  info: { cls: "bg-[#eef3ff] border-[#cddbfb]", icon: Info, ic: "text-[#2a5cc9]" },
  success: { cls: "bg-[#e5f7ef] border-[#b7e6d0]", icon: Check, ic: "text-[#0f7a55]" },
};

function WarningCard({ w }: { w: PlanWarning }) {
  const st = WARN_STYLE[w.kind];
  return (
    <div className={`rounded-2xl border p-4 flex gap-3 pop-in ${st.cls}`} role={w.kind === "danger" ? "alert" : "status"}>
      <st.icon size={20} className={`shrink-0 mt-0.5 ${st.ic}`} />
      <div className="min-w-0">
        <p className="font-semibold text-sm md:text-base">{w.title}</p>
        {w.detail && <p className="text-sm text-ink-2 mt-0.5 whitespace-pre-line">{w.detail}</p>}
      </div>
    </div>
  );
}

function Timeline({
  plan,
  isToday,
  canCheck,
  isDone,
  onToggle,
  onOpen,
  taskMap,
}: {
  plan: DayPlan;
  isToday: boolean;
  canCheck: boolean;
  isDone: (b: Block) => boolean;
  onToggle: (b: Block) => void;
  onOpen: (b: Block) => void;
  taskMap: Map<string, Task>;
}) {
  const now = nowMin();
  const rows: React.ReactNode[] = [];
  let cursor = plan.wake;
  let nowShown = !isToday;
  const blocks = plan.blocks;
  blocks.forEach((b, i) => {
    if (!b.atSchool && b.start - cursor >= 20 && b.cat !== "sleep") {
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
    if (!b.atSchool) cursor = Math.max(cursor, b.end);
  });
  return <ol className="space-y-1.5">{rows}</ol>;
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
  return (
    <li className={`flex items-stretch gap-2 ${b.atSchool ? "ml-6 md:ml-10" : ""}`}>
      <div className="w-14 shrink-0 text-right pt-3">
        <span className="text-sm font-bold">{fmtTime(b.start)}</span>
        <span className="block text-[11px] text-ink-3">{fmtTime(b.end)}</span>
      </div>
      <div
        className={`flex-1 min-w-0 flex items-center gap-3 rounded-2xl p-3 border transition-opacity ${done ? "opacity-60" : ""} ${
          b.missed ? "border-dashed border-[#e0a899]" : "border-transparent"
        }`}
        style={{ background: m.tint }}
      >
        <span className="h-9 w-9 shrink-0 rounded-xl bg-white/80 flex items-center justify-center" style={{ color: m.color }}>
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
            {b.atSchool && <span className="chip bg-white/80 text-[#1d5aa3]">🎒 Tranh thủ giờ học</span>}
            {b.shortened && b.note && <span className="chip bg-white/80 text-[#b8431a]">{b.note}</span>}
            {!b.shortened && b.note && !b.atSchool && <span className="text-ink-3">{b.note}</span>}
            {b.missed && <span className="chip bg-white text-[#b8431a]">Bỏ lỡ – đã xếp lại</span>}
          </span>
        </button>
        {canCheck && !b.missed && (
          <button
            onClick={onToggle}
            aria-pressed={done}
            aria-label={done ? `Bỏ đánh dấu ${b.title}` : `Đánh dấu đã xong ${b.title}`}
            className={`focus-ring h-8 w-8 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
              done ? "bg-brand border-brand text-white" : "bg-white border-[#c9c3dc] hover:border-brand"
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
  return (
    <section className="card p-5 bg-ink text-white border-0">
      <h2 className="font-bold flex items-center gap-2">
        <BrainCircuit size={18} className="text-lime" /> Dự đoán cho ngày mai
      </h2>
      {pred.enoughData ? (
        <>
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
        </>
      ) : (
        <p className="mt-3 text-sm text-white/75 leading-relaxed">
          Cần ít nhất 3 ngày có tick checklist task ({pred.sampleDays}/3). {pred.tip}
        </p>
      )}
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
                  className={`mt-0.5 chip ${left < 0 ? "bg-[#ffe1e1] text-[#b3261e]" : left === 0 ? "bg-coral-soft text-[#b8431a]" : "bg-brand-soft text-brand-dark"}`}
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

function BlockDetail({
  block,
  onClose,
  date,
  taskMap,
}: {
  block: Block | null;
  onClose: () => void;
  date: string;
  taskMap: Map<string, Task>;
}) {
  const s = useStore();
  const [editing, setEditing] = useState<Task | null>(null);
  if (editing) return <TaskForm open task={editing} onClose={() => { setEditing(null); onClose(); }} />;
  if (!block) return null;
  const m = CAT[block.cat];
  const task = block.taskId ? taskMap.get(block.taskId) : undefined;
  const alt = alternativesFor(block.cat, date, s.profile?.exercise.kind ?? "");
  return (
    <Modal open onClose={onClose} title={block.title}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: m.tint }}>
          <m.icon size={20} style={{ color: m.color }} />
          <span className="font-semibold">{m.label}</span>
          <span className="ml-auto text-sm font-semibold">
            {fmtTime(block.start)} – {fmtTime(block.end)} · {fmtDuration(block.end - block.start)}
          </span>
        </div>
        {task && (
          <div className="space-y-2 text-sm">
            {task.description && <p className="text-ink-2 whitespace-pre-line">{task.description}</p>}
            <p>
              <b>Hạn nộp:</b> {task.deadlineTime} ngày {fmtDateShort(task.deadlineDate)} · <b>Tổng thời gian:</b> {fmtDuration(task.estimate)}
            </p>
            <p>
              <b>Ưu tiên:</b> {PRIORITY_META[task.priority].label}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {!task.done ? (
                <button className="btn btn-primary" onClick={() => { s.setTaskDone(task.id, true, date <= todayStr() ? date : todayStr()); onClose(); }}>
                  <Check size={18} /> Hoàn thành cả task
                </button>
              ) : (
                <button className="btn btn-ghost" onClick={() => { s.setTaskDone(task.id, false); onClose(); }}>
                  Đánh dấu chưa xong
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setEditing(task)}>
                Sửa task
              </button>
            </div>
          </div>
        )}
        {alt &&
          (s.premium ? (
            <div className="rounded-2xl border border-line p-4">
              <p className="font-semibold text-sm flex items-center gap-2">
                <Sparkles size={16} className="text-brand" /> {alt.title}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-ink-2">
                {alt.options.map((o) => (
                  <li key={o}>• {o}</li>
                ))}
              </ul>
            </div>
          ) : (
            <Link to="/premium" onClick={onClose} className="flex items-center gap-3 rounded-2xl border border-dashed border-line p-4 text-sm hover:border-brand">
              <Lock size={18} className="text-brand" />
              <span>
                Không có thời gian cho hoạt động này? <b>Premium</b> gợi ý phương án thay thế phù hợp.
              </span>
            </Link>
          ))}
        {!task && !alt && <p className="text-sm text-ink-2">Hoạt động cố định trong lịch của bạn. Chỉnh sửa trong phần Cài đặt.</p>}
      </div>
    </Modal>
  );
}
