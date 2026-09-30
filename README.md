# ⚡ Smart Life – Sống khoẻ mà vẫn kịp deadline

Smart Life là website tự động sắp xếp thời gian biểu lành mạnh cho người trẻ bận rộn (sinh viên, người đi làm).
Hệ thống **giữ chỗ cho giấc ngủ, bữa ăn và tập luyện trước**, sau đó mới xếp task/deadline vào thời gian rảnh.
Khi có quá nhiều việc, lịch tự cân bằng lại, luôn có giới hạn để bảo vệ sức khoẻ.

🌐 **Website:** https://minh-hieu-2005.github.io/Healthy-Schedule/

> Bấm **“Dùng thử ngay”** ở trang chủ để xem một lịch đầy đủ với dữ liệu mẫu (kèm lịch sử 5 tuần cho biểu đồ và dự đoán) – không cần tài khoản.
> Khi muốn lưu lâu dài, bấm **“Đăng nhập Gmail để lưu”**: dữ liệu đang dùng thử được chuyển sang tài khoản.

---

## Tính năng

### Bắt đầu nhanh
| Tính năng | Mô tả |
|---|---|
| Dùng thử không cần tài khoản | Dữ liệu dùng thử lưu trên máy. Đăng nhập Gmail sau đó sẽ gộp dữ liệu vào tài khoản, không mất gì. |
| Mẫu lịch 1 chạm | Sinh viên học sáng / học chiều + làm thêm / người đi làm / tự thiết lập. Xem trước lịch một ngày ngay khi chọn, chi tiết (lịch học, bữa ăn, tập luyện…) chỉnh sau cũng được. |
| Đăng nhập bằng Gmail | Firebase Authentication. Mỗi tài khoản có dữ liệu riêng trên Cloud Firestore: đổi máy vẫn còn, người khác không xem được. |

### Xếp lịch & điều chỉnh
| Tính năng | Mô tả |
|---|---|
| Tự xếp vào giờ rảnh | Giữ chỗ cho ngủ, ăn, tập trước; task có hạn sớm được xếp trước, chia phiên tối đa 90 phút, có nghỉ giữa các phiên. |
| Tự cân bằng khi nhiều deadline | Bỏ bớt hoạt động tuỳ chọn → rút ngắn bữa ăn, tập nhẹ → giảm giờ ngủ (tối thiểu 6 tiếng, có cảnh báo đỏ). |
| Dời deadline & quy tắc 2 ngày | Task **chưa đến hạn** được dời sang ngày sau khi quá tải. Mỗi 2 ngày chỉ được quá tải 1 lần. |
| Điều chỉnh từng hoạt động | Bấm vào một hoạt động: **Làm ngay**, **Đổi giờ**, **Để mai làm**, **Bỏ qua hôm nay** (có hoàn tác), **Mới làm được một nửa**, thêm vào Google Calendar. Lịch tự xếp lại quanh lựa chọn của bạn. |
| Thêm task 1 dòng | Gõ `Ôn thi Vĩ mô 2h thứ 6 !` – hiểu thời lượng (2h, 1h30, 30p), ngày (hôm nay, mai, thứ 2–CN, tuần sau, 5/10), giờ (lúc 17h) và `!` = ưu tiên cao. |
| Form task dễ nhập | Chọn thời lượng, hạn nộp bằng nút (Hôm nay, Ngày mai, Thứ…), giờ dạng 24h. Tuỳ chọn thêm: mô tả, **việc con**, **lặp lại hằng ngày / hằng tuần**, ngày bắt đầu. |
| Trang Hôm nay gọn trên điện thoại | Thẻ **Đang diễn ra / Tiếp theo**, các hoạt động đã qua được thu gọn, chế độ “Gọn hơn” ẩn di chuyển. |
| ⏱ Chế độ tập trung | Đếm ngược theo phiên, tạm dừng / thu nhỏ; bấm “Xong phiên này” là tự tick trên lịch. |

### Nhắc nhở (ít làm phiền)
| Tính năng | Mô tả |
|---|---|
| Thông báo dạng toast | Hiện ở cuối màn hình, **tự ẩn sau 12 giây**; tất cả được giữ trong hộp 🔔 để xem lại. |
| 🔔 Tiếng “tink” | Kêu nhẹ mỗi khi pop-up nhắc nhở hiện lên (bật/tắt và nghe thử trong Cài đặt → Thông báo). Âm thanh tạo bằng Web Audio, không cần file. |
| 💧 Nhắc uống nước | Lúc 8:00, 14:00, 17:00 (đổi được). Bấm “Đã uống” để cộng cốc; theo dõi số cốc/ngày theo mục tiêu. |
| ⏰ Nhắc deadline | Ưu tiên cao: trước 24h, 3h, 1h; task khác: trước 1h. **Không nhắc ngay khi vừa tạo task.** |
| ▶️ Nhắc giờ bắt đầu | Trước khi task / buổi tập bắt đầu vài phút (mặc định 5 phút), có nút “Bắt đầu tập trung”. |
| ☀️ / 🌙 Tóm tắt ngày | Buổi sáng: hôm nay có gì. Buổi tối: đã hoàn thành bao nhiêu. |

### Theo dõi & động lực
| Tính năng | Mô tả |
|---|---|
| Checklist + “làm được một nửa” | Tick từng hoạt động; phiên làm dở được tính một nửa. |
| Giấc ngủ thực tế | Buổi sáng hỏi nhanh “Tối qua bạn ngủ thế nào?” để thống kê đúng với thực tế. |
| Biểu đồ ngày / tuần / tháng | Ngủ **thực tế so với lịch**, task **đã làm so với đã xếp**, thời gian theo hoạt động, tỉ lệ hoàn thành; xem được dạng bảng. Người mới thấy màn hình hướng dẫn thay vì biểu đồ trống. |
| Dự đoán giờ năng suất | Khung 2 tiếng có tỉ lệ hoàn thành task cao nhất; task ưu tiên cao được xếp vào đây. |
| 🔥 Chuỗi ngày & huy hiệu | Chuỗi ngày hoàn thành ≥ 70% lịch, chuỗi ngủ đủ giấc, 7 huy hiệu, màn chúc mừng khi xong hết việc trong ngày, **tổng kết tuần** chia sẻ được. |

### Ứng dụng
| Tính năng | Mô tả |
|---|---|
| 🌙 Chế độ tối | Sáng / Tối / Theo hệ thống. |
| 📱 Tải về như ứng dụng (PWA) | Cài lên màn hình chính iPhone, iPad, Android, máy tính – không cần App Store / CH Play. Mở toàn màn hình, **xem lịch được cả khi mất mạng**, xoay ngang trên iPad, nhấn giữ biểu tượng để dùng lối tắt “Thêm task”. Nút **Tải app** có hướng dẫn riêng cho từng thiết bị. |
| 📅 Xuất lịch | Tải file `.ics` để nhập vào Google Calendar / Apple Calendar, hoặc thêm từng hoạt động vào Google Calendar. |

> Lưu ý: vì là website miễn phí (không có máy chủ gửi thông báo), Smart Life chỉ nhắc được khi trang hoặc ứng dụng đang mở (ở tab nào cũng được). Mở web muộn trong vòng 1 tiếng sau giờ nhắc uống nước vẫn nhận được nhắc.

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

Logic nhắc nhở nằm ở [`src/engine/reminders.ts`](src/engine/reminders.ts), thêm task 1 dòng ở [`src/engine/quickadd.ts`](src/engine/quickadd.ts),
chuỗi ngày / huy hiệu ở [`src/engine/motivation.ts`](src/engine/motivation.ts), xuất lịch ở [`src/engine/calendar.ts`](src/engine/calendar.ts).

Khi bạn điều chỉnh lịch (bỏ qua, đổi giờ, làm ngay), lựa chọn được lưu thành “ghi đè” cho ngày đó; thuật toán xếp lại
phần còn lại quanh lựa chọn của bạn, vẫn giữ giờ ngủ và giờ học/làm.

## Tài khoản & lưu trữ dữ liệu

- Đăng nhập: **Firebase Authentication** (nhà cung cấp Google), cửa sổ đăng nhập của Google.
- Dùng thử: dữ liệu lưu trong trình duyệt (localStorage). Khi đăng nhập, dữ liệu dùng thử được gộp vào tài khoản.
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
5. **Đăng nhập trên điện thoại / iPad / app đã cài**: trên các thiết bị này Smart Life đăng nhập bằng cách chuyển thẳng tới Google rồi quay về
   (trình duyệt điện thoại chặn cách dùng cửa sổ bật lên qua firebaseapp.com). Cần:
   - Chép **Web client ID** (Authentication → Sign-in method → Google → Web SDK configuration) vào `googleWebClientId` trong `src/firebase.config.ts`.
   - Mở [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials), chọn **Web client (auto created by Google Service)**, thêm
     **Authorized JavaScript origins**: `https://<tên-tài-khoản>.github.io` và **Authorized redirect URIs**: `https://<tên-tài-khoản>.github.io/<tên-repo>/` → **Save**.

## Công nghệ

- React 19 + TypeScript + Vite
- Tailwind CSS 4, font Be Vietnam Pro, icon Lucide
- Firebase (Authentication + Cloud Firestore)
- Recharts (biểu đồ), Zustand (quản lý trạng thái)
- Vitest (kiểm thử thuật toán xếp lịch, nhắc nhở, thêm nhanh, động lực)
- PWA: manifest + service worker

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
│   ├── reminders.ts     # Nhắc uống nước, deadline, giờ bắt đầu, tóm tắt ngày
│   ├── quickadd.ts      # Hiểu câu "Ôn thi 2h thứ 6 !"
│   ├── motivation.ts    # Chuỗi ngày, huy hiệu, tổng kết tuần
│   ├── calendar.ts      # Task lặp lại, xuất .ics / Google Calendar
│   ├── demo.ts          # Mẫu lịch + dữ liệu mẫu
│   ├── time.ts          # Tiện ích ngày giờ
│   └── *.test.ts        # Kiểm thử
├── cloud/           # Đăng nhập + đồng bộ dữ liệu theo tài khoản
│   ├── firebase.ts      # Firebase Auth + Firestore
│   ├── session.ts       # Phiên đăng nhập, tự lưu, tách dữ liệu từng tài khoản
│   └── mock.ts          # Backend giả lập cho kiểm thử tự động
├── store/
│   ├── useStore.ts      # Dữ liệu của người dùng (tài khoản hoặc dùng thử)
│   └── ui.ts            # Hộp thông báo, chế độ tập trung, cài ứng dụng
├── pages/           # Trang chủ, Đăng nhập, Bắt đầu, Hôm nay, Task, Thống kê, Cài đặt
├── components/      # Form, thêm nhanh, nhắc nhở, chế độ tập trung, các thẻ trang Hôm nay…
├── lib/             # Màu sắc/icon theo nhóm hoạt động, thông báo trình duyệt
└── firebase.config.ts   # Cấu hình Firebase
```
