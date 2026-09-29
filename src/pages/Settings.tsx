import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Download, RotateCcw, Save } from "lucide-react";
import { useStore } from "../store/useStore";
import { BasicSection, CommitmentsSection, MealsExerciseSection, OptionalSection } from "../components/ProfileForm";
import type { Profile } from "../engine/types";
import { toMin } from "../engine/time";
import { confirmReplace } from "./Landing";

const TABS = ["Cơ bản", "Học & làm", "Ăn & tập", "Tuỳ chọn", "Dữ liệu"];

export default function Settings() {
  const s = useStore();
  const nav = useNavigate();
  const [p, setP] = useState<Profile>(s.profile!);
  const [tab, setTab] = useState(0);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(p) !== JSON.stringify(s.profile);
  const invalid = p.commitments.some((c) => toMin(c.end) <= toMin(c.start) || c.days.length === 0);
  const set = (fn: (x: Profile) => Profile) => {
    setSaved(false);
    setP(fn);
  };

  const save = () => {
    s.setProfile({ ...p, name: p.name.trim() });
    setSaved(true);
  };

  const exportData = () => {
    const st = useStore.getState();
    const data = { profile: st.profile, tasks: st.tasks, checks: st.checks, logs: st.logs, exportedAt: new Date().toISOString() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "smart-life-du-lieu.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold">Cài đặt</h1>
        <p className="text-ink-2 mt-1">Thay đổi thói quen của bạn – lịch sẽ tự xếp lại ngay khi lưu.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4" role="tablist">
        {TABS.map((t, i) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={`focus-ring shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold border ${
              tab === i ? "bg-ink text-white border-ink" : "bg-white border-line text-ink-2"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="card p-5 md:p-6">
        {tab === 0 && <BasicSection p={p} set={set} />}
        {tab === 1 && <CommitmentsSection p={p} set={set} />}
        {tab === 2 && <MealsExerciseSection p={p} set={set} />}
        {tab === 3 && <OptionalSection p={p} set={set} />}
        {tab === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-ink-2">
              Toàn bộ dữ liệu được lưu trong trình duyệt này (localStorage). Mở Smart Life trên máy khác sẽ là dữ liệu trống.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <button className="btn btn-ghost" onClick={exportData}>
                <Download size={18} /> Tải dữ liệu (JSON)
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (!confirmReplace()) return;
                  s.loadDemo();
                  nav("/hom-nay");
                }}
              >
                <Database size={18} /> Nạp dữ liệu mẫu
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (!window.confirm("Xoá toàn bộ dữ liệu và bắt đầu lại từ đầu?")) return;
                  s.resetAll();
                  nav("/");
                }}
              >
                <RotateCcw size={18} /> Xoá toàn bộ
              </button>
            </div>
          </div>
        )}
      </div>

      {tab < 4 && (dirty || saved) && (
        <div className="sticky bottom-20 md:bottom-4 z-30 flex items-center justify-end gap-3">
          {saved && !dirty && <span className="text-sm font-semibold text-[#0f7a55]">✓ Đã lưu, lịch đã được xếp lại</span>}
          {invalid && <span className="text-sm font-semibold text-[#b3261e]">Kiểm tra lại giờ học / làm</span>}
          <button className="btn btn-primary" onClick={save} disabled={!dirty || invalid}>
            <Save size={18} /> Lưu thay đổi
          </button>
        </div>
      )}
    </div>
  );
}
