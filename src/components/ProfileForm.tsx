import { Plus, Trash2 } from "lucide-react";
import type { Commitment, MealSetting, Profile } from "../engine/types";
import { DaysPicker, Field, NumInput, TimeField, Toggle } from "./ui";
import { fmtTime, toMin } from "../engine/time";
import { MEAL_LABEL } from "../engine/scheduler";
import { uid } from "../engine/demo";

export type SetProfile = (fn: (p: Profile) => Profile) => void;
interface Props {
  p: Profile;
  set: SetProfile;
}

const SLEEP_OPTIONS = [360, 390, 420, 450, 480, 510, 540];

export function BasicSection({ p, set }: Props) {
  const bed = toMin(p.wakeTime) - p.sleepTarget;
  return (
    <div className="space-y-4">
      <Field label="Tên của bạn (để Smart Life gọi cho thân)">
        <input
          className="field"
          value={p.name}
          maxLength={40}
          placeholder="Ví dụ: Minh Anh"
          onChange={(e) => set((x) => ({ ...x, name: e.target.value }))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Giờ thức dậy">
          <TimeField label="Chọn giờ" value={p.wakeTime} onChange={(v) => set((x) => ({ ...x, wakeTime: v }))} />
        </Field>
        <Field label="Muốn ngủ mỗi đêm">
          <select
            className="field"
            value={p.sleepTarget}
            onChange={(e) => set((x) => ({ ...x, sleepTarget: Number(e.target.value) }))}
          >
            {SLEEP_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {(m / 60).toString().replace(".", ",")} tiếng
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="text-sm text-ink-2 bg-brand-soft rounded-2xl p-3">
        😴 Smart Life sẽ nhắc bạn đi ngủ lúc <b>{fmtTime(bed)}</b> để thức dậy lúc <b>{p.wakeTime}</b>. Người trẻ nên
        ngủ 7–9 tiếng mỗi đêm.
      </p>
    </div>
  );
}

export function CommitmentsSection({ p, set }: Props) {
  const update = (id: string, patch: Partial<Commitment>) =>
    set((x) => ({ ...x, commitments: x.commitments.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const remove = (id: string) => set((x) => ({ ...x, commitments: x.commitments.filter((c) => c.id !== id) }));
  const add = () =>
    set((x) => ({
      ...x,
      commitments: [
        ...x.commitments,
        { id: uid(), label: x.commitments.length ? "Làm thêm" : "Đi học", kind: x.commitments.length ? "work" : "school", days: [1, 2, 3, 4, 5], start: "07:30", end: "11:30" },
      ],
    }));
  return (
    <div className="space-y-3">
      {p.commitments.length === 0 && (
        <p className="text-sm text-ink-3 bg-card border border-dashed border-line rounded-2xl p-4 text-center">
          Chưa có lịch cố định nào. Thêm giờ đi học hoặc đi làm để Smart Life xếp lịch quanh chúng.
        </p>
      )}
      {p.commitments.map((c) => (
        <div key={c.id} className="rounded-2xl border border-line bg-card p-4 space-y-3">
          <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_8rem_auto] gap-2">
            <input
              className="field col-span-3 sm:col-span-1"
              value={c.label}
              aria-label="Tên lịch"
              onChange={(e) => update(c.id, { label: e.target.value })}
            />
            <select
              className="field col-span-2 sm:col-span-1"
              value={c.kind}
              aria-label="Loại"
              onChange={(e) => update(c.id, { kind: e.target.value as Commitment["kind"] })}
            >
              <option value="school">Đi học</option>
              <option value="work">Đi làm</option>
            </select>
            <button className="focus-ring rounded-xl px-2.5 text-danger hover:bg-coral-soft" onClick={() => remove(c.id)} aria-label={`Xoá ${c.label}`}>
              <Trash2 size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bắt đầu">
              <TimeField label="Chọn giờ" value={c.start} onChange={(v) => update(c.id, { start: v })} />
            </Field>
            <Field label="Kết thúc">
              <TimeField label="Chọn giờ" value={c.end} onChange={(v) => update(c.id, { end: v })} />
            </Field>
          </div>
          {toMin(c.end) <= toMin(c.start) && <p className="text-sm text-danger">Giờ kết thúc phải sau giờ bắt đầu.</p>}
          <DaysPicker value={c.days} onChange={(days) => update(c.id, { days })} />
        </div>
      ))}
      <button type="button" className="btn btn-ghost w-full" onClick={add}>
        <Plus size={18} /> Thêm lịch học / lịch làm
      </button>
    </div>
  );
}

export function MealsExerciseSection({ p, set }: Props) {
  const upMeal = (id: MealSetting["id"], patch: Partial<MealSetting>) =>
    set((x) => ({ ...x, meals: x.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  const ex = p.exercise;
  const upEx = (patch: Partial<Profile["exercise"]>) => set((x) => ({ ...x, exercise: { ...x.exercise, ...patch } }));
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="font-bold">🍚 Bữa ăn</h3>
        {p.meals.map((m) => (
          <div key={m.id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{MEAL_LABEL[m.id]}</span>
              <Toggle checked={m.enabled} onChange={(v) => upMeal(m.id, { enabled: v })} label={`Bật ${MEAL_LABEL[m.id]}`} />
            </div>
            {m.enabled && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Giờ ăn">
                  <TimeField label="Chọn giờ" value={m.time} onChange={(v) => upMeal(m.id, { time: v })} />
                </Field>
                <Field label="Thời gian (phút)">
                  <NumInput min={10} max={120} step={5} className="field" value={m.duration} onChange={(v) => upMeal(m.id, { duration: v })} />
                </Field>
                <label className="col-span-2 flex items-center gap-2 text-sm text-ink-2">
                  <input type="checkbox" className="h-4 w-4 accent-brand" checked={m.cook} onChange={(e) => upMeal(m.id, { cook: e.target.checked })} />
                  Tự nấu bữa này (cần bật “Nấu ăn” ở phần hoạt động tuỳ chọn)
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">💪 Tập luyện</h3>
          <Toggle checked={ex.enabled} onChange={(v) => upEx({ enabled: v })} label="Bật tập luyện" />
        </div>
        {ex.enabled && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Môn">
                <input className="field" value={ex.kind} maxLength={24} onChange={(e) => upEx({ kind: e.target.value })} />
              </Field>
              <Field label="Giờ tập">
                <TimeField label="Chọn giờ" value={ex.time} onChange={(v) => upEx({ time: v })} />
              </Field>
              <Field label="Phút">
                <NumInput min={15} max={180} step={5} className="field" value={ex.duration} onChange={(v) => upEx({ duration: v })} />
              </Field>
            </div>
            <DaysPicker value={ex.days} onChange={(days) => upEx({ days })} />
          </>
        )}
      </div>
    </div>
  );
}

export function OptionalSection({ p, set }: Props) {
  return (
    <div className="space-y-3">
      <OptRow
        emoji="🚌"
        title="Di chuyển"
        desc="Thời gian đi đến trường / chỗ làm (mỗi chiều)"
        enabled={p.commute.enabled}
        onToggle={(v) => set((x) => ({ ...x, commute: { ...x.commute, enabled: v } }))}
      >
        <MinutesInput value={p.commute.minutes} onChange={(v) => set((x) => ({ ...x, commute: { ...x.commute, minutes: v } }))} />
      </OptRow>
      <OptRow
        emoji="🍳"
        title="Nấu ăn"
        desc="Thời gian nấu trước mỗi bữa bạn tự nấu"
        enabled={p.cooking.enabled}
        onToggle={(v) => set((x) => ({ ...x, cooking: { ...x.cooking, enabled: v } }))}
      >
        <MinutesInput value={p.cooking.minutes} onChange={(v) => set((x) => ({ ...x, cooking: { ...x.cooking, minutes: v } }))} />
      </OptRow>
      <OptRow
        emoji="🎮"
        title="Giải trí"
        desc="Xem phim, chơi game, lướt mạng, gặp bạn bè…"
        enabled={p.fun.enabled}
        onToggle={(v) => set((x) => ({ ...x, fun: { ...x.fun, enabled: v } }))}
      >
        <div className="grid grid-cols-2 gap-3 w-full">
          <Field label="Khoảng giờ">
            <TimeField label="Chọn giờ" value={p.fun.time} onChange={(v) => set((x) => ({ ...x, fun: { ...x.fun, time: v } }))} />
          </Field>
          <Field label="Phút">
            <NumInput min={15} max={240} step={15} className="field" value={p.fun.minutes} onChange={(v) => set((x) => ({ ...x, fun: { ...x.fun, minutes: v } }))} />
          </Field>
        </div>
      </OptRow>
      <p className="text-xs text-ink-3">
        Hoạt động tuỳ chọn là những thứ Smart Life được phép bớt đi đầu tiên khi bạn có quá nhiều deadline.
      </p>
    </div>
  );
}

function OptRow({
  emoji,
  title,
  desc,
  enabled,
  onToggle,
  children,
}: {
  emoji: string;
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            {emoji} {title}
          </p>
          <p className="text-sm text-ink-3">{desc}</p>
        </div>
        <Toggle checked={enabled} onChange={onToggle} label={`Bật ${title}`} />
      </div>
      {enabled && <div className="mt-3 flex">{children}</div>}
    </div>
  );
}

function MinutesInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Field label="Số phút">
      <NumInput min={5} max={180} step={5} className="field w-32" value={value} onChange={(v) => onChange(v)} />
    </Field>
  );
}

