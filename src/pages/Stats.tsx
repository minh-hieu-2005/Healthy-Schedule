import { useMemo, useState } from "react";
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
import { BrainCircuit, Flame, Moon, Target, TrendingUp } from "lucide-react";
import { useStore } from "../store/useStore";
import { predict } from "../engine/predict";
import type { DayLog } from "../engine/types";
import { addDays, fmtDateShort, fmtDuration, fmtHours, relDayLabel, todayStr, WEEKDAY_SHORT, weekday } from "../engine/time";
import { CHART_GROUPS, LEVEL_META } from "../lib/categories";

type Tab = "day" | "week" | "month";

interface TipItem {
  name?: string | number;
  value?: unknown;
  color?: string;
  dataKey?: unknown;
  payload?: Record<string, unknown>;
}

/** Tooltip: chữ màu mực, chấm màu mang nhận diện; thứ tự khớp chú thích. */
function ChartTip({
  active,
  payload,
  unit,
  order,
  today,
}: {
  active?: boolean;
  payload?: TipItem[];
  unit: string;
  order?: string[];
  today: string;
}) {
  if (!active || !payload?.length) return null;
  const date = payload[0].payload?.date as string | undefined;
  const items = order
    ? order.map((k) => payload.find((p) => p.dataKey === k)).filter((p): p is TipItem => !!p)
    : payload;
  return (
    <div className="rounded-xl bg-white border border-line shadow-lg px-3 py-2 text-sm">
      {date && <p className="font-semibold mb-1">{date === today || addDays(date, 1) === today ? `${relDayLabel(date, today)} · ${fmtDateShort(date)}` : relDayLabel(date, today)}</p>}
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

const AXIS = { fontSize: 12, fill: "#7a7593" };
const GRID = "#efedf5";
const h1 = (m: number) => Math.round((m / 60) * 10) / 10;

const groupMinutes = (l: DayLog) =>
  Object.fromEntries(CHART_GROUPS.map((g) => [g.id, g.cats.reduce((a, c) => a + (l.minutes[c] ?? 0), 0)])) as Record<string, number>;

export default function Stats() {
  const logs = useStore((s) => s.logs);
  const sleepTarget = useStore((s) => s.profile?.sleepTarget ?? 480);
  const today = todayStr();
  const [tab, setTab] = useState<Tab>("week");
  const [day, setDay] = useState(today);

  const series = (n: number) =>
    Array.from({ length: n }, (_, i) => addDays(today, i - n + 1)).map((d) => ({ date: d, log: logs[d] }));

  const pred = useMemo(() => predict(logs, addDays(today, 1)), [logs, today]);
  const dayLog = logs[day];
  const availableDays = Object.keys(logs).sort().reverse();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">Thống kê</h1>
          <p className="text-ink-2 mt-1">Theo dõi giấc ngủ, việc học và vận động của bạn.</p>
        </div>
        <div className="inline-flex rounded-full bg-white border border-line p-1" role="tablist" aria-label="Khoảng thời gian">
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
              className={`focus-ring rounded-full px-5 py-1.5 text-sm font-semibold ${tab === k ? "bg-ink text-white" : "text-ink-2"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {availableDays.length === 0 && (
        <div className="card p-8 text-center text-ink-2">
          Chưa có dữ liệu. Hãy dùng lịch và tick checklist mỗi ngày – biểu đồ sẽ xuất hiện ở đây.
        </div>
      )}

      {tab === "day" && availableDays.length > 0 && (
        <DayView log={dayLog} day={day} setDay={setDay} days={availableDays} today={today} />
      )}
      {tab === "week" && availableDays.length > 0 && <RangeView data={series(7)} today={today} sleepTarget={sleepTarget} label="7 ngày qua" />}
      {tab === "month" && availableDays.length > 0 && <RangeView data={series(30)} today={today} sleepTarget={sleepTarget} label="30 ngày qua" month />}

      <PredictionSection pred={pred} />
    </div>
  );
}

function Tile({ icon: Icon, label, value, sub, tone = "brand" }: { icon: typeof Moon; label: string; value: string; sub?: string; tone?: "brand" | "coral" | "lime" }) {
  const cls = tone === "brand" ? "bg-brand-soft text-brand" : tone === "coral" ? "bg-coral-soft text-[#c2361a]" : "bg-[#f4ffd0] text-[#4d6100]";
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

function DayView({ log, day, setDay, days, today }: { log?: DayLog; day: string; setDay: (d: string) => void; days: string[]; today: string }) {
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
        <Tile icon={Moon} label="Giấc ngủ" value={fmtHours(log.sleepMin)} tone={log.sleepMin < 360 ? "coral" : "brand"} />
        <Tile icon={Target} label="Task đã làm" value={fmtDuration(log.taskDoneMin)} sub={`trên ${fmtDuration(log.taskPlannedMin)} đã xếp`} tone="coral" />
        <Tile icon={TrendingUp} label="Checklist" value={`${pct}%`} sub={`${log.blocksDone}/${log.blocksTotal} hoạt động`} tone="lime" />
        <Tile icon={Flame} label="Mức độ ngày" value={`${LEVEL_META[log.level]?.emoji ?? ""} ${log.overload ? "Quá tải" : log.level === 0 ? "Bình thường" : "Cân bằng"}`} />
      </div>
      <section className="card p-5">
        <h2 className="font-bold">Thời gian theo hoạt động (giờ)</h2>
        <div className="h-64 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} unit="h" />
              <YAxis type="category" dataKey="name" tick={AXIS} axisLine={false} tickLine={false} width={120} />
              <Tooltip cursor={{ fill: "#f5f2ff" }} itemStyle={{ color: "#17122b" }} formatter={(v) => [`${v} giờ`, "Thời gian"]} />
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
  label,
  month,
}: {
  data: { date: string; log?: DayLog }[];
  today: string;
  sleepTarget: number;
  label: string;
  month?: boolean;
}) {
  const rows = data.map(({ date, log }) => {
    const gm = log ? groupMinutes(log) : {};
    return {
      date,
      label: month ? fmtDateShort(date) : date === today ? "Nay" : WEEKDAY_SHORT[weekday(date)],
      ...Object.fromEntries(CHART_GROUPS.map((g) => [g.id, log ? h1(gm[g.id] ?? 0) : null])),
      sleep: log ? h1(log.sleepMin) : null,
      done: log && log.blocksTotal ? Math.round((log.blocksDone / log.blocksTotal) * 100) : null,
    };
  });
  const withLog = data.filter((d) => d.log).map((d) => d.log!);
  const avgSleep = withLog.length ? withLog.reduce((a, l) => a + l.sleepMin, 0) / withLog.length : 0;
  const taskDone = withLog.reduce((a, l) => a + l.taskDoneMin, 0);
  const overloadDays = withLog.filter((l) => l.overload).length;
  const bt = withLog.reduce((a, l) => a + l.blocksTotal, 0);
  const bd = withLog.reduce((a, l) => a + l.blocksDone, 0);
  const shortSleep = withLog.filter((l) => l.sleepMin < 360).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile icon={Moon} label={`Ngủ trung bình · ${label}`} value={fmtHours(Math.round(avgSleep / 6) * 6)} sub={shortSleep ? `${shortSleep} đêm dưới 6 tiếng` : "Không đêm nào dưới 6 tiếng 👍"} />
        <Tile icon={Target} label="Tổng thời gian làm task" value={fmtDuration(taskDone)} tone="coral" />
        <Tile icon={TrendingUp} label="Hoàn thành checklist" value={`${bt ? Math.round((bd / bt) * 100) : 0}%`} tone="lime" />
        <Tile icon={Flame} label="Số ngày quá tải" value={`${overloadDays} ngày`} sub={`trên ${withLog.length} ngày có dữ liệu`} tone="coral" />
      </div>

      <section className="card p-5">
        <h2 className="font-bold">Thời gian mỗi ngày theo hoạt động (giờ)</h2>
        <p className="text-sm text-ink-3">Không tính giấc ngủ và di chuyển</p>
        <div className="h-72 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ left: -18, right: 4 }} barCategoryGap={month ? "12%" : "28%"}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={month ? 4 : 0} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "#f5f2ff" }}
                content={(props) => (
                  <ChartTip {...(props as object)} unit=" giờ" today={today} order={[...CHART_GROUPS.map((g) => g.id)].reverse()} />
                )}
              />
              {CHART_GROUPS.map((g, i) => (
                <Bar
                  key={g.id}
                  dataKey={g.id}
                  name={g.label}
                  stackId="a"
                  fill={g.color}
                  stroke="#fff"
                  strokeWidth={month ? 1 : 2}
                  radius={i === CHART_GROUPS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <HtmlLegend items={CHART_GROUPS.map((g) => ({ label: g.label, color: g.color }))} />
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-5">
          <h2 className="font-bold">Giấc ngủ (giờ)</h2>
          <p className="text-sm text-ink-3">So với mức tối thiểu 6 tiếng và mục tiêu của bạn</p>
          <div className="h-56 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ left: -18, right: 8 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={month ? 4 : 0} />
                <YAxis domain={[4, 10]} ticks={[4, 6, 8, 10]} tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip content={(props) => <ChartTip {...(props as object)} unit=" giờ" today={today} />} />
                <ReferenceLine y={6} stroke="#e34948" strokeDasharray="4 4" />
                <ReferenceLine y={sleepTarget / 60} stroke="#1baf7a" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="sleep" name="Ngủ" stroke="#4a3aa7" strokeWidth={2} dot={{ r: month ? 2 : 4, fill: "#4a3aa7" }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <HtmlLegend
            items={[
              { label: "Giờ ngủ", color: "#4a3aa7" },
              { label: "Tối thiểu 6 tiếng", color: "#e34948", dashed: true },
              { label: `Mục tiêu ${fmtHours(sleepTarget)}`, color: "#1baf7a", dashed: true },
            ]}
          />
        </section>
        <section className="card p-5">
          <h2 className="font-bold">Tỉ lệ hoàn thành checklist (%)</h2>
          <p className="text-sm text-ink-3">Phần trăm hoạt động bạn đã tick mỗi ngày (hôm nay vẫn đang diễn ra)</p>
          <div className="h-56 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ left: -18, right: 8 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={month ? 4 : 0} />
                <YAxis domain={[0, 100]} tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip content={(props) => <ChartTip {...(props as object)} unit="%" today={today} />} />
                <Line type="monotone" dataKey="done" name="Hoàn thành" stroke="#6c47ff" strokeWidth={2} dot={{ r: month ? 2 : 4, fill: "#6c47ff" }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold">Xem dạng bảng</summary>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-3">
              <tr>
                <th className="py-1.5 pr-3">Ngày</th>
                <th className="pr-3">Ngủ</th>
                {CHART_GROUPS.map((g) => (
                  <th key={g.id} className="pr-3">{g.label}</th>
                ))}
                <th>Checklist</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date} className="border-t border-line">
                  <td className="py-1.5 pr-3 font-semibold">{fmtDateShort(r.date)}</td>
                  <td className="pr-3">{r.sleep ?? "–"}h</td>
                  {CHART_GROUPS.map((g) => (
                    <td key={g.id} className="pr-3">{(r as Record<string, unknown>)[g.id] as number ?? "–"}h</td>
                  ))}
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
      h: h.hour,
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
                  cursor={{ fill: "#f5f2ff" }}
                  itemStyle={{ color: "#17122b" }}
                  formatter={(v, _n, p) => [p?.payload?.has ? `${v}%` : "Chưa có dữ liệu", "Tỉ lệ hoàn thành"]}
                />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {data.map((d) => (
                    <Cell key={d.hour} fill={d.peak ? "#6c47ff" : "#cfc4ff"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-ink-3 mt-2">
            Cột tím đậm là khung giờ năng suất. Smart Life tự xếp các task <b>ưu tiên cao</b> vào khung giờ này.
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-2">{pred.tip}</p>
      )}
    </section>
  );
}
