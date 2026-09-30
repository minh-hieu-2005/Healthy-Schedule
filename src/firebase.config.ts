// Cấu hình Firebase của Smart Life (project: healthy-schedule-aea97).
// Các giá trị này KHÔNG phải mật khẩu: Firebase thiết kế để chúng nằm công khai
// trong mã nguồn website. Dữ liệu được bảo vệ bằng Firestore Security Rules
// (mỗi người chỉ đọc/ghi được tài liệu users/{uid} của chính mình).
//
// Lấy trong: Firebase Console → Project settings → General → Your apps → SDK setup.
export const firebaseConfig = {
  apiKey: "AIzaSyAVU1LMqGt2u_GkfJgB_UgOjLJf53_jIWg",
  authDomain: "healthy-schedule-aea97.firebaseapp.com",
  projectId: "healthy-schedule-aea97",
  storageBucket: "healthy-schedule-aea97.firebasestorage.app",
  messagingSenderId: "609462508397",
  appId: "1:609462508397:web:22876e1ff9ace7c2f39864",
};

// OAuth Web client ID của project (Firebase Console → Authentication → Sign-in method → Google
// → Web SDK configuration). Dùng cho cách đăng nhập "chuyển trang" trên điện thoại / iPad / app đã cài.
// Cần thêm vào Google Cloud Console → APIs & Services → Credentials → Web client:
//   Authorized JavaScript origins: https://minh-hieu-2005.github.io
//   Authorized redirect URIs:      https://minh-hieu-2005.github.io/Healthy-Schedule/
export const googleWebClientId = "609462508397-7ktn5c0cjkgmkp0uagp79v14vkvvgo03.apps.googleusercontent.com";
