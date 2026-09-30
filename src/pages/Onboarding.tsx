import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, Settings2 } from "lucide-react";
import Logo from "../components/Logo";
import { CommitmentsSection, MealsExerciseSection, OptionalSection } from "../components/ProfileForm";
import { TEMPLATES } from "../engine/demo";
import type { Profile } from "../engine/types";
import { useStore } from "../store/useStore";
import { addDays, fmtDuration, fmtTime, toMin, todayStr, weekday, WEEKDAY_LONG } from "../engine/time";
import { planDay } from "../engine/scheduler";
import { useSession } from "../cloud/session";
import { CAT } from "../lib/categories";
import { Field, TimeField } from "../components/ui";

const SLEEP_OPTIONS = [360, 390, 420, 450, 480, 510, 540];

/** Ngày gần nhất có lịch học/làm để xem trước cho sinh động. */
function previewDate(p: Profile) {
  const t = todayStr();
  for (let i = 1; i <= 7; i++) {
    const d = addDays(t, i);
    if (p.commitments.some((c) => c.days.includes(weekday(d)))) return d;
  }
  return addDays(t, 1);
}

export default function Onboarding() {
  const nav = useNavigate();
  const existing = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const googleName = useSession((st) => (st.status === "signedIn" ? st.user?.name ?? "" : ""));
  const firstName = googleName.split(" ").slice(-1)[0] ?? "";
  const [tpl, setTpl] = useState(existing ? "" : "student-am");
  const [p, setP] = useState<Profile>(() => existing ?? { ...TEMPLATES[0].make(), name: firstName });
  const [open, setOpen] = useState<string | null>(null);
  const set = (fn: (x: Profile) => Profile) => setP(fn);

  const choose = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)!;
    setTpl(id);
    setP((cur) => ({ ...t.make(), name: cur.name, wakeTime: t.id === "custom" ? cur.wakeTime : t.make().wakeTime }));
  };

  const invalid = p.commitments.some((c) => toMin(c.end) <= toMin(c.start) || c.days.length === 0);
  const finish = () => {
    setProfile({ ...p, name: p.name.trim() });
    nav("/hom-nay");
  };

  const pDate = previewDate(p);
  const preview = useMemo(
    () => planDay({ date: pDate, profile: p, tasks: [], overloadAllowed: true }),
    [p, pDate],
  );

  return (
    <div className="min-h-dvh blob-bg">
      <header className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
        <Logo />
        <span className="text-sm font-semibold text-ink-3">Chỉ mất 1 phút</span>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Lịch của bạn trông như thế nào?</h1>
            <p className="text-ink-2 mt-1">Chọn mẫu gần giống bạn nhất – mọi thứ đều chỉnh lại được sau.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Chọn mẫu lịch">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={tpl === t.id}
                onClick={() => choose(t.id)}
                className={`focus-ring text-left rounded-2xl border-2 p-4 transition-colors ${
                  tpl === t.id ? "border-brand bg-brand-soft" : "border-line bg-card hover:border-brand/40"
                }`}
              >
                <span className="text-2xl">{t.emoji}</span>
                <span className="block font-bold mt-1">{t.title}</span>
                <span className="block text-sm text-ink-2">{t.desc}</span>
              </button>
            ))}
          </div>

          <div className="card p-5 grid sm:grid-cols-3 gap-3">
            <Field label="Tên của bạn">
              <input
                className="field"
                value={p.name}
                maxLength={40}
                placeholder="Ví dụ: Minh Anh"
                onChange={(e) => set((x) => ({ ...x, name: e.target.value }))}
              />
            </Field>
            <Field label="Thức dậy lúc">
              <TimeField label="Giờ thức dậy" value={p.wakeTime} onChange={(v) => set((x) => ({ ...x, wakeTime: v }))} from={4 * 60} to={11 * 60} />
            </Field>
            <Field label="Muốn ngủ mỗi đêm">
              <select className="field" value={p.sleepTarget} onChange={(e) => set((x) => ({ ...x, sleepTarget: Number(e.target.value) }))}>
                {SLEEP_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {(m / 60).toString().replace(".", ",")} tiếng
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="space-y-2.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-2">
              <Settings2 size={16} /> Tuỳ chỉnh chi tiết (không bắt buộc)
            </p>
            <Section open={open} setOpen={setOpen} id="commit" title="Lịch học & làm" sub={p.commitments.length ? p.commitments.map((c) => `${c.label} ${c.start}–${c.end}`).join(" · ") : "Chưa có"}>
              <CommitmentsSection p={p} set={set} />
            </Section>
            <Section open={open} setOpen={setOpen} id="meal" title="Ăn uống & tập luyện" sub={`${p.meals.filter((m) => m.enabled).length} bữa/ngày · ${p.exercise.enabled ? `${p.exercise.kind} ${p.exercise.time}` : "không tập"}`}>
              <MealsExerciseSection p={p} set={set} />
            </Section>
            <Section open={open} setOpen={setOpen} id="opt" title="Di chuyển, nấu ăn, giải trí" sub="Được bớt đi trước khi bạn quá tải">
              <OptionalSection p={p} set={set} />
            </Section>
          </div>

          <div className="flex justify-between gap-3 pt-1">
            <button className="btn btn-ghost" onClick={() => nav("/")}>
              <ArrowLeft size={18} /> Trang chủ
            </button>
            <button className="btn btn-primary px-6" onClick={finish} disabled={invalid}>
              <Check size={18} /> {existing ? "Lưu" : "Tạo lịch của tôi"}
            </button>
          </div>
          {invalid && <p className="text-sm text-danger text-right">Kiểm tra lại giờ học / làm (giờ kết thúc phải sau giờ bắt đầu).</p>}
        </div>

        {/* Xem trước lịch */}
        <aside className="card p-4 lg:sticky lg:top-6" aria-label="Xem trước lịch">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-3">Xem trước · {WEEKDAY_LONG[weekday(pDate)]}</p>
          <p className="font-bold">Lịch một ngày của bạn</p>
          <ol className="mt-3 space-y-1.5">
            {preview.blocks.map((b) => {
              const m = CAT[b.cat];
              return (
                <li key={b.key} className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm" style={{ background: m.tint }}>
                  <span className="w-11 text-xs font-bold text-ink-2">{fmtTime(b.start)}</span>
                  <m.icon size={15} style={{ color: m.color }} />
                  <span className="flex-1 truncate font-semibold">{b.title}</span>
                  <span className="text-[11px] text-ink-3">{fmtDuration(b.end - b.start)}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-ink-3">Còn trống {fmtDuration(preview.freeMin)} để làm bài tập, deadline – Smart Life sẽ tự xếp khi bạn thêm task.</p>
        </aside>
      </main>
    </div>
  );
}

/** Khối thu gọn / mở rộng (đặt ngoài component để ô nhập không bị mất focus). */
function Section({
  id,
  title,
  sub,
  open,
  setOpen,
  children,
}: {
  id: string;
  title: string;
  sub: string;
  open: string | null;
  setOpen: (v: string | null) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card">
      <button
        className="focus-ring w-full flex items-center gap-3 p-4 text-left rounded-2xl"
        onClick={() => setOpen(open === id ? null : id)}
        aria-expanded={open === id}
      >
        <span className="flex-1 min-w-0">
          <span className="block font-bold">{title}</span>
          <span className="block text-sm text-ink-3 truncate">{sub}</span>
        </span>
        <ChevronDown size={18} className={`transition-transform ${open === id ? "rotate-180" : ""}`} />
      </button>
      {open === id && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
