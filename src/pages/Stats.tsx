import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, BrainCircuit, Flame, Moon, Target, TrendingUp, Trophy } from "lucide-react";
import { useStore } from "../store/useStore";
import { predict } from "../engine/predict";
import type { DayLog } from "../engine/types";
import { addDays, fmtDateShort, fmtDuration, fmtHours, relDayLabel, todayStr, WEEKDAY_SHORT, weekday } from "../engine/time";
import { motivation, sleepMinutes, weekRecap, type SleepRecord } from "../engine/motivation";
import { CHART_GROUPS, LEVEL_META } from "../lib/categories";

type Tab = "day" | "week" | "month";

const AXIS = { fontSize: 12, fill: "var(--chart-axis)" };
const GRID = "var(--chart-grid)";
const CURSOR = { fill: "var(--chart-cursor)" };
const h1 = (m: number) => Math.round((m / 60) * 10) / 10;
const MIN_DAYS = 3;

const groupMinutes = (l: DayLog) =>
  Object.fromEntries(CHART_GROUPS.map((g) => [g.id, g.cats.reduce((a, c) => a + (l.minutes[c] ?? 0), 0)])) as Record<string, number>;

interface TipItem {
  name?: string | number;
  value?: unknown;
  color?: string;
  dataKey?: unknown;
  payload?: Record<string, unknown>;
}

/** Tooltip: chữ màu mực, chấm màu mang nhận diện; thứ tự khớp chú thích. */
function ChartTip({ active, payload, unit, order, today }: { active?: boolean; payload?: TipItem[]; unit: string; order?: string[]; today: string }) {
  if (!active || !payload?.length) return null;
  const date = payload[0].payload?.date as string | undefined;
  const items = order ? order.map((k) => payload.find((p) => p.dataKey === k)).filter((p): p is TipItem => !!p) : payload;
  return (
    <div className="rounded-xl bg-card border border-line shadow-lg px-3 py-2 text-sm">
      {date && <p className="font-semibold mb-1">{relDayLabel(date, today)} · {fmtDateShort(date)}</p>}
      {items.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-ink-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
          <span className="flex-1">{p.name}</span>
          <b className="text-ink ml-3">{p.value == null ? "–" : `${p.value}${unit}`}</b>
        </p>
      ))}
    </div>
  );
}

function HtmlLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-xs text-ink-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {i.dashed ? (
            <span className="w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function Tile({ icon: Icon, label, value, sub, tone = "brand" }: { icon: typeof Moon; label: string; value: string; sub?: string; tone?: "brand" | "coral" | "lime" }) {
  const cls = tone === "brand" ? "bg-brand-soft text-brand" : tone === "coral" ? "bg-coral-soft text-hot" : "bg-lime-soft text-olive";
  return (
    <div className="card p-4">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${cls}`}>
        <Icon size={18} />
      </span>
      <p className="mt-2 text-xs font-semibold text-ink-3">{label}</p>
      <p className="text-xl font-extrabold">{value}</p>
      {sub && <p className="text-xs text-ink-3">{sub}</p>}
    </div>
  );
}

export default function Stats() {
  const s = useStore();
  const today = todayStr();
  const [tab, setTab] = useState<Tab>("week");
  const [day, setDay] = useState(today);
  const [params] = useSearchParams();

  useEffect(() => {
    if (params.get("muc") === "thanh-tich") document.getElementById("thanh-tich")?.scrollIntoView({ behavior: "smooth" });
  }, [params]);

  const sleepTarget = s.profile?.sleepTarget ?? 480;
  const mot = useMemo(
    () =>
      motivation({ logs: s.logs, sleepActual: s.sleepActual, water: s.water, waterGoal: s.reminders.waterGoal, tasks: s.tasks, sleepTarget }),
    [s.logs, s.sleepActual, s.water, s.reminders.waterGoal, s.tasks, sleepTarget],
  );
  const pred = useMemo(() => predict(s.logs, addDays(today, 1)), [s.logs, today]);
  const loggedDays = Object.values(s.logs).filter((l) => l.blocksTotal > 0).length;
  const enough = loggedDays >= MIN_DAYS;
  const series = (n: number) => Array.from({ length: n }, (_, i) => addDays(today, i - n + 1)).map((d) => ({ date: d, log: s.logs[d] }));
  const availableDays = Object.keys(s.logs).sort().reverse();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">Thống kê</h1>
          <p className="text-ink-2 mt-1">Giấc ngủ, việc học và vận động của bạn – thực tế so với kế hoạch.</p>
        </div>
        {enough && (
          <div className="inline-flex rounded-full bg-card border border-line p-1" role="tablist" aria-label="Khoảng thời gian">
            {(
              [
                ["day", "Ngày"],
                ["week", "Tuần"],
                ["month", "Tháng"],
              ] as [Tab, string][]
            ).map(([k, l]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`focus-ring rounded-full px-5 py-1.5 text-sm font-semibold ${tab === k ? "bg-inverse text-on-inverse" : "text-ink-2"}`}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {!enough ? (
        <EmptyStats days={loggedDays} />
      ) : (
        <>
          {tab === "day" && <DayView log={s.logs[day]} day={day} setDay={setDay} days={availableDays} today={today} sleep={s.sleepActual[day]} />}
          {tab === "week" && (
            <RangeView data={series(7)} today={today} sleepTarget={sleepTarget} sleepActual={s.sleepActual} label="7 ngày qua" />
          )}
          {tab === "month" && (
            <RangeView data={series(30)} today={today} sleepTarget={sleepTarget} sleepActual={s.sleepActual} label="30 ngày qua" month />
          )}
        </>
      )}

      <Achievements mot={mot} />
      {enough && <WeekCompare today={today} />}
      <PredictionSection pred={pred} />
    </div>
  );
}

function EmptyStats({ days }: { days: number }) {
  const left = Math.max(0, MIN_DAYS - days);
  return (
    <section className="card p-6 md:p-8 text-center blob-bg">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <BarChart3 size={28} />
      </span>
      <h2 className="mt-3 text-xl font-extrabold">Biểu đồ sẽ xuất hiện sau {left} ngày nữa</h2>
      <p className="mt-2 text-ink-2 max-w-md mx-auto">
        Dùng Smart Life mỗi ngày và tick những hoạt động đã làm. Sau {MIN_DAYS} ngày, bạn sẽ thấy mình ngủ bao nhiêu, học bao nhiêu và
        khung giờ nào làm việc hiệu quả nhất.
      </p>
      <div className="mt-5 flex justify-center gap-2" aria-label={`Đã có ${days}/${MIN_DAYS} ngày`}>
        {Array.from({ length: MIN_DAYS }, (_, i) => (
          <span key={i} className={`h-2.5 w-14 rounded-full ${i < days ? "bg-brand" : "bg-sunken"}`} />
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-3">
        {days}/{MIN_DAYS} ngày có dữ liệu
      </p>
    </section>
  );
}

function Achievements({ mot }: { mot: ReturnType<typeof motivation> }) {
  const earned = mot.badges.filter((b) => b.earned).length;
  return (
    <section id="thanh-tich" className="card p-5 scroll-mt-24" aria-label="Thành tích">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold flex items-center gap-2">
          <Trophy size={18} className="text-brand" /> Thành tích
        </h2>
        <span className="text-sm text-ink-3">
          {earned}/{mot.badges.length} huy hiệu
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-coral-soft p-4">
          <p className="text-xs font-semibold text-hot flex items-center gap-1.5">
            <Flame size={14} /> Chuỗi ngày hiện tại
          </p>
          <p className="text-3xl font-extrabold">{mot.streak} ngày</p>
          <p className="text-xs text-ink-2">Kỷ lục: {mot.bestStreak} ngày · hoàn thành ≥ 70% lịch</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "var(--tint-sleep)" }}>
          <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--cat-sleep)" }}>
            <Moon size={14} /> Chuỗi ngủ đủ giấc
          </p>
          <p className="text-3xl font-extrabold">{mot.sleepStreak} đêm</p>
          <p className="text-xs text-ink-2">Theo giờ ngủ thực tế bạn ghi lại</p>
        </div>
      </div>
      <ul className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {mot.badges.map((b) => (
          <li
            key={b.id}
            className={`rounded-2xl border p-3 flex items-center gap-3 ${b.earned ? "border-brand/40 bg-brand-soft" : "border-line"}`}
          >
            <span className={`text-2xl ${b.earned ? "" : "grayscale opacity-40"}`} aria-hidden="true">
              {b.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">
                {b.title} {b.earned && <span className="text-ok">✓</span>}
              </p>
              <p className="text-xs text-ink-3">{b.desc}</p>
              {!b.earned && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="flex-1 h-1.5 rounded-full bg-sunken overflow-hidden">
                    <span className="block h-full bg-brand rounded-full" style={{ width: `${(b.progress / b.target) * 100}%` }} />
                  </span>
                  <span className="text-[11px] text-ink-3">
                    {b.progress}/{b.target}
                  </span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WeekCompare({ today }: { today: string }) {
  const s = useStore();
  const inp = { logs: s.logs, sleepActual: s.sleepActual, water: s.water, waterGoal: s.reminders.waterGoal, tasks: s.tasks, sleepTarget: s.profile?.sleepTarget ?? 480 };
  const thisW = weekRecap(inp, today);
  const lastW = weekRecap(inp, addDays(today, -7));
  const rows: [string, string, string][] = [
    ["Hoàn thành lịch", `${Math.round(lastW.completion * 100)}%`, `${Math.round(thisW.completion * 100)}%`],
    ["Thời gian làm task", fmtDuration(lastW.taskDoneMin), fmtDuration(thisW.taskDoneMin)],
    ["Ngủ thực tế trung bình", lastW.avgSleepActual ? fmtHours(lastW.avgSleepActual) : "–", thisW.avgSleepActual ? fmtHours(thisW.avgSleepActual) : "–"],
    ["Số ngày uống đủ nước", `${lastW.waterDays}`, `${thisW.waterDays}`],
    ["Số ngày quá tải", `${lastW.overloadDays}`, `${thisW.overloadDays}`],
  ];
  return (
    <section className="card p-5 overflow-x-auto" aria-label="So sánh tuần">
      <h2 className="font-bold">Tuần này so với tuần trước</h2>
      <table className="mt-3 w-full text-sm min-w-[420px]">
        <thead className="text-left text-ink-3">
          <tr>
            <th className="py-1.5 pr-3 font-semibold"></th>
            <th className="py-1.5 pr-3 font-semibold">Tuần trước ({fmtDateShort(lastW.from)}–{fmtDateShort(lastW.to)})</th>
            <th className="py-1.5 font-semibold">Tuần này</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, a, b]) => (
            <tr key={k} className="border-t border-line">
              <td className="py-2 pr-3 text-ink-2">{k}</td>
              <td className="py-2 pr-3">{a}</td>
              <td className="py-2 font-bold">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function DayView({
  log,
  day,
  setDay,
  days,
  today,
  sleep,
}: {
  log?: DayLog;
  day: string;
  setDay: (d: string) => void;
  days: string[];
  today: string;
  sleep?: SleepRecord;
}) {
  if (!log)
    return (
      <div className="card p-6">
        <DaySelect day={day} setDay={setDay} days={days} today={today} />
        <p className="mt-4 text-ink-2">Không có dữ liệu cho ngày này.</p>
      </div>
    );
  const gm = groupMinutes(log);
  const data = CHART_GROUPS.map((g) => ({ name: g.label, value: h1(gm[g.id]), color: g.color }));
  const pct = log.blocksTotal ? Math.round((log.blocksDone / log.blocksTotal) * 100) : 0;
  return (
    <div className="space-y-4">
      <DaySelect day={day} setDay={setDay} days={days} today={today} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile
          icon={Moon}
          label="Giấc ngủ (thực tế)"
          value={sleep ? fmtHours(sleepMinutes(sleep)) : "Chưa ghi"}
          sub={`Theo lịch: ${fmtHours(log.sleepMin)}`}
          tone={sleep && sleepMinutes(sleep) < 360 ? "coral" : "brand"}
        />
        <Tile icon={Target} label="Task đã làm" value={fmtDuration(log.taskDoneMin)} sub={`trên ${fmtDuration(log.taskPlannedMin)} đã xếp`} tone="coral" />
        <Tile icon={TrendingUp} label="Checklist" value={`${pct}%`} sub={`${log.blocksDone}/${log.blocksTotal} hoạt động`} tone="lime" />
        <Tile icon={Flame} label="Mức độ ngày" value={`${LEVEL_META[log.level]?.emoji ?? ""} ${log.overload ? "Quá tải" : log.level === 0 ? "Bình thường" : "Cân bằng"}`} />
      </div>
      <section className="card p-5">
        <h2 className="font-bold">Thời gian theo hoạt động (giờ, theo lịch)</h2>
        <div className="h-64 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} unit="h" />
              <YAxis type="category" dataKey="name" tick={AXIS} axisLine={false} tickLine={false} width={120} />
              <Tooltip cursor={CURSOR} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-line)", borderRadius: 12 }} itemStyle={{ color: "var(--color-ink)" }} formatter={(v) => [`${v} giờ`, "Thời gian"]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function DaySelect({ day, setDay, days, today }: { day: string; setDay: (d: string) => void; days: string[]; today: string }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      Xem ngày
      <select className="field w-auto" value={day} onChange={(e) => setDay(e.target.value)}>
        {!days.includes(day) && <option value={day}>{relDayLabel(day, today)}</option>}
        {days.map((d) => (
          <option key={d} value={d}>
            {relDayLabel(d, today)} ({fmtDateShort(d)})
          </option>
        ))}
      </select>
    </label>
  );
}

function RangeView({
  data,
  today,
  sleepTarget,
  sleepActual,
  label,
  month,
}: {
  data: { date: string; log?: DayLog }[];
  today: string;
  sleepTarget: number;
  sleepActual: Record<string, SleepRecord>;
  label: string;
  month?: boolean;
}) {
  const rows = data.map(({ date, log }) => {
    const gm = log ? groupMinutes(log) : {};
    const act = sleepActual[date];
    return {
      date,
      label: month ? fmtDateShort(date) : date === today ? "Nay" : WEEKDAY_SHORT[weekday(date)],
      ...Object.fromEntries(CHART_GROUPS.map((g) => [g.id, log ? h1(gm[g.id] ?? 0) : null])),
      sleepPlan: log ? h1(log.sleepMin) : null,
      sleepReal: act ? h1(sleepMinutes(act)) : null,
      taskPlan: log ? h1(log.taskPlannedMin) : null,
      taskDone: log ? h1(log.taskDoneMin) : null,
      done: log && log.blocksTotal ? Math.round((log.blocksDone / log.blocksTotal) * 100) : null,
    };
  });
  const withLog = data.filter((d) => d.log).map((d) => d.log!);
  const actual = data.map((d) => sleepActual[d.date]).filter(Boolean).map((r) => sleepMinutes(r!));
  const avgActual = actual.length ? actual.reduce((a, b) => a + b, 0) / actual.length : null;
  const taskDone = withLog.reduce((a, l) => a + l.taskDoneMin, 0);
  const taskPlan = withLog.reduce((a, l) => a + l.taskPlannedMin, 0);
  const overloadDays = withLog.filter((l) => l.overload).length;
  const bt = withLog.reduce((a, l) => a + l.blocksTotal, 0);
  const bd = withLog.reduce((a, l) => a + l.blocksDone, 0);
  const shortSleep = actual.filter((m) => m < 360).length;
  const tip = (unit: string, order?: string[]) => (props: object) => <ChartTip {...props} unit={unit} today={today} order={order} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile
          icon={Moon}
          label={`Ngủ thực tế TB · ${label}`}
          value={avgActual ? fmtHours(Math.round(avgActual / 6) * 6) : "Chưa ghi"}
          sub={avgActual ? (shortSleep ? `${shortSleep} đêm dưới 6 tiếng` : "Không đêm nào dưới 6 tiếng 👍") : "Ghi giờ ngủ mỗi sáng trên trang Hôm nay"}
        />
        <Tile icon={Target} label="Task: đã làm / đã xếp" value={fmtDuration(taskDone)} sub={`trên ${fmtDuration(taskPlan)} (${taskPlan ? Math.round((taskDone / taskPlan) * 100) : 0}%)`} tone="coral" />
        <Tile icon={TrendingUp} label="Hoàn thành checklist" value={`${bt ? Math.round((bd / bt) * 100) : 0}%`} tone="lime" />
        <Tile icon={Flame} label="Số ngày quá tải" value={`${overloadDays} ngày`} sub={`trên ${withLog.length} ngày có dữ liệu`} tone="coral" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-5">
          <h2 className="font-bold">Giấc ngủ: thực tế so với lịch (giờ)</h2>
          <div className="h-56 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ left: -18, right: 8 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={month ? 4 : 0} />
                <YAxis domain={[3, 10]} ticks={[4, 6, 8, 10]} tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip content={tip(" giờ")} />
                <ReferenceLine y={6} stroke="#e34948" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="sleepPlan" name="Theo lịch" stroke="var(--color-ink-3)" strokeDasharray="5 4" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="sleepReal" name="Thực tế" stroke="var(--cat-sleep)" strokeWidth={2} dot={{ r: month ? 2 : 4, fill: "var(--cat-sleep)" }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <HtmlLegend
            items={[
              { label: "Thực tế", color: "var(--cat-sleep)" },
              { label: `Theo lịch (mục tiêu ${fmtHours(sleepTarget)})`, color: "var(--color-ink-3)", dashed: true },
              { label: "Tối thiểu 6 tiếng", color: "#e34948", dashed: true },
            ]}
          />
        </section>
        <section className="card p-5">
          <h2 className="font-bold">Task: đã làm so với đã xếp (giờ)</h2>
          <div className="h-56 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ left: -18, right: 8 }} barGap={2} barCategoryGap={month ? "10%" : "25%"}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={month ? 4 : 0} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip cursor={CURSOR} content={tip(" giờ", ["taskPlan", "taskDone"])} />
                <Bar dataKey="taskPlan" name="Đã xếp" fill="var(--chart-plan)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="taskDone" name="Đã làm" fill="var(--chart-actual)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <HtmlLegend
            items={[
              { label: "Đã xếp (kế hoạch)", color: "var(--chart-plan)" },
              { label: "Đã làm (thực tế)", color: "var(--chart-actual)" },
            ]}
          />
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-bold">Thời gian mỗi ngày theo hoạt động (giờ)</h2>
        <p className="text-sm text-ink-3">Theo lịch, không tính giấc ngủ và di chuyển</p>
        <div className="h-72 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ left: -18, right: 4 }} barCategoryGap={month ? "12%" : "28%"}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={month ? 4 : 0} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip cursor={CURSOR} content={tip(" giờ", [...CHART_GROUPS.map((g) => g.id)].reverse())} />
              {CHART_GROUPS.map((g, i) => (
                <Bar
                  key={g.id}
                  dataKey={g.id}
                  name={g.label}
                  stackId="a"
                  fill={g.color}
                  stroke="var(--color-card)"
                  strokeWidth={month ? 1 : 2}
                  radius={i === CHART_GROUPS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <HtmlLegend items={CHART_GROUPS.map((g) => ({ label: g.label, color: g.color }))} />
      </section>

      <section className="card p-5">
        <h2 className="font-bold">Tỉ lệ hoàn thành checklist (%)</h2>
        <p className="text-sm text-ink-3">Phần trăm hoạt động bạn đã tick mỗi ngày (hôm nay vẫn đang diễn ra)</p>
        <div className="h-52 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ left: -18, right: 8 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={month ? 4 : 0} />
              <YAxis domain={[0, 100]} tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip content={tip("%")} />
              <ReferenceLine y={70} stroke="var(--color-coral)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="done" name="Hoàn thành" stroke="var(--color-brand)" strokeWidth={2} dot={{ r: month ? 2 : 4, fill: "var(--color-brand)" }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <HtmlLegend
          items={[
            { label: "Hoàn thành", color: "var(--color-brand)" },
            { label: "Mốc 70% để giữ chuỗi 🔥", color: "var(--color-coral)", dashed: true },
          ]}
        />
      </section>

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold">Xem dạng bảng</summary>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-3">
              <tr>
                <th className="py-1.5 pr-3">Ngày</th>
                <th className="pr-3">Ngủ thực tế</th>
                <th className="pr-3">Ngủ theo lịch</th>
                <th className="pr-3">Task đã làm</th>
                <th className="pr-3">Task đã xếp</th>
                <th>Checklist</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date} className="border-t border-line">
                  <td className="py-1.5 pr-3 font-semibold">{fmtDateShort(r.date)}</td>
                  <td className="pr-3">{r.sleepReal ?? "–"}h</td>
                  <td className="pr-3">{r.sleepPlan ?? "–"}h</td>
                  <td className="pr-3">{r.taskDone ?? "–"}h</td>
                  <td className="pr-3">{r.taskPlan ?? "–"}h</td>
                  <td>{r.done ?? "–"}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function PredictionSection({ pred }: { pred: ReturnType<typeof predict> }) {
  const data = pred.hourRate
    .filter((h) => h.hour >= 6)
    .map((h) => ({
      hour: `${h.hour}h`,
      rate: h.planned >= 20 ? Math.round(h.rate * 100) : 0,
      peak: pred.peakStart !== null && h.hour >= pred.peakStart && h.hour < pred.peakEnd!,
      has: h.planned >= 20,
    }));
  return (
    <section className="card p-5">
      <h2 className="font-bold flex items-center gap-2">
        <BrainCircuit size={18} className="text-brand" /> Dự đoán thời gian làm việc năng suất ngày mai
      </h2>
      {pred.enoughData ? (
        <>
          <p className="mt-1 text-sm text-ink-2">
            Dựa trên {pred.sampleDays} ngày gần nhất, bạn làm việc hiệu quả nhất vào{" "}
            <b className="text-brand">
              {pred.peakStart}:00 – {pred.peakEnd}:00
            </b>
            . Dự kiến ngày mai bạn tập trung được khoảng <b>{fmtDuration(pred.expectedFocusMin)}</b>.
          </p>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: -18, right: 4 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="hour" tick={AXIS} axisLine={false} tickLine={false} interval={1} />
                <YAxis domain={[0, 100]} tick={AXIS} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  cursor={CURSOR}
                  contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-line)", borderRadius: 12 }}
                  itemStyle={{ color: "var(--color-ink)" }}
                  formatter={(v, _n, p) => [p?.payload?.has ? `${v}%` : "Chưa có dữ liệu", "Tỉ lệ hoàn thành"]}
                />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {data.map((d) => (
                    <Cell key={d.hour} fill={d.peak ? "var(--chart-actual)" : "var(--chart-plan)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-ink-3 mt-2">
            Cột đậm là khung giờ năng suất. Smart Life tự xếp các task <b>ưu tiên cao</b> vào khung giờ này.
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-2">{pred.tip}</p>
      )}
    </section>
  );
}
