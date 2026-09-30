# ⚡ Smart Life – Sống khoẻ mà vẫn kịp deadline

Smart Life là website tự động sắp xếp thời gian biểu lành mạnh cho người trẻ bận rộn (sinh viên, người đi làm).
Hệ thống **giữ chỗ cho giấc ngủ, bữa ăn và tập luyện trước**, sau đó mới xếp task/deadline vào thời gian rảnh.
Khi có quá nhiều việc, lịch tự cân bằng lại, luôn có giới hạn để bảo vệ sức khoẻ.

🌐 **Website:** https://minh-hieu-2005.github.io/Healthy-Schedule/

> Đăng nhập bằng Gmail, rồi bấm **“Xem thử với dữ liệu mẫu”** ở trang chủ để xem ngay một lịch đầy đủ, kèm lịch sử 5 tuần cho biểu đồ và dự đoán.

---

## Tính năng

| Tính năng | Mô tả |
|---|---|
| Đăng nhập bằng Gmail | Đăng ký / đăng nhập bằng tài khoản Google (Firebase Authentication). Mỗi tài khoản có dữ liệu riêng, lưu trên đám mây (Cloud Firestore): đổi máy vẫn còn, người khác không xem được. |
| Lịch cá nhân hoá | Khai báo giờ thức dậy, số giờ ngủ, lịch học/làm, bữa ăn, lịch tập, các hoạt động tuỳ chọn (nấu ăn, giải trí, di chuyển). |
| Nhập task / deadline | Tên, mô tả, thời gian thực hiện dự tính, hạn nộp (ngày + giờ), ngày bắt đầu làm, mức ưu tiên. |
| Tự xếp vào giờ rảnh | Task có hạn sớm được xếp trước; task dài được chia thành các phiên tối đa 90 phút, có nghỉ giữa các phiên. |
| Tự cân bằng khi nhiều deadline | Lần lượt bỏ bớt hoạt động tuỳ chọn → rút ngắn bữa ăn, chuyển sang tập nhẹ → giảm giờ ngủ (tối thiểu 6 tiếng). |
| Cảnh báo thiếu ngủ | Khi giấc ngủ giảm xuống mức tối thiểu 6 tiếng, hiện cảnh báo đỏ; Smart Life không bao giờ xếp ngủ ít hơn. |
| Dời deadline khi quá tải | Nếu vẫn không đủ thời gian, các task **chưa đến hạn** được dời sang ngày sau (task hạn xa nhất / ưu tiên thấp nhất bị dời trước). |
| Quy tắc 2 ngày | Mỗi 2 ngày chỉ được quá tải 1 lần. Hôm qua đã quá tải thì hôm nay lịch giữ đủ giờ ngủ và dời bớt việc. |
| Checklist | Tick từng hoạt động đã làm. Tick hết các phiên của một task thì task tự hoàn thành. Bấm **Xếp lại lịch** để xếp lại phần còn lại trong ngày. |
| Biểu đồ ngày / tuần / tháng | Thời gian theo hoạt động, giấc ngủ, tỉ lệ hoàn thành checklist. |
| Dự đoán giờ năng suất | Từ lịch sử checklist, tìm khung 2 tiếng có tỉ lệ hoàn thành task cao nhất. Task ưu tiên cao được xếp vào khung này. |
| 💧 Nhắc uống nước | Pop-up hiện trên màn hình lúc **8:00, 14:00 và 17:00** (đổi được trong Cài đặt → Thông báo). Có nút “Đã uống” (đếm số lần trong ngày) và “Nhắc lại sau 10 phút”. |
| ⏰ Nhắc deadline quan trọng | Task **ưu tiên cao**: pop-up trước hạn 24 tiếng, 3 tiếng và 1 tiếng. Task khác: trước 1 tiếng. Mỗi mốc chỉ nhắc 1 lần. |
| 🔔 Thông báo trình duyệt | Nếu cho phép, trình duyệt hiện thông báo hệ thống khi bạn đang ở tab / ứng dụng khác. |

> Lưu ý: vì là website, Smart Life chỉ nhắc được khi trang đang mở (ở tab nào cũng được). Nếu mở web muộn trong vòng 1 tiếng sau giờ nhắc uống nước, bạn vẫn nhận được nhắc.

## Cách thuật toán xếp lịch hoạt động

Mã nguồn chính: [`src/engine/scheduler.ts`](src/engine/scheduler.ts).

1. **Xếp các khung cố định:** lịch học/làm (kèm thời gian di chuyển) → bữa ăn (kèm nấu ăn) → tập luyện → giải trí.
2. **Tìm khoảng trống** giữa các hoạt động trên và xếp task theo thứ tự hạn nộp (sớm trước), rồi đến mức ưu tiên.
3. Nếu không đủ chỗ, thử lần lượt các **mức cân bằng**:

| Mức | Tên | Thay đổi |
|---|---|---|
| 0 | Bình thường | Đủ ngủ, ăn, tập, có nấu ăn và giải trí |
| 1 | Cân bằng | Bỏ bớt nấu ăn, giải trí |
| 2 | Quá tải | Bữa ăn ngắn hơn, tập cardio nhẹ, ngủ ít hơn 1 tiếng |
| 3 | Quá tải | Ngủ còn 6 tiếng (mức tối thiểu) → cảnh báo thiếu ngủ |

4. Mức 2–3 chỉ được dùng nếu **2 ngày gần nhất chưa quá tải**.
5. Nếu vẫn không đủ, **dời các task chưa đến hạn** sang ngày hôm sau. Task đến hạn hôm nay mà vẫn không kịp sẽ có cảnh báo.

Dự đoán giờ năng suất nằm ở [`src/engine/predict.ts`](src/engine/predict.ts): hệ thống lấy dữ liệu 28 ngày gần nhất
(ngày gần đây có trọng số cao hơn), tính tỉ lệ *số phút task đã tick / số phút task đã xếp* cho từng giờ, rồi chọn khung
2 tiếng liên tiếp có tỉ lệ cao nhất.

Logic nhắc nhở nằm ở [`src/engine/reminders.ts`](src/engine/reminders.ts).

## Tài khoản & lưu trữ dữ liệu

- Đăng nhập: **Firebase Authentication** (nhà cung cấp Google), cửa sổ đăng nhập của Google.
- Dữ liệu: mỗi người dùng có một tài liệu `users/{uid}` trong **Cloud Firestore**, kèm một bản sao trên máy để mở nhanh và dùng khi mất mạng. Dữ liệu tự lưu sau mỗi thay đổi (khoảng 1 giây).
- Bảo mật: Firestore Security Rules chỉ cho phép chủ tài khoản đọc/ghi dữ liệu của mình:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Cấu hình Firebase nằm trong [`src/firebase.config.ts`](src/firebase.config.ts). Các giá trị trong đó (apiKey, projectId…) được Firebase thiết kế để công khai, không phải mật khẩu.

### Thiết lập Firebase (nếu dùng project Firebase khác)

1. Tạo project tại https://console.firebase.google.com, thêm ứng dụng **Web**, rồi dán cấu hình vào `src/firebase.config.ts`.
2. **Authentication → Sign-in method → Google → Enable**.
3. **Authentication → Settings → Authorized domains**: thêm `<tên-tài-khoản>.github.io`.
4. **Firestore Database → Create database** (Production mode), rồi dán Rules ở trên vào tab **Rules** → **Publish**.

## Công nghệ

- React 19 + TypeScript + Vite
- Tailwind CSS 4, font Be Vietnam Pro, icon Lucide
- Firebase (Authentication + Cloud Firestore)
- Recharts (biểu đồ), Zustand (quản lý trạng thái)
- Vitest (kiểm thử thuật toán xếp lịch và nhắc nhở)

## Chạy trên máy

Yêu cầu: Node.js 20 trở lên.

```bash
npm install
npm run dev      # mở http://localhost:5173/Healthy-Schedule/
npm test         # chạy kiểm thử
npm run build    # build ra thư mục dist/
```

> Để đăng nhập khi chạy trên máy, thêm `localhost` vào **Authorized domains** của Firebase (thường có sẵn).

## Deploy lên GitHub Pages

Repo có sẵn workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): mỗi lần push lên nhánh `main`, GitHub tự chạy test, build rồi deploy.
Chỉ cần bật một lần: **Settings → Pages → Source: GitHub Actions**.

> Nếu đổi tên repo, sửa `base` trong [`vite.config.ts`](vite.config.ts) cho trùng với tên repo mới.

## Cấu trúc thư mục

```
src/
├── engine/          # Logic thuần, không phụ thuộc giao diện
│   ├── scheduler.ts     # Thuật toán xếp lịch + mức cân bằng + dời task
│   ├── predict.ts       # Dự đoán giờ năng suất, tóm tắt ngày
│   ├── reminders.ts     # Nhắc uống nước, nhắc deadline
│   ├── demo.ts          # Hồ sơ mặc định + dữ liệu mẫu
│   ├── time.ts          # Tiện ích ngày giờ
│   └── *.test.ts        # Kiểm thử
├── cloud/           # Đăng nhập + đồng bộ dữ liệu theo tài khoản
│   ├── firebase.ts      # Firebase Auth + Firestore
│   ├── session.ts       # Phiên đăng nhập, tự lưu, tách dữ liệu từng tài khoản
│   └── mock.ts          # Backend giả lập cho kiểm thử tự động
├── store/useStore.ts    # Trạng thái dữ liệu của người dùng đang đăng nhập
├── pages/           # Trang chủ, Đăng nhập, Bắt đầu, Hôm nay, Task, Thống kê, Cài đặt
├── components/      # Form, pop-up nhắc nhở, menu tài khoản…
├── lib/             # Màu sắc/icon theo nhóm hoạt động, thông báo trình duyệt
└── firebase.config.ts   # Cấu hình Firebase
```
