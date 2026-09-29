import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Logo from "../components/Logo";
import { BasicSection, CommitmentsSection, MealsExerciseSection, OptionalSection } from "../components/ProfileForm";
import { defaultProfile } from "../engine/demo";
import type { Profile } from "../engine/types";
import { useStore } from "../store/useStore";
import { toMin } from "../engine/time";

const STEPS = [
  { title: "Về bạn", sub: "Giờ giấc cơ bản để Smart Life bảo vệ giấc ngủ của bạn." },
  { title: "Lịch học & lịch làm", sub: "Những khung giờ cố định mỗi tuần. Có thể bỏ qua nếu bạn chưa có." },
  { title: "Ăn uống & tập luyện", sub: "Sức khoẻ là mặc định – những hoạt động này luôn được xếp trước." },
  { title: "Hoạt động tuỳ chọn", sub: "Di chuyển, nấu ăn, giải trí… được bớt đi trước khi bạn quá tải." },
];

export default function Onboarding() {
  const nav = useNavigate();
  const existing = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const [p, setP] = useState<Profile>(() => existing ?? defaultProfile());
  const [step, setStep] = useState(0);
  const set = (fn: (x: Profile) => Profile) => setP(fn);

  const invalid = step === 1 && p.commitments.some((c) => toMin(c.end) <= toMin(c.start) || c.days.length === 0);
  const last = step === STEPS.length - 1;

  const next = () => {
    if (!last) return setStep(step + 1);
    setProfile({ ...p, name: p.name.trim() });
    nav("/hom-nay");
  };

  return (
    <div className="min-h-dvh blob-bg">
      <header className="mx-auto max-w-2xl px-4 h-16 flex items-center justify-between">
        <Logo />
        <span className="text-sm font-semibold text-ink-3">
          Bước {step + 1}/{STEPS.length}
        </span>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-16">
        <div className="flex gap-1.5 mb-6" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
          ))}
        </div>
        <div className="card p-5 md:p-7 pop-in" key={step}>
          <h1 className="text-2xl font-extrabold">{STEPS[step].title}</h1>
          <p className="text-ink-2 mt-1 mb-6">{STEPS[step].sub}</p>
          {step === 0 && <BasicSection p={p} set={set} />}
          {step === 1 && <CommitmentsSection p={p} set={set} />}
          {step === 2 && <MealsExerciseSection p={p} set={set} />}
          {step === 3 && <OptionalSection p={p} set={set} />}
        </div>
        <div className="mt-5 flex justify-between gap-3">
          <button className="btn btn-ghost" onClick={() => (step ? setStep(step - 1) : nav("/"))}>
            <ArrowLeft size={18} /> {step ? "Quay lại" : "Trang chủ"}
          </button>
          <button className="btn btn-primary" onClick={next} disabled={invalid}>
            {last ? (
              <>
                <Check size={18} /> Tạo lịch của tôi
              </>
            ) : (
              <>
                Tiếp tục <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
