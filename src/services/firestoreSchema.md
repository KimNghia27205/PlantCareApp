# Firestore Database Structure for PlantCareApp

Dưới đây là cấu trúc cơ sở dữ liệu trên Firebase Firestore được thiết kế cho PlantCareApp:

## 1. Collection: `users`
Lưu trữ thông tin hồ sơ của người dùng. Mỗi document ID chính là `uid` từ Firebase Authentication.

**Document Fields:**
- `uid` (string): ID duy nhất của người dùng (từ Firebase Auth).
- `email` (string): Địa chỉ email của người dùng.
- `displayName` (string): Tên hiển thị của người dùng.
- `createdAt` (string/timestamp): Thời điểm tạo tài khoản.

---

## 2. Collection: `plants`
Lưu trữ thông tin về các cây trồng mà người dùng đã thêm vào ứng dụng để theo dõi.

**Document Fields:**
- `id` (string): ID duy nhất của cây (tự động tạo bởi Firestore).
- `userId` (string): `uid` của người sở hữu cây này (liên kết với `users`).
- `plantName` (string): Tên thường gọi của cây (ví dụ: "Cây Trầu Bà của tôi").
- `species` (string): Tên loài cây (ví dụ: "Epipremnum aureum").
- `healthStatus` (string): Trạng thái sức khỏe (ví dụ: "Healthy", "Needs Water", "Sick").
- `imageUrl` (string): URL ảnh của cây (lưu trên Firebase Storage).
- `lastWatered` (string/timestamp): Thời gian tưới nước lần cuối cùng.
- `createdAt` (string/timestamp): Thời điểm thêm cây vào ứng dụng.

---

## 3. Collection: `posts`
Lưu trữ các bài viết được người dùng chia sẻ trên diễn đàn/cộng đồng (Forum).

**Document Fields:**
- `id` (string): ID duy nhất của bài viết.
- `userId` (string): `uid` của người đăng bài.
- `title` (string): Tiêu đề bài viết.
- `content` (string): Nội dung chi tiết của bài viết.
- `imageUrl` (string): URL ảnh đính kèm (nếu có, lưu trên Firebase Storage).
- `likes` (number): Số lượng lượt thích.
- `comments` (array hoặc subcollection): Danh sách hoặc số lượng bình luận.
- `createdAt` (string/timestamp): Thời điểm đăng bài.

---

## 4. Collection: `plant_logs` (Nhật ký tăng trưởng)
Lưu trữ các ghi chú và hình ảnh theo dõi quá trình lớn lên của cây.

**Document Fields:**
- `id` (string): ID duy nhất của nhật ký.
- `plantId` (string): ID của cây trồng (liên kết với `plants`).
- `userId` (string): `uid` của người sở hữu.
- `note` (string): Nội dung ghi chú.
- `imageUrl` (string): URL ảnh chụp cây ở thời điểm ghi chú (tùy chọn, lưu trên Firebase Storage).
- `storagePath` (string): Đường dẫn gốc của ảnh trên Firebase Storage để dễ dàng xóa.
- `date` (string/timestamp): Ngày ghi nhận (do người dùng chọn hoặc tự động).
- `createdAt` (string/timestamp): Thời điểm tạo ghi chú trên hệ thống.
