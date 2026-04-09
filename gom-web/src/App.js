import React, { useState, useEffect } from "react";
import axios from "axios";
import "./index.css";
import "./App.css";

// --- API CONFIG ---
const API_BASE = "http://127.0.0.1:8000/api";

function App() {
  const [view, setView] = useState("auth"); 
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [notification, setNotification] = useState(null);

  const notify = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    if (token) setView("debate");
    else setView("auth");
  }, [token]);

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setView("auth");
  };

  return (
    <div className="min-h-screen bg-smoke flex flex-col items-center">
      {token && <Navbar user={user} setView={setView} logout={logout} view={view} />}
      
      <main className="w-full max-w-[1400px] flex-1 px-6 pb-20">
        {view === "auth" && <AuthScreen setToken={setToken} setUser={setUser} notify={notify} />}
        {view === "debate" && <DebateScreen token={token} notify={notify} />}
        {view === "history" && <HistoryScreen token={token} setSelectedHistory={setSelectedHistory} />}
        {view === "profile" && <ProfileScreen token={token} user={user} setUser={setUser} notify={notify} />}
        {view === "dashboard" && <DashboardScreen token={token} />}
      </main>

      {notification && (
        <div className="fixed bottom-10 right-10 z-[999999] animate-bounce-in">
          <div className={`flex items-center gap-4 px-6 py-4 rounded-[24px] shadow-2xl border ${
            notification.type === 'error' ? 'bg-red-500 border-red-400' : 
            notification.type === 'success' ? 'bg-emerald-500 border-emerald-400' : 'bg-navy border-slate/20'
          } text-white min-w-[320px]`}>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              {notification.type === 'error' ? '✕' : notification.type === 'success' ? '✓' : 'ℹ'}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                {notification.type === 'error' ? 'Lỗi hệ thống' : notification.type === 'success' ? 'Thành công' : 'Thông báo'}
              </p>
              <p className="font-bold text-sm">{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      {selectedHistory && (
        <HistoryDetailModal item={selectedHistory} onClose={() => setSelectedHistory(null)} />
      )}
      
      <footer className="w-full py-12 text-center text-slate/40 text-sm">
        <p>&copy; 2025 GOM AI - Professional Pottery Recognition Portal</p>
      </footer>
    </div>
  );
}

// --- COMPONENTS ---

function Navbar({ user, setView, logout, view }) {
  const navBtn = (v, label) => (
    <button 
      onClick={() => setView(v)}
      className={`mx-4 font-extrabold uppercase text-xs tracking-widest transition-all duration-300 ${view === v ? 'text-gold border-b-2 border-gold pb-1' : 'text-navy opacity-50 hover:opacity-100'}`}
    >
      {label}
    </button>
  );

  return (
    <nav className="w-full max-w-[1400px] mt-6 mb-12 bg-white rounded-[30px] shadow-sm flex items-center justify-between px-10 py-5">
      <div className="font-display font-black text-3xl cursor-pointer text-navy" onClick={() => setView("debate")}>
        🏺 GOM AI <span className="text-gold text-xs font-extrabold align-super ml-1">WEB</span>
      </div>
      
      <div className="flex items-center">
        {navBtn("dashboard", "Bảng điều khiển")}
        {navBtn("debate", "Giám định")}
        {navBtn("history", "Lịch sử")}
      </div>

      <div className="flex items-center gap-4">
        <div 
          className="bg-slate/5 px-5 py-2.5 rounded-full flex items-center gap-3 cursor-pointer hover:bg-slate/10 transition-all"
          onClick={() => setView("profile")}
        >
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
          <span className="font-extrabold text-sm text-navy">{user?.name}</span>
        </div>
        <button 
          className="text-slate hover:text-navy transition-colors p-2"
          onClick={logout}
          title="Đăng xuất"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
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
      const msg = err.response?.data?.message || "Lỗi xác thực hạ tầng";
      setError(msg);
      notify(msg, "error");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center py-20 fade-in">
      <div className="w-full max-w-[550px] bg-white p-16 rounded-[40px] shadow-2xl shadow-navy/5 text-center">
        <h2 className="text-3xl font-display font-black text-navy mb-2">{isLogin ? "Đăng Nhập" : "Đăng Ký"}</h2>
        <p className="text-slate text-sm font-medium mb-10">Cổng thông tin giám định cổ vật chuyên nghiệp</p>
        
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-2xl mb-8 font-extrabold text-sm flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate ml-2">Tên nghệ nhân</label>
              <input 
                className="w-full px-6 py-4 rounded-2xl bg-smoke border border-slate/10 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all font-bold" 
                required value={form.name} onChange={e => setForm({...form, name: e.target.value})} 
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate ml-2">Email liên lạc</label>
            <input 
              className="w-full px-6 py-4 rounded-2xl bg-smoke border border-slate/10 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all font-bold" 
              type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate ml-2">Mật khẩu</label>
            <input 
              className="w-full px-6 py-4 rounded-2xl bg-smoke border border-slate/10 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all font-bold" 
              type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} 
            />
          </div>
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate ml-2">Xác nhận lại</label>
              <input 
                className="w-full px-6 py-4 rounded-2xl bg-smoke border border-slate/10 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all font-bold" 
                type="password" required value={form.password_confirmation} onChange={e => setForm({...form, password_confirmation: e.target.value})} 
              />
            </div>
          )}
          <button 
            className="w-full bg-navy text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-navy/20 disabled:opacity-50"
            type="submit" disabled={loading}
          >
            {loading ? "Đang xử lý hồ sơ..." : (isLogin ? "Vào Hệ Thống" : "Gia Nhập GOM AI")}
          </button>
        </form>
        <p 
          className="mt-8 text-sm font-bold text-slate cursor-pointer hover:text-gold transition-colors underline underline-offset-4"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
        </p>
      </div>
    </div>
  );
}

function DebateScreen({ token, notify }) {
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
    if (!file) {
      const msg = "Vui lòng tải ảnh cổ vật lên trước khi khởi động giám định!";
      setError(msg);
      notify(msg, "error");
      return;
    }
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await axios.post(API_BASE + "/predict", formData, {
        headers: { Authorization: "Bearer " + token }
      });
      setResult(res.data.data);
      notify("Giám định hoàn tất! Hội đồng AI đã ra kết luận.", "success");
    } catch (err) {
      const msg = err.response?.data?.message || "Lỗi giao tiếp máy chủ trí tuệ nhân tạo";
      setError(msg);
      notify(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center pt-10 fade-in">
      {!result ? (
        <div className="w-full max-w-[1200px] bg-white p-24 rounded-[50px] shadow-2xl shadow-navy/5 text-center border border-slate/5">
          <h1 className="text-5xl font-display font-black text-navy mb-4">Giám định Cổ vật Đa đại lý</h1>
          <p className="text-slate text-lg font-medium mb-12">Hệ thống Multi-Agent AI đầu tiên dành cho nghệ thuật gốm sứ</p>
          
          {error && (
            <div className="bg-red-500 text-white p-4 rounded-2xl mb-8 font-extrabold text-sm flex items-center justify-center gap-2 max-w-md mx-auto">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {error}
            </div>
          )}

          <div 
            className="w-full max-w-[900px] h-[550px] bg-smoke border-4 border-dashed border-slate/20 rounded-[40px] flex items-center justify-center cursor-pointer hover:border-gold hover:bg-white transition-all group overflow-hidden mx-auto mb-12"
            onClick={() => document.getElementById("fileInput").click()}
          >
            {preview ? <img src={preview} alt="preview" className="w-full h-full object-contain p-8" /> : (
              <div className="text-center group-hover:scale-110 transition-transform">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl mx-auto mb-6 text-gold">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </div>
                <p className="text-navy font-black text-xl uppercase tracking-widest">Kéo thả hoặc nhấp để tải ảnh</p>
                <p className="text-slate text-sm font-bold mt-2">Dữ liệu ảnh gốm sứ JPG, PNG, WEBP</p>
              </div>
            )}
            <input id="fileInput" type="file" hidden onChange={onFileChange} accept="image/*" />
          </div>

          <button 
            className="bg-navy text-white px-20 py-6 rounded-3xl font-black text-xl uppercase tracking-[0.2em] shadow-2xl shadow-navy/20 hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-50"
            onClick={analyze} disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-4">
                <div className="w-6 h-6 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
                Các Agent đang tranh biện...
              </span>
            ) : "Khởi động quy trình phân tích"}
          </button>
        </div>
      ) : <ResultDashboard result={result} />}
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
          avg_confidence: hist.reduce((acc, curr) => {
            const cert = curr.data?.final_report?.certainty || 0;
            return acc + (typeof cert === "number" ? cert : 0);
          }, 0) / (hist.length || 1),
          history: hist
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-12 border-4 border-navy border-t-gold rounded-full animate-spin"></div>
      <p className="text-navy font-black uppercase text-xs tracking-widest">Đang tải hạ tầng quản trị...</p>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center pt-10 fade-in">
      <div className="w-full max-w-[1300px] grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
        <div className="bg-white p-12 rounded-[40px] shadow-sm border border-slate/5">
          <label className="text-xs font-black uppercase tracking-widest text-slate block mb-4">Tổng lượt giám định</label>
          <h3 className="text-6xl font-display font-black text-navy">{stats.total_requests}</h3>
          <p className="text-green-500 font-bold text-xs mt-4">▲ 100% Phân tích AI</p>
        </div>
        <div className="bg-white p-12 rounded-[40px] shadow-sm border border-slate/5">
          <label className="text-xs font-black uppercase tracking-widest text-slate block mb-4">Độ tin cậy hệ thống</label>
          <h3 className="text-6xl font-display font-black text-navy">{stats.avg_confidence.toFixed(1)}%</h3>
          <div className="w-full h-2.5 bg-smoke rounded-full mt-6 overflow-hidden">
            <div className="h-full bg-gold transition-all duration-1000" style={{ width: `${stats.avg_confidence}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-12 rounded-[40px] shadow-sm border border-slate/5">
          <label className="text-xs font-black uppercase tracking-widest text-slate block mb-4">Lực lượng phản biện</label>
          <h3 className="text-6xl font-display font-black text-navy">3</h3>
          <p className="text-slate font-bold text-xs mt-4 italic">GPT-4, Grok, Gemini PRO</p>
        </div>
      </div>

      <div className="w-full max-w-[1300px] bg-white p-16 rounded-[50px] shadow-sm border border-slate/5">
        <h3 className="text-2xl font-display font-black text-navy mb-8">Biểu đồ Theo dõi Hiệu năng AI</h3>
        <div className="flex items-end gap-5 h-[300px] bg-smoke p-10 rounded-4xl border-b-4 border-slate/10 overflow-hidden">
          {stats.history.slice(0, 10).map((h, i) => {
            const cert = h.data?.final_report?.certainty || 0;
            return (
              <div 
                key={i} 
                className={`flex-1 ${h.data ? 'bg-navy' : 'bg-slate/20'} rounded-t-xl hover:bg-gold transition-all duration-500 cursor-pointer relative group`}
                style={{ height: `${cert}%` }}
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-navy text-white text-[10px] px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-10">
                  {cert}% • {h.prediction}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex justify-between text-xs font-black text-slate uppercase tracking-tighter">
          <p>Dữ liệu thời gian thực</p>
          <p>{new Date().toLocaleDateString("vi-VN")}</p>
        </div>
      </div>
    </div>
  );
}

function ResultDashboard({ result, isModal }) {
  if (!result || !result.final_report) {
    return (
      <div className="w-full text-center p-20 bg-smoke rounded-3xl animate-pulse">
        <p className="text-navy font-black">QUY TRÌNH GIÁM ĐỊNH ĐANG TIẾP TỤC HOẶC BỊ GIÁN ĐOẠN</p>
        <p className="text-slate text-sm">Vui lòng quay lại sau...</p>
      </div>
    );
  }
  const final = result.final_report;
  const agents = result.agent_predictions || [];

  return (
    <div className={`w-full max-w-[1300px] ${isModal ? 'px-10 pb-10' : 'mt-10'} fade-in`}>
      <div className="bg-navy text-white p-16 rounded-[50px] shadow-2xl shadow-navy/30 text-center mb-12">
        <div className="inline-block bg-gold px-6 py-2 rounded-full text-xs font-black tracking-widest mb-8">
          ĐỘ TIN CẬY: {final.certainty}%
        </div>
        {!isModal && (
          <>
            <h2 className="text-5xl font-display font-black mb-4">Dự đoán Cuối cùng: {final.final_prediction}</h2>
            <p className="text-gold font-bold tracking-[0.3em] uppercase mb-12">{final.final_country} • {final.final_era}</p>
          </>
        )}
        
        <div className="w-full max-w-4xl mx-auto bg-white/5 border border-white/10 p-10 rounded-[35px] text-left">
          <h4 className="text-gold font-black uppercase text-xs tracking-widest mb-4">Biên bản kết luận tổng hợp:</h4>
          <p className="text-white/80 leading-relaxed font-semibold italic text-lg line-clamp-4 overflow-hidden">
            "{final.reasoning}"
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isModal ? 'gap-10' : 'md:grid-cols-2 gap-12'}`}>
        {agents.map((a, i) => (
          <div key={i} className="bg-white p-10 rounded-[40px] shadow-sm border border-slate/5 overflow-hidden">
            <div className="flex items-center gap-6 mb-8 pb-6 border-b border-slate/5">
              <div className="w-16 h-16 bg-smoke rounded-full flex items-center justify-center text-2xl shadow-inner">🏺</div>
              <div>
                <h4 className="text-navy font-black text-xl">{a.agent_name}</h4>
                <p className="text-gold font-bold text-sm tracking-widest uppercase">{a.prediction?.ceramic_line}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {a.debate_details?.attacks?.map((atk, j) => (
                <div key={j} className="bg-red-50 p-6 rounded-3xl flex gap-4 border border-red-100">
                  <span className="text-red-500 font-bold text-xl leading-none mt-1">⚔️</span>
                  <p className="text-red-900 font-bold text-sm leading-relaxed">{atk}</p>
                </div>
              ))}
              <div className="bg-green-50 p-6 rounded-3xl flex gap-4 border border-green-100">
                <span className="text-green-500 font-bold text-xl leading-none mt-1">🛡️</span>
                <p className="text-green-900 font-bold text-sm leading-relaxed italic">{a.debate_details?.defense}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryScreen({ token, setSelectedHistory }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(API_BASE + "/history", { headers: { Authorization: "Bearer " + token }})
      .then(res => setHistory(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="w-full flex flex-col items-center pt-10 fade-in">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-display font-black text-navy mb-4">Lịch sử giám định nghệ thuật</h2>
        <p className="text-slate font-bold uppercase text-xs tracking-widest">Lưu trữ 200 bản ghi nghệ thuật cổ điển</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 w-full max-w-[1300px]">
          {[1,2,3].map(n => <div key={n} className="h-[450px] bg-slate/5 rounded-[40px] animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 w-full max-w-[1300px]">
          {history.map((h, i) => (
            <div 
              key={i} 
              className="group bg-white rounded-[40px] overflow-hidden shadow-sm hover:shadow-2xl hover:scale-[1.03] transition-all cursor-pointer border border-slate/5"
              onClick={() => setSelectedHistory(h)}
            >
              <div className="h-[380px] overflow-hidden bg-smoke relative">
                <img src={h.image_url} alt="pottery" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                <div className="absolute inset-0 bg-navy opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur px-5 py-2 rounded-2xl text-[10px] font-black text-navy tracking-widest uppercase">
                  {h.prediction}
                </div>
              </div>
              <div className="p-10">
                <h4 className="text-xl font-display font-black text-navy mb-2 line-clamp-1">{h.prediction}</h4>
                <p className="text-slate font-bold text-xs uppercase tracking-widest">{h.country} • {h.era}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryDetailModal({ item, onClose }) {
  return (
    <div 
      className="fixed inset-0 bg-navy/90 backdrop-blur-3xl z-[99999] flex items-center justify-center p-6 md:p-12 overflow-hidden"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[1500px] h-full bg-white rounded-[50px] shadow-2xl flex flex-col md:flex-row overflow-hidden relative fade-in"
        onClick={e => e.stopPropagation()}
      >
        <button 
          className="absolute top-8 right-10 z-[100] w-14 h-14 bg-white rounded-full flex items-center justify-center text-3xl font-light shadow-xl hover:bg-gold hover:text-white transition-all transform hover:rotate-90" 
          onClick={onClose}
        >&times;</button>
        
        <div className="w-full md:w-[42%] h-[400px] md:h-full bg-navy relative overflow-hidden flex flex-col">
          <div className="flex-1 w-full relative">
            <img src={item.image_url} alt="artifact" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          </div>
          <div className="p-12 absolute bottom-0 left-0 w-full">
            <h3 className="text-gold font-display font-black text-3xl mb-2 italic">Hồ Sơ Cổ Vật #{item.id}</h3>
            <p className="text-white/50 font-bold uppercase text-[10px] tracking-widest">
              Lưu trữ ngày: {new Date(item.created_at).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>

        <div className="flex-1 h-full overflow-y-auto bg-white">
          <div className="px-12 pt-16 pb-8 border-b border-slate/5 sticky top-0 bg-white z-10">
            <div className="text-gold font-black uppercase text-[10px] tracking-[0.4em] mb-4">Biên bản Giám định Chi tiết</div>
            <h1 className="text-5xl font-display font-black text-navy">{item.prediction}</h1>
            <div className="flex gap-6 mt-6">
              <span className="bg-smoke px-5 py-2.5 rounded-2xl text-xs font-black text-slate uppercase tracking-widest">📍 {item.country}</span>
              <span className="bg-smoke px-5 py-2.5 rounded-2xl text-xs font-black text-slate uppercase tracking-widest">📅 {item.era}</span>
            </div>
          </div>
          
          <div className="pt-8">
            <ResultDashboard result={item.data} isModal={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileScreen({ token, user, setUser, notify }) {
  const [form, setForm] = useState({ name: user?.name, email: user?.email });
  const [passForm, setPassForm] = useState({ old_password: "", password: "", password_confirmation: "" });
  const [updating, setUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const update = async () => {
    setUpdating(true);
    try {
      const res = await axios.post(API_BASE + "/profile/update", form, {
        headers: { Authorization: "Bearer " + token }
      });
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      notify("Hệ thống đã lưu lại thay đổi hồ sơ nhân thân!", "success");
    } catch (err) {
      notify(err.response?.data?.message || "Đã có lỗi xảy ra trong hạ tầng", "error");
    }
    setUpdating(false);
  };

  return (
    <div className="w-full flex flex-col items-center pt-10 fade-in">
      <div className="text-center mb-16">
        <div className="w-24 h-24 bg-white border-2 border-gold rounded-full flex items-center justify-center text-4xl font-black text-gold shadow-2xl mx-auto mb-8">M</div>
        <h2 className="text-4xl font-display font-black text-navy mb-4">Hồ Sơ Nghệ Nhân</h2>
        <p className="text-slate font-bold uppercase text-[10px] tracking-widest">Quản lý mã định danh và hạ tầng bảo mật</p>
      </div>

      <div className="w-full max-w-[1300px] grid grid-cols-1 md:grid-cols-2 gap-16 mb-20">
        <div className="bg-white rounded-[50px] shadow-sm border border-slate/5 overflow-hidden">
          <div className="p-12 border-b border-slate/5 flex justify-between items-center">
            <h3 className="text-xl font-display font-black text-navy italic">🏷️ Thông Tin Định Danh</h3>
          </div>
          <div className="p-16 space-y-10">
             <div className="space-y-4">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate ml-2">Tên hiển thị công khai</label>
               <input 
                className="w-full px-8 py-5 rounded-3xl bg-smoke border border-slate/10 focus:border-gold outline-none transition-all font-bold text-lg" 
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} 
               />
             </div>
             <div className="space-y-4">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate ml-2">Địa chỉ Email liên lạc</label>
               <input 
                className="w-full px-8 py-5 rounded-3xl bg-smoke border border-slate/10 focus:border-gold outline-none transition-all font-bold text-lg opacity-60" 
                value={form.email} disabled 
               />
             </div>
             <button 
              className="bg-navy text-white px-12 py-5 rounded-2xl font-black tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-xl shadow-navy/20"
              onClick={update} disabled={updating}>Lưu Lại Thay Đổi</button>
          </div>
        </div>

        <div className="bg-white rounded-[50px] shadow-sm border border-slate/5 overflow-hidden">
          <div className="p-12 border-b border-slate/5 flex justify-between items-center">
            <h3 className="text-xl font-display font-black text-navy italic">🛡️ Hạ Tầng Bảo Mật</h3>
            {!showPassword && (
              <button 
                className="bg-gold text-white px-8 py-3 rounded-full font-black text-[10px] tracking-widest uppercase shadow-lg shadow-gold/20 hover:scale-110 active:scale-90 transition-all" 
                onClick={() => setShowPassword(true)}>Thay đổi mật mã</button>
            )}
          </div>
          <div className="p-16 flex flex-col justify-center min-h-[400px]">
            {!showPassword ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-navy text-gold rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                </div>
                <p className="text-slate font-bold leading-relaxed px-10">Cơ chế bảo vệ cổ vật đang hoạt động. Khởi tạo quy trình nếu bạn muốn cấu hình lại mật mã truy cập.</p>
              </div>
            ) : (
              <div className="space-y-8 fade-in">
                 <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate ml-2">Mật khẩu hiện hành</label>
                   <input className="w-full px-6 py-4 rounded-2xl bg-smoke border border-slate/10 outline-none focus:border-gold font-bold" type="password" value={passForm.old_password} onChange={e => setPassForm({...passForm, old_password: e.target.value})} />
                 </div>
                 <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate ml-2">Chuỗi ký tự mới</label>
                   <input className="w-full px-6 py-4 rounded-2xl bg-smoke border border-slate/10 outline-none focus:border-gold font-bold" type="password" value={passForm.password} onChange={e => setPassForm({...passForm, password: e.target.value})} />
                 </div>
                 <div className="space-y-3">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate ml-2">Xác nhận chuỗi mới</label>
                   <input className="w-full px-6 py-4 rounded-2xl bg-smoke border border-slate/10 outline-none focus:border-gold font-bold" type="password" value={passForm.password_confirmation} onChange={e => setPassForm({...passForm, password_confirmation: e.target.value})} />
                 </div>
                 <div className="flex gap-4 pt-4">
                   <button className="bg-navy text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl" onClick={() => setShowPassword(false)} disabled={updating}>Ghi đè mật mã</button>
                   <button className="text-slate font-black text-xs uppercase tracking-widest px-8" onClick={() => setShowPassword(false)}>Hủy quy trình</button>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;