# 🎬 KỊCH BẢN QUAY VIDEO HƯỚNG DẪN CÀI ĐẶT DỰ ÁN The Archivist
## Hướng Dẫn Quay Clip Cài Đặt Chi Tiết Từ A Đến Z

Kịch bản này được thiết kế thành từng phân cảnh rõ ràng để bạn có thể vừa thao tác màn hình (Screen Record) vừa thuyết minh hoặc làm phụ đề.

---

## PHẦN 1: GIỚI THIỆU TỔNG QUAN (Thời lượng khuyến nghị: 30 giây)
*   **Thao tác màn hình**: Mở thư mục gốc của dự án `Gom` hiển thị 4 thư mục con: `gom-ai`, `gom-api`, `gom-web`, `gom_app`.
*   **Lời thuyết minh/Phụ đề**: 
    > "Xin chào các thầy cô và các bạn. Hôm nay mình sẽ hướng dẫn các bạn cách thiết lập môi trường phát triển cục bộ và cài đặt hệ thống Giám định Gốm sứ Đa đại lý The Archivist. Hệ thống của chúng ta bao gồm 4 cấu phần: API Gateway bằng Laravel, AI Engine bằng FastAPI Python, Web Admin bằng React và Mobile App bằng Flutter. Bây giờ chúng ta sẽ đi vào cài đặt từng phần từ đầu đến cuối."

---

## PHẦN 2: THIẾT LẬP CƠ SỞ DỮ LIỆU & BACKEND LARAVEL (Thời lượng: 2 phút)
*   **Thao tác màn hình**: 
    1. Mở phpMyAdmin hoặc phần mềm quản lý MySQL (Navicat/DBeaver). Tạo một database mới tên là `dbgom` (để trống).
    2. Mở Visual Studio Code hoặc Terminal tại thư mục `gom-api`. Show file `.env` chứa thông số cấu hình MySQL vừa tạo.
    3. Gõ lệnh cài đặt và tạo bảng dữ liệu mẫu:
       ```bash
       composer install
       php artisan key:generate
       php artisan migrate --seed
       ```
    4. Gõ lệnh khởi động backend server:
       ```bash
       php artisan serve
       ```
*   **Lời thuyết minh/Phụ đề**: 
    > "Đầu tiên, chúng ta truy cập MySQL và tạo một cơ sở dữ liệu trống có tên là `dbgom`. Tiếp theo, di chuyển vào thư mục `gom-api`, tiến hành chạy lệnh `composer install` để cài đặt thư viện PHP. Chúng ta tạo file `.env` cấu hình đúng mật khẩu MySQL và chạy lệnh `php artisan migrate --seed` để khởi tạo cấu trúc bảng cùng các gói dữ liệu gốm mẫu. Cuối cùng, gõ `php artisan serve` để khởi chạy máy chủ API tại cổng 8000."

---

## PHẦN 3: CÀI ĐẶT VÀ KHỞI CHẠY AI SERVER PYTHON (Thời lượng: 1.5 phút)
*   **Thao tác màn hình**:
    1. Mở Terminal mới và chuyển đến thư mục `gom-ai`.
    2. Chạy lệnh tạo và kích hoạt môi trường ảo:
       ```bash
       python -m venv .venv
       .venv\Scripts\activate
       ```
    3. Chạy lệnh cài đặt các thư viện:
       ```bash
       pip install -r requirements.txt
       ```
    4. Show file `.env` đã điền sẵn `GEMINI_API_KEY`, `GROQ_API_KEY`.
    5. Khởi động AI Server bằng uvicorn:
       ```bash
       uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
       ```
*   **Lời thuyết minh/Phụ đề**: 
    > "Bước tiếp theo, chúng ta mở một Terminal mới tại thư mục `gom-ai` để khởi động bộ não AI. Chúng ta tạo môi trường ảo Python và kích hoạt nó. Tiếp theo cài đặt tất cả các gói phụ thuộc cần thiết bằng lệnh `pip install -r requirements.txt`. Đảm bảo bạn đã điền đầy đủ các API key của Gemini và Groq trong file `.env`. Sau đó chạy máy chủ AI bằng lệnh `uvicorn app.main:app` trên cổng 8001. Hệ thống AI đã sẵn sàng."

---

## PHẦN 4: KHỞI CHẠY WEB FRONTEND REACT (Thời lượng: 1 phút)
*   **Thao tác màn hình**:
    1. Mở Terminal mới tại thư mục `gom-web`.
    2. Gõ lệnh:
       ```bash
       npm install
       npm run dev
       ```
    3. Click mở liên kết `http://localhost:5173` trên trình duyệt Chrome. Hiển thị trang đăng nhập và bảng điều khiển của The Archivist.
*   **Lời thuyết minh/Phụ đề**: 
    > "Tiếp theo là phần giao diện quản trị Web. Tại thư mục `gom-web`, chạy lệnh `npm install` để tải các module NodeJS và chạy lệnh `npm run dev`. Trang web sẽ được mở tại cổng 5173. Lúc này chúng ta có thể đăng nhập bằng tài khoản mẫu của nghệ nhân để truy cập bảng điều khiển."

---

## PHẦN 5: CHẠY MOBILE APP FLUTTER (Thời lượng: 1.5 phút)
*   **Thao tác màn hình**:
    1. Mở máy ảo Android/iOS hoặc cắm điện thoại thật.
    2. Mở Terminal tại thư mục `gom_app`.
    3. Chạy lệnh:
       ```bash
       flutter pub get
       flutter run
       ```
    4. Chờ ứng dụng biên dịch và hiển thị lên màn hình điện thoại.
*   **Lời thuyết minh/Phụ đề**: 
    > "Cuối cùng, chúng ta cài đặt và chạy ứng dụng di động Flutter. Di chuyển đến thư mục `gom_app`, chạy lệnh `flutter pub get` để tải các gói thư viện Dart. Sau đó khởi chạy ứng dụng lên thiết bị di động bằng lệnh `flutter run`. Khi ứng dụng mở ra, chúng ta đã hoàn thành việc thiết lập đồng bộ toàn bộ dự án."

---

## PHẦN 6: DEMO NHANH SỰ ĐỒNG BỘ (Thời lượng: 1 phút)
*   **Thao tác màn hình**:
    1. Trên Mobile App: Nhấn chụp ảnh một hiện vật gốm sứ. Show tiến trình AI phân tích (Debate) hiển thị thành công.
    2. Trên Web: F5 hoặc mở Lịch sử giám định, show lịch sử vừa giám định trên Mobile đã đồng bộ và xuất hiện trên Web ngay lập tức.
    3. Nhấn thử nạp lượt tín dụng qua VNPay, show trang quét mã và hủy thanh toán tự động quay lại app mượt mà.
*   **Lời thuyết minh/Phụ đề**: 
    > "Để kiểm tra hoạt động, mình sẽ chụp thử một sản phẩm gốm sứ từ App di động. AI đang thực thi phân tích tranh biện đa chuyên gia và tích hợp Google Lens. Đã có kết quả nhận dạng gốm Chu Đậu niên đại thế kỷ 21. Bây giờ, mình mở Bảng điều khiển Web và xem lịch sử, thông tin giám định vừa rồi đã lập tức được đồng bộ hóa thành công. Tính năng thanh toán tín dụng qua VNPay cũng hoạt động mượt mà và tự động điều hướng quay lại app khi hoàn tất hoặc hủy giao dịch. Cảm ơn thầy cô và các bạn đã theo dõi hướng dẫn cài đặt."
