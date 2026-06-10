# ⚙️ HƯỚNG DẪN CÀI ĐẶT CHI TIẾT HỆ THỐNG The Archivist
## Cấu Hình Và Vận Hành Dự Án Từ Đầu Đến Cuối

Báo cáo hướng dẫn này giúp bạn cài đặt đầy đủ môi trường phát triển (Local Development) cho cả 4 phần của hệ sinh thái The Archivist.

---

## 1. Yêu Cầu Cài Đặt Ban Đầu (Prerequisites)
Trước khi cài đặt, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
*   **PHP 8.2+** & **Composer 2.x** (Dành cho Backend API Laravel).
*   **Node.js 18+** & **npm** (Dành cho Web Frontend React).
*   **Python 3.10+** & **pip** (Dành cho AI Server FastAPI).
*   **Flutter SDK 3.10+** (Dành cho Mobile App).
*   **MySQL Server 8.0+** hoặc công cụ XAMPP/Laragon quản lý cơ sở dữ liệu.
*   **Google Chrome** (Bản mới nhất, cần có để Selenium quét dữ liệu Google Lens).

---

## 2. Các Bước Cài Đặt Chi Tiết Từng Phần

### Bước 2.1: Cài đặt và cấu hình Cơ sở dữ liệu & API Gateway (`gom-api`)
Thư mục `gom-api` là trung tâm điều phối dữ liệu của toàn hệ thống.

1.  **Mở Terminal** tại thư mục `gom-api`:
    ```bash
    cd gom-api
    ```
2.  **Cài đặt các gói thư viện PHP**:
    ```bash
    composer install
    ```
3.  **Cấu hình file môi trường `.env`**:
    *   Tạo file `.env` bằng cách copy từ file mẫu:
        ```bash
        cp .env.example .env
        ```
    *   Mở file `.env` bằng Text Editor và cấu hình thông tin Database của bạn:
        ```env
        DB_CONNECTION=mysql
        DB_HOST=127.0.0.1
        DB_PORT=3306
        DB_DATABASE=dbgom
        DB_USERNAME=root
        DB_PASSWORD=YOUR_PASSWORD
        ```
    *   Cấu hình thông tin API Key và URL của VNPay Sandbox để thử nghiệm thanh toán:
        ```env
        VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
        VNP_TMN_CODE=MS44J0V3
        VNP_HASH_SECRET=UGDYN8NTP5PKHBXX78CM4NLQ1FW5RX3B
        VNP_RETURN_URL=http://localhost:3000/payment/vnpay-return
        ```
    *   Cấu hình các API Key của mô hình AI:
        ```env
        GOOGLE_API_KEY=AIzaSyD0jyfgz3C...
        GROQ_API_KEY=gsk_WWbhw7334B...
        ```
4.  **Tạo khóa bảo mật ứng dụng**:
    ```bash
    php artisan key:generate
    ```
5.  **Tạo các bảng cơ sở dữ liệu và dữ liệu mẫu**:
    *   Tạo một Database trống tên là `dbgom` trong MySQL của bạn.
    *   Chạy lệnh migration để tạo cấu trúc bảng:
        ```bash
        php artisan migrate --seed
        ```
6.  **Khởi động Laravel Server**:
        ```bash
        php artisan serve
        ```
        *Mặc định Laravel API sẽ chạy tại URL:* `http://127.0.0.1:8000`

---

### Bước 2.2: Cài đặt và cấu hình AI Engine (`gom-ai`)
Thư mục `gom-ai` chạy máy chủ AI để xử lý lập luận và phân tích thị giác.

1.  **Mở Terminal** tại thư mục `gom-ai`:
    ```bash
    cd ../gom-ai
    ```
2.  **Tạo môi trường ảo Python (Virtual Environment)**:
    ```bash
    python -m venv .venv
    ```
    *   Kích hoạt môi trường ảo:
        *   Trên Windows: `.venv\Scripts\activate`
        *   Trên macOS/Linux: `source .venv/bin/activate`
3.  **Cài đặt các thư viện Python cần thiết**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Cấu hình file môi trường `.env`**:
    *   Tạo file `.env` từ file mẫu:
        ```bash
        cp .env.example .env
        ```
    *   Điền các mã API Token để kết nối với các mô hình ngôn ngữ lớn (LLM):
        ```env
        GEMINI_API_KEY=AIzaSyD0jyfgz3C...
        GROQ_API_KEY=gsk_WWbhw7334B...
        OPENAI_API_KEY=sk-proj-...
        ```
5.  **Khởi chạy AI Server**:
    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
    ```
    *Mặc định AI Engine sẽ chạy tại URL:* `http://127.0.0.1:8001`

---

### Bước 2.3: Cài đặt và cấu hình Web Frontend (`gom-web`)
Giao diện quản trị viên và người dùng trực quan trên máy tính.

1.  **Mở Terminal** tại thư mục `gom-web`:
    ```bash
    cd ../gom-web
    ```
2.  **Cài đặt các gói thư viện Node.js**:
    ```bash
    npm install
    ```
3.  **Khởi chạy Web App**:
    ```bash
    npm run dev
    ```
    *Mặc định Web App sẽ chạy tại địa chỉ:* `http://localhost:5173`

---

### Bước 2.4: Cấu hình và chạy ứng dụng di động (`gom_app`)
Ứng dụng thực địa chạy trên Android và iOS.

1.  **Mở Terminal** tại thư mục `gom_app`:
    ```bash
    cd ../gom_app
    ```
2.  **Tải các thư viện Flutter**:
    ```bash
    flutter pub get
    ```
3.  **Kiểm tra và sửa lỗi biên dịch (nếu có)**:
    ```bash
    flutter analyze
    ```
4.  **Cấu hình URL kết nối**:
    *   Mở tệp `lib/api_config.dart` và đảm bảo biến `_localBaseUrl` trỏ về địa chỉ IP cục bộ của bạn hoặc `http://10.0.2.2:8000` (đối với máy ảo Android Emulator) để kết nối được với Laravel Backend.
5.  **Khởi chạy ứng dụng**:
    *   Kết nối điện thoại thật qua cáp USB hoặc mở máy ảo Android/iOS.
    *   Chạy lệnh:
        ```bash
        flutter run
        ```

---

## 3. Quy Trình Vận Hành Đồng Bộ Khi Chạy Thử (Operational Workflow)
Để kiểm tra đầy đủ tính năng liên thông giữa các nền tảng, bạn cần mở **4 tab Terminal** chạy đồng thời các lệnh sau:

1.  **Tab 1 (AI Server)**: 
    `cd gom-ai && .venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload`
2.  **Tab 2 (Laravel API)**: 
    `cd gom-api && php artisan serve`
3.  **Tab 3 (Web Admin)**: 
    `cd gom-web && npm run dev`
4.  **Tab 4 (Mobile App)**: 
    `cd gom_app && flutter run`

Sau đó, bạn có thể thực hiện thao tác chụp ảnh gốm sứ trên điện thoại di động, hệ thống sẽ gửi ảnh về backend API, chuyển tiếp tới AI Server để hội đồng Agent phân tích và lưu lịch sử. Bạn có thể mở trình duyệt web trên máy tính để theo dõi tiến trình và lịch sử vừa chụp cập nhật tức thì.
