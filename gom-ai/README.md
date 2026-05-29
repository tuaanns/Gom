# GOM AI - Multi-Agent Debate System

Hệ thống AI phân tích gốm sứ sử dụng kiến trúc multi-agent debate: 3 chuyên gia AI tranh luận với nhau, sau đó 1 judge tổng hợp kết luận cuối cùng.

## Kiến trúc Debate

Service nhận ảnh gốm sứ và chạy qua 4 phase:

- **Phase 0 — Vision Analysis**: Google Gemini (fallback: 2.5 Flash Lite → 3 Flash Preview → 2.5 Flash) phân tích hình ảnh, trích xuất visual features (màu sắc, hoa văn, chất liệu, hình dáng, xuất xứ dự đoán).
- **Phase 1 — Independent Predictions**: 3 chuyên gia AI độc lập (**Lịch Sử Gốm**, **Chuyên gia Chữ ký Lò và Hình thái Gốm**, và **Chuyên Gia Gốm Toàn Cầu**) đưa ra dự đoán độc lập dựa trên visual features và kết quả đối sánh Google Lens thời gian thực. Tất cả chạy song song trên Groq Llama 3.3-70b.
- **Phase 2 — Debate Round**: Các agent tấn công lập luận của nhau và bảo vệ quan điểm của mình, điều chỉnh confidence. Chạy song song.
- **Phase 3 — Final Judging**: Trọng Tài Phán Quyết (JudgeAgent - Groq Llama 3.3-70b) tổng hợp tất cả bằng chứng và tranh luận, đối chiếu trực quan, đưa ra kết luận cuối cùng.

## Công nghệ

- **FastAPI** + Uvicorn (async Python web server)
- **Google Gemini 2.5 Flash Lite** (vision analysis — Phase 0, with fallback to 3 Flash Preview / 2.5 Flash)
- **Groq Llama 3.3-70b** (tất cả text agents + judge — Phase 1, 2, 3)
- **httpx** (async HTTP client cho Wikipedia API, Google token verification)
- **tenacity** (retry với exponential backoff cho rate limits)
- **python-dotenv** (quản lý biến môi trường)

## Cấu trúc code

```
app/
├── agents/
│   ├── base_agent.py       # BaseAgent: LLM call, JSON extract, predict, debate
│   ├── specialists.py      # GPTAgent, GrokAgent, GeminiAgent (3 chuyên gia)
│   └── vision_agent.py     # VisionAgent: phân tích hình ảnh bằng Gemini
├── debate/
│   └── debate_engine.py    # DebateEngine (orchestrator) + JudgeAgent
└── main.py                 # FastAPI app, endpoints, CORS, social login
uploads/                    # Lưu ảnh debug tạm thời
requirements.txt
.env
```

## Yêu cầu

- Python 3.10+
- Kết nối internet (gọi Groq API, Google Gemini API, Wikipedia API)

## Cài đặt

```bash
# Tạo virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux/macOS

# Install dependencies
pip install -r requirements.txt
```

## Cấu hình

Tạo file `.env`:

```env
GROQ_API_KEY=gsk_xxxxx
GOOGLE_API_KEY=AIzaSyxxxxx
CORS_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

Lấy API keys:

- **Groq**: https://console.groq.com/keys
- **Google Gemini**: https://aistudio.google.com/app/apikey
- **Google Client ID** (cho social login): Google Cloud Console → APIs & Services → Credentials

## 🌐 Cấu Hình Google Lens Trên Production (Browserless.io)

Để chạy được Selenium quét Google Lens trên môi trường máy chủ đám mây (như **Azure App Service** - vốn không có sẵn môi trường đồ họa và Google Chrome), hệ thống hỗ trợ luồng định tuyến thông minh qua **Remote Cloud Browser**:

### 1. Cách hoạt động
- **Tại local**: Hệ thống dùng Chrome cài sẵn trên máy tính của bạn.
- **Tại production**: Hệ thống tự động kết nối qua WebSocket tới cụm trình duyệt đám mây của **Browserless.io** khi phát hiện thấy biến cấu hình `BROWSERLESS_TOKEN`.

### 2. Hướng dẫn thiết lập (Miễn phí)
1. Đăng ký tài khoản miễn phí (tặng 1000+ lượt quét/tháng) tại [Browserless.io](https://www.browserless.io/).
2. Copy mã **API Token** từ Dashboard chính của Browserless.
3. Thiết lập biến môi trường trên **Azure Portal** (hoặc file `.env` trên VPS):
   - **Key**: `BROWSERLESS_TOKEN`
   - **Value**: *(Mã Token của bạn)*
4. Khởi động lại App Service để áp dụng cấu hình mới. Trích dẫn Google Lens sẽ tự động kích hoạt thành công trên mọi nền tảng!

## Chạy server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Server: http://localhost:8001 — Docs: http://localhost:8001/docs

## API Endpoints

### `GET /` — Health Check

```json
{ "status": "online", "system": "Multi-Agent AI Debate" }
```

### `POST /predict` — Phân tích gốm sứ

Request: `multipart/form-data` với field `file` (ảnh JPG/PNG)

Response:
```json
{
  "visual_features": {
    "is_pottery": true,
    "color": "xanh ngọc",
    "pattern": "hoa văn rồng",
    "material": "sứ",
    "shape": "bình",
    "estimated_era": "Thế kỷ 15-16",
    "style_hint": "men ngọc",
    "suspected_origin": "Bát Tràng, Việt Nam"
  },
  "agent_predictions": [
    {
      "agent_name": "GPT Historian",
      "prediction": {
        "ceramic_line": "Gốm Bát Tràng",
        "country": "Việt Nam",
        "era": "Thế kỷ 15-16",
        "style": "Men ngọc truyền thống"
      },
      "confidence": 0.85,
      "evidence": "...",
      "visual_clues_used": ["men ngọc", "cốt gốm dày"],
      "debate_details": { "attacks": [...], "defense": "...", "confidence_adjustment": 0.05 }
    }
  ],
  "final_report": {
    "final_prediction": "Gốm Bát Tràng",
    "final_country": "Việt Nam",
    "final_era": "Thế kỷ 15-16",
    "certainty": 88,
    "reasoning": "...",
    "debate_summary": "..."
  }
}
```

### `POST /chat` — Chat với AI chuyên gia gốm sứ

Request:
```json
{ "question": "Gốm Celadon có đặc điểm gì?" }
```

Response:
```json
{
  "answer": "Gốm Celadon là loại gốm có men màu xanh ngọc...",
  "sources": ["Kiến thức chuyên gia AI", "Wikipedia: Gốm Celadon"]
}
```

### `POST /api/login/social` — Google Social Login Verification

Request:
```json
{
  "provider": "google",
  "credential": "eyJhbGciOiJSUzI1NiIs...",
  "clientId": "xxxxx.apps.googleusercontent.com"
}
```

Response:
```json
{
  "success": true,
  "provider": "google",
  "user": { "id": "...", "email": "...", "name": "...", "picture": "...", "email_verified": true }
}
```

## Troubleshooting

| Vấn đề | Giải pháp |
|---|---|
| `ModuleNotFoundError` | `pip install -r requirements.txt` |
| 401 Unauthorized | Kiểm tra API keys trong `.env` |
| 429 Rate Limit | Đợi 1-2 phút hoặc upgrade Groq/Gemini plan |
| `RESOURCE_EXHAUSTED` | Gemini quota hết — đợi reset hoặc đổi key |

## Logs

Console output theo format:
```
2026-04-27 10:30:45 [INFO] gom-ai: POST /predict - Received image.jpg (125000 bytes)
2026-04-27 10:30:50 [INFO] gom-ai.debate.engine: Starting Phase 1: Independent Predictions
```

Lỗi nghiêm trọng được ghi vào `error_log.txt`.

## Tài liệu bổ sung

- `docs/api.md` — API documentation chi tiết
- `docs/database.md` — Data flow và models
