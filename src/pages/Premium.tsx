import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Crown, GraduationCap, Minus, PartyPopper, Sparkles, Zap } from "lucide-react";
import { useStore } from "../store/useStore";
import { Modal, Toggle } from "../components/ui";
import { fmtDateShort } from "../engine/time";

export const PREMIUM_PRICE = "39.000đ";

const ROWS: [string, boolean, boolean][] = [
  ["Tự động xếp lịch healthy theo hồ sơ cá nhân", true, true],
  ["Nhập task / deadline, tự xếp vào giờ rảnh", true, true],
  ["Tự cân bằng ăn, ngủ, nghỉ khi nhiều deadline", true, true],
  ["Cảnh báo ngủ dưới 6 tiếng, dời deadline khi quá tải", true, true],
  ["Checklist, biểu đồ ngày / tuần / tháng", true, true],
  ["Dự đoán khung giờ năng suất", true, true],
  ["Chế độ rất gấp – cho phép ngủ dưới 6 tiếng", false, true],
  ["Tranh thủ giờ học để chạy deadline", false, true],
  ["Gợi ý phương án thay thế cho hoạt động", false, true],
];

export default function Premium() {
  const s = useStore();
  const [confirm, setConfirm] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  return (
    <div className="space-y-6">
      <section className="card p-6 md:p-10 blob-bg overflow-hidden">
        <span className="chip bg-lime text-ink">
          <Crown size={14} /> Smart Life Premium
        </span>
        <h1 className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tight max-w-2xl">
          Cho những tuần deadline <span className="text-brand">dí sát nút</span>
        </h1>
        <p className="mt-3 text-ink-2 max-w-xl">
          Vẫn giữ nguyên tắc sức khoẻ là trên hết, nhưng có thêm “vũ khí” cho những lúc thật sự cần: chế độ rất gấp, tranh
          thủ giờ học và gợi ý thay thế thông minh.
        </p>
        {s.premium ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="chip bg-ink text-white text-sm py-1.5 px-3">
              <Check size={15} /> Đang dùng Premium {s.premiumSince && `từ ${fmtDateShort(s.premiumSince)}`}
            </span>
            <button className="btn btn-ghost text-sm" onClick={() => s.cancelPremium()}>
              Huỷ Premium
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button className="btn btn-primary text-base px-6 py-3.5" onClick={() => setConfirm(true)}>
              <Crown size={18} /> Dùng thử Premium
            </button>
            <p className="text-sm text-ink-2">
              <b className="text-2xl text-ink">{PREMIUM_PRICE}</b> / tháng sau 7 ngày dùng thử
            </p>
          </div>
        )}
      </section>

      <div className="grid md:grid-cols-3 gap-4">
        <FeatureCard
          icon={Zap}
          title="Chế độ rất gấp"
          text="Bật cho từng ngày ngay trên trang lịch. Khi deadline hôm nay không kịp, Smart Life được phép rút giờ ngủ xuống 5 rồi 4 tiếng – luôn kèm cảnh báo và gợi ý ngủ bù. Việc còn hạn vẫn được dời sang ngày sau trước."
        />
        <FeatureCard
          icon={GraduationCap}
          title="Tranh thủ giờ học"
          text="Khi nhiều việc, lịch được xếp một phần task vào giờ học (tối đa 50% mỗi buổi) trước khi phải cắt giờ ngủ, giờ ăn."
        >
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-bg p-3">
            <span className="text-sm font-semibold">Bật tranh thủ giờ học</span>
            <Toggle checked={s.studyAtSchool} onChange={s.setStudyAtSchool} label="Tranh thủ giờ học" disabled={!s.premium} />
          </div>
        </FeatureCard>
        <FeatureCard
          icon={Sparkles}
          title="Gợi ý thay thế"
          text="Không kịp nấu ăn → gợi ý món ship lành mạnh. Không kịp đi gym → bài cardio nhẹ 15 phút. Mất giờ giải trí → cách thư giãn nhanh."
        />
      </div>

      <section className="card p-5 md:p-6 overflow-x-auto">
        <h2 className="text-lg font-bold mb-3">So sánh các gói</h2>
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="text-left">
              <th className="py-2 pr-3 font-semibold text-ink-3">Tính năng</th>
              <th className="py-2 px-3 text-center">Miễn phí</th>
              <th className="py-2 px-3 text-center">
                <span className="chip bg-lime text-ink">Premium</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([f, free, pre]) => (
              <tr key={f} className="border-t border-line">
                <td className="py-2.5 pr-3">{f}</td>
                <td className="text-center">{free ? <Check size={18} className="inline text-[#0f7a55]" aria-label="Có" /> : <Minus size={18} className="inline text-ink-3" aria-label="Không" />}</td>
                <td className="text-center">{pre ? <Check size={18} className="inline text-brand" aria-label="Có" /> : <Minus size={18} className="inline text-ink-3" aria-label="Không" />}</td>
              </tr>
            ))}
            <tr className="border-t border-line font-bold">
              <td className="py-2.5">Giá</td>
              <td className="text-center">0đ</td>
              <td className="text-center">{PREMIUM_PRICE}/tháng</td>
            </tr>
          </tbody>
        </table>
      </section>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Dùng thử Premium">
        <div className="space-y-4">
          <p className="text-ink-2">
            Bạn sẽ được dùng đầy đủ tính năng Premium. Đây là <b>phiên bản demo</b> của đồ án: không thu tiền và không cần
            nhập bất kỳ thông tin thanh toán nào.
          </p>
          <ul className="space-y-1.5 text-sm">
            <li>⚡ Chế độ rất gấp</li>
            <li>🎒 Tranh thủ giờ học</li>
            <li>🍱 Gợi ý phương án thay thế</li>
          </ul>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setConfirm(false)}>
              Để sau
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                s.activatePremium();
                setConfirm(false);
                setCelebrate(true);
              }}
            >
              <Crown size={18} /> Kích hoạt ngay
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={celebrate} onClose={() => setCelebrate(false)} title="Chào mừng đến với Premium!">
        <div className="text-center space-y-4">
          <PartyPopper size={48} className="mx-auto text-brand" />
          <p className="text-ink-2">Mọi tính năng Premium đã được mở khoá. Thử bật “Rất gấp” hoặc xem gợi ý thay thế trên lịch hôm nay nhé.</p>
          <Link to="/hom-nay" className="btn btn-primary" onClick={() => setCelebrate(false)}>
            Mở lịch hôm nay
          </Link>
        </div>
      </Modal>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: typeof Zap;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Icon size={22} />
      </span>
      <h3 className="mt-3 font-bold">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-2 leading-relaxed">{text}</p>
      {children}
    </div>
  );
}
