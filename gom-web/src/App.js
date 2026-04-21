import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import "./index.css";
import { AdminLayout, AdminDashboard, AdminUsers, AdminCeramics, AdminPayments, AdminPredictions } from "./AdminPanel";

// --- API CONFIG ---
const API_BASE = "http://127.0.0.1:8000/api";

function App() {
  const [view, setView] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || "auth";
  });
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [quota, setQuota] = useState({ free_used: 0, free_limit: 5, token_balance: 0 });
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [notification, setNotification] = useState(null);
  const [authSubView, setAuthSubView] = useState("login"); // login, register, forgot, reset
  const [resetEmail, setResetEmail] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Xin chào! Tôi là Trợ lý AI Gốm Sứ. Bạn cần hỗ trợ gì về lịch sử, nguồn gốc hay định danh loại gốm sứ nào không?", isUser: false }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showChat]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userText = chatInput.trim();
    setMessages(prev => [...prev, { text: userText, isUser: true }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await axios.post(API_BASE + '/ai/chat', { question: userText }, { headers: { Authorization: 'Bearer ' + token } });
      const data = res.data.data || res.data;
      setMessages(prev => [...prev, {
        text: data.answer || "Tôi chưa rõ ý bạn, bạn có thể mô tả cụ thể về hiện vật hơn được không?",
        isUser: false,
        sources: data.sources,
        tokens: data.tokens_charged
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { text: "Rất tiếc, hệ thống AI đang bận hoặc số dư của bạn đã hết. Vui lòng kiểm tra lại sau!", isUser: false }]);
    }
    setChatLoading(false);
  };

  const notify = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchUser = async () => {
    if (!token) return;
    try {
      const res = await axios.get(API_BASE + "/user", { headers: { Authorization: "Bearer " + token } });
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));
      setQuota({
        free_used: res.data.free_predictions_used || 0,
        free_limit: res.data.free_limit || 5,
        token_balance: res.data.token_balance || 0
      });
    } catch (err) {
      if (err.response?.status === 401) logout();
    }
  };

  useEffect(() => {
    if (token) {
      const currentHash = window.location.hash.replace('#', '');
      if (!currentHash || currentHash === 'auth') {
        setView("debate");
      } else {
        setView(currentHash);
      }
      fetchUser();
    } else {
      setView("auth");
    }
  }, [token]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (window.location.hash.replace('#', '') !== view) {
      window.location.hash = view;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

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
        {view === "auth" && (
          <AuthScreen
            setToken={setToken}
            setUser={setUser}
            notify={notify}
            fetchUser={fetchUser}
            subView={authSubView}
            setSubView={setAuthSubView}
            resetEmail={resetEmail}
            setResetEmail={setResetEmail}
          />
        )}
        <div className="view-transition" key={view}>
          {view === "debate" && <DebateScreen token={token} notify={notify} quota={quota} setQuota={setQuota} setView={setView} user={user} />}
          {view === "history" && <HistoryScreen token={token} setSelectedHistory={setSelectedHistory} />}
          {view === "profile" && <ProfileScreen user={user} token={token} notify={notify} fetchUser={fetchUser} />}
          {view === "transaction_history" && <TransactionHistoryScreen token={token} notify={notify} />}
          {view === "lines" && <CeramicLinesScreen />}
          {view === "payment" && <PaymentScreen token={token} quota={quota} fetchUser={fetchUser} notify={notify} setView={setView} />}
          {view === "about" && <AboutScreen />}
          {view === "contact" && <ContactScreen notify={notify} />}
          {view === "terms" && <TermsScreen />}
          {view === "privacy" && <PrivacyScreen />}

          {/* ADMIN ROUTES */}
          {user?.role === 'admin' && view.startsWith("admin_") && (
            <AdminLayout view={view} setView={setView}>
              {view === "admin_dashboard" && <AdminDashboard token={token} />}
              {view === "admin_users" && <AdminUsers token={token} notify={notify} fetchUser={fetchUser} />}
              {view === "admin_ceramics" && <AdminCeramics token={token} notify={notify} />}
              {view === "admin_payments" && <AdminPayments token={token} />}
              {view === "admin_predictions" && <AdminPredictions token={token} />}
            </AdminLayout>
          )}
        </div>
      </main>

      {notification && (
        <div className={`toast ${notification.type} fade-in`}>
          <div className="toast-icon">
            {notification.type === 'error' ? '✕' : notification.type === 'success' ? '✓' : 'ℹ'}
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8, fontWeight: 800, letterSpacing: '0.5px' }}>
              {notification.type === 'error' ? 'Lỗi hệ thống' : notification.type === 'success' ? 'Thành công' : 'Thông báo'}
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{notification.message}</div>
          </div>
        </div>
      )}

      {selectedHistory && (
        <HistoryDetailModal item={selectedHistory} onClose={() => setSelectedHistory(null)} token={token} />
      )}

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <img src="/logo.png" alt="Logo" style={{ height: '100px', marginBottom: '15px', filter: 'brightness(0) invert(1)' }} />
            <p>
              Hệ thống giám định cổ vật ứng dụng trí tuệ nhân tạo đa đại lý,
              mang lại độ chính xác cao trong việc phân định các dòng gốm sứ truyền thống.
            </p>
          </div>

          <div className="footer-col">
            <h4>Khám phá</h4>
            <ul className="footer-links">
              <li><a onClick={() => setView("debate")}>Trang chủ giám định</a></li>
              <li><a onClick={() => setView("lines")}>Thư viện dòng gốm</a></li>
              <li><a onClick={() => setView("history")}>Lịch sử giám định</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Tài khoản</h4>
            <ul className="footer-links">
              <li><a onClick={() => setView("profile")}>Thông tin cá nhân</a></li>
              <li><a onClick={() => setView("payment")}>Nạp lượt phân tích</a></li>
              <li><a onClick={() => setView("transaction_history")}>Lịch sử nạp tiền</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Hỗ trợ</h4>
            <ul className="footer-links">
              <li><a onClick={() => setView("about")} style={{ cursor: 'pointer' }}>Về chúng tôi</a></li>
              <li><a onClick={() => setView("terms")} style={{ cursor: 'pointer' }}>Điều khoản sử dụng</a></li>
              <li><a onClick={() => setView("privacy")} style={{ cursor: 'pointer' }}>Chính sách bảo mật</a></li>
              <li><a onClick={() => setView("contact")} style={{ cursor: 'pointer' }}>Liên hệ chuyên gia</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>&copy; 2026 THE ARCHIVIST. All rights reserved.</div>
          <div>POWERED BY THE ARCHIVIST AI MULTI-AGENT SYSTEM</div>
        </div>
      </footer>

      {/* FLOATING CHATBOT */}
      {token && (
        <div className={`chat-wrapper ${showChat ? 'active' : ''}`}>
          <div className="chat-window">
            <div className="chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="chat-bot-icon">
                  <i className="fas fa-robot"></i>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Trợ lý AI hệ thống The Archivist</div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>Online • Sẵn sàng hỗ trợ</div>
                </div>
              </div>
              <button className="chat-close" onClick={() => setShowChat(false)}>✕</button>
            </div>

            <div className="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`chat-bubble-container ${m.isUser ? 'user' : 'bot'}`}>
                  {!m.isUser && (
                    <div className="chat-avatar">
                      <i className="fas fa-robot"></i>
                    </div>
                  )}
                  <div className="chat-bubble">
                    {m.text}
                    {m.sources && m.sources.length > 0 && (
                      <div className="chat-sources">
                        <i className="fas fa-book"></i> Nguồn: {m.sources.join(', ')}
                      </div>
                    )}
                    {m.tokens && (
                      <div className="chat-tokens">-{m.tokens} token</div>
                    )}
                  </div>
                  {m.isUser && (
                    <div className="chat-avatar user-avt">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              ))}
              {chatLoading && (
                <div className="chat-bubble-container bot">
                  <div className="chat-avatar">
                    <i className="fas fa-robot"></i>
                  </div>
                  <div className="chat-bubble loading">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-area">
              <input
                type="text"
                placeholder="Hỏi AI về gốm sứ..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              />
              <button className="chat-send" onClick={sendChatMessage}>
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>

          <button className="chat-toggle" onClick={() => setShowChat(!showChat)}>
            {showChat ? <i className="fas fa-times"></i> : <i className="fas fa-comment-dots"></i>}
            {!showChat && <div className="chat-badge">New</div>}
          </button>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTS ---

function Navbar({ user, quota, setView, logout, view, notify }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const badgeRef = useRef(null);

  const navBtn = (v, label) => (
    <button
      onClick={() => setView(v)}
      className={`nav-link ${view === v ? 'active' : ''}`}
    >
      {label}
    </button>
  );

  const toggleDropdown = () => {
    if (!showDropdown && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 10, right: window.innerWidth - rect.right });
    }
    setShowDropdown(prev => !prev);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;
    const handler = () => setShowDropdown(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showDropdown]);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="nav-brand" onClick={() => { setView("debate"); window.location.hash = "debate"; window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ cursor: 'pointer' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '80px' }} />
        </div>

        <div className="nav-links">
          {navBtn("debate", "TRANG CHỦ")}
          {navBtn("lines", "DÒNG GỐM")}
          {navBtn("history", "LỊCH SỬ")}
          {navBtn("contact", "LIÊN HỆ")}
          {navBtn("about", "VỀ CHÚNG TÔI")}
        </div>

        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="quota-badge" style={{ cursor: 'default', display: 'flex', gap: '10px', alignItems: 'center' }}>
            {quota.token_balance > 0 && (
              <span style={{ color: 'var(--accent)' }}>Số dư: {quota.token_balance} lượt</span>
            )}
            {quota.free_used < quota.free_limit && (
              <span style={{ 
                color: 'var(--success)', 
                borderLeft: quota.token_balance > 0 ? '1px solid rgba(0,0,0,0.1)' : 'none', 
                paddingLeft: quota.token_balance > 0 ? '10px' : '0' 
              }}>
                Miễn phí: {quota.free_limit - quota.free_used} lượt
              </span>
            )}
            {quota.free_used >= quota.free_limit && quota.token_balance <= 0 && (
              <span style={{ color: 'var(--danger)' }}>Đã hết lượt</span>
            )}
          </div>

          <button
            className="btn-pay-highlight"
            onClick={() => setView("payment")}
            style={{
              padding: '10px 26px',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              borderRadius: '50px',
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
              color: '#0F265C',
              boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
          >
            <span style={{ fontSize: '1rem' }}>+</span> Nạp lượt
          </button>

          <div
            ref={badgeRef}
            className="user-badge"
            style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: '50px' }}
            onClick={(e) => { e.stopPropagation(); toggleDropdown(); }}
          >
            <div style={{
              width: '28px', height: '28px',
              borderRadius: '50%',
              background: user?.avatar
                ? `url(${user.avatar}) center/cover`
                : 'var(--primary)',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 900,
              flexShrink: 0
            }}>
              {!user?.avatar && user?.name?.charAt(0).toUpperCase()}
            </div>
            <b style={{ marginLeft: '5px' }}>{user?.name}</b>
            <span style={{ fontSize: '0.6rem', marginLeft: '5px', opacity: 0.5 }}>▼</span>
          </div>
        </div>
      </div>

      {/* DROPDOWN rendered via Portal at document.body to avoid stacking context issues */}
      {showDropdown && createPortal(
        <div
          className="card fade-in"
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            right: dropdownPos.right,
            zIndex: 9999,
            minWidth: '220px',
            padding: '10px 0',
            border: '1px solid var(--stroke)',
            boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
          }}
        >
          <div className="dropdown-item" onClick={() => { setView("profile"); setShowDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
            👤 Hồ sơ của tôi
          </div>
          <div className="dropdown-item" onClick={() => { setView("transaction_history"); setShowDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
            📜 Lịch sử giao dịch
          </div>
          <div className="dropdown-item" onClick={() => { setView("payment"); setShowDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
            💳 Nạp lượt phân tích
          </div>
          {user?.role === 'admin' && (
            <>
              <div style={{ height: '1px', background: 'var(--stroke)', margin: '8px 0' }}></div>
              <div className="dropdown-item" onClick={() => { setView("admin_dashboard"); setShowDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-shield-alt"></i> Khu vực Admin
              </div>
            </>
          )}
          <div style={{ height: '1px', background: 'var(--stroke)', margin: '8px 0' }}></div>
          <div className="dropdown-item" onClick={() => { logout(); setShowDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 800, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🚪 Đăng Xuất
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
}

function AuthScreen({ setToken, setUser, notify, subView, setSubView, resetEmail, setResetEmail }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", password_confirmation: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const sendSocialAuth = async (provider, token) => {
    setLoading(true);
    try {
      const res = await axios.post(API_BASE + "/login/social", { provider, token });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      notify(`Chào mừng ${res.data.user.name} đã gia nhập!`, "success");
    } catch (err) {
      notify(err.response?.data?.message || `Lỗi kết nối ${provider}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleGoogleSuccess = (res) => {
      sendSocialAuth('google', res.credential);
    };

    const initGoogle = () => {
      if (window.google && document.getElementById('google-button-container')) {
        window.google.accounts.id.initialize({
          client_id: "208231172368-34f26e0l7771ngcqa89j9ufj01gm6mtt.apps.googleusercontent.com",
          callback: handleGoogleSuccess
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-button-container'),
          { theme: "outline", size: "large", width: 220, text: "signin_with", shape: "rectangular" }
        );
      } else {
        setTimeout(initGoogle, 500);
      }
    };

    initGoogle();
  }, [subView]);

  if (subView === "forgot") return <ForgotPasswordScreen setSubView={setSubView} notify={notify} setResetEmail={setResetEmail} />;
  if (subView === "reset") return <ResetPasswordScreen setSubView={setSubView} notify={notify} email={resetEmail} />;

  const isLogin = subView === "login";

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
      notify(`Chào mừng ${res.data.user.name} quay trở lại!`, "success");
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi xác thực hệ thống");
    }
    setLoading(false);
  };

  const handleSocialLogin = (provider) => {
    if (provider === "Facebook") {
      if (window.FB) {
        window.FB.login((res) => {
          if (res.authResponse) {
            sendSocialAuth('facebook', res.authResponse.accessToken);
          } else notify("Đã hủy đăng nhập Facebook", "info");
        }, { scope: 'public_profile,email' });
      } else notify("Đang tải thư viện Facebook...", "info");
    }
  };

  return (
    <div className="auth-container card fade-in">
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <img src="/logo.png" alt="Logo" style={{ height: '50px', marginBottom: '32px' }} />
        <h2 className="display-title" style={{ fontSize: '1.6rem', color: '#222222' }}>{isLogin ? "Chào mừng trở lại" : "Gia nhập hệ thống"}</h2>
        <p className="subtitle" style={{ marginBottom: 0 }}>{isLogin ? "Đăng nhập để sử dụng hệ thống." : "Đăng ký tài khoản mới ngay."}</p>
      </div>

      {error && <div style={{ background: 'var(--danger)', color: 'white', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="input-group">
            <label className="input-label">TÊN NGHỆ NHÂN</label>
            <input className="input-field" placeholder="Họ và tên..." required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
        )}
        <div className="input-group">
          <label className="input-label">EMAIL</label>
          <input className="input-field" type="email" placeholder="email@example.com" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label className="input-label">MẬT KHẨU</label>
            {isLogin && <span onClick={() => setSubView("forgot")} style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--secondary)', cursor: 'pointer' }}>Quên mật khẩu?</span>}
          </div>
          <div style={{ position: 'relative' }}>
            <input className="input-field" type={showPass ? "text" : "password"} placeholder="••••••••" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <span onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6, fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
              {showPass ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </span>
          </div>
        </div>
        {!isLogin && (
          <div className="input-group">
            <label className="input-label">XÁC NHẬN LẠI</label>
            <input className="input-field" type="password" placeholder="••••••••" required value={form.password_confirmation} onChange={e => setForm({ ...form, password_confirmation: e.target.value })} />
          </div>
        )}
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '10px', height: '52px' }}>
          {loading ? "Đang xử lý..." : (isLogin ? "Tiếp tục" : "Đăng ký ngay")}
        </button>
      </form>

      <div className="auth-divider">HOẶC KẾT NỐI QUA</div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', justifyContent: 'center', alignItems: 'center' }}>
        <div id="google-button-container" style={{ flex: 1, display: 'flex', justifyContent: 'center', height: '40px' }}></div>
        <button
          type="button"
          style={{
            flex: 1,
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '0 12px',
            background: 'white',
            border: '1px solid #dadce0',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: '"Roboto", arial, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
            color: '#3c4043',
            boxSizing: 'border-box'
          }}
          onClick={() => handleSocialLogin('Facebook')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
          Facebook
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {isLogin ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
        <span style={{ color: 'var(--primary-dark)', fontWeight: 800, cursor: 'pointer' }} onClick={() => setSubView(isLogin ? "register" : "login")}>
          {isLogin ? "Đăng ký ngay" : "Đăng nhập ngay"}
        </span>
      </p>

      <div style={{ marginTop: '48px', textAlign: 'center', fontSize: '0.65rem', color: '#888888', lineHeight: 1.6 }}>
        Bằng việc tiếp tục, bạn đồng ý với <b>Điều khoản Dịch vụ</b> và <b>Chính sách Bảo mật</b> của chúng tôi.
      </div>
    </div>
  );
}

function ForgotPasswordScreen({ setSubView, notify, setResetEmail }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await axios.post(API_BASE + "/forgot-password", { email });
      notify("Mã phục hồi đã được gửi về email của bạn.", "success");
      setResetEmail(email);
      setSubView("reset");
    } catch (err) {
      notify(err.response?.data?.message || "Lỗi gửi yêu cầu phục hồi", "error");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container card fade-in">
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <img src="/logo.png" alt="Logo" style={{ height: '50px', marginBottom: '32px' }} />
        <h2 className="display-title" style={{ fontSize: '1.6rem', color: '#222222', textTransform: 'uppercase' }}>Quên mật khẩu</h2>
        <p className="subtitle">Nhập email của bạn và chúng tôi sẽ gửi mã khôi phục tài khoản.</p>
      </div>

      <form onSubmit={handleReset}>
        <div className="input-group">
          <label className="input-label">EMAIL</label>
          <input className="input-field" type="email" placeholder="Nhập email liên lạc..." required value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '10px', height: '52px' }}>
          {loading ? "Đang xử lý..." : "Gửi Yêu Cầu"}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '32px' }}>
        Quay lại
        <span style={{ color: 'var(--primary-dark)', fontWeight: 800, cursor: 'pointer', marginLeft: '5px' }} onClick={() => setSubView("login")}>
          Đăng nhập
        </span>
      </p>
    </div>
  );
}

function ResetPasswordScreen({ setSubView, notify, email }) {
  const [form, setForm] = useState({ code: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(API_BASE + "/reset-password", { ...form, email });
      notify("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.", "success");
      setSubView("login");
    } catch (err) {
      notify(err.response?.data?.message || "Mã xác nhận không chính xác", "error");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container card fade-in">
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <img src="/logo.png" alt="Logo" style={{ height: '50px', marginBottom: '32px' }} />
        <h2 className="display-title" style={{ fontSize: '1.6rem', color: '#222222', textTransform: 'uppercase' }}>Đặt lại mật khẩu</h2>
        <p className="subtitle">Nhập mã xác nhận đã được gửi tới email <b>{email}</b></p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label">MÃ XÁC NHẬN</label>
          <input className="input-field" placeholder="Nhập mã 6 số..." required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
        </div>
        <div className="input-group">
          <label className="input-label">MẬT KHẨU MỚI</label>
          <input className="input-field" type="password" placeholder="••••••••" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '10px', height: '52px' }}>
          {loading ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '32px' }}>
        Hủy bỏ và quay lại
        <span style={{ color: 'var(--primary-dark)', fontWeight: 800, cursor: 'pointer', marginLeft: '5px' }} onClick={() => setSubView("login")}>
          Đăng nhập
        </span>
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
  const [featuredLines, setFeaturedLines] = useState([]);
  const [selectedLine, setSelectedLine] = useState(null);

  useEffect(() => {
    axios.get(API_BASE + "/ceramic-lines?featured=1")
      .then(res => setFeaturedLines(res.data.data || []))
      .catch(err => console.error(err));
  }, []);

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
      notify("Hết lượt giám định. Vui lòng nạp thêm!", "error");
      setView("payment");
      return;
    }
    if (!file) {
      setError("Vui lòng tải ảnh cổ vật lên trước khi giám định!");
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
      setError(err.response?.data?.message || "Lỗi kết nối máy chủ AI");
    } finally {
      setLoading(false);
    }
  };

  if (result) return (
    <div className="fade-in">
      <ResultDashboard
        result={result}
        token={token}
        user={user}
        preview={preview}
        resetPreview={() => { setResult(null); setPreview(null); setFile(null); setError(""); }}
      />
    </div>
  );

  return (
    <div className="home-layout fade-in" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 100px' }}>
      {/* --- PREMIUM HERO SECTION --- */}
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '80px 0', gap: '60px', minHeight: '600px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '2.5px', marginBottom: '24px' }}>HỆ THỐNG GIÁM ĐỊNH TOÀN CẦU</div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '4.2rem', fontWeight: 900, color: 'var(--primary-dark)', lineHeight: 1.1, marginBottom: '24px' }}>
            Vẻ đẹp của <br /><i style={{ color: 'var(--primary)', fontWeight: 400 }}>Tinh hoa Gốm</i>
          </h1>
          <p style={{ maxWidth: '520px', fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: '40px', opacity: 0.9 }}>
            Khám phá những nét hoa văn tinh xảo và linh hồn văn hóa của gốm sứ Việt Nam.
            Cơ sở dữ liệu lưu trữ của chúng tôi sử dụng công nghệ nhận dạng chính xác tích hợp AI đa đại lý để xác thực mọi hiện vật.
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn btn-primary" onClick={() => document.getElementById("hero-upload").scrollIntoView({ behavior: 'smooth' })} style={{ padding: '16px 36px', borderRadius: '50px', boxShadow: '0 10px 20px rgba(15,38,92,0.2)' }}>Bắt đầu khám phá →</button>
            <button className="btn btn-outline" onClick={() => setView("lines")} style={{ padding: '16px 36px', borderRadius: '50px' }}>Thư viện dòng gốm</button>
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '90%', maxWidth: '500px', height: '600px', borderRadius: '40px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.15)', position: 'relative', background: 'white' }}>
            <img
              src="https://i.pinimg.com/1200x/ca/57/35/ca5735c6a579334d55e7ad3711640a6e.jpg"
              alt="Pottery Masterpiece"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          {/* Decorative shapes */}
          <div style={{ position: 'absolute', top: '-40px', right: '-20px', width: '150px', height: '150px', background: 'var(--accent)', opacity: 0.1, borderRadius: '50%', zIndex: -1 }}></div>
          <div style={{ position: 'absolute', bottom: '-20px', left: '0', width: '200px', height: '200px', background: 'var(--primary)', opacity: 0.05, borderRadius: '50%', zIndex: -1 }}></div>
        </div>
      </section>

      {/* --- IDENTIFICATION SECTION --- */}
      <section id="hero-upload" style={{ padding: '100px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: '16px' }}>Giám định Hiện vật của Bạn</h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', opacity: 0.7 }}>Công cụ nhận dạng dựa trên thị giác máy tính của chúng tôi so khớp hiện vật của bạn với hàng ngàn hồ sơ lịch sử.</p>
        </div>

        <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '60px', borderRadius: '40px', border: 'none', background: 'white', boxShadow: '0 30px 80px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="upload-area" onClick={() => document.getElementById("fileInput").click()} style={{ width: '100%', height: preview ? 'auto' : '420px', minHeight: '320px', maxHeight: '640px', borderRadius: '32px', border: preview ? '3px solid var(--accent)' : '2px dashed var(--stroke)', background: preview ? 'linear-gradient(145deg, #f8f6f3 0%, #eae6df 100%)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', marginBottom: '40px', transition: 'all 0.4s ease', boxShadow: preview ? '0 20px 60px rgba(0,0,0,0.08)' : 'none' }}>
              {preview ? <img src={preview} alt="preview" style={{ width: '100%', maxHeight: '600px', objectFit: 'contain', padding: '16px' }} /> : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '20px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>🏺</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Tải ảnh hiện vật lên</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Nhấn vào đây hoặc kéo thả ảnh</div>
                </div>
              )}
              <input id="fileInput" type="file" hidden onChange={onFileChange} accept="image/*" />
            </div>

            {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '24px', fontWeight: 800, background: '#FEF2F2', padding: '12px 24px', borderRadius: '50px' }}>⚠️ {error}</div>}

            <button className="btn btn-primary" onClick={analyze} disabled={loading} style={{ padding: '18px 80px', fontSize: '1.1rem', borderRadius: '60px', width: 'auto' }}>
              {loading ? "Các chuyên gia đang tranh biện..." : "PHÂN TÍCH HIỆN VẬT NGAY"}
            </button>
          </div>
        </div>
      </section>

      {/* --- FEATURED CERAMIC LINES --- */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '1px' }}>Dòng gốm trứ danh</h3>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setView("lines")}>XEM TẤT CẢ →</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
          {featuredLines.length > 0 ? featuredLines.slice(0, 3).map((line, i) => (
            <div
              key={i}
              className="card"
              onClick={() => setSelectedLine(line)}
              style={{ display: 'flex', gap: '20px', alignItems: 'center', cursor: 'pointer', padding: '20px', transition: '0.3s', border: '1px solid var(--stroke)', boxShadow: 'none' }}
            >
              <div style={{ width: '100px', height: '100px', flexShrink: 0, borderRadius: '16px', overflow: 'hidden', background: 'var(--input-bg)' }}>
                <img src={line.image_url || 'https://via.placeholder.com/120'} alt={line.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.55rem', fontWeight: 900, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '4px' }}>{line.era}</div>
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '6px' }}>{line.name}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>{line.description}</p>
              </div>
            </div>
          )) : <div style={{ opacity: 0.5 }}>Đang tải dữ liệu tinh hoa...</div>}
        </div>
      </section>

      {selectedLine && (
        <CeramicDetailModal line={selectedLine} onClose={() => setSelectedLine(null)} />
      )}
    </div>
  );
}

function CeramicLinesScreen() {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLine, setSelectedLine] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios.get(API_BASE + "/ceramic-lines?featured=1")
      .then(res => setLines(res.data.data || []))
      .catch(err => console.error("Error fetching lines:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredLines = lines.filter(l =>
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.era?.toLowerCase().includes(search.toLowerCase()) ||
    l.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="fade-in" style={{ marginTop: '40px', paddingBottom: '100px', maxWidth: '1200px', margin: '40px auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 className="display-title">Dòng Gốm Trứ Danh</h2>
          <p className="subtitle">Bách khoa toàn thư các dòng gốm cổ truyền</p>

          <div style={{ maxWidth: '600px', margin: '32px auto 0', position: 'relative' }}>
            <input
              type="text"
              placeholder="Tìm kiếm tên dòng gốm, niên đại, đặc điểm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '16px 24px 16px 50px', borderRadius: '50px', border: '1px solid var(--stroke)', background: 'white', fontSize: '0.9rem', outline: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
            />
            <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', opacity: 0.5 }}>Đang tải dữ liệu đa đại lý...</div>
        ) : (
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '32px' }}>
            {filteredLines.map((line, i) => (
              <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', height: '100%' }}>
                {line.image_url ? (
                  <img src={line.image_url} alt={line.name} style={{ width: '100%', height: '240px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '240px', background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🏺</div>
                )}
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{line.era || 'Cổ đại'}</div>
                  <h3 className="section-title" style={{ marginBottom: '12px', fontSize: '1.4rem', fontFamily: 'var(--font-heading)' }}>{line.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                    {line.description || 'Đang cập nhật dữ liệu kiến thức...'}
                  </p>
                  <button
                    className="btn btn-outline"
                    onClick={() => setSelectedLine(line)}
                    style={{ marginTop: '24px', width: '100%', fontSize: '0.75rem', fontWeight: 800, height: '44px', textTransform: 'uppercase' }}
                  >
                    Tìm hiểu thêm
                  </button>
                </div>
              </div>
            ))}
            {!loading && filteredLines.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', opacity: 0.5 }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>Empty</div>
                <p>Không tìm thấy kết quả phù hợp cho "{search}"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedLine && (
        <CeramicDetailModal line={selectedLine} onClose={() => setSelectedLine(null)} />
      )}
    </>
  );
}

function CeramicDetailModal({ line, onClose }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }} onClick={onClose}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '100%', overflowY: 'auto', position: 'relative', padding: 0, border: 'none', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>✕</button>

        <div style={{ height: '400px', width: '100%', position: 'relative' }}>
          <img src={line.image_url || 'https://via.placeholder.com/800x400'} alt={line.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '48px 40px 40px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', color: 'white' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '2px' }}>{line.era}</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.8rem', fontWeight: 900, marginBottom: '4px', lineHeight: 1.1 }}>{line.name}</h2>
            <p style={{ fontSize: '1.1rem', opacity: 0.8, fontWeight: 500 }}>{line.origin} • {line.country}</p>
          </div>
        </div>

        <div style={{ padding: '40px 50px 60px' }}>
          <div style={{ marginBottom: '40px' }}>
            <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '18px', letterSpacing: '1.5px' }}>Đặc điểm cốt yếu</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {line.style ? line.style.split(',').map((s, i) => (
                <span key={i} style={{ padding: '10px 20px', background: 'var(--input-bg)', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)', border: '1px solid var(--stroke)' }}>{s.trim()}</span>
              )) : <span style={{ color: 'var(--text-muted)' }}>Đang cập nhật...</span>}
            </div>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '18px', letterSpacing: '1.5px' }}>Mô tả chi tiết</h4>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.9, color: 'var(--text-main)', textAlign: 'justify', opacity: 0.9 }}>
              {line.description}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <button className="btn btn-primary" onClick={onClose} style={{ padding: '16px 60px', borderRadius: '50px', fontSize: '1rem', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>Đóng</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}


function ResultDashboard({ result, isModal, token, user, preview, resetPreview }) {
  if (!result || !result.final_report) return <div className="card text-center">Đang tải kết quả...</div>;
  const final = result.final_report;
  const agents = result.agent_predictions || [];

  return (
    <div className="fade-in" style={{ width: '100%', maxWidth: '940px', margin: '40px auto' }}>
      {/* FINAL REPORT HERO */}
      <div className="card" style={{ background: 'var(--primary-dark)', color: 'white', marginBottom: '32px', padding: '40px', border: 'none', borderRadius: '32px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', alignItems: 'center' }}>
          {preview && (
            <div style={{ width: '100%', maxWidth: '380px', minHeight: '350px', maxHeight: '500px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', background: 'linear-gradient(145deg, #f8f6f3 0%, #eae6df 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.15)' }}>
              <img src={preview} alt="pottery preview" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px' }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: '300px', textAlign: preview ? 'left' : 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent)', color: 'var(--primary-dark)', padding: '6px 16px', borderRadius: '50px', fontWeight: 900, fontSize: '0.7rem', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <span style={{ fontSize: '1rem' }}>🎯</span> ĐỘ TIN CẬY: {final.certainty}%
            </div>

            {!isModal && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.4rem', fontWeight: 900, marginBottom: '4px', textTransform: 'uppercase', lineHeight: 1.2 }}>{final.final_prediction}</h2>
                <p style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '2px' }}>{final.final_country} • {final.final_era}</p>
              </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '28px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
              <div style={{ color: 'var(--accent)', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>Tóm lược giám định:</div>
              <p style={{ fontSize: '1.1rem', fontStyle: 'italic', opacity: 0.9, lineHeight: 1.7, color: '#F8F9FA', fontWeight: 300 }}>"{final.reasoning}"</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--stroke)', opacity: 0.5 }}></div>
        <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>Phân tích chi tiết từ hội đồng AI</h3>
        <div style={{ flex: 1, height: '1px', background: 'var(--stroke)', opacity: 0.5 }}></div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {agents.map((a, i) => (
          <div key={i} className="card" style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none', transition: '0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', background: 'var(--input-bg)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🤖</div>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)' }}>{a.agent_name}</h4>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>EXPERT AGENT</div>
                </div>
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 900, background: 'var(--input-bg)', padding: '6px 12px', borderRadius: '10px', color: 'var(--primary-dark)' }}>{a.prediction?.ceramic_line || 'Unknown'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {a.debate_details?.attacks?.map((atk, j) => (
                <div key={j} style={{ background: '#FEF2F2', padding: '14px', borderRadius: '12px', fontSize: '0.85rem', color: '#991B1B', fontWeight: 500, lineHeight: 1.5, border: '1px solid #FEE2E2' }}>
                  <span style={{ fontWeight: 900, marginRight: '4px' }}>⚔️</span> {atk}
                </div>
              ))}
              <div style={{ background: '#F0FDF4', padding: '14px', borderRadius: '12px', fontSize: '0.85rem', color: '#166534', fontWeight: 500, lineHeight: 1.5, border: '1px solid #DCFCE7' }}>
                <span style={{ fontWeight: 900, marginRight: '4px' }}>🛡️</span> {a.debate_details?.defense}
              </div>
            </div>
          </div>
        ))}
      </div>

      {resetPreview && (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <button className="btn btn-primary" onClick={resetPreview} style={{ padding: '16px 40px', borderRadius: '50px', fontSize: '1.1rem', boxShadow: '0 10px 20px rgba(15,38,92,0.2)' }}>
            <span style={{ marginRight: '8px' }}>🏺</span> GIÁM ĐỊNH HIỆN VẬT KHÁC
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryScreen({ token, setSelectedHistory }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios.get(API_BASE + "/history", { headers: { Authorization: "Bearer " + token } })
      .then(res => setHistory(res.data.data)).finally(() => setLoading(false));
  }, [token]);

  const filteredHistory = history.filter(h =>
    h.prediction?.toLowerCase().includes(search.toLowerCase()) ||
    h.country?.toLowerCase().includes(search.toLowerCase()) ||
    h.era?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in" style={{ marginTop: '40px', maxWidth: '1200px', margin: '40px auto' }}>
      <div className="text-center" style={{ marginBottom: '48px' }}>
        <h2 className="display-title">Nhật ký Giám định</h2>
        <p className="subtitle">Lưu trữ các biên bản phân tích Multi-Agent</p>

        <div style={{ maxWidth: '600px', margin: '32px auto 0', position: 'relative' }}>
          <input
            type="text"
            placeholder="Tìm kiếm kết quả giám định, quốc gia, niên đại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '16px 24px 16px 50px', borderRadius: '50px', border: '1px solid var(--stroke)', background: 'white', fontSize: '0.9rem', outline: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
          />
          <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', opacity: 0.5 }}>Đang tải dữ liệu...</div> : (
        <div className="history-grid">
          {filteredHistory.map((h, i) => (
            <div key={i} className="history-card" onClick={() => setSelectedHistory(h)}>
              <img src={h.image_url} alt="pottery" className="history-img" />
              <div className="history-info">
                <h4 className="history-title">{h.prediction}</h4>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h.country} • {h.era}</p>
              </div>
            </div>
          ))}
          {!loading && filteredHistory.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', opacity: 0.5 }}>
              <p>Không tìm thấy lịch sử phù hợp cho "{search}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryDetailModal({ item, onClose, token }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }} onClick={onClose}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: '1000px', maxHeight: '100%', overflowY: 'auto', position: 'relative', padding: 0, border: 'none', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>✕</button>

        <div style={{ height: '400px', width: '100%', position: 'relative' }}>
          <img src={item.image_url} alt={item.prediction} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '48px 40px 40px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', color: 'white' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '2px' }}>Biên bản giám định số #{item.id}</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.8rem', fontWeight: 900, marginBottom: '4px', lineHeight: 1.1 }}>{item.prediction}</h2>
            <p style={{ fontSize: '1.1rem', opacity: 0.8, fontWeight: 500 }}>{item.country} • {item.era}</p>
          </div>
        </div>

        <div style={{ padding: '40px 50px 60px' }}>
          <ResultDashboard result={item.data} isModal={true} />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '48px' }}>
            <button className="btn btn-primary" onClick={onClose} style={{ padding: '16px 60px', borderRadius: '50px', fontSize: '1rem', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>Đóng</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AIChatbox({ token, user }) {
  const [messages, setMessages] = useState([{ text: `Xin chào ${user?.name || 'nghệ nhân'}.\nTôi là Trợ lý AI chuyên môn về gốm sứ. Bạn cần hỗ trợ gì?`, isUser: false }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setMessages(prev => [...prev, { text: userText, isUser: true }]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(API_BASE + "/ai/chat", { question: userText }, { headers: { Authorization: "Bearer " + token } });
      setMessages(prev => [...prev, { text: res.data.answer, isUser: false }]);
    } catch (err) {
      setMessages(prev => [...prev, { text: "Xin lỗi, tôi gặp sự cố kết nối máy chủ.", isUser: false }]);
    }
    setLoading(false);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <span style={{ fontSize: '0.9rem' }}>Trợ lý Chuyên gia AI</span>
        <button onClick={() => setMessages([messages[0]])} className="btn-outline" style={{ padding: '4px 12px', background: 'transparent', color: 'white', borderColor: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', fontWeight: 800 }}>LÀM MỚI</button>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.isUser ? 'user' : 'bot'}`}>
            <div className={`avatar ${m.isUser ? 'user' : 'bot'}`}>{m.isUser ? (user?.name?.charAt(0) || 'U') : '🏺'}</div>
            <div className="message-bubble">
              <p style={{ whiteSpace: 'pre-wrap' }}>{m.text}</p>
            </div>
          </div>
        ))}
        {loading && <div className="message bot"><div className="avatar bot">🏺</div><div className="message-bubble">Đang phân tích...</div></div>}
      </div>
      <div className="chat-input-area">
        <input className="chat-input" placeholder="Đặt câu hỏi về gốm sứ..." value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} disabled={loading} />
        <button className="chat-send" onClick={sendMessage} disabled={loading || !input.trim()}>➜</button>
      </div>
    </div>
  );
}

function ProfileScreen({ user, token, notify, fetchUser }) {
  const STORAGE_BASE = API_BASE.replace('/api', '');
  const [activeTab, setActiveTab] = useState("info"); // info, update, password
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });
  const [passForm, setPassForm] = useState({ old_password: "", password: "", password_confirmation: "" });
  const [loading, setLoading] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, label: '', color: '', bars: 0 };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 2) return { level: 1, label: 'Yếu', color: '#EF4444', bars: 1 };
    if (score <= 3) return { level: 2, label: 'Trung bình', color: '#F59E0B', bars: 2 };
    if (score <= 4) return { level: 3, label: 'Mạnh', color: '#10B981', bars: 3 };
    return { level: 4, label: 'Rất mạnh', color: '#059669', bars: 4 };
  };

  const passwordStrength = getPasswordStrength(passForm.password);
  const passwordsMatch = passForm.password && passForm.password_confirmation && passForm.password === passForm.password_confirmation;
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (user?.avatar) {
      if (user.avatar.startsWith('http')) return user.avatar;
      return STORAGE_BASE + user.avatar;
    }
    return null;
  };

  const onAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('phone', form.phone);

      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const res = await axios.post(API_BASE + "/profile/update", formData, {
        headers: {
          Authorization: "Bearer " + token,
          'Content-Type': 'multipart/form-data'
        }
      });

      setAvatarFile(null);
      setAvatarPreview(null);
      await fetchUser(); // Now this should work as we added the route

      notify("Cập nhật hồ sơ thành công!", "success");
      setActiveTab("info");
    } catch (err) {
      notify(err.response?.data?.message || "Lỗi cập nhật thông tin", "error");
    } finally { setLoading(false); }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(API_BASE + "/profile/password", passForm, { headers: { Authorization: "Bearer " + token } });
      notify("Đổi mật khẩu thành công!", "success");
      setPassForm({ old_password: "", password: "", password_confirmation: "" });
      setActiveTab("info");
    } catch (err) {
      notify(err.response?.data?.message || "Lỗi đổi mật khẩu", "error");
    } finally { setLoading(false); }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1000px', margin: '60px auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px' }}>

        {/* Sidebar Mini */}
        <div style={{ flex: '0 0 280px' }}>
          <div className="card" style={{ padding: '32px', textAlign: 'center', position: 'sticky', top: '100px' }}>
            <div
              style={{
                width: '120px', height: '120px',
                background: getAvatarUrl() ? `url(${getAvatarUrl()}) center/cover` : 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
                color: 'white', borderRadius: '40px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '3rem', fontWeight: 900, margin: '0 auto 16px',
                boxShadow: '0 20px 40px rgba(15,38,92,0.2)',
                overflow: 'hidden', position: 'relative'
              }}
            >
              {!getAvatarUrl() && user?.name?.charAt(0).toUpperCase()}
            </div>
            <input type="file" id="avatarInput" hidden accept="image/*" onChange={onAvatarChange} />
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: '4px' }}>{user?.name}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px', fontWeight: 600 }}>Thành viên Hệ thống</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'info', label: 'Hồ sơ cá nhân', icon: '👤' },
                { id: 'update', label: 'Cập nhật thông tin', icon: '📝' },
                { id: 'password', label: 'Bảo mật tài khoản', icon: '🛡️' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderRadius: '16px', border: 'none',
                    background: activeTab === tab.id ? 'var(--primary-dark)' : 'transparent',
                    color: activeTab === tab.id ? 'white' : 'var(--text-main)',
                    fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: '0.3s', textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, minWidth: '400px' }}>
          {activeTab === "info" && (
            <div className="fade-in">
              <div className="card" style={{ padding: '48px', marginBottom: '32px' }}>
                <div style={{ marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: '8px' }}>Hồ sơ Tổng quan</h2>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>Thông tin định danh và trạng thái tài khoản của bạn trên hệ thống.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '48px' }}>
                  <div style={{ padding: '32px', background: 'var(--input-bg)', borderRadius: '24px', border: '1px solid var(--stroke)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Số dư tín dụng</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary-dark)' }}>{user?.token_balance}</span>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', opacity: 0.7 }}>TOKEN</span>
                    </div>
                  </div>
                  <div style={{ padding: '32px', background: 'var(--input-bg)', borderRadius: '24px', border: '1px solid var(--stroke)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Ngày gia nhập</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary-dark)' }}>{new Date(user?.created_at).toLocaleDateString('vi-VN')}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 800, marginTop: '8px' }}>✓ Đã xác thực</div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--stroke)', paddingTop: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Email liên hệ</span>
                    <span style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>{user?.email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Số điện thoại</span>
                    <span style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>{user?.phone || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "update" && (
            <div className="card fade-in" style={{ padding: '48px' }}>
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: '8px' }}>Cập nhật Hồ sơ</h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>Thay đổi thông tin liên lạc và ảnh đại diện.</p>
              </div>

              <form onSubmit={updateProfile}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px', padding: '24px', background: 'var(--input-bg)', borderRadius: '24px', border: '1px solid var(--stroke)' }}>
                  <div
                    onClick={() => document.getElementById('avatarInput').click()}
                    style={{
                      width: '80px', height: '80px',
                      background: getAvatarUrl() ? `url(${getAvatarUrl()}) center/cover` : 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
                      color: 'white', borderRadius: '24px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '2rem', fontWeight: 900,
                      cursor: 'pointer', overflow: 'hidden', position: 'relative'
                    }}
                  >
                    {!getAvatarUrl() && user?.name?.charAt(0).toUpperCase()}
                    <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.4)', color: 'white', fontSize: '0.5rem', padding: '2px 0', fontWeight: 800, textAlign: 'center' }}>SỬA</div>
                  </div>
                  <input type="file" id="avatarInput" hidden accept="image/*" onChange={onAvatarChange} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Ảnh đại diện</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nhấn vào hình vuông để thay đổi ảnh</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.7rem' }}>HỌ VÀ TÊN</label>
                    <input className="input-field" style={{ height: '56px', borderRadius: '16px' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.7rem' }}>SỐ ĐIỆN THOẠI</label>
                    <input className="input-field" style={{ height: '56px', borderRadius: '16px' }} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="VD: 0912345678" />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.7rem' }}>ĐỊA CHỈ EMAIL</label>
                  <input className="input-field" style={{ height: '56px', borderRadius: '16px' }} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', height: '60px', borderRadius: '50px', fontSize: '1rem', fontWeight: 800, marginTop: '16px' }}>
                  {loading ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "password" && (
            <div className="card fade-in" style={{ padding: '48px' }}>
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: '8px' }}>Bảo mật & Mật khẩu</h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>Khuyến nghị đổi mật khẩu định kỳ để bảo vệ tài sản số của bạn.</p>
              </div>

              <form onSubmit={updatePassword}>
                {/* Mật khẩu hiện tại */}
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.7rem' }}>MẬT KHẨU HIỆN TẠI</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input-field" style={{ height: '56px', borderRadius: '16px', paddingRight: '50px' }} type={showCurrentPass ? 'text' : 'password'} value={passForm.old_password} onChange={e => setPassForm({ ...passForm, old_password: e.target.value })} placeholder="Nhập mật khẩu hiện tại" required />
                    <span onClick={() => setShowCurrentPass(!showCurrentPass)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6, fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
                      {showCurrentPass ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      )}
                    </span>
                  </div>
                </div>

                {/* Mật khẩu mới */}
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.7rem' }}>MẬT KHẨU MỚI</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input-field" style={{ height: '56px', borderRadius: '16px', paddingRight: '50px' }} type={showNewPass ? 'text' : 'password'} value={passForm.password} onChange={e => setPassForm({ ...passForm, password: e.target.value })} placeholder="Tối thiểu 8 ký tự" required />
                    <span onClick={() => setShowNewPass(!showNewPass)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6, fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
                      {showNewPass ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      )}
                    </span>
                  </div>
                  {/* Password Strength Meter */}
                  {passForm.password && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '4px', background: i <= passwordStrength.bars ? passwordStrength.color : '#E5E7EB', transition: 'all 0.3s ease' }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: passwordStrength.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {passwordStrength.level <= 1 ? '⚠️' : passwordStrength.level <= 2 ? 'ℹ️' : '✅'} {passwordStrength.label}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Xác nhận mật khẩu */}
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.7rem' }}>XÁC NHẬN MẬT KHẨU MỚI</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input-field" style={{ height: '56px', borderRadius: '16px', paddingRight: '50px', borderColor: passForm.password_confirmation ? (passwordsMatch ? '#10B981' : '#EF4444') : undefined }} type={showConfirmPass ? 'text' : 'password'} value={passForm.password_confirmation} onChange={e => setPassForm({ ...passForm, password_confirmation: e.target.value })} placeholder="Nhập lại mật khẩu mới" required />
                    <span onClick={() => setShowConfirmPass(!showConfirmPass)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6, fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
                      {showConfirmPass ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      )}
                    </span>
                  </div>
                  {/* Match indicator */}
                  {passForm.password_confirmation && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8rem' }}>{passwordsMatch ? '✅' : '❌'}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: passwordsMatch ? '#10B981' : '#EF4444' }}>
                        {passwordsMatch ? 'Mật khẩu khớp' : 'Mật khẩu không khớp'}
                      </span>
                    </div>
                  )}
                </div>

                <button className="btn btn-primary" type="submit" disabled={loading || (passForm.password_confirmation && !passwordsMatch)} style={{ width: '100%', height: '60px', borderRadius: '50px', fontSize: '1rem', fontWeight: 800, marginTop: '24px', opacity: (passForm.password_confirmation && !passwordsMatch) ? 0.5 : 1 }}>
                  {loading ? "Đang xử lý..." : "🔒 Cập nhật mật khẩu"}
                </button>
              </form>

              {/* Security Tips */}
              <div style={{ marginTop: '32px', padding: '28px', background: 'linear-gradient(135deg, #FFF8F0 0%, #FEF3E2 100%)', borderRadius: '20px', border: '1px solid #F5E6D0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', background: '#FDE68A', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>💡</div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)', margin: 0 }}>Gợi ý bảo mật</h4>
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <li style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>Sử dụng tổ hợp <strong>chữ hoa, chữ thường, số</strong> và <strong>ký hiệu đặc biệt</strong> (!@#$%)</li>
                  <li style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>Mật khẩu nên dài tối thiểu <strong>8 ký tự</strong>, khuyến nghị từ <strong>12 ký tự</strong> trở lên</li>
                  <li style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>Tránh dùng thông tin cá nhân như ngày sinh, số điện thoại hoặc tên đăng nhập</li>
                  <li style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>Không nên dùng chung mật khẩu với các trang web khác</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionHistoryScreen({ token, notify }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(API_BASE + "/payment/history", { headers: { Authorization: "Bearer " + token } })
      .then(res => setHistory(res.data.data))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="fade-in" style={{ maxWidth: '900px', margin: '40px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h2 className="display-title">Lịch sử Giao dịch</h2>
        <p className="subtitle">Quản lý các khoản nạp lượt phân tích của bạn</p>
      </div>

      {loading ? <div style={{ textAlign: 'center', opacity: 0.5 }}>Đang tải dữ liệu...</div> : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--primary-dark)', color: 'white' }}>
              <tr>
                <th style={{ padding: '18px 20px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Mã GD</th>
                <th style={{ padding: '18px 20px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Gói nạp</th>
                <th style={{ padding: '18px 20px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Số tiền</th>
                <th style={{ padding: '18px 20px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Trạng thái</th>
                <th style={{ padding: '18px 20px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {history.map((tx, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--stroke)', background: i % 2 === 0 ? 'white' : '#F9FBFF' }}>
                  <td style={{ padding: '20px', fontWeight: 800, fontSize: '0.8rem', color: 'var(--primary-dark)' }}>#{tx.hex_id || tx.id}</td>
                  <td style={{ padding: '20px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>{tx.package_name || 'Nạp lượt'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>+{tx.credit_amount} lượt phân tích</div>
                  </td>
                  <td style={{ padding: '20px', fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary-dark)' }}>
                    {new Intl.NumberFormat('vi-VN').format(tx.amount_vnd || tx.amount || 0)}₫
                  </td>
                  <td style={{ padding: '20px' }}>
                    <span style={{
                      background: tx.status === 'completed' ? '#ECFDF5' : '#FFF7ED',
                      color: tx.status === 'completed' ? '#065F46' : '#C2410C',
                      padding: '6px 16px',
                      borderRadius: '50px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}></span>
                      {tx.status === 'completed' ? 'THÀNH CÔNG' : 'ĐANG CHỜ'}
                    </span>
                  </td>
                  <td style={{ padding: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(tx.created_at).toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '100px', textAlign: 'center', opacity: 0.5 }}>Chưa có lịch sử giao dịch nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TermsScreen() {
  return (
    <div className="fade-in" style={{ maxWidth: '900px', margin: '40px auto', padding: '0 24px 100px' }}>
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <h2 className="display-title">Điều khoản sử dụng</h2>
        <p className="subtitle">Vui lòng đọc kỹ các điều khoản trước khi sử dụng hệ thống The Archivist</p>
      </div>

      <div className="card" style={{ padding: '48px', borderRadius: '32px', border: 'none', boxShadow: '0 30px 80px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '16px' }}>1. Quyết định giám định của AI</h3>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '32px' }}>
          Tuy hệ thống sử dụng thuật toán trí tuệ nhân tạo (AI) học sâu đa đại lý với nguồn dữ liệu khổng lồ, mọi thông tin giám định do hệ thống xuất ra mang tính chất tham khảo. Kết quả của AI không thể thay thế cho đánh giá của cơ quan có thẩm quyền hoặc chuyên gia thẩm định trực tiếp trong các vấn đề liên quan tới pháp lý, chứng nhận và thương mại. Chấp nhận sử dụng hệ thống đồng nghĩa với việc bạn hiểu rõ mọi quyết định giao dịch hoàn toàn nằm trong quyền tài phán cá nhân của bạn.
        </p>

        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '16px' }}>2. Bản quyền và Dữ liệu</h3>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '32px' }}>
          Bạn sở hữu độc quyền hình ảnh hiện vật tải lên. Tuy nhiên, bằng việc phân tích mẫu vật, bạn cấp cho chúng tôi quyền sử dụng hình ảnh ở dạng ẩn danh nhằm mục đích huấn luyện hệ thống AI ngày càng hoàn thiện hơn. Chúng tôi không sử dụng dữ liệu của bạn cho bất kì mục đích phân phối nào với bên thứ ba khác.
        </p>

        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '16px' }}>3. Tín dụng và Thanh toán</h3>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '32px' }}>
          Tín dụng (lượt giám định) thuộc tài khoản của bạn không có thời hạn sử dụng. Các gói nạp một khi đã thực hiện thành công và cập nhật số dư cho tài khoản sẽ không được hoàn trả, trừ trường hợp giao dịch bị lỗi từ phía cổng thanh toán.
        </p>

        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '16px' }}>4. Trách nhiệm người dùng</h3>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.7' }}>
          Tài khoản chỉ được sử dụng và là tiện ích ưu đãi dành riêng cho cá nhân. Mọi hành vi tự động hóa hoặc thu thập thông tin ngược (API reverse engineering) trên hệ thống sẽ dẫn tới hành động khóa vĩnh viễn quyền truy cập.
        </p>
      </div>
    </div>
  );
}

function PrivacyScreen() {
  return (
    <div className="fade-in" style={{ maxWidth: '900px', margin: '40px auto', padding: '0 24px 100px' }}>
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <h2 className="display-title">Chính sách bảo mật</h2>
        <p className="subtitle">Bảo mật thông tin của khách hàng là ưu tiên hàng đầu tại The Archivist</p>
      </div>

      <div className="card" style={{ padding: '48px', borderRadius: '32px', border: 'none', boxShadow: '0 30px 80px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '16px' }}>Thu thập Thông Tin Cá Nhân</h3>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '32px' }}>
          Chúng tôi chỉ thu thập họ tên, địa chỉ email, và quá trình sử dụng (lịch sử phân tích hình ảnh) của bạn với mục tiêu xác định tính danh tính nhằm duy trì số lượng bộ tín dụng cho dịch vụ phân tích. Hình ảnh tải lên được mã hóa và bảo mật trên máy chủ biên phòng nội bộ của chúng tôi.
        </p>

        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '16px' }}>Sử Dụng Dữ Liệu</h3>
        <ul style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '32px', listStylePosition: 'inside', paddingLeft: 0 }}>
          <li style={{ marginBottom: '8px' }}>Xử lý các yêu cầu nhận diện và hội chẩn AI đa đại lý cho hiện vật gốm sứ.</li>
          <li style={{ marginBottom: '8px' }}>Hiển thị nhật ký giám định trực tiếp trên giao diện cá nhân.</li>
          <li style={{ marginBottom: '8px' }}>Thông báo tiến trình đơn hàng (các gói nạp tiền tín dụng).</li>
          <li style={{ marginBottom: '8px' }}>Cải tiến trọng số hệ thống AI (bằng hình ảnh ẩn danh phi danh tính).</li>
        </ul>

        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '16px' }}>Giao Dịch Thanh Toán</h3>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '32px' }}>
          Chúng tôi không lưu trữ thông tin số thẻ hay bảo mật Internet Banking hay thông tin thẻ tín dụng của bạn. Mọi quá trình nạp tín dụng đều được giao dịch trên cổng thanh toán trung gian, tuân thủ tiêu chuẩn mã hoá PCI DSS cao nhất thông qua giao thức ngân hàng điện tử VietQR và MoMo.
        </p>

        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '16px' }}>Liên hệ & Giải quyết quyền lợi người dùng</h3>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.7' }}>
          Để yêu cầu xóa toàn bộ lịch sử tư liệu cá nhân, bao gồm các bài viết trên sổ nhật ký, hãy liên hệ tới The Archivist thông qua phần "Liên hệ chuyên gia" trên hệ thống. Dữ liệu của bạn sẽ bị hủy vĩnh viễn theo đúng yêu cầu bảo mật thông tin chuẩn GDPR của Liên Minh Châu Âu.
        </p>
      </div>
    </div>
  );
}

function AboutScreen() {
  const [stats, setStats] = useState({ total_analyzed: '...', accuracy: '...' });

  useEffect(() => {
    axios.get(`${API_BASE}/stats`)
      .then(res => {
        if (res.data) {
          setStats({
            total_analyzed: new Intl.NumberFormat('vi-VN').format(res.data.total_analyzed),
            accuracy: res.data.accuracy + '%'
          });
        }
      })
      .catch(err => {
        console.error("Lỗi lấy dữ liệu thống kê", err);
        setStats({ total_analyzed: '1M+', accuracy: '99.2%' });
      });
  }, []);

  return (
    <div className="fade-in" style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px 100px' }}>
      {/* Hero section */}
      <div style={{ textAlign: 'center', marginBottom: '80px', paddingTop: '40px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '2.5px', marginBottom: '16px' }}>VỀ THE ARCHIVIST</div>
        <h2 className="display-title" style={{ fontSize: '3rem', maxWidth: '800px', margin: '0 auto 24px', lineHeight: 1.2 }}>
          Lưu giữ Tinh hoa di sản qua Lăng kính Trí tuệ Nhân tạo
        </h2>
        <p className="subtitle" style={{ maxWidth: '600px', margin: '0 auto' }}>
          Chúng tôi tiên phong ứng dụng công nghệ AI đa đại lý học sâu để nhận diện, giám định và số hóa mọi dấu ấn của gốm sứ Việt Nam cùng tinh túy thế giới.
        </p>
      </div>

      {/* Grid Features */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginBottom: '80px' }}>
        <div className="card" style={{ padding: '48px 32px', textAlign: 'center', border: '1px solid var(--stroke)', boxShadow: 'none' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--input-bg)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 24px' }}>🛡️</div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '16px' }}>Độ chính xác vượt trội</h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Hệ thống quy tụ 5 hội đồng AI chuyên biệt đóng vai trò tranh biện trực tiếp trong thời gian thực, đảm bảo mọi phán đoán xuất xứ và niên đại đều dựa trên lập luận đa phương diện.
          </p>
        </div>

        <div className="card" style={{ padding: '48px 32px', textAlign: 'center', border: '1px solid var(--stroke)', boxShadow: 'none' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--input-bg)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 24px' }}>📚</div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '16px' }}>Kho tàng Dữ liệu</h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Lưu trữ hơn 50.000 mẫu vân gốm, kiểu dáng và nước men trải dài từ các triều đại lịch sử phương Đông, giúp tối ưu hóa việc so khớp và định danh mọi hiện vật.
          </p>
        </div>

        <div className="card" style={{ padding: '48px 32px', textAlign: 'center', border: '1px solid var(--stroke)', boxShadow: 'none' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--input-bg)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 24px' }}>🤝</div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '16px' }}>Cộng đồng Sưu tầm</h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Xây dựng sân chơi tri thức cho giới mộ điệu, nhà khảo cổ và những chuyên gia gốm sứ. Không chỉ là nền tảng máy học, The Archivist còn là kho tàng sống của văn hóa dân tộc.
          </p>
        </div>
      </div>

      {/* Mission */}
      <div className="card" style={{ padding: '64px', borderRadius: '40px', background: 'var(--primary-dark)', color: 'white', border: 'none', display: 'flex', flexWrap: 'wrap', gap: '40px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: 900, marginBottom: '24px', lineHeight: 1.3 }}>
            Tầm nhìn và <span style={{ color: 'var(--accent)' }}>Sứ mệnh</span>
          </h3>
          <p style={{ fontSize: '1rem', lineHeight: '1.8', opacity: 0.8, marginBottom: '20px' }}>
            Chúng tôi tin rằng, mỗi cổ vật gốm sứ không chỉ đơn thuần là món đồ vô tri, mà ẩn chứa trong nó là cả câu chuyện của dòng thời gian, hồn phách vạn vật và tinh hoa đôi bàn tay nghệ nhân.
          </p>
          <p style={{ fontSize: '1rem', lineHeight: '1.8', opacity: 0.8 }}>
            Sứ mệnh của The Archivist là kéo dài tuổi thọ của ký ức. Biến những câu chuyện ngỡ như đã chìm vào quên lãng trở nên sống động, bằng sự logic, minh bạch và năng lực phi thường của công nghệ.
          </p>
        </div>
        <div style={{ flex: 1, minWidth: '300px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '400px', height: '300px', background: 'white', borderRadius: '24px', padding: '30px', color: 'var(--primary-dark)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '8px', color: 'var(--accent)' }}>{stats.total_analyzed}</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px', opacity: 0.6 }}>Bức ảnh phân tích</div>

            <div style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '8px', color: 'var(--accent)' }}>{stats.accuracy}</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>Độ chính xác AI</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactScreen({ notify }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      notify('Vui lòng nhập đầy đủ thông tin!', 'error');
      return;
    }
    setSending(true);
    try {
      await axios.post(`${API_BASE}/contact`, form);
      setForm({ name: '', email: '', subject: '', message: '' });
      notify('Tin nhắn đã được gửi thành công! Chúng tôi sẽ phản hồi trong 24h.', 'success');
    } catch (err) {
      console.error(err);
      notify('Gửi tin nhắn thất bại. Vui lòng thử lại sau.', 'error');
    }
    setSending(false);
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px 100px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <h2 className="display-title">Liên hệ với chúng tôi</h2>
        <p className="subtitle">Đội ngũ chuyên gia luôn sẵn sàng hỗ trợ bạn về mọi vấn đề liên quan đến giám định gốm sứ</p>
      </div>

      {/* Contact Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '64px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 32px', border: '1px solid var(--stroke)', boxShadow: 'none' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--input-bg)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 20px' }}>📧</div>
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '8px' }}>Email</h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>dongnguyenkh123@gmail.com</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', opacity: 0.7 }}>Phản hồi trong 24 giờ</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '40px 32px', border: '1px solid var(--stroke)', boxShadow: 'none' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--input-bg)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 20px' }}>📞</div>
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '8px' }}>Điện thoại</h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>0949 085 842</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', opacity: 0.7 }}>Thứ 2 - Thứ 7, 8:00 - 17:30</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '40px 32px', border: '1px solid var(--stroke)', boxShadow: 'none' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--input-bg)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 20px' }}>📍</div>
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '8px' }}>Địa chỉ</h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Cần Thơ</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', opacity: 0.7 }}>Việt Nam</p>
        </div>
      </div>

      {/* Contact Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' }}>
        <div className="card" style={{ padding: '48px', borderRadius: '32px', border: 'none', boxShadow: '0 30px 80px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '8px' }}>Gửi tin nhắn</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '32px' }}>Điền thông tin bên dưới, chúng tôi sẽ liên hệ lại sớm nhất.</p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Họ và tên *</label>
                <input type="text" placeholder="Nguyễn Văn A" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%', padding: '14px 20px', borderRadius: '14px', border: '1px solid var(--stroke)', fontSize: '0.95rem', outline: 'none', background: 'var(--input-bg)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Email *</label>
                <input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ width: '100%', padding: '14px 20px', borderRadius: '14px', border: '1px solid var(--stroke)', fontSize: '0.95rem', outline: 'none', background: 'var(--input-bg)' }} />
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Chủ đề</label>
              <input type="text" placeholder="Cần hỗ trợ giám định, hợp tác, góp ý..." value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} style={{ width: '100%', padding: '14px 20px', borderRadius: '14px', border: '1px solid var(--stroke)', fontSize: '0.95rem', outline: 'none', background: 'var(--input-bg)' }} />
            </div>
            <div style={{ marginBottom: '32px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Nội dung *</label>
              <textarea placeholder="Mô tả chi tiết yêu cầu hoặc câu hỏi của bạn..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={5} style={{ width: '100%', padding: '14px 20px', borderRadius: '14px', border: '1px solid var(--stroke)', fontSize: '0.95rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: 'var(--input-bg)' }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={sending} style={{ width: '100%', height: '56px', borderRadius: '50px', fontSize: '1rem', fontWeight: 700 }}>
              {sending ? 'Đang gửi...' : 'Gửi tin nhắn'}
            </button>
          </form>
        </div>

        {/* Right side info */}
        <div>
          <div className="card" style={{ padding: '40px', borderRadius: '32px', marginBottom: '24px', background: 'var(--primary-dark)', color: 'white', border: 'none' }}>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, marginBottom: '20px' }}>Về hệ thống</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🤖</span>
                <span>Hội đồng 3 AI chuyên gia tranh luận</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🏺</span>
                <span>Cơ sở dữ liệu nhiều dòng gốm sứ</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
                <span style={{ fontSize: '1.2rem' }}>⚡</span>
                <span>Kết quả phân tích trong vài giây</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🌐</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Hoạt động 24/7 — không giới hạn</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '40px', borderRadius: '32px', border: '1px solid var(--stroke)', boxShadow: 'none' }}>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '16px' }}>Câu hỏi thường gặp</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { q: 'Kết quả giám định có chính xác không?', a: 'Hệ thống sử dụng 5 AI chuyên gia tranh luận để đạt độ chính xác cao nhất.' },
                { q: 'Tín dụng có hết hạn không?', a: 'Không, tín dụng của bạn không có thời hạn sử dụng.' },
                { q: 'Có hỗ trợ giám định trực tiếp không?', a: 'Có, bạn có thể liên hệ để đặt lịch giám định trực tiếp.' }
              ].map((faq, i) => (
                <div key={i} style={{ padding: '16px 0', borderBottom: i < 2 ? '1px solid var(--stroke)' : 'none' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '6px' }}>{faq.q}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{faq.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentScreen({ token, quota, fetchUser, notify, setView }) {
  const [stage, setStage] = useState(0); // 0: Select Package, 1: Select Method, 2: Final Payment
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successCredit, setSuccessCredit] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [cardForm, setCardForm] = useState({ number: '', expiry: '', name: '' });

  const selectPackage = (pkg) => {
    setSelectedPkg(pkg);
    setStage(1);
    setSelectedMethod(null);
  };

  const handleMethodClick = (methodId) => {
    if (methodId === 'atm') {
      setSelectedMethod('atm');
    } else {
      buyPackage();
    }
  };

  const handleCardSubmit = () => {
    if (!cardForm.number || !cardForm.expiry || !cardForm.name) {
      notify('Vui lòng nhập đầy đủ thông tin thẻ!', 'error');
      return;
    }
    buyPackage();
  };

  const formatCardNumber = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const buyPackage = async () => {
    if (!selectedPkg) return;
    setPurchasing(true);
    try {
      const res = await axios.post(API_BASE + '/payment/create', { package_id: selectedPkg.id }, { headers: { Authorization: 'Bearer ' + token } });
      const serverData = res.data.data || res.data;

      // Constructing robust payment data following SePay pattern
      const amount = serverData.amount || selectedPkg.price;
      const content = serverData.transfer_content || `GOM NAP ${selectedPkg.id}`;

      const paymentData = {
        ...serverData,
        amount: amount,
        transfer_content: content,
        bank_name: 'ACB',
        account_number: '28569967',
        account_name: 'MA GIA TUAN',
        qr_url: `https://qr.sepay.vn/img?bank=ACB&acc=28569967&template=compact&amount=${amount}&des=${content}`
      };

      setQrCodeData(paymentData);
      setStage(2);
      notify('Xin mời quét mã QR để thanh toán!', 'success');
    } catch (err) {
      notify('Hệ thống thanh toán đang gặp sự cố. Vui lòng thử lại sau!', 'error');
    }
    setPurchasing(false);
  };

  const checkStatus = async () => {
    if (!qrCodeData) return;
    try {
      const res = await axios.get(API_BASE + '/payment/check/' + qrCodeData.id, { headers: { Authorization: 'Bearer ' + token } });
      if (res.data.status === 'completed' || (res.data.data && res.data.data.status === 'completed')) {
        const credit = res.data.credit_amount || (res.data.data && res.data.data.credit_amount) || selectedPkg?.desc.match(/\d+/)[0] || 0;
        setSuccessCredit(credit);
        setPaymentSuccess(true);
        fetchUser();
      } else {
        notify('Chưa nhận được thanh toán. Vui lòng thử lại sau 30s!', 'info');
      }
    } catch (err) { }
  };

  const resetPayment = () => {
    setStage(0);
    setSelectedPkg(null);
    setQrCodeData(null);
    setPaymentSuccess(false);
  };

  const simulateSuccess = async () => {
    if (!qrCodeData) return;
    try {
      const res = await axios.post(API_BASE + '/payment/test-complete/' + qrCodeData.payment_id, {}, { headers: { Authorization: 'Bearer ' + token } });
      if (res.data.status === 'completed') {
        const credit = res.data.credit_amount || selectedPkg?.desc.match(/\d+/)[0] || 0;
        setSuccessCredit(credit);
        setPaymentSuccess(true);
        fetchUser();
      }
    } catch (err) {
      notify('Lỗi khi giả lập thanh toán', 'error');
    }
  };

  const handleFinishPayment = () => {
    setPaymentSuccess(false);
    setQrCodeData(null);
    setStage(0);
    setView("transaction_history");
  };

  const currentStage = Math.max(stage, qrCodeData ? 2 : selectedPkg ? 1 : 0);

  const renderSteps = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '60px' }}>
      {[
        { id: 0, l: 'Chọn gói' },
        { id: 1, l: 'Phương thức' },
        { id: 2, l: 'Thanh toán' }
      ].map(s => (
        <React.Fragment key={s.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: currentStage >= s.id ? 'var(--primary-dark)' : 'var(--stroke)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>
              {currentStage > s.id ? '✓' : s.id + 1}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: currentStage >= s.id ? 'var(--primary-dark)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.l}</span>
          </div>
          {s.id < 2 && <div style={{ width: '40px', height: '1px', background: 'var(--stroke)' }}></div>}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="fade-in" style={{ marginTop: '40px', padding: '0 24px 100px', maxWidth: '1200px', margin: '40px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 className="display-title">Nạp Tín Dụng</h2>
        <p className="subtitle">Mở khóa toàn bộ khả năng phân tích đa đại lý của hệ thống.</p>
      </div>

      {renderSteps()}

      {currentStage === 0 && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          {[
            { id: 1, name: 'Cơ Bản', credits: 10, pricePerCredit: 15000, price: 150000, discount: null },
            { id: 2, name: 'Phổ Biến', credits: 50, pricePerCredit: 12000, price: 600000, discount: 'Tiết kiệm 20%', featured: true },
            { id: 3, name: 'Chuyên Gia', credits: 200, pricePerCredit: 10000, price: 2000000, discount: '-30% off' }
          ].map(pkg => (
            <div key={pkg.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '48px 40px', border: pkg.featured ? '2.5px solid var(--accent)' : '1px solid var(--stroke)', borderRadius: '32px', transition: '0.4s', transform: pkg.featured ? 'scale(1.05)' : 'none', position: 'relative', background: 'white' }}>

              {/* Header: Tag + Discount */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{pkg.name}</span>
                {pkg.discount && (
                  <span style={{ background: '#E53935', color: 'white', padding: '3px 10px', borderRadius: '50px', fontSize: '0.65rem', fontWeight: 800 }}>{pkg.discount}</span>
                )}
              </div>

              {/* Credits */}
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: '8px' }}>
                {pkg.credits} Tín dụng
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '32px', fontWeight: 500 }}>
                {new Intl.NumberFormat('vi-VN').format(pkg.pricePerCredit)}đ / tín dụng
              </p>

              {/* Price */}
              <div style={{ marginBottom: '40px' }}>
                <span style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--primary-dark)' }}>{new Intl.NumberFormat('vi-VN').format(pkg.price)}</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)', marginLeft: '4px' }}>đ</span>
              </div>

              {/* CTA Button */}
              <button className="btn btn-primary" onClick={() => selectPackage(pkg)} style={{ marginTop: 'auto', width: '100%', height: '56px', borderRadius: '50px', background: pkg.featured ? 'var(--primary-dark)' : 'var(--primary)', fontSize: '1rem', fontWeight: 700 }}>Chọn gói</button>
            </div>
          ))}
        </div>
      )}

      {currentStage === 1 && (
        <div className="card fade-in" style={{ maxWidth: '700px', margin: '0 auto', padding: '48px', borderRadius: '40px', border: 'none', boxShadow: '0 30px 80px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '48px' }}>
            <button onClick={resetPayment} style={{ background: 'var(--input-bg)', border: 'none', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', fontWeight: 900 }}>←</button>
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary-dark)' }}>Phương thức thanh toán</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Đang thanh toán cho {selectedPkg.name} — {selectedPkg.credits} tín dụng</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { id: 'vietqr', name: 'Chuyển khoản Ngân hàng', icon: '🏦', sub: 'Tự động duyệt qua VietQR' },
              { id: 'momo', name: 'Ví điện tử MoMo', icon: 'img:https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-MoMo-Square.png', sub: 'Thanh toán tức thì' },
              { id: 'zalopay', name: 'Ví ZaloPay', icon: 'img:https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-ZaloPay-Square.png', sub: 'Quét mã hoặc chuyển tức thì' }
            ].map(m => (
              <div
                key={m.id}
                onClick={buyPackage}
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '24px', cursor: 'pointer',
                  border: '1px solid var(--stroke)',
                  boxShadow: 'none', transition: '0.3s',
                  opacity: purchasing ? 0.6 : 1, pointerEvents: purchasing ? 'none' : 'auto'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '50px', height: '50px', background: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }}>
                    {m.icon.startsWith('img:') ? <img src={m.icon.replace('img:', '')} alt={m.name} style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '8px' }} /> : m.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{m.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.sub}</div>
                  </div>
                </div>
                {purchasing ? <div className="spin" style={{ fontSize: '1.2rem' }}>⌛</div> : <div style={{ fontSize: '1.2rem', opacity: 0.3 }}>→</div>}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '48px', textAlign: 'center', borderTop: '1px solid var(--stroke)', paddingTop: '32px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Tổng thanh toán:</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary-dark)' }}>{new Intl.NumberFormat('vi-VN').format(selectedPkg.price)}₫</div>
          </div>
        </div>
      )}

      {currentStage === 2 && qrCodeData && (
        <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '40px', border: 'none', boxShadow: '0 40px 100px rgba(0,0,0,0.12)', background: 'white', display: 'flex', flexWrap: 'wrap' }}>

            {/* Left: QR Code focus */}
            <div style={{ flex: 0.8, minWidth: '350px', padding: '60px', background: '#F8F9FA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--stroke)' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>Quét mã VietQR</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Sử dụng App Ngân hàng / MoMo</h3>
              </div>

              <div style={{ background: 'white', padding: '24px', borderRadius: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', position: 'relative' }}>
                <img src={qrCodeData.qr_url} alt="SePay QR" style={{ width: '280px', height: '280px', display: 'block' }} />
                {/* Decorative corners */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', borderTop: '4px solid var(--accent)', borderLeft: '4px solid var(--accent)', borderRadius: '32px 0 0 0' }}></div>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', borderTop: '4px solid var(--accent)', borderRight: '4px solid var(--accent)', borderRadius: '0 32px 0 0' }}></div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', borderBottom: '4px solid var(--accent)', borderLeft: '4px solid var(--accent)', borderRadius: '0 0 0 32px' }}></div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: '4px solid var(--accent)', borderRight: '4px solid var(--accent)', borderRadius: '0 0 32px 0' }}></div>
              </div>

              <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="spin" style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid var(--primary)', borderTopColor: 'transparent' }}></div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Đang chờ giao dịch...</span>
              </div>
            </div>

            {/* Right: Payment Details */}
            <div style={{ flex: 1.2, minWidth: '400px', padding: '60px' }}>
              <div style={{ marginBottom: '48px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Chi tiết thanh toán</div>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--primary-dark)' }}>{new Intl.NumberFormat('vi-VN').format(qrCodeData.amount)}<span style={{ fontSize: '1.2rem', marginLeft: '4px' }}>₫</span></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {[
                  { label: 'Ngân hàng', value: qrCodeData.bank_name || 'ACB', icon: '🏛️' },
                  { label: 'Số tài khoản', value: qrCodeData.account_number || '28569967', copy: true },
                  { label: 'Chủ tài khoản', value: qrCodeData.account_name || 'MA GIA TUAN' },
                  { label: 'Nội dung', value: qrCodeData.transfer_content, copy: true, featured: true }
                ].map((item, idx) => (
                  <div key={idx} style={{
                    padding: item.featured ? '20px' : '0',
                    background: item.featured ? 'var(--input-bg)' : 'transparent',
                    borderRadius: '16px',
                    border: item.featured ? '1px dashed var(--accent)' : 'none'
                  }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>{item.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: item.featured ? '1.1rem' : '1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{item.value}</span>
                      {item.copy && (
                        <button
                          onClick={() => { navigator.clipboard.writeText(item.value); notify('Đã sao chép!', 'info'); }}
                          style={{ background: 'var(--input-bg)', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)' }}
                        >
                          SAO CHÉP
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '56px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button disabled={purchasing} onClick={checkStatus} className="btn btn-primary" style={{ width: '100%', height: '60px', borderRadius: '50px', fontSize: '1rem', fontWeight: 800 }}>
                  {purchasing ? "Đang xử lý..." : "Xác nhận đã chuyển khoản"}
                </button>
                <button onClick={resetPayment} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>Huỷ giao dịch</button>

                {/* SIMULATION BUTTON FOR TEST MODE */}
                <div style={{ marginTop: '20px', borderTop: '1px solid var(--stroke)', paddingTop: '20px' }}>
                  <button
                    onClick={simulateSuccess}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      opacity: 0.7
                    }}
                  >
                    <i className="fas fa-vial" style={{ marginRight: '6px' }}></i>
                    Giả lập nạp tiền thành công (Test Mode)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '32px', textAlign: 'center', padding: '24px', background: '#FFFBEB', borderRadius: '20px', border: '1px solid #FEF3C7' }}>
            <p style={{ fontSize: '0.85rem', color: '#92400E', fontWeight: 600, margin: 0 }}>
              ⚠️ <b>Lưu ý quan trọng:</b> Vui lòng giữ nguyên <b>Nội dung chuyển khoản</b> để hệ thống tự động cộng lượt ngay lập tức. Giao dịch sẽ hết hạn sau 10 phút.
            </p>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {paymentSuccess && createPortal(
        <div className="modal-overlay">
          <div className="modal-content fade-in" style={{ textAlign: 'center', padding: '48px', maxWidth: '400px', width: '90%' }}>
            <div style={{ width: '80px', height: '80px', background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#065F46', fontSize: '40px' }}>
              <i className="fas fa-check"></i>
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: '12px' }}>Thanh toán thành công!</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Bạn đã nạp thành công bộ <b>{successCredit} lượt phân tích</b> vào tài khoản. Hãy bắt đầu giám định những cổ vật ngay bây giờ!
            </p>
            <button className="btn btn-primary" onClick={handleFinishPayment} style={{ width: '100%', height: '54px', borderRadius: '50px', fontSize: '1rem' }}>
              Xác nhận
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default App;
