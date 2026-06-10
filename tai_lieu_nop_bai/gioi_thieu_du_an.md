# 🏺 BÁO CÁO GIỚI THIỆU DỰ ÁN The Archivist
## Hệ Thống Giám Định Gốm Sứ Mỹ Thuật Đa Đại Lý Toàn Cầu

---

## 1. Tổng Quan Dự Án
**The Archivist** (The Archivist) là một hệ thống đột phá trong lĩnh vực bảo tồn và giám định cổ vật mỹ thuật gốm sứ. Hệ thống ứng dụng mô hình trí tuệ nhân tạo thế hệ mới (Generative AI) dưới cấu trúc **Đa Đại lý Tranh luận (Multi-Agent Debate)** phối hợp cùng công nghệ **Tìm kiếm Thị giác Song song (Parallel Visual Search - Google Lens)** để nhận diện dòng gốm, niên đại và quốc gia xuất xứ của hiện vật một cách tự động với độ chính xác cao.

Hệ thống được thiết kế hoàn chỉnh theo mô hình **Đồng bộ hóa Đa Nền tảng (Cross-platform Sync)** phục vụ cả môi trường thực địa thông qua ứng dụng di động (Flutter Mobile App) và môi trường nghiên cứu chuyên sâu/quản lý thông qua bảng điều khiển web (React Web Dashboard).

---

## 2. Hệ Sinh Thái Dự Án (Quad-Core Architecture)
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

---

## 3. Các Tính Năng Độc Bản & Đột Phá Công Nghệ

### 🌀 Quy trình Tranh biện Đa Chuyên gia (Multi-Agent Debate Round)
Thay vì sử dụng một mô hình AI đơn lẻ dễ dẫn đến hiện tượng "ảo tưởng" (hallucination), The Archivist thiết lập một hội đồng giám định ảo gồm **3 chuyên gia trí tuệ nhân tạo chuyên sâu** cùng thảo luận:
*   **Chuyên Gia Lịch Sử Gốm (GPT-based)**: Chuyên phân tích về bối cảnh lịch sử, triều đại chế tác, niên đại thời kỳ và các con đường tơ lụa giao thương.
*   **Chuyên Gia Hình Thái & Chữ Ký Lò (Grok-based)**: Chuyên sâu về hoa văn, cấu trúc men gốm (Glaze Typology), cốt đất sét, dấu vết lò nung (Kiln signatures) và hình dạng chân đế hiện vật.
*   **Chuyên Gia So Sánh Gốm Toàn Cầu (Gemini-based)**: So sánh đối chiếu đặc điểm văn hóa mỹ thuật giữa các vùng miền khác nhau (Á Đông, Trung Đông, Châu Âu) để phát hiện sự giao thoa nghệ thuật.
*   **Trọng Tài Phán Quyết (Gemini-based)**: Thu thập lập luận, đánh giá độ tin cậy dựa trên các chứng cứ và đưa ra kết luận cuối cùng thống nhất về dòng gốm, niên đại và quốc gia.

### 🔍 Tích Hợp Tìm Kiếm Thị Giác Song Song (Google Lens Integration)
Hệ thống sử dụng các kỹ thuật Selenium tự động hóa để mô phỏng tìm kiếm hình ảnh của hiện vật trên dữ liệu thực tế của Google Lens. Kết quả trả về từ các bảo tàng, catalogue cổ vật thế giới được đưa trực tiếp vào vòng tranh biện làm chứng cứ đắc lực đầu vào cho các Chuyên gia AI, giúp triệt tiêu tối đa sai số nhận diện giữa các dòng gốm có hoa văn tương đồng.

### 💳 Hệ Thống Thanh Toán & Tín Dụng Tự Động
*   Hệ thống cung cấp các lượt giám định miễn phí đầu tiên để trải nghiệm.
*   Hỗ trợ nạp tiền mua các gói tín dụng (Credits) tự động thông qua hai cổng giao dịch phổ biến tại Việt Nam: **VNPay Gateway** và **VietQR** (SePay quét giao dịch thời gian thực).
*   Đồng bộ sâu liên kết (Deep Link) trên Mobile giúp việc thực hiện thanh toán trên điện thoại tự động chuyển hướng mượt mà giữa Trình duyệt Web và App.

---

## 4. Giá Trị Thực Tiễn Của Đề Tài
*   **Hỗ trợ Bảo tồn Di sản**: Giúp các nhà nghiên cứu, bảo tàng số hóa và phân loại nhanh các hiện vật gốm sứ cổ.
*   **Bảo vệ Nhà Sưu Tầm**: Cung cấp góc nhìn tham khảo độc lập, khoa học trước khi thực hiện các giao dịch cổ vật.
*   **Ứng dụng Giáo dục**: Giúp học sinh, sinh viên ngành mỹ thuật lịch sử tra cứu nhanh thông tin hiện vật một cách trực quan, sinh động.
