# 📖 HƯỚNG DẪN SỬ DỤNG HỆ THỐNG / USER MANUAL
## Hệ Sinh Thái Giám Định & Tư Vấn Gốm Sứ "The Archivist"
## "The Archivist" Ceramic Appraisal & Consultation Ecosystem

---

## 📑 MỤC LỤC / TABLE OF CONTENTS
1. [GIỚI THIỆU CHUNG / INTRODUCTION](#1-giới-thiệu-chung--introduction)
2. [CÁC VAI TRÒ TRONG HỆ THỐNG / USER ROLES](#2-các-vai-trò-trong-hệ-thống--user-roles)
3. [HƯỚNG DẪN CÁC TÍNH NĂNG CHÍNH / CORE FEATURES MANUAL](#3-hướng-dẫn-các-tính-năng-chính--core-features-manual)
   - [3.1. Đăng ký & Đăng nhập / Register & Login](#31-đăng-ký--đăng-nhập--register--login)
   - [3.2. Giám định Gốm sứ bằng AI / AI Ceramic Appraisal](#32-giám-định-gốm-sứ-bằng-ai--ai-ceramic-appraisal)
   - [3.3. Hỏi đáp cùng Chatbot Gốm sứ / AI Ceramic Chatbot](#33-hỏi-đáp-cùng-chatbot-gốm-sứ--ai-ceramic-chatbot)
   - [3.4. Nạp tiền & Đăng ký gói / VNPay Payments & Packages](#34-nạp-tiền--đăng-ký-gói--vnpay-payments--packages)
   - [3.5. Xem Lịch sử Giám định / Appraisal History](#35-xem-lịch-sử-giám-định--appraisal-history)
   - [3.6. Bảng Điều khiển Admin / Admin Dashboard (Web)](#36-bảng-điều-khiển-admin--admin-dashboard-web)
4. [XỬ LÝ SỰ CỐ THƯỜNG GẶP / TROUBLESHOOTING](#4-xử-lý-sự-cố-thường-gặp--troubleshooting)

---

## 1. GIỚI THIỆU CHUNG / INTRODUCTION

### 🇻🇳 Tiếng Việt
**The Archivist** là một hệ sinh thái ứng dụng đa nền tảng (Web & Flutter Mobile App) ứng dụng Trí tuệ nhân tạo (AI) để hỗ trợ nhận diện, giám định niên đại, xuất xứ, phong cách nghệ thuật và định giá sơ bộ các hiện vật gốm sứ cổ truyền Việt Nam. 

Điểm độc đáo của hệ thống là việc ứng dụng **mô hình tranh biện đa tác nhân (Multi-Agent Debate Engine)**. Khi nhận ảnh đầu vào, ba tác nhân AI đóng vai trò là các chuyên gia gốm sứ với góc nhìn khác nhau sẽ thảo luận trực tiếp để đi đến sự đồng thuận cuối cùng, tăng tính khách quan và độ chính xác của kết quả.

### 🇬🇧 English
**The Archivist** is a multi-platform application ecosystem (Web & Flutter Mobile App) leveraging Artificial Intelligence (AI) to identify, appraise the age, origin, art style, and preliminary valuation of traditional Vietnamese ceramic artifacts.

The key highlight of the system is the deployment of a **Multi-Agent Debate Engine**. Upon receiving an input image, three distinct AI agents—acting as ceramic experts with different analytical perspectives—will debate in real-time to reach a final consensus, ensuring high objectivity and accuracy in appraisal.

---

## 2. CÁC VAI TRÒ TRONG HỆ THỐNG / USER ROLES

| Vai trò / Role | Mô tả trên Web / Web Platform | Mô tả trên Mobile App / Mobile App |
| :--- | :--- | :--- |
| **Khách vãng lai**<br>*(Guest)* | Xem thông tin giới thiệu, các tính năng chung, đăng ký tài khoản. | Xem giới thiệu, đăng ký/đăng nhập. |
| **Thành viên**<br>*(Member)* | Giám định gốm sứ (trừ lượt), hỏi chatbot, thanh toán VNPay, xem lịch sử cá nhân. | Giám định gốm sứ (camera/gallery), hỏi chatbot, nạp lượt, xem lịch sử cá nhân. |
| **Quản trị viên**<br>*(Admin)* | Quản lý người dùng, xem lịch sử giao dịch thanh toán, quản lý tập dữ liệu (dataset), cấu hình mô hình AI. | *(Chỉ hoạt động trên nền tảng Web để đảm bảo bảo mật).* |

---

## 3. HƯỚNG DẪN CÁC TÍNH NĂNG CHÍNH / CORE FEATURES MANUAL

### 3.1. Đăng ký & Đăng nhập / Register & Login

#### 🇻🇳 Tiếng Việt
1. **Truy cập hệ thống**:
   * **Web**: Truy cập đường dẫn của dự án (ví dụ Localhost: `http://localhost:5173` hoặc bản deploy trực tuyến).
   * **Mobile**: Mở ứng dụng di động **The Archivist** trên thiết bị Android hoặc iOS.
2. **Đăng ký tài khoản mới**:
   * Nhấp chọn **Đăng ký / Register**.
   * Nhập đầy đủ thông tin: Họ tên, Email, Mật khẩu, Số điện thoại.
   * Hệ thống sẽ tự động khởi tạo tài khoản và tặng kèm **3 lượt giám định miễn phí** ban đầu.
3. **Đăng nhập**:
   * Nhập Email và Mật khẩu đã đăng ký, hoặc bấm **Đăng nhập với Google** để truy cập nhanh chóng.
   * Để thay đổi ngôn ngữ hiển thị (Anh/Việt) toàn hệ thống, người dùng nhấp chọn biểu tượng cờ quốc gia trên thanh điều hướng đầu trang (Header) của Web hoặc góc trên cùng màn hình App.

#### 🇬🇧 English
1. **Access the System**:
   * **Web**: Navigate to the project URL (Localhost: `http://localhost:5173` or the deployed link).
   * **Mobile**: Launch **The Archivist** app on your Android or iOS device.
2. **Register a New Account**:
   * Tap/Click **Register**.
   * Enter required information: Full Name, Email, Password, and Phone Number.
   * The system will create your account and grant **3 free appraisal tokens** for initial testing.
3. **Login**:
   * Enter your registered Email and Password, or click **Sign in with Google** for instant access.
   * To change the system language (English/Vietnamese), click on the language switch icon (flag icon) in the Web Header or at the top of the Mobile App screen.

---

### 3.2. Giám định Gốm sứ bằng AI / AI Ceramic Appraisal

#### 🇻🇳 Tiếng Việt
Tính năng giám định áp dụng quy trình phân tích và tranh biện tự động:
1. **Tải ảnh lên**:
   * **Web**: Kéo thả hoặc bấm chọn ảnh gốm sứ cần giám định từ máy tính.
   * **App Mobile**: Cho phép chụp trực tiếp từ Camera điện thoại hoặc chọn ảnh có sẵn từ Album ảnh (Gallery).
2. **Khởi động Giám định**:
   * Bấm nút **Bắt đầu giám định / Start Appraisal** (Yêu cầu tài khoản có tối thiểu 1 lượt giám định).
3. **Quan sát quá trình Tranh biện (Debate)**:
   * Màn hình sẽ hiển thị trực quan cuộc tranh luận thời gian thực của 3 chuyên gia AI chuyên sâu:
     * **Nhà nghiên cứu Lịch sử Gốm sứ** *(Ceramic Historian Agent)*: Tập trung phân tích triều đại, niên đại lịch sử.
     * **Chuyên gia Giám định Cổ vật** *(Appraisal Expert Agent)*: Tập trung vào đặc điểm chất men, cốt đất và kỹ thuật chế tác.
     * **Nhà phân tích Mỹ thuật Cổ** *(Art Analyst Agent)*: Phân tích hoa văn trang trí, kiểu dáng nghệ thuật và phong thái cổ vật.
   * Sau khi qua 2-3 lượt tranh biện, các Agent sẽ đi đến thống nhất.
4. **Nhận kết quả**:
   * Báo cáo giám định trả về bao gồm: **Kết luận phân loại**, **Niên đại/Triều đại ước tính**, **Độ tin cậy (%)**, **Mô tả chi tiết đặc điểm** và **Gợi ý bảo tồn/Định giá tham khảo**.
   * Giao diện và tên các tác nhân sẽ tự động đồng bộ hóa sang tiếng Anh hoặc tiếng Viết dựa trên cấu hình ngôn ngữ hiện tại của ứng dụng.

#### 🇬🇧 English
Appraisal feature applies an automated multi-agent analysis and debate process:
1. **Upload Ceramic Photo**:
   * **Web**: Drag and drop or browse the ceramic image from your local computer.
   * **Mobile App**: Tap to capture a live photo using the device Camera or select an existing photo from the Gallery.
2. **Initiate Appraisal**:
   * Press **Start Appraisal** (Requires at least 1 remaining token).
3. **Observe the Agent Debate**:
   * The interface displays a live, interactive debate among 3 specialized AI agents:
     * **Ceramic Historian Agent**: Analyzes historical eras, reigns, and timelines.
     * **Appraisal Expert Agent**: Inspects glaze attributes, clay body, and craftsmanship techniques.
     * **Art Analyst Agent**: Evaluates decorative motifs, shapes, and artistic aesthetics.
   * After 2 to 3 iterations of debate, the agents consolidate their findings.
4. **View Final Report**:
   * The returned report contains: **Classified Ceramic Type**, **Estimated Age/Dynasty**, **Confidence Score (%)**, **Detailed Characteristic Analyses**, and **Preservation Suggestions & Reference Valuation**.
   * All report elements and agent identities are automatically translated and formatted in English or Vietnamese corresponding to your selected language setting.

---

### 3.3. Hỏi đáp cùng Chatbot Gốm sứ / AI Ceramic Chatbot

#### 🇻🇳 Tiếng Việt
Hệ thống cung cấp một Chatbot chuyên gia trực tuyến hỗ trợ trả lời các thắc mắc về lĩnh vực gốm sứ.
1. **Truy cập**: Nhấp vào biểu tượng Bong bóng Chat ở góc dưới màn hình (Web) hoặc tab **Trò chuyện / Chatbot** trên App di động.
2. **Gửi câu hỏi**:
   * Bạn có thể hỏi các câu hỏi liên quan đến lịch sử gốm sứ (ví dụ: *"Gốm Chu Đậu có đặc điểm gì?"*, *"Làm sao phân biệt men rạn Bát Tràng"*), hoặc thông tin về dự án The Archivist (ví dụ: *"Hệ thống này hoạt động như thế nào?"*).
3. **Giới hạn phạm vi (Strict Topic Constraint)**:
   * Để bảo đảm tính chính xác và chất lượng học thuật, chatbot được cấu hình **chỉ trả lời các nội dung liên quan đến gốm sứ và hệ thống The Archivist**.
   * Nếu người dùng hỏi những câu hỏi ngoài lề (như code lập trình, toán học, thời tiết, giải trí đại chúng), chatbot sẽ từ chối trả lời một cách lịch sự bằng ngôn ngữ tương ứng.

#### 🇬🇧 English
The system hosts a specialized online Chatbot to handle queries in the ceramics domain.
1. **Access**: Click the Chat bubble icon at the bottom-right corner (Web) or switch to the **Chatbot** tab on the Mobile App.
2. **Ask Questions**:
   * You can ask questions about ceramic history and characteristics (e.g., *"What are the features of Chu Dau ceramics?"*, *"How to distinguish Bat Trang crackle glaze?"*) or inquiries about The Archivist platform (e.g., *"How does this appraisal system work?"*).
3. **Strict Topic Constraint**:
   * To preserve academic focus and accuracy, the chatbot is engineered to **only answer questions related to ceramics and The Archivist**.
   * If a user inputs unrelated topics (such as computer programming, mathematics, weather forecasts, or pop culture), the chatbot will politely decline to answer in the active language.

---

### 3.4. Nạp tiền & Đăng ký gói / VNPay Payments & Packages

#### 🇻🇳 Tiếng Việt
Khi hết lượt giám định miễn phí, người dùng có thể mua thêm lượt thông qua cổng thanh toán VNPay trực tuyến.
1. **Vào trang nạp lượt**:
   * Nhấp chọn **Nạp tiền / Gói dịch vụ** trên Menu (Web) hoặc trang cá nhân (App).
2. **Chọn gói**:
   * Hệ thống có nhiều gói linh hoạt (Ví dụ: Gói Cơ bản - 5 lượt, Gói Nâng cao - 20 lượt, Gói Chuyên gia - Không giới hạn).
3. **Thanh toán**:
   * Nhấn nút **Thanh toán qua VNPay / Pay with VNPay**.
   * Hệ thống chuyển hướng an toàn tới Cổng thanh toán VNPay Sandbox.
   * Sử dụng ứng dụng Ngân hàng quét mã QR hoặc nhập thông tin thẻ test của VNPay Sandbox để hoàn tất.
4. **Kiểm tra số dư**:
   * Sau khi thanh toán thành công, hệ thống tự động cộng thêm số lượt tương ứng vào tài khoản và cập nhật lịch sử giao dịch.

#### 🇬🇧 English
When free appraisal tokens are exhausted, users can purchase additional tokens via VNPay.
1. **Navigate to Packages Page**:
   * Select **Pricing / Buy Tokens** from the Web navigation menu or via the Profile tab on the Mobile App.
2. **Select a Package**:
   * Choose from flexible packages (e.g., Basic - 5 tokens, Premium - 20 tokens, Expert - Unlimited).
3. **Complete Payment**:
   * Click the **Pay with VNPay** button.
   * The app securely redirects to the VNPay Sandbox payment gateway.
   * Scan the QR code with a banking app or enter VNPay Sandbox test card details to finalize the transaction.
4. **Balance Update**:
   * Upon successful checkout, the purchased tokens are instantly credited to your balance, and the transaction list is updated.

---

### 3.5. Xem Lịch sử Giám định / Appraisal History

#### 🇻🇳 Tiếng Việt
Tất cả các kết quả giám định trước đó đều được lưu trữ trực tuyến để người dùng tra cứu lại bất cứ lúc nào.
1. **Truy cập**: Nhấp vào tab **Lịch sử / History**.
2. **Nội dung hiển thị**:
   * Danh sách các cổ vật đã từng được gửi lên giám định kèm thời gian, hình ảnh thu nhỏ, tên cổ vật phân loại và độ tin cậy.
3. **Xem chi tiết**:
   * Nhấp chọn vào một mục lịch sử cụ thể để đọc lại toàn bộ biên bản tranh biện của các AI Agent và kết luận giám định chi tiết.
   * Người dùng có thể tìm kiếm theo tên hoặc lọc danh sách theo khoảng thời gian.

#### 🇬🇧 English
All prior appraisal records are archived online for users to access at any time.
1. **Access**: Navigate to the **History** tab.
2. **Overview**:
   * Lists previously appraised ceramics featuring timestamp, thumbnail image, classified category, and confidence rating.
3. **View Detail**:
   * Click any history item to reopen the comprehensive report, including full AI agent arguments and final appraisal verdicts.
   * Users can search by name or apply date filters to locate records.

---

### 3.6. Bảng Điều khiển Admin / Admin Dashboard (Web Only)

#### 🇻🇳 Tiếng Việt
*Tính năng này chỉ hiển thị khi tài khoản đăng nhập có quyền Quản trị viên (Admin) trên giao diện Web.*
1. **Quản lý Người dùng (User Management)**:
   * Xem danh sách tất cả người dùng, trạng thái kích hoạt, số lượt giám định còn lại.
   * Có chức năng khóa/mở khóa tài khoản hoặc chỉnh sửa thủ công số lượt giám định cho thành viên.
2. **Quản lý Giao dịch (Transactions)**:
   * Thống kê toàn bộ doanh thu, danh sách các giao dịch thanh toán qua VNPay thành công/thất bại để phục vụ đối soát tài chính.
3. **Cấu hình AI & Dataset**:
   * Theo dõi trạng thái hoạt động của AI Server (`gom-ai`).
   * Quản lý tập dữ liệu hình ảnh gốm sứ dùng làm tài liệu tham khảo cho các tác nhân AI tranh biện.

#### 🇬🇧 English
*This feature is visible only to accounts with Administrator privileges logged in via the Web interface.*
1. **User Management**:
   * Review all users, account activation status, and active token balances.
   * Action items to suspend/activate accounts or adjust token counts manually.
2. **Transaction Records**:
   * Access global revenue statistics, successful/failed VNPay transactions for audit logs.
   * Financial statistics reports.
3. **AI & Dataset Configuration**:
   * Monitor health status of the AI Server (`gom-ai`).
   * Manage ceramic image datasets utilized by the AI agents as references during debates.

---

## 4. XỬ LÝ SỰ CỐ THƯỜNG GẶP / TROUBLESHOOTING

| 🇻🇳 Sự cố thường gặp | 🇬🇧 Common Issue | 🛠️ Cách khắc phục / Solution |
| :--- | :--- | :--- |
| **Không kết nối được API trên App Mobile** | *Cannot connect to API on Mobile App* | Kiểm tra địa chỉ IP cục bộ được khai báo tại cấu hình Flutter (`lib/api_config.dart`). Đảm bảo điện thoại và máy tính chạy server chung một mạng Wi-Fi. |
| **Giao dịch VNPay bị hủy nhưng vẫn mất tiền** | *VNPay transaction cancelled but tokens charged* | Hệ thống sử dụng môi trường test Sandbox của VNPay nên không trừ tiền thật. Nếu giao dịch lỗi, lượt sẽ không bị trừ hoặc được hoàn trả tự động. |
| **Chatbot báo lỗi không phản hồi** | *Chatbot gives error or no response* | Đảm bảo AI Server (`gom-ai`) đang hoạt động và khóa `GEMINI_API_KEY`/`GROQ_API_KEY` trong file cấu hình `.env` của AI Server chưa bị hết hạn hạn mức. |
| **Ảnh giám định không tải lên được** | *Ceramic photo upload fails* | Kiểm tra định dạng ảnh (hỗ trợ JPG, PNG) và đảm bảo dung lượng file ảnh chụp không vượt quá 10MB để tối ưu đường truyền. |
