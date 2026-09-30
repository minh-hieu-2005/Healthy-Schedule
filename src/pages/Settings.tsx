import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, Database, Download, LogOut, Plus, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { defaultReminders, useStore } from "../store/useStore";
import { signOut, useSession } from "../cloud/session";
import { Avatar, SyncBadge } from "../components/UserMenu";
import { Toggle } from "../components/ui";
import { notifyPermission, requestNotifyPermission, systemNotify } from "../lib/notify";
import { BasicSection, CommitmentsSection, MealsExerciseSection, OptionalSection } from "../components/ProfileForm";
import type { Profile } from "../engine/types";
import { toMin } from "../engine/time";
import { confirmReplace } from "./Landing";

const TABS = ["Cơ bản", "Học & làm", "Ăn & tập", "Tuỳ chọn", "Thông báo", "Tài khoản"];

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
        {tab === 4 && <NotificationSettings />}
        {tab === 5 && (
          <div className="space-y-5">
            <AccountCard />
            <div>
              <h3 className="font-bold">Dữ liệu</h3>
              <p className="text-sm text-ink-2 mt-1">
                Lịch, task và thống kê được lưu trong tài khoản của bạn, chỉ bạn xem được. Đăng nhập trên máy khác vẫn thấy đầy đủ.
              </p>
              <div className="grid sm:grid-cols-3 gap-3 mt-3">
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
                    if (!window.confirm("Xoá toàn bộ dữ liệu trong tài khoản và bắt đầu lại từ đầu?")) return;
                    s.resetAll();
                    nav("/bat-dau");
                  }}
                >
                  <RotateCcw size={18} /> Xoá toàn bộ
                </button>
              </div>
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

function AccountCard() {
  const user = useSession((st) => st.user);
  const error = useSession((st) => st.error);
  const sync = useSession((st) => st.sync);
  if (!user) return null;
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar size={52} />
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{user.name}</p>
          <p className="text-sm text-ink-3 truncate">{user.email}</p>
          <div className="mt-1">
            <SyncBadge />
          </div>
        </div>
        <button className="btn btn-danger" onClick={() => void signOut()}>
          <LogOut size={18} /> Đăng xuất
        </button>
      </div>
      {(sync === "error" || sync === "offline") && error && <p className="mt-3 text-sm text-[#b8431a]">{error}</p>}
    </div>
  );
}

const PERM_TEXT = {
  granted: "Đã bật – bạn sẽ nhận thông báo cả khi đang ở tab khác.",
  denied: "Đã bị chặn. Hãy bấm biểu tượng ổ khoá cạnh địa chỉ web → cho phép Thông báo, rồi tải lại trang.",
  default: "Chưa bật – hiện chỉ có pop-up khi bạn đang mở Smart Life.",
  unsupported: "Trình duyệt này không hỗ trợ thông báo hệ thống – vẫn có pop-up khi mở Smart Life.",
};

function NotificationSettings() {
  const reminders = useStore((st) => st.reminders);
  const setReminders = useStore((st) => st.setReminders);
  const [perm, setPerm] = useState(notifyPermission());
  const times = reminders.waterTimes;
  const setTimes = (t: string[]) => setReminders({ waterTimes: [...new Set(t)].sort() });

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-2">
        Thông báo sẽ <b>bật lên trên màn hình</b> khi bạn đang mở Smart Life. Thay đổi ở đây được lưu ngay.
      </p>

      <div className="rounded-2xl border border-line p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">💧 Nhắc uống nước</p>
            <p className="text-sm text-ink-3">Mặc định lúc 8:00, 14:00 và 17:00</p>
          </div>
          <Toggle checked={reminders.water} onChange={(v) => setReminders({ water: v })} label="Nhắc uống nước" />
        </div>
        {reminders.water && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {times.map((t, i) => (
                <span key={t} className="flex items-center gap-1 rounded-xl border border-line bg-white pl-2 pr-1 py-1">
                  <input
                    type="time"
                    className="text-sm font-semibold bg-transparent focus:outline-none"
                    value={t}
                    aria-label={`Giờ nhắc ${i + 1}`}
                    onChange={(e) => e.target.value && setTimes(times.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                  <button
                    className="focus-ring rounded-lg p-1 text-ink-3 hover:text-[#c2361a]"
                    onClick={() => setTimes(times.filter((_, j) => j !== i))}
                    aria-label={`Xoá giờ nhắc ${t}`}
                    disabled={times.length <= 1}
                  >
                    <Trash2 size={15} />
                  </button>
                </span>
              ))}
              {times.length < 8 && (
                <button className="btn btn-ghost text-sm py-1.5" onClick={() => setTimes([...times, "20:00"])}>
                  <Plus size={16} /> Thêm giờ
                </button>
              )}
            </div>
            <button className="text-xs font-semibold text-brand hover:underline" onClick={() => setTimes(defaultReminders().waterTimes)}>
              Khôi phục 8:00 · 14:00 · 17:00
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-line p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">⏰ Nhắc deadline quan trọng</p>
            <p className="text-sm text-ink-3">
              Task <b>ưu tiên cao</b>: nhắc trước 24 tiếng, 3 tiếng và 1 tiếng. Task khác: nhắc trước 1 tiếng.
            </p>
          </div>
          <Toggle checked={reminders.deadline} onChange={(v) => setReminders({ deadline: v })} label="Nhắc deadline" />
        </div>
      </div>

      <div className="rounded-2xl border border-line p-4 space-y-3">
        <div className="flex items-start gap-3">
          <BellRing size={20} className="text-brand shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Thông báo của trình duyệt</p>
            <p className="text-sm text-ink-3">{PERM_TEXT[perm]}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {perm === "default" && (
            <button className="btn btn-primary text-sm" onClick={async () => setPerm(await requestNotifyPermission())}>
              <BellRing size={16} /> Bật thông báo
            </button>
          )}
          {perm === "granted" && (
            <button
              className="btn btn-ghost text-sm"
              onClick={() => void systemNotify("💧 Smart Life", "Thông báo thử: đến giờ uống nước rồi!", "test")}
            >
              <Send size={16} /> Gửi thông báo thử
            </button>
          )}
        </div>
        <p className="text-xs text-ink-3">
          Lưu ý: Smart Life là website nên chỉ nhắc được khi trang đang mở (ở tab nào cũng được). Nếu đóng hẳn trình duyệt, thông báo sẽ hiện lần tới bạn mở lại trong vòng 1 tiếng sau giờ nhắc.
        </p>
      </div>
    </div>
  );
}
