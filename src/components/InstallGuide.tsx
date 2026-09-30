import { useEffect, useState } from "react";
import { BellRing, Check, Copy, Download, EllipsisVertical, MonitorDown, Share, Smartphone, SquarePlus, Tablet, WifiOff, Zap } from "lucide-react";
import { Modal } from "./ui";
import { inAppBrowser, markInstalled, platform, useInstall, type Platform } from "../store/ui";

const TABS: { id: Platform; label: string; icon: typeof Smartphone }[] = [
  { id: "ios", label: "iPhone / iPad", icon: Tablet },
  { id: "android", label: "Android", icon: Smartphone },
  { id: "desktop", label: "Máy tính", icon: MonitorDown },
];

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="h-7 w-7 shrink-0 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center">{n}</span>
      <span className="pt-0.5 text-sm text-ink-2 leading-relaxed">{children}</span>
    </li>
  );
}

const Key = ({ children }: { children: React.ReactNode }) => (
  <b className="inline-flex items-center gap-1 rounded-md bg-sunken px-1.5 py-0.5 text-ink font-semibold align-middle">{children}</b>
);

/** Hộp hướng dẫn cài Smart Life như ứng dụng – dùng chung cho mọi nơi có nút "Cài ứng dụng". */
export default function InstallGuide() {
  const { guide, setGuide, canInstall, install, installed } = useInstall();
  const [tab, setTab] = useState<Platform>("ios");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (guide) setTab(platform());
  }, [guide]);
  const inApp = inAppBrowser();
  const link = window.location.href.split("#")[0];

  return (
    <Modal open={guide} onClose={() => setGuide(false)} title="Tải Smart Life về máy">
      <div className="space-y-4">
        <ul className="grid grid-cols-3 gap-2 text-center text-xs text-ink-2">
          <li className="rounded-2xl bg-brand-soft p-2.5">
            <Zap size={18} className="mx-auto text-brand" />
            <span className="mt-1 block">Mở nhanh từ biểu tượng</span>
          </li>
          <li className="rounded-2xl bg-brand-soft p-2.5">
            <WifiOff size={18} className="mx-auto text-brand" />
            <span className="mt-1 block">Xem lịch cả khi mất mạng</span>
          </li>
          <li className="rounded-2xl bg-brand-soft p-2.5">
            <BellRing size={18} className="mx-auto text-brand" />
            <span className="mt-1 block">Toàn màn hình, như app thật</span>
          </li>
        </ul>

        {installed && <p className="rounded-xl bg-ok-soft text-ok text-sm font-semibold p-3">✓ Smart Life đã được cài trên thiết bị này.</p>}

        {inApp && (
          <div className="rounded-xl bg-amber-soft border border-amber-line p-3 text-sm text-ink-2 space-y-2">
            <p>
              <b className="text-amber">Bạn đang mở trong Zalo / Facebook / Messenger.</b> Trình duyệt này không cài được ứng dụng. Hãy bấm <Key>⋯</Key> →{" "}
              <b>Mở bằng trình duyệt</b> (Safari hoặc Chrome), hoặc sao chép đường dẫn:
            </p>
            <button
              className="btn btn-ghost text-sm py-1.5"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                } catch {
                  /* bỏ qua */
                }
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Đã sao chép" : "Sao chép đường dẫn"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-bg p-1" role="tablist" aria-label="Thiết bị">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`focus-ring flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold ${
                tab === t.id ? "bg-card shadow-sm text-ink" : "text-ink-3"
              }`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "ios" && (
          <ol className="space-y-3">
            <Step n={1}>
              Mở Smart Life bằng <b className="text-ink">Safari</b> (trên iOS 16.4 trở lên, Chrome cũng được).
            </Step>
            <Step n={2}>
              Bấm nút <Key><Share size={14} /> Chia sẻ</Key> – trên iPhone ở thanh dưới cùng, trên iPad ở góc trên bên phải.
            </Step>
            <Step n={3}>
              Kéo xuống, chọn <Key><SquarePlus size={14} /> Thêm vào MH chính</Key> rồi bấm <b className="text-ink">Thêm</b>.
            </Step>
            <Step n={4}>
              Mở Smart Life từ biểu tượng mới trên màn hình chính và <b className="text-ink">đăng nhập lại một lần</b> (ứng dụng lưu dữ liệu riêng với Safari).
            </Step>
          </ol>
        )}
        {tab === "android" && (
          <ol className="space-y-3">
            <Step n={1}>
              Mở Smart Life bằng <b className="text-ink">Chrome</b> (hoặc Samsung Internet, Edge).
            </Step>
            <Step n={2}>
              Bấm <Key><EllipsisVertical size={14} /> menu</Key> ở góc trên bên phải.
            </Step>
            <Step n={3}>
              Chọn <b className="text-ink">“Cài đặt ứng dụng”</b> hoặc <b className="text-ink">“Thêm vào màn hình chính”</b> → <b className="text-ink">Cài đặt</b>.
            </Step>
            <Step n={4}>Nhấn giữ biểu tượng Smart Life để dùng lối tắt “Thêm task”, “Thống kê”.</Step>
          </ol>
        )}
        {tab === "desktop" && (
          <ol className="space-y-3">
            <Step n={1}>
              Trên <b className="text-ink">Chrome / Edge</b>: bấm biểu tượng <Key><MonitorDown size={14} /></Key> ở cuối thanh địa chỉ → <b className="text-ink">Cài đặt</b>.
            </Step>
            <Step n={2}>
              Trên <b className="text-ink">Safari (Mac)</b>: menu <b className="text-ink">Tệp</b> → <b className="text-ink">Thêm vào Dock</b>.
            </Step>
            <Step n={3}>Smart Life mở trong cửa sổ riêng, có biểu tượng trên thanh tác vụ / Dock.</Step>
          </ol>
        )}

        {canInstall && !installed && (
          <button
            className="btn btn-primary w-full"
            onClick={async () => {
              if (await install()) setGuide(false);
            }}
          >
            <Download size={18} /> Cài đặt ngay
          </button>
        )}
        <p className="text-xs text-ink-3">
          Smart Life là ứng dụng web: không cần tải từ App Store / CH Play, không tốn dung lượng, luôn tự cập nhật bản mới nhất.
        </p>
        {!installed && (
          <button
            className="btn btn-ghost w-full text-sm"
            onClick={markInstalled}
          >
            Tôi đã cài xong
          </button>
        )}
      </div>
    </Modal>
  );
}
