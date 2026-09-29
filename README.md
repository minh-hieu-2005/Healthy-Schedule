# ⚡ Smart Life – Sống khoẻ mà vẫn kịp deadline

Smart Life là website tự động sắp xếp thời gian biểu lành mạnh cho người trẻ bận rộn (sinh viên, người đi làm).
Hệ thống **giữ chỗ cho giấc ngủ, bữa ăn và tập luyện trước**, sau đó mới xếp task/deadline vào thời gian rảnh.
Khi có quá nhiều việc, lịch tự cân bằng lại và luôn có giới hạn để bảo vệ sức khoẻ.

🌐 **Website:** https://minh-hieu-2005.github.io/Healthy-Schedule/

> Bấm **“Xem thử với dữ liệu mẫu”** ở trang chủ để xem ngay một lịch đầy đủ, kèm lịch sử 5 tuần để có biểu đồ và dự đoán.

---

## Tính năng

| Tính năng | Mô tả |
|---|---|
| Lịch cá nhân hoá | Khai báo giờ thức dậy, số giờ ngủ, lịch học/làm, bữa ăn, lịch tập, các hoạt động tuỳ chọn (nấu ăn, giải trí, di chuyển). |
| Nhập task / deadline | Tên, mô tả, thời gian thực hiện dự tính, hạn nộp (ngày + giờ), ngày bắt đầu làm, mức ưu tiên. |
| Tự xếp vào giờ rảnh | Task có hạn sớm được xếp trước; task dài được chia thành các phiên tối đa 90 phút, có nghỉ giữa các phiên. |
| Tự cân bằng khi nhiều deadline | Lần lượt bỏ bớt hoạt động tuỳ chọn → rút ngắn bữa ăn, chuyển sang tập nhẹ → giảm giờ ngủ (tối thiểu 6 tiếng). |
| Cảnh báo ngủ dưới 6 tiếng | Hiện cảnh báo đỏ và gợi ý ngủ bù. |
| Dời deadline khi quá tải | Nếu vẫn không đủ thời gian, các task **chưa đến hạn** được dời sang ngày sau (task hạn xa nhất / ưu tiên thấp nhất bị dời trước). |
| Quy tắc 2 ngày | Mỗi 2 ngày chỉ được quá tải 1 lần. Hôm qua đã quá tải thì hôm nay lịch giữ đủ giờ ngủ và dời bớt việc. |
| Checklist | Tick từng hoạt động đã làm. Tick hết các phiên của một task thì task tự hoàn thành. Bấm **Xếp lại lịch** để xếp lại phần còn lại trong ngày. |
| Biểu đồ ngày / tuần / tháng | Thời gian theo hoạt động, giấc ngủ, tỉ lệ hoàn thành checklist. |
| Dự đoán giờ năng suất | Từ lịch sử checklist, tìm khung 2 tiếng có tỉ lệ hoàn thành task cao nhất. Task ưu tiên cao sẽ được xếp vào khung này. |
| **Premium** | ⚡ *Chế độ rất gấp* (cho phép ngủ dưới 6 tiếng để kịp deadline hôm nay) · 🎒 *Tranh thủ giờ học* (làm task trong tối đa 50% giờ học) · 🍱 *Gợi ý thay thế* (không kịp nấu → đặt món ship; không kịp gym → cardio nhẹ). |

> Premium trong đồ án là **bản demo**: bấm “Dùng thử Premium” là kích hoạt, không có thanh toán thật.

## Cách thuật toán xếp lịch hoạt động

Mã nguồn chính: [`src/engine/scheduler.ts`](src/engine/scheduler.ts).

1. **Xếp các khung cố định:** lịch học/làm (kèm thời gian di chuyển) → bữa ăn (kèm nấu ăn) → tập luyện → giải trí.
2. **Tìm khoảng trống** giữa các hoạt động trên và xếp task theo thứ tự hạn nộp (sớm trước), rồi đến mức ưu tiên.
3. Nếu không đủ chỗ, thử lần lượt các **mức cân bằng**:

| Mức | Tên | Thay đổi |
|---|---|---|
| 0 | Bình thường | Đủ ngủ, ăn, tập, có nấu ăn và giải trí |
| 1 | Cân bằng | Bỏ bớt nấu ăn, giải trí (gợi ý đặt đồ ship) |
| 2 | Tranh thủ giờ học | *(Premium)* làm task trong giờ học |
| 3 | Quá tải | Bữa ăn ngắn hơn, tập cardio nhẹ, ngủ ít hơn 1 tiếng |
| 4 | Quá tải | Ngủ còn 6 tiếng (mức sàn của bản miễn phí) |
| 5–6 | Rất gấp | *(Premium)* ngủ 5 rồi 4 tiếng, chỉ để kịp task đến hạn hôm nay |

4. Mức 3–6 chỉ được dùng nếu **2 ngày gần nhất chưa quá tải**.
5. Nếu vẫn không đủ, **dời các task chưa đến hạn** sang ngày hôm sau. Task đến hạn hôm nay mà vẫn không kịp sẽ có cảnh báo.

Dự đoán giờ năng suất nằm ở [`src/engine/predict.ts`](src/engine/predict.ts): hệ thống lấy dữ liệu 28 ngày gần nhất
(ngày gần đây có trọng số cao hơn), tính tỉ lệ *số phút task đã tick / số phút task đã xếp* cho từng giờ, rồi chọn khung
2 tiếng liên tiếp có tỉ lệ cao nhất.

## Công nghệ

- React 19 + TypeScript + Vite
- Tailwind CSS 4, font Be Vietnam Pro, icon Lucide
- Recharts (biểu đồ), Zustand (quản lý trạng thái)
- Vitest (kiểm thử thuật toán xếp lịch)
- Dữ liệu lưu bằng `localStorage` trên trình duyệt, không cần server hay tài khoản.

## Chạy trên máy

Yêu cầu: Node.js 20 trở lên.

```bash
npm install
npm run dev      # mở http://localhost:5173/Healthy-Schedule/
npm test         # chạy kiểm thử thuật toán
npm run build    # build ra thư mục dist/
```

## Deploy lên GitHub Pages

Repo đã có sẵn workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Workflow này tự chạy test, build rồi deploy mỗi khi push lên nhánh `main`.

Chỉ cần làm **một lần**:

1. Vào **Settings → Pages** của repo.
2. Ở mục **Build and deployment → Source**, chọn **GitHub Actions**.
3. Vào tab **Actions**, chạy lại workflow “Deploy lên GitHub Pages” (hoặc push một commit bất kỳ).

Sau khoảng 1–2 phút, website sẽ có tại `https://<tên-tài-khoản>.github.io/Healthy-Schedule/`.

> Nếu đổi tên repo, sửa `base` trong [`vite.config.ts`](vite.config.ts) cho trùng với tên repo mới.

## Cấu trúc thư mục

```
src/
├── engine/          # Logic thuần, không phụ thuộc giao diện
│   ├── scheduler.ts     # Thuật toán xếp lịch + mức cân bằng + dời task
│   ├── predict.ts       # Dự đoán giờ năng suất, tóm tắt ngày
│   ├── suggestions.ts   # Gợi ý thay thế (Premium)
│   ├── demo.ts          # Hồ sơ mặc định + dữ liệu mẫu
│   ├── time.ts          # Tiện ích ngày giờ
│   └── scheduler.test.ts
├── store/useStore.ts    # Trạng thái ứng dụng (lưu localStorage)
├── pages/           # Trang chủ, Bắt đầu, Hôm nay, Task, Thống kê, Premium, Cài đặt
├── components/      # Form hồ sơ, form task, các thành phần giao diện
└── lib/categories.ts    # Màu sắc, icon theo nhóm hoạt động
```
