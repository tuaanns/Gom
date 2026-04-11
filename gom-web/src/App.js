import React, { useState, useEffect } from "react";
import axios from "axios";
import "./index.css";

// --- API CONFIG ---
const API_BASE = "http://127.0.0.1:8000/api";

function App() {
  const [view, setView] = useState("auth"); 
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [quota, setQuota] = useState({ free_used: 0, free_limit: 5, token_balance: 0 });
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [notification, setNotification] = useState(null);

  const notify = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchUser = async () => {
    if (!token) return;
    try {
      const res = await axios.get(API_BASE + "/user", { headers: { Authorization: "Bearer " + token }});
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));
      setQuota({
        free_used: res.data.free_predictions_used || 0,
        free_limit: res.data.free_limit || 5,
        token_balance: res.data.token_balance || 0
      });
    } catch (err) {
      if(err.response?.status === 401) logout();
    }
  };

  useEffect(() => {
    if (token) {
      setView("debate");
      fetchUser();
    } else setView("auth");
  }, [token]);

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setView("auth");
  };

  return (
    <div className="app-container">
      {token && <Navbar user={user} quota={quota} setView={setView} logout={logout} view={view} />}
      
      <main className="main-content">
        {view === "auth" && <AuthScreen setToken={setToken} setUser={setUser} notify={notify} fetchUser={fetchUser} />}
        {view === "debate" && <DebateScreen token={token} notify={notify} quota={quota} setQuota={setQuota} setView={setView} user={user} />}
        {view === "history" && <HistoryScreen token={token} setSelectedHistory={setSelectedHistory} />}
        {view === "dashboard" && <DashboardScreen token={token} />}
        {view === "payment" && <PaymentScreen token={token} quota={quota} fetchUser={fetchUser} notify={notify} />}
      </main>

      {notification && (
        <div className={`toast ${notification.type} fade-in`}>
          <span>{notification.type === 'error' ? '✕' : notification.type === 'success' ? '✓' : 'ℹ'}</span>
          <div>
            <div style={{fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8}}>Thông báo hệ thống</div>
            <div>{notification.message}</div>
          </div>
        </div>
      )}

      {selectedHistory && (
        <HistoryDetailModal item={selectedHistory} onClose={() => setSelectedHistory(null)} token={token} />
      )}
      
      <footer>
        <p>&copy; 2026 GOM AI - Professional Pottery Recognition Portal</p>
      </footer>
    </div>
  );
}

// --- COMPONENTS ---

function Navbar({ user, quota, setView, logout, view }) {
  const navBtn = (v, label) => (
    <button 
      onClick={() => setView(v)}
      className={`nav-link ${view === v ? 'active' : ''}`}
    >
      {label}
    </button>
  );

  return (
    <nav className="navbar fade-in">
      <div className="nav-brand" onClick={() => setView("debate")}>
        🏺 GOM AI <span>WEB</span>
      </div>
      
      <div className="nav-links">
        {navBtn("dashboard", "Bảng điều khiển")}
        {navBtn("debate", "Giám định")}
        {navBtn("history", "Lịch sử")}
        {navBtn("payment", "Nạp lượt")}
      </div>

      <div className="nav-actions">
        <div className="quota-badge" style={{cursor: 'pointer'}} onClick={() => setView("payment")}>
          {quota.free_used < quota.free_limit 
            ? <span style={{color: 'var(--success)'}}>Miễn phí: {quota.free_limit - quota.free_used} lượt</span>
            : quota.token_balance > 0 
              ? <span style={{color: 'var(--secondary)'}}>Số dư: {quota.token_balance} token</span>
              : <span style={{color: 'var(--danger)'}}>Đã hết lượt</span>}
        </div>
        <div className="user-badge" style={{cursor: 'pointer'}}>
          <span style={{width: 8, height: 8, background: 'var(--success)', borderRadius: '50%'}}></span>
          {user?.name}
        </div>
        <button className="nav-link" onClick={logout} title="Đăng xuất">Đăng Xuất</button>
      </div>
    </nav>
  );
}

function AuthScreen({ setToken, setUser, notify }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", password_confirmation: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = isLogin ? "/login" : "/register";
      const res = await axios.post(API_BASE + endpoint, form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      notify(`Chào mừng nghệ nhân ${res.data.user.name}!`, "success");
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi xác thực hạ tầng");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container card fade-in text-center">
      <h2 className="display-title">{isLogin ? "Đăng Nhập" : "Đăng Ký"}</h2>
      <p className="subtitle">Cổng thông tin giám định cổ vật chuyên nghiệp</p>
      
      {isLogin && (
        <div style={{display: 'flex', gap: '15px', marginBottom: '20px'}}>
          <button type="button" className="btn btn-outline" style={{flex: 1}} onClick={() => notify("Kết nối Google Auth đang được cấu hình", "info")}>Google</button>
          <button type="button" className="btn btn-outline" style={{flex: 1}} onClick={() => notify("Kết nối Facebook Auth đang được cấu hình", "info")}>Facebook</button>
        </div>
      )}

      {isLogin && <div className="auth-divider">Hoặc đăng nhập bằng Email</div>}

      {error && <div style={{background: 'var(--danger)', color: 'white', padding: '15px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 'bold'}}>{error}</div>}

      <form onSubmit={handleSubmit} style={{textAlign: 'left'}}>
        {!isLogin && (
          <div className="input-group">
            <label className="input-label">Tên nghệ nhân</label>
            <input className="input-field" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
        )}
        <div className="input-group">
          <label className="input-label">Email liên lạc</label>
          <input className="input-field" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        </div>
        <div className="input-group">
          <label className="input-label">Mật khẩu</label>
          <input className="input-field" type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
        </div>
        {!isLogin && (
          <div className="input-group">
             <label className="input-label">Xác nhận lại</label>
             <input className="input-field" type="password" required value={form.password_confirmation} onChange={e => setForm({...form, password_confirmation: e.target.value})} />
          </div>
        )}
        <button className="btn btn-primary" type="submit" disabled={loading} style={{width: '100%', marginTop: '20px', padding: '18px'}}>
          {loading ? "Đang xử lý hồ sơ..." : (isLogin ? "Vào Hệ Thống" : "Gia Nhập GOM AI")}
        </button>
      </form>
      <p style={{marginTop: '25px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)'}} onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
      </p>
    </div>
  );
}

function DebateScreen({ token, notify, quota, setQuota, setView, user }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const onFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setResult(null);
      setError("");
    }
  };

  const analyze = async () => {
    if (quota.free_used >= quota.free_limit && quota.token_balance <= 0) {
      notify("Tài khoản của bạn đã hết lượt miễn phí và số dư không đủ. Vui lòng nạp thêm lượt!", "error");
      setView("payment");
      return;
    }

    if (!file) {
      setError("Vui lòng tải ảnh cổ vật lên trước khi khởi động giám định!");
      return;
    }
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await axios.post(API_BASE + "/predict", formData, { headers: { Authorization: "Bearer " + token } });
      setResult(res.data.data);
      const q = res.data.quota || {};
      if (q.free_used !== undefined) setQuota({ free_used: q.free_used, free_limit: q.free_limit || quota.free_limit, token_balance: q.token_balance || quota.token_balance });
      notify("Giám định hoàn tất!", "success");
    } catch (err) {
      if (err.response?.status === 402) {
         notify("Đã hết số lượt giám định. Vui lòng nạp thêm lượt!", "error");
         setView("payment");
      } else setError(err.response?.data?.message || "Lỗi kết nối máy chủ AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      {!result ? (
        <div className="card text-center" style={{width: '100%', maxWidth: '1000px', marginTop: '40px'}}>
          <h1 className="display-title">Giám định Cổ vật Đa đại lý</h1>
          <p className="subtitle">Hệ thống Multi-Agent AI đầu tiên dành cho nghệ thuật gốm sứ</p>
          
          {error && <div style={{background: 'var(--danger)', color: 'white', padding: '15px', borderRadius: '12px', marginBottom: '20px', fontWeight: 'bold'}}>{error}</div>}

          <div className="upload-area" onClick={() => document.getElementById("fileInput").click()}>
            {preview ? <img src={preview} alt="preview" /> : (
              <>
                <div className="upload-icon">🏺</div>
                <h3 style={{fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px'}}>Kéo thả hoặc nhấp để tải ảnh</h3>
                <p style={{color: 'var(--text-muted)'}}>Dữ liệu ảnh gốm sứ JPG, PNG, WEBP</p>
              </>
            )}
            <input id="fileInput" type="file" hidden onChange={onFileChange} accept="image/*" />
          </div>

          <button className="btn btn-primary" onClick={analyze} disabled={loading} style={{padding: '20px 40px', fontSize: '1.1rem'}}>
            {loading ? "Đang phân tích đa đại lý..." : "Khởi động quy trình phân tích"}
          </button>
        </div>
      ) : <ResultDashboard result={result} token={token} user={user} />}
    </div>
  );
}

function DashboardScreen({ token }) {
  const [stats, setStats] = useState({ total_requests: 0, avg_confidence: 0, history: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(API_BASE + "/history", { headers: { Authorization: "Bearer " + token }})
      .then(res => {
        const hist = res.data.data;
        setStats({
          total_requests: hist.length,
          avg_confidence: hist.reduce((acc, curr) => acc + (curr.data?.final_report?.certainty || 0), 0) / (hist.length || 1),
          history: hist
        });
      }).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{textAlign: 'center', margin: '100px 0'}}>Loading...</div>;

  return (
    <div className="fade-in">
      <div className="stats-grid">
        <div className="stat-card">
          <label className="input-label">Tổng lượt giám định</label>
          <div className="stat-value">{stats.total_requests}</div>
          <p style={{color: 'var(--success)', fontWeight: 'bold', fontSize: '0.8rem'}}>▲ 100% Phân tích AI</p>
        </div>
        <div className="stat-card">
          <label className="input-label">Độ tin cậy hệ thống</label>
          <div className="stat-value">{stats.avg_confidence.toFixed(1)}%</div>
        </div>
        <div className="stat-card">
          <label className="input-label">Lực lượng phản biện</label>
          <div className="stat-value">3</div>
          <p style={{color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.8rem'}}>GPT-4, Grok, Gemini PRO</p>
        </div>
      </div>
    </div>
  );
}

function ResultDashboard({ result, isModal, token, user }) {
  if (!result || !result.final_report) return <div className="card text-center">Đang tải kết quả...</div>;
  const final = result.final_report;
  const agents = result.agent_predictions || [];

  return (
    <div className="fade-in" style={{width: '100%', maxWidth: '1000px', margin: isModal ? '0' : '40px auto 0'}}>
      <div className="card" style={{background: 'var(--primary)', color: 'white', textAlign: 'center', marginBottom: '30px'}}>
        <div style={{display: 'inline-block', background: 'var(--secondary)', color: 'var(--text-main)', padding: '5px 15px', borderRadius: '50px', fontWeight: 900, fontSize: '0.8rem', marginBottom: '20px'}}>ĐỘ TIN CẬY: {final.certainty}%</div>
        {!isModal && (
          <>
            <h2 style={{fontFamily: 'var(--font-heading)', fontSize: '3rem', marginBottom: '10px'}}>{final.final_prediction}</h2>
            <p style={{color: 'var(--secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '30px'}}>{final.final_country} • {final.final_era}</p>
          </>
        )}
        <div style={{background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'left'}}>
          <h4 style={{color: 'var(--secondary)', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 800, marginBottom: '10px'}}>Biên bản kết luận tổng hợp:</h4>
          <p style={{fontSize: '1.1rem', fontStyle: 'italic', fontWeight: 500, opacity: 0.9}}>"{final.reasoning}"</p>
        </div>
      </div>

      <div className="stats-grid">
        {agents.map((a, i) => (
          <div key={i} className="card">
            <div style={{display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid var(--stroke)', paddingBottom: '15px', marginBottom: '20px'}}>
              <h4 style={{fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)'}}>{a.agent_name}</h4>
              <span style={{fontSize: '0.8rem', fontWeight: 700, background: 'var(--bg)', padding: '4px 8px', borderRadius: '6px', color: 'var(--secondary)'}}>{a.prediction?.ceramic_line}</span>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              {a.debate_details?.attacks?.map((atk, j) => (
                <div key={j} style={{background: '#FEF2F2', border: '1px solid #FECACA', padding: '15px', borderRadius: '12px'}}>
                  <p style={{color: '#991B1B', fontSize: '0.9rem', fontWeight: 600}}>⚔️ {atk}</p>
                </div>
              ))}
              <div style={{background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '15px', borderRadius: '12px'}}>
                <p style={{color: '#065F46', fontSize: '0.9rem', fontWeight: 600}}>🛡️ {a.debate_details?.defense}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!isModal && token && <AIChatbox token={token} user={user} />}
    </div>
  );
}

function HistoryScreen({ token, setSelectedHistory }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(API_BASE + "/history", { headers: { Authorization: "Bearer " + token }})
      .then(res => setHistory(res.data.data)).finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="fade-in" style={{marginTop: '40px'}}>
      <div className="text-center" style={{marginBottom: '40px'}}>
        <h2 className="display-title">Lịch sử giám định nghệ thuật</h2>
        <p className="subtitle">Lưu trữ các biên bản phân tích AI</p>
      </div>

      <div className="history-grid">
        {!loading && history.map((h, i) => (
          <div key={i} className="history-card" onClick={() => setSelectedHistory(h)}>
            <img src={h.image_url} alt="pottery" className="history-img" />
            <div className="history-info">
              <h4 className="history-title">{h.prediction}</h4>
              <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase'}}>{h.country} • {h.era}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryDetailModal({ item, onClose, token }) {
  return (
    <div style={{position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px'}} onClick={onClose}>
      <div className="card fade-in" style={{width: '100%', maxWidth: '1200px', height: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: 0}} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{position: 'absolute', top: '15px', right: '15px', background: 'var(--surface)', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '1.5rem', cursor: 'pointer', zIndex: 10}}>×</button>
        <div style={{padding: '40px', borderBottom: '1px solid var(--stroke)'}}>
          <h1 className="display-title">{item.prediction}</h1>
          <p style={{fontWeight: 800, color: 'var(--text-muted)'}}>{item.country} • {item.era}</p>
        </div>
        <div style={{padding: '40px', background: 'var(--bg)'}}>
          <ResultDashboard result={item.data} isModal={true} />
        </div>
      </div>
    </div>
  );
}

function AIChatbox({ token, user }) {
  const [messages, setMessages] = useState([{ text: `Xin chào ${user?.name || 'nghệ nhân'}.\nTôi là Trợ lý AI giám định gốm sứ GOM AI.`, isUser: false }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setMessages(prev => [...prev, { text: userText, isUser: true }]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(API_BASE + "/ai/chat", { question: userText }, { headers: { Authorization: "Bearer " + token }});
      setMessages(prev => [...prev, { text: res.data.answer, isUser: false, sources: res.data.sources?.join(', '), tokensCharged: res.data.tokens_charged}]);
    } catch (err) {
      setMessages(prev => [...prev, { text: "Có lỗi xảy ra khi kết nối máy chủ AI.", isUser: false }]);
    }
    setLoading(false);
  };

  return (
    <div className="chat-container">
      <div className="chat-header"><span>Trợ lý AI Gốm Sứ</span><button onClick={() => setMessages([messages[0]])} className="btn-outline" style={{padding: '5px 15px', color:'white', borderColor:'rgba(255,255,255,0.3)', fontSize: '0.7rem'}}>LÀM MỚI</button></div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.isUser ? 'user' : 'bot'}`}>
             <div className={`avatar ${m.isUser ? 'user' : 'bot'}`}>{m.isUser ? (user?.name?.charAt(0) || 'U') : '🏺'}</div>
             <div className="message-bubble">
               <p style={{whiteSpace: 'pre-wrap'}}>{m.text}</p>
               {m.sources && <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px', fontStyle: 'italic'}}>Nguồn: {m.sources}</p>}
             </div>
          </div>
        ))}
        {loading && <div className="message bot"><div className="avatar bot">🏺</div><div className="message-bubble">Đang phân tích...</div></div>}
      </div>
      <div className="chat-input-area">
         <input className="chat-input" placeholder="Nhập câu hỏi..." value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} disabled={loading} />
         <button className="chat-send" onClick={sendMessage} disabled={loading || !input.trim()}>➜</button>
      </div>
    </div>
  );
}

function PaymentScreen({ token, quota, fetchUser, notify }) {
  const [history, setHistory] = useState([]);
  const [purchasing, setPurchasing] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);

  useEffect(() => {
    axios.get(API_BASE + '/payment/history', { headers: { Authorization: 'Bearer ' + token } }).then(res => setHistory(res.data.data)).catch(console.error);
  }, [token]);

  const buyPackage = async (id) => {
    setPurchasing(true);
    try {
      const res = await axios.post(API_BASE + '/payment/create', { package_id: id }, { headers: { Authorization: 'Bearer ' + token } });
      setQrCodeData(res.data.data);
      notify('Xin mời thanh toán qua mã QR!', 'success');
    } catch (err) { notify('Hệ thống thanh toán lỗi', 'error'); }
    setPurchasing(false);
  };

  const checkStatus = async () => {
    if (!qrCodeData) return;
    try {
      const res = await axios.get(API_BASE + '/payment/check/' + qrCodeData.id, { headers: { Authorization: 'Bearer ' + token } });
      if (res.data.data.status === 'success') {
        notify('Thanh toán thành công!', 'success');
        setQrCodeData(null);
        fetchUser(); 
      } else notify('Chưa nhận được thanh toán', 'info');
    } catch (err) {}
  };

  return (
    <div className='fade-in' style={{marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div className='text-center' style={{marginBottom: '40px'}}>
        <h2 className='display-title'>Hạ tầng Thanh toán & Nạp lượt</h2>
        <p className='subtitle'>Số dư hiện tại: {quota.token_balance} GOM | Dùng thử: {quota.free_used}/{quota.free_limit}</p>
      </div>

      {qrCodeData ? (
        <div className='card' style={{maxWidth: '450px', textAlign: 'center'}}>
          <h3 className='section-title'>Mã Giao Dịch #{qrCodeData.id}</h3>
          <img src={qrCodeData.qr_url} alt='QR Code' style={{width: '100%', borderRadius: '15px', marginBottom: '20px'}} />
          <p style={{fontSize: '1.5rem', fontWeight: 900, color: 'var(--secondary)', marginBottom: '20px'}}>{new Intl.NumberFormat('vi-VN').format(qrCodeData.amount)} VNĐ</p>
          <button onClick={checkStatus} className='btn btn-primary' style={{width: '100%', marginBottom: '15px'}}>Đóng & Kiểm tra GD</button>
          <button onClick={() => setQrCodeData(null)} className='btn btn-outline' style={{width: '100%'}}>Huỷ giao dịch</button>
        </div>
      ) : (
        <div className='stats-grid' style={{maxWidth: '1000px', width: '100%'}}>
          {[
            { id: 1, name: 'Tân binh', price: 50000, desc: '15 Lượt + Chatbot' },
            { id: 2, name: 'Chuyên gia', price: 200000, desc: '80 Lượt Cao Cấp' },
            { id: 3, name: 'Sưu tầm gia', price: 500000, desc: 'Không giới hạn 30 ngày' }
          ].map(pkg => (
            <div key={pkg.id} className='card text-center' style={{display: 'flex', flexDirection: 'column'}}>
              <h4 className='section-title' style={{margin:0}}>{pkg.name}</h4>
              <p style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', fontWeight: 600}}>{pkg.desc}</p>
              <h3 style={{fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '30px'}}>{new Intl.NumberFormat('vi-VN').format(pkg.price)}₫</h3>
              <button disabled={purchasing} onClick={() => buyPackage(pkg.id)} className='btn btn-primary' style={{marginTop: 'auto'}}>Nạp Gói Này</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
