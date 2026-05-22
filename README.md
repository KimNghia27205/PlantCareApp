# 🌿 PlantCareApp

Ứng dụng chăm sóc cây trồng sử dụng **React Native + Expo**, tích hợp **Firebase** (xác thực & cơ sở dữ liệu) và **Google Gemini AI** (nhận diện cây, tư vấn chăm sóc).

---

## 📋 Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu |
|---|---|
| Node.js | 18.x trở lên |
| npm | 9.x trở lên |
| Expo Go (điện thoại) | Mới nhất trên App Store / Google Play |
| Git | Bất kỳ |

---

## ⚙️ Cài đặt

### 1. Clone repository

```bash
git clone <URL_REPOSITORY>
cd PlantCareApp
```

### 2. Cài dependencies

```bash
npm install
```

### 3. Tạo file `.env`

Tạo file `.env` ở thư mục gốc với nội dung sau (thay giá trị thật vào):

```env
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
EXPO_MAX_WORKERS=1
```

> **Lấy key ở đâu?**
> - **Firebase**: [Firebase Console](https://console.firebase.google.com) → Project Settings → Your apps
> - **Gemini AI**: [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## 🚀 Chạy ứng dụng

### Cách 1 — LAN (Khuyên dùng, đơn giản nhất)

> Yêu cầu: điện thoại và máy tính **cùng mạng Wi-Fi**

```bash
npx expo start --lan
```

Mở **Expo Go** trên điện thoại → quét QR code.

---

### Cách 2 — Tunnel (Khác mạng Wi-Fi)

> Yêu cầu: có tài khoản [ngrok.com](https://ngrok.com) (miễn phí)

**Bước 1:** Lưu authtoken ngrok (chỉ cần làm 1 lần)

```bash
npx ngrok authtoken YOUR_NGROK_TOKEN
```

**Bước 2:** Set biến môi trường và chạy

```powershell
# PowerShell (Windows)
$env:NGROK_AUTHTOKEN = "YOUR_NGROK_TOKEN"
npx expo start --tunnel
```

```bash
# macOS / Linux
NGROK_AUTHTOKEN=YOUR_NGROK_TOKEN npx expo start --tunnel
```

---

### Cách 3 — Web (Không cần điện thoại)

```bash
npx expo start --web
```

Mở trình duyệt tại `http://localhost:8081`

---

## 📁 Cấu trúc thư mục

```
PlantCareApp/
├── App.js                        # Entry point
├── index.js                      # Root component registration
├── app.json                      # Cấu hình Expo
├── .env                          # Biến môi trường (không commit)
├── src/
│   ├── context/
│   │   └── AuthContext.js        # Quản lý trạng thái đăng nhập
│   ├── navigation/
│   │   └── AppNavigator.js       # Điều hướng màn hình
│   ├── screens/
│   │   ├── LoginScreen.js        # Đăng nhập / Đăng ký
│   │   ├── DashboardScreen.js    # Trang chủ
│   │   ├── ScanScreen.js         # Quét / nhận diện cây
│   │   ├── MyGardenScreen.js     # Vườn của tôi
│   │   ├── ForumScreen.js        # Diễn đàn
│   │   ├── ScheduleScreen.js     # Lịch chăm sóc
│   │   ├── ProfileScreen.js      # Hồ sơ người dùng
│   │   ├── SettingsScreen.js     # Cài đặt
│   │   └── AdminDashboardScreen.js # Quản trị
│   └── services/
│       ├── firebaseConfig.js     # Khởi tạo Firebase
│       ├── authService.js        # Xác thực người dùng
│       ├── aiService.js          # Tích hợp Gemini AI
│       ├── plantService.js       # Quản lý dữ liệu cây
│       ├── forumService.js       # Dịch vụ diễn đàn
│       └── imageService.js       # Xử lý hình ảnh
```

---

## 🛠️ Các lệnh thường dùng

```bash
# Chạy và xóa cache
npx expo start --clear

# Chạy trên Android (cần kết nối thiết bị / emulator)
npm run android

# Chạy trên iOS (chỉ macOS)
npm run ios

# Chạy web
npm run web
```

---

## 🔥 Cấu hình Firebase

1. Vào [Firebase Console](https://console.firebase.google.com) → tạo project mới (hoặc dùng project sẵn có)
2. Bật **Authentication** → Sign-in method → **Email/Password**
3. Bật **Firestore Database** → chọn mode phù hợp
4. Bật **Storage** (nếu dùng upload ảnh)
5. Sao chép cấu hình vào file `.env`

---

## 🤖 Cấu hình Gemini AI

1. Truy cập [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Tạo API key mới
3. Dán vào `EXPO_PUBLIC_GEMINI_API_KEY` trong file `.env`

---

## ❗ Lưu ý

- File `.env` chứa thông tin nhạy cảm — **không commit lên Git**. Đảm bảo `.env` đã có trong `.gitignore`.
- Biến môi trường có tiền tố `EXPO_PUBLIC_` mới được truy cập từ phía client.
- Khi đổi nội dung `.env`, cần restart lại Expo (`npx expo start --clear`).

---

## 👥 Đóng góp

1. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
2. Commit thay đổi: `git commit -m "mô tả thay đổi"`
3. Push và tạo Pull Request

---

*Được xây dựng với ❤️ bằng React Native & Expo*
