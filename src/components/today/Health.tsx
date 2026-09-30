import { useState } from "react";
import { BedDouble, Check, Droplets, Minus, Plus } from "lucide-react";
import { useStore } from "../../store/useStore";
import { fmtHours, toMin } from "../../engine/time";
import { sleepMinutes } from "../../engine/motivation";
import { TimeSelect } from "../ui";

/** Buổi sáng: hỏi nhanh giờ ngủ thực tế tối qua (để thống kê trung thực). */
export function SleepCheckIn({ date }: { date: string }) {
  const profile = useStore((s) => s.profile)!;
  const setSleepActual = useStore((s) => s.setSleepActual);
  const wakeP = toMin(profile.wakeTime);
  const bedP = (((wakeP - profile.sleepTarget) % 1440) + 1440) % 1440;
  const [bed, setBed] = useState(bedP < 720 ? bedP + 1440 : bedP); // giờ sau nửa đêm hiển thị là "hôm sau"
  const [wake, setWake] = useState(wakeP);
  const [edit, setEdit] = useState(false);
  const mins = sleepMinutes({ bed: bed % 1440, wake });
  const save = () => setSleepActual(date, { bed: bed % 1440, wake });

  return (
    <section className="card p-4" aria-label="Giờ ngủ tối qua">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: "var(--tint-sleep)", color: "var(--cat-sleep)" }}>
          <BedDouble size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold">Tối qua bạn ngủ thế nào?</p>
          <p className="text-sm text-ink-2">Ghi lại giờ ngủ thật để thống kê chính xác – chỉ mất 2 giây.</p>
        </div>
      </div>
      {edit ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-ink-2">
            Đi ngủ lúc
            <TimeSelect label="Giờ đi ngủ" className="field mt-1 w-36" value={bed} onChange={setBed} from={20 * 60} to={27 * 60} />
          </label>
          <label className="text-xs font-semibold text-ink-2">
            Thức dậy lúc
            <TimeSelect label="Giờ thức dậy" className="field mt-1 w-28" value={wake} onChange={setWake} from={4 * 60} to={12 * 60} />
          </label>
          <span className={`text-sm font-bold pb-2.5 ${mins < 360 ? "text-danger" : "text-ink"}`}>= {fmtHours(mins)}</span>
          <button className="btn btn-primary text-sm py-2 ml-auto" onClick={save}>
            <Check size={16} /> Lưu
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary text-sm py-2" onClick={save}>
            <Check size={16} /> Đúng như lịch ({fmtHours(mins)})
          </button>
          <button className="btn btn-ghost text-sm py-2" onClick={() => setEdit(true)}>
            Khác lịch – nhập giờ
          </button>
        </div>
      )}
    </section>
  );
}

/** Theo dõi số cốc nước trong ngày. */
export function WaterTracker({ date }: { date: string }) {
  const n = useStore((s) => s.water[date] ?? 0);
  const goal = useStore((s) => s.reminders.waterGoal);
  const times = useStore((s) => s.reminders.waterTimes);
  const on = useStore((s) => s.reminders.water);
  const addWater = useStore((s) => s.addWater);
  const pct = Math.min(1, n / goal);
  return (
    <section className="card p-4" aria-label="Uống nước hôm nay">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold flex items-center gap-2">
          <Droplets size={18} className="text-sky" /> Uống nước
        </h2>
        <span className={`text-sm font-bold ${n >= goal ? "text-ok" : "text-ink-2"}`}>
          {n}/{goal} cốc {n >= goal ? "🎉" : ""}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Số cốc đã uống">
        {Array.from({ length: goal }, (_, i) => {
          // bấm cốc thứ i -> đã uống i+1 cốc (bấm lại đúng cốc cuối để bớt 1)
          const target = i + 1 === n ? i : i + 1;
          return (
          <button
            key={i}
            onClick={() => addWater(date, target - n)}
            aria-label={`Đã uống ${target} cốc`}
            className={`focus-ring h-9 w-7 rounded-b-lg rounded-t-sm border-2 transition-colors ${
              i < n ? "bg-sky border-sky" : "border-sky-line bg-sky-soft"
            }`}
          />
          );
        })}
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-sunken overflow-hidden" aria-hidden="true">
        <div className="h-full bg-sky rounded-full transition-all" style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button className="btn btn-ghost py-1.5 px-2.5" onClick={() => addWater(date, -1)} disabled={n === 0} aria-label="Bớt 1 cốc">
          <Minus size={16} />
        </button>
        <button className="btn btn-primary py-1.5 px-3 text-sm flex-1" onClick={() => addWater(date, 1)}>
          <Plus size={16} /> 1 cốc (~250ml)
        </button>
      </div>
      {on && <p className="mt-2 text-xs text-ink-3">Nhắc lúc {times.join(" · ")}</p>}
    </section>
  );
}
