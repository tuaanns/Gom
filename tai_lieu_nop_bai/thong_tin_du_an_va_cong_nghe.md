# 🏺 BÁO CÁO GIỚI THIỆU DỰ ÁN & CÔNG NGHỆ SỬ DỤNG - THE ARCHIVIST
## Hệ Thống Giám Định Gốm Sứ Mỹ Thuật Đa Đại Lý Toàn Cầu

---

## PHẦN I: GIỚI THIỆU TỔNG QUAN DỰ ÁN

### 1. Tổng Quan Dự Án
**The Archivist** là một hệ thống đột phá trong lĩnh vực bảo tồn và giám định cổ vật mỹ thuật gốm sứ. Hệ thống ứng dụng mô hình trí tuệ nhân tạo thế hệ mới (Generative AI) dưới cấu trúc **Đa Đại lý Tranh luận (Multi-Agent Debate)** phối hợp cùng công nghệ **Tìm kiếm Thị giác Song song (Parallel Visual Search - Google Lens)** để nhận diện dòng gốm, niên đại và quốc gia xuất xứ của hiện vật một cách tự động với độ chính xác cao.

Hệ thống được thiết kế hoàn chỉnh theo mô hình **Đồng bộ hóa Đa Nền tảng (Cross-platform Sync)** phục vụ cả môi trường thực địa thông qua ứng dụng di động (Flutter Mobile App) và môi trường nghiên cứu chuyên sâu/quản lý thông qua bảng điều khiển web (React Web Dashboard).

### 2. Hệ Sinh Thái Dự Án (Quad-Core Architecture)
Hệ thống được tổ chức đồng bộ gồm 4 cấu phần lõi:
1.  **🧠 GOM-AI (Python / FastAPI)**: 
    *   Đóng vai trò là "Bộ não" xử lý tác vụ trí tuệ nhân tạo.
    *   Tích hợp luồng phân tích hình ảnh và thực thi quy trình tranh luận giữa các chuyên gia AI (GPT, Groq, Gemini) để đưa ra phán quyết cuối cùng.
    *   Thực hiện cơ chế quét dữ liệu song song qua Google Lens để thu thập chứng cứ bảo tàng thực tế.
2.  **🚀 GOM-API (PHP / Laravel 11)**:
    *   Đóng vai trò là Cổng trung tâm (Gatekeeper) quản lý toàn bộ cơ sở dữ liệu.
    *   Thực hiện xác thực người dùng (Laravel Sanctum Auth), quản lý lịch sử giám định, kiểm soát lượt nạp tiền và gói tín dụng thành viên.
    *   Tích hợp cổng thanh toán trực tuyến tự động (VNPay Gateway & VietQR).
3.  **💻 GOM-WEB (ReactJS / Vite / TailwindCSS)**:
    *   Trang quản trị dành cho người dùng cuối và quản trị viên hệ thống trên màn hình lớn.
    *   Cung cấp biểu đồ thống kê, lịch sử giám định chuyên sâu, giao diện nạp tín dụng trực quan và hiển thị tiến trình lập luận chi tiết của các Agent AI.
4.  **📱 GOM-APP (Flutter / Dart)**:
    *   Ứng dụng di động cài đặt trực tiếp trên điện thoại (Android & iOS).
    *   Hỗ trợ nghệ nhân thực địa chụp ảnh trực tiếp từ camera hoặc tải lên từ thư viện để nhận dạng nhanh hiện vật.

### 3. Các Tính Năng Độc Bản & Đột Phá Công Nghệ

#### 🌀 Quy trình Tranh biện Đa Chuyên gia (Multi-Agent Debate Round)
Thay vì sử dụng một mô hình AI đơn lẻ dễ dẫn đến hiện tượng "ảo tưởng" (hallucination), The Archivist thiết lập một hội đồng giám định ảo gồm **3 chuyên gia trí tuệ nhân tạo chuyên sâu** cùng thảo luận:
*   **Chuyên Gia Lịch Sử Gốm (GPT-based)**: Chuyên phân tích về bối cảnh lịch sử, triều đại chế tác, niên đại thời kỳ và các con đường tơ lụa giao thương.
*   **Chuyên Gia Hình Thái & Chữ Ký Lò (Grok-based)**: Chuyên sâu về hoa văn, cấu trúc men gốm (Glaze Typology), cốt đất sét, dấu vết lò nung (Kiln signatures) và hình dạng chân đế hiện vật.
*   **Chuyên Gia So Sánh Gốm Toàn Cầu (Gemini-based)**: So sánh đối chiếu đặc điểm văn hóa mỹ thuật giữa các vùng miền khác nhau (Á Đông, Trung Đông, Châu Âu) để phát hiện sự giao thoa nghệ thuật.
*   **Trọng Tài Phán Quyết (Gemini-based)**: Thu thập lập luận, đánh giá độ tin cậy dựa trên các chứng cứ và đưa ra kết luận cuối cùng thống nhất về dòng gốm, niên đại và quốc gia.

#### 🔍 Tích Hợp Tìm Kiếm Thị Giác Song Song (Google Lens Integration)
Hệ thống sử dụng các kỹ thuật Selenium tự động hóa để mô phỏng tìm kiếm hình ảnh của hiện vật trên dữ liệu thực tế của Google Lens. Kết quả trả về từ các bảo tàng, catalogue cổ vật thế giới được đưa trực tiếp vào vòng tranh biện làm chứng cứ đắc lực đầu vào cho các Chuyên gia AI, giúp triệt tiêu tối đa sai số nhận diện giữa các dòng gốm có hoa văn tương đồng.

#### 💳 Hệ Thống Thanh Toán & Tín Dụng Tự Động
*   Hệ thống cung cấp các lượt giám định miễn phí đầu tiên để trải nghiệm.
*   Hỗ trợ nạp tiền mua các gói tín dụng (Credits) tự động thông qua hai cổng giao dịch phổ biến tại Việt Nam: **VNPay Gateway** và **VietQR** (SePay quét giao dịch thời gian thực).
*   Đồng bộ sâu liên kết (Deep Link) trên Mobile giúp việc thực hiện thanh toán trên điện thoại tự động chuyển hướng mượt mà giữa Trình duyệt Web và App.

### 4. Giá Trị Thực Tiễn Của Đề Tài
*   **Hỗ trợ Bảo tồn Di sản**: Giúp các nhà nghiên cứu, bảo tàng số hóa và phân loại nhanh các hiện vật gốm sứ cổ.
*   **Bảo vệ Nhà Sưu Tầm**: Cung cấp góc nhìn tham khảo độc lập, khoa học trước khi thực hiện các giao dịch cổ vật.
*   **Ứng dụng Giáo dục**: Giúp học sinh, sinh viên ngành mỹ thuật lịch sử tra cứu nhanh thông tin hiện vật một cách trực quan, sinh động.

---

## PHẦN II: CHI TIẾT CÔNG NGHỆ SỬ DỤNG

### 1. Bộ Não Xử Lý Trí Tuệ Nhân Tạo (`gom-ai`)
*   **Python 3.10+**: Ngôn ngữ lập trình tiêu chuẩn thế giới dành cho Khoa học dữ liệu và Học máy.
*   **FastAPI**: 
    *   Framework web hiệu năng cao viết bằng Python, xử lý bất đồng bộ (Asynchronous `async/await`) cực nhanh.
    *   Được chọn để làm lớp giao tiếp API cho AI Server nhờ khả năng xử lý đồng thời nhiều yêu cầu giám định và xuất tài liệu tài liệu (Autogenerated OpenAPI/Swagger docs) tự động.
*   **Mô hình Ngôn ngữ Lớn (LLMs)**:
    *   **Google Gemini (1.5 Flash / Pro)**: Xử lý phân tích thị giác (Vision API) nhận diện đặc trưng ảnh gốm sứ đầu vào, đồng thời làm Agent so sánh toàn cầu và Trọng tài phán quyết cuối cùng nhờ khả năng hiểu hình ảnh vượt trội.
    *   **OpenAI GPT-4o / GPT-3.5**: Đóng vai trò là Chuyên Gia Lịch Sử Gốm sứ nhờ kho tri thức khổng lồ về lịch sử văn hóa nhân loại.
    *   **Groq Cloud (Llama 3 / Mixtral)**: Đóng vai trò là Chuyên Gia Hình Thái & Chữ ký Lò nhờ tốc độ suy luận (Inference Speed) cực cao và phản hồi tức thì.
*   **Selenium & BeautifulSoup4**:
    *   Được sử dụng làm công cụ cào quét (Scraping/Web automation) song song để giả lập tìm kiếm thị giác trên cổng Google Lens.
    *   Sử dụng trình duyệt không đầu (Headless Chrome) để tích hợp mượt mà dữ liệu hình ảnh cổ vật thế giới thời gian thực làm dữ liệu đầu vào cho AI tranh biện.
*   **Uvicorn**: Máy chủ chạy Python Web Server đạt chuẩn ASGI có tốc độ xử lý nhanh hàng đầu.

### 2. API Cổng Điều Phối Dữ Liệu (`gom-api`)
*   **PHP 8.2+ & Laravel 11**:
    *   Framework PHP hiện đại, bảo mật tốt và cung cấp cấu trúc phát triển chặt chẽ, tối ưu thời gian phát triển dự án.
    *   Đóng vai trò điều phối nghiệp vụ: Quản lý database, lịch sử giám định, người dùng, thay đổi mật khẩu và quản trị nội dung tĩnh (CMS).
*   **Laravel Sanctum**:
    *   Cơ chế xác thực dựa trên Token (Token-based authentication) siêu nhẹ, cung cấp API xác thực bảo mật cao cho cả ứng dụng React Web và Flutter App cùng sử dụng chung một cơ sở dữ liệu tài khoản.
*   **MySQL 8.0**:
    *   Hệ quản trị cơ sở dữ liệu quan hệ mã nguồn mở phổ biến và ổn định nhất thế giới, quản lý thông tin giao dịch, lịch sử giám định và cài đặt hệ thống một cách tối ưu.
*   **Tích hợp cổng Thanh toán**:
    *   **VNPay SDK**: Kết nối trực tiếp với Sandbox VNPay để tạo mã QR thanh toán động và xác thực chữ ký bảo mật giao dịch trực tuyến qua thuật toán HMAC-SHA512.
    *   **VietQR (VietQR API)**: Sinh mã QR chuyển khoản nhanh chứa đầy đủ số tiền, tài khoản thụ hưởng và nội dung chuyển khoản tự động.

### 3. Giao Diện Web Cho Máy Tính (`gom-web`)
*   **ReactJS 18**: Thư viện JavaScript xây dựng giao diện người dùng dựa trên Component động và quản lý trạng thái hiệu quả thông qua Virtual DOM.
*   **Vite**: Công cụ build frontend thế hệ mới thay thế cho Webpack, tăng tốc độ khởi chạy dự án cực nhanh trong quá trình phát triển (Hot Module Replacement).
*   **TailwindCSS**: Thư viện CSS tiện ích (Utility-first) giúp thiết kế giao diện tùy biến nhanh chóng, đồng bộ hệ thống màu sắc nghệ thuật cao cấp.
*   **Framer Motion**: Thư viện hiệu ứng chuyển động chất lượng cao giúp các popup, thông báo giao dịch và hiệu ứng chuyển trang mượt mà hơn.
*   **Lucide React**: Bộ icon thiết kế hiện đại đồng nhất cho trang web.

### 4. Ứng Dụng Di Động Thực Địa (`gom_app`)
*   **Flutter SDK & Dart**:
    *   Bộ công cụ phát triển đa nền tảng (Cross-platform) của Google, cho phép dùng chung một mã nguồn Dart để xuất ra ứng dụng hiệu năng cao chạy nguyên bản (Native performance) trên cả **Android** và **iOS**.
*   **HTTP Package**: Thư viện thực hiện các cuộc gọi API RESTful bất đồng bộ để kết nối và đồng bộ tài khoản/lịch sử giám định với Laravel Server.
*   **Image Picker**: Thư viện Flutter hỗ trợ tương tác với phần cứng thiết bị, cho phép mở nhanh Camera chụp ảnh hoặc truy cập Thư viện ảnh để chọn hiện vật.
*   **URL Launcher**: Thư viện mở liên kết ngoài giúp ứng dụng di động tự động khởi chạy trình duyệt thực hiện thanh toán qua cổng VNPay.
*   **Cupertino & Material Icons**: Đảm bảo giao diện hiển thị đúng chuẩn thẩm mỹ thiết kế của iOS (Apple) và Android (Google).

### 5. Hạ Tầng Triển Khai (Infrastructure & DevOps)
*   **Vercel**: Máy chủ Cloud chuyên dụng cho React Web, hỗ trợ tự động triển khai (Auto-deploy) từ GitHub.
*   **Azure App Service**: Nền tảng PaaS của Microsoft dùng để host API Laravel chạy ổn định, tự động tăng cấu hình khi lượng truy cập cao.
*   **GitHub Actions**: Công cụ tự động hóa CI/CD:
    *   Tự động kiểm tra lỗi cú pháp khi lập trình viên đẩy code.
    *   Tự động build và đóng gói file **`.ipa`** (cho iOS) trên máy chủ macOS ảo của GitHub.

---

## PHẦN III: THÔNG TIN THƯ VIỆN & THÀNH PHẦN CÀI ĐẶT (DEPENDENCIES)

Dưới đây là chi tiết các thư viện mở rộng (Packages) được cài đặt và quản lý trong mã nguồn của từng dự án thành phần:

### 1. Bộ não AI - `gom-ai` (Python / Pip)
Quản lý qua file `requirements.txt`. Các thư viện chính được sử dụng bao gồm:

| Tên thư viện | Phiên bản | Chức năng chính |
| :--- | :---: | :--- |
| **fastapi** | Mới nhất | Xây dựng API Server có hiệu năng cao và tự sinh tài liệu OpenAPI |
| **uvicorn[standard]** | Mới nhất | Server chạy ứng dụng Python theo chuẩn ASGI có hiệu năng cao |
| **openai** | Mới nhất | Gọi API kết nối với các mô hình ngôn ngữ lớn của OpenAI (GPT-4o) |
| **google-genai** | Mới nhất | Gọi API kết nối trực tiếp với dòng mô hình Gemini (1.5 Flash/Pro) của Google |
| **selenium** | Mới nhất | Điều khiển trình duyệt Chrome tự động hóa để quét dữ liệu Google Lens |
| **undetected-chromedriver** | Mới nhất | Hỗ trợ Selenium không bị chặn bởi các cơ chế Cloudflare khi thu thập dữ liệu |
| **Pillow** | Mới nhất | Thư viện xử lý hình ảnh (đọc, cắt, resize ảnh trước khi truyền tới AI) |
| **httpx** | Mới nhất | Tạo các kết nối HTTP bất đồng bộ tốc độ cao |

### 2. Laravel Backend API - `gom-api` (PHP / Composer)
Quản lý qua file `composer.json`. Các thư viện chính được sử dụng bao gồm:

| Tên thư viện / Package | Phiên bản | Chức năng chính |
| :--- | :---: | :--- |
| **php** | `^8.2` | Phiên bản PHP tối thiểu để chạy ứng dụng |
| **laravel/framework** | `^12.0` | Framework chính cung cấp bộ định tuyến, ORM, cấu trúc MVC |
| **laravel/sanctum** | `^4.0` | Quản lý token xác thực API gọn nhẹ cho Web và Mobile |
| **laravel/tinker** | `^2.10.1` | Công cụ tương tác trực tiếp với cơ sở dữ liệu qua terminal |
| **league/flysystem-azure-blob-storage** | `^3.31` | Adapter lưu trữ tệp tin tải lên trực tiếp trên đám mây Azure |

### 3. Web Dashboard - `gom-web` (NodeJS / npm)
Quản lý qua file `package.json`. Các thư viện chính được sử dụng bao gồm:

| Tên thư viện | Phiên bản | Chức năng chính |
| :--- | :---: | :--- |
| **react** | `^19.2.5` | Thư viện lõi xây dựng giao diện người dùng dựa trên thành phần |
| **react-router-dom** | `^7.14.2` | Bộ điều hướng trang (Routing) không cần tải lại trang |
| **axios** | `^1.15.2` | Gọi API RESTful kết nối dữ liệu với Laravel Backend |
| **framer-motion** | `^12.38.0` | Thư viện tạo các hiệu ứng chuyển động, hiển thị modal mượt mà |
| **three** / **@react-three/fiber** | Mới nhất | Hiển thị và tương tác các hiệu ứng 3D trực quan trên Web |
| **gsap** / **@gsap/react** | Mới nhất | Công cụ diễn hoạt cao cấp tạo hiệu ứng scroll và text loading |
| **lucide-react** | `^0.469.0` | Bộ icon SVG hiện đại, đồng nhất |
| **tailwindcss** | `^3.4.19` | Framework CSS phục vụ thiết kế giao diện nhanh chóng |

### 4. Mobile App - `gom_app` (Flutter / pubspec)
Quản lý qua file `pubspec.yaml`. Các gói chính được sử dụng bao gồm:

| Tên Package | Phiên bản | Chức năng chính |
| :--- | :---: | :--- |
| **flutter sdk** | `>=3.0.0` | Bộ công cụ lập trình giao diện gốc (Native UI) |
| **http** | `^0.13.6` | Gửi yêu cầu HTTP kết nối và trao đổi dữ liệu với Server API |
| **image_picker** | `^1.0.4` | Tương tác phần cứng máy ảnh chụp ảnh hiện vật và chọn ảnh từ thư viện |
| **url_launcher** | `^6.2.1` | Khởi chạy trình duyệt ngoài để thanh toán VNPay và tự động quay lại app |
| **google_sign_in** | `^7.2.0` | Tích hợp đăng nhập bằng tài khoản Google thuận tiện |
| **cupertino_icons** | `^1.0.8` | Bộ icon giao diện chuẩn iOS |
