import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000/api/admin";

export function AdminLayout({ view, setView, children }) {
  const tabs = [
    { id: "admin_dashboard", label: "📄 Tổng quan", icon: "fas fa-chart-line" },
    { id: "admin_users", label: "👥 Người dùng", icon: "fas fa-users" },
    { id: "admin_ceramics", label: "🏺 Dòng gốm", icon: "fas fa-shapes" },
    { id: "admin_payments", label: "💳 Giao dịch", icon: "fas fa-money-bill-wave" },
    { id: "admin_predictions", label: "🔍 Lượt giám định", icon: "fas fa-microscope" },
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', gap: '30px', minHeight: '70vh' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)', alignSelf: 'flex-start' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-dark)', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid var(--stroke)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
          <i className="fas fa-shield-alt" style={{ marginRight: '8px', color: 'var(--accent)' }}></i> Admin Panel
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{
                textAlign: 'left',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                background: view === t.id ? 'var(--primary)' : 'transparent',
                color: view === t.id ? 'white' : 'var(--text-main)',
                fontWeight: view === t.id ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '30px', boxShadow: 'var(--shadow-md)' }}>
        {children}
      </div>
    </div>
  );
}

export function AdminDashboard({ token }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(API_BASE + "/dashboard", { headers: { Authorization: "Bearer " + token } })
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, [token]);

  if (!data) return <div>Đang tải thống kê...</div>;

  return (
    <div className="fade-in">
      <h2 className="section-title">Tổng quan hệ thống</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="input-label">TỔNG NGƯỜI DÙNG</div>
          <div className="stat-value">{data.stats.total_users}</div>
        </div>
        <div className="stat-card">
          <div className="input-label">TỔNG LƯỢT GIÁM ĐỊNH</div>
          <div className="stat-value">{data.stats.total_predictions}</div>
        </div>
        <div className="stat-card">
          <div className="input-label">DOANH THU (VND)</div>
          <div className="stat-value" style={{ color: 'var(--success)', fontSize: '2.5rem', wordBreak: 'break-word', lineHeight: 1.2 }}>
             {new Intl.NumberFormat('vi-VN').format(data.stats.total_revenue)}đ
          </div>
        </div>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h3 style={{ marginBottom: '20px', fontFamily: 'var(--font-heading)' }}>Thành viên nổi bật (Dự đoán nhiều nhất)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--primary-dark)', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderTopLeftRadius: '8px' }}>Tên</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'right', borderTopRightRadius: '8px' }}>Số lượt giám định</th>
            </tr>
          </thead>
          <tbody>
            {data.top_users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--stroke)' }}>
                <td style={{ padding: '12px', fontWeight: 600 }}>{u.name}</td>
                <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{u.email}</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: 'var(--accent)' }}>{u.predictions_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminUsers({ token, notify, fetchUser }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [editTokenId, setEditTokenId] = useState(null);
  const [editTokenValue, setEditTokenValue] = useState("");
  const [editFreeId, setEditFreeId] = useState(null);
  const [editFreeValue, setEditFreeValue] = useState("");
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "user", token_balance: 0, free_predictions_used: 0 });

  const fetchUsers = () => {
    axios.get(`${API_BASE}/users?search=${search}`, { headers: { Authorization: "Bearer " + token } })
      .then(res => setUsers(res.data.data || []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, [search]);

  const updateRole = (id, newRole) => {
    axios.put(`${API_BASE}/users/${id}`, { role: newRole }, { headers: { Authorization: "Bearer " + token } })
      .then(() => { notify("Cập nhật quyền thành công", "success"); fetchUsers(); })
      .catch(() => notify("Lỗi cập nhật", "error"));
  };

  const startEditToken = (u) => {
    setEditTokenId(u.id);
    setEditTokenValue(u.token_balance);
  };

  const saveToken = (id) => {
    axios.put(`${API_BASE}/users/${id}`, { token_balance: parseFloat(editTokenValue) }, { headers: { Authorization: "Bearer " + token } })
      .then(() => { 
          notify("Cập nhật Token thành công", "success"); 
          setEditTokenId(null);
          fetchUsers(); 
          if (fetchUser) fetchUser();
      })
      .catch((err) => notify(err.response?.data?.message || "Lỗi cập nhật Token", "error"));
  };

  const startEditFree = (u) => {
    setEditFreeId(u.id);
    setEditFreeValue(u.free_predictions_used || 0);
  };

  const saveFree = (id) => {
    axios.put(`${API_BASE}/users/${id}`, { free_predictions_used: parseInt(editFreeValue, 10) }, { headers: { Authorization: "Bearer " + token } })
      .then(() => { 
          notify("Cập nhật Lượt miễn phí thành công", "success"); 
          setEditFreeId(null);
          fetchUsers(); 
          if (fetchUser) fetchUser();
      })
      .catch((err) => notify(err.response?.data?.message || "Lỗi cập nhật", "error"));
  };

  const openUserForm = (u) => {
    setEditingUserId(u.id);
    setUserForm({
      name: u.name || "",
      email: u.email || "",
      role: u.role || "user",
      token_balance: u.token_balance || 0,
      free_predictions_used: u.free_predictions_used || 0
    });
    setIsUserModalOpen(true);
  };

  const saveUserForm = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE}/users/${editingUserId}`, userForm, { headers: { Authorization: "Bearer " + token } });
      notify("Cập nhật người dùng thành công", "success");
      setIsUserModalOpen(false);
      fetchUsers();
      if (fetchUser) fetchUser();
    } catch (err) {
      notify(err.response?.data?.message || "Có lỗi xảy ra", "error");
    }
  };

  const deleteUserAction = async (id) => {
    try {
      await axios.delete(`${API_BASE}/users/${id}`, { headers: { Authorization: "Bearer " + token } });
      notify("Đã xóa người dùng", "success");
      setDeleteUserId(null);
      fetchUsers();
    } catch (err) {
      notify(err.response?.data?.message || "Không thể xóa người dùng này", "error");
      setDeleteUserId(null);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Quản lý Người dùng</h2>
        <input 
          type="text" 
          placeholder="Tìm email, tên..." 
          className="input-field" 
          style={{ width: '300px', padding: '10px 15px' }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ background: 'var(--primary-dark)', color: 'white' }}>
          <tr>
            <th style={{ padding: '15px' }}>ID</th>
            <th style={{ padding: '15px' }}>Tên / Email</th>
            <th style={{ padding: '15px' }}>Quyền</th>
            <th style={{ padding: '15px' }}>Số dư Tokens</th>
            <th style={{ padding: '15px' }}>Lượt Free (đã dùng)</th>
            <th style={{ padding: '15px' }}>Ngày T.Gia</th>
            <th style={{ padding: '15px', textAlign: 'right' }}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid var(--stroke)' }}>
              <td style={{ padding: '15px' }}>#{u.id}</td>
              <td style={{ padding: '15px' }}>
                <div style={{ fontWeight: 800 }}>{u.name}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{u.email}</div>
              </td>
              <td style={{ padding: '15px' }}>
                <select 
                  value={u.role || 'user'} 
                  onChange={(e) => updateRole(u.id, e.target.value)}
                  style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="user">Người dùng</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </td>
              <td style={{ padding: '15px' }}>
                {editTokenId === u.id ? (
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <input 
                      type="number" 
                      value={editTokenValue} 
                      onChange={e => setEditTokenValue(e.target.value)} 
                      style={{ width: '80px', padding: '5px', borderRadius: '4px', border: '1px solid var(--stroke)' }}
                    />
                    <button onClick={() => saveToken(u.id)} style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu</button>
                    <button onClick={() => setEditTokenId(null)} style={{ background: '#ccc', color: '#333', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{u.token_balance}</span>
                    <i className="fas fa-edit" onClick={() => startEditToken(u)} style={{ cursor: 'pointer', opacity: 0.5, fontSize: '0.8rem' }} title="Chỉnh sửa Token"></i>
                  </div>
                )}
              </td>
              <td style={{ padding: '15px' }}>
                {editFreeId === u.id ? (
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <input 
                      type="number" 
                      value={editFreeValue} 
                      onChange={e => setEditFreeValue(e.target.value)} 
                      style={{ width: '60px', padding: '5px', borderRadius: '4px', border: '1px solid var(--stroke)' }}
                    />
                    <button onClick={() => saveFree(u.id)} style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu</button>
                    <button onClick={() => setEditFreeId(null)} style={{ background: '#ccc', color: '#333', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>{u.free_predictions_used || 0} / 5</span>
                    <i className="fas fa-edit" onClick={() => startEditFree(u)} style={{ cursor: 'pointer', opacity: 0.5, fontSize: '0.8rem' }} title="Sửa Lượt Dùng Thử"></i>
                  </div>
                )}
              </td>
              <td style={{ padding: '15px', fontSize: '0.85rem' }}>{new Date(u.created_at).toLocaleDateString()}</td>
              <td style={{ padding: '15px' }}>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <button onClick={() => openUserForm(u)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 800 }}>Sửa</button>
                  <button onClick={() => setDeleteUserId(u.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 800 }}>Xóa</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isUserModalOpen && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="fade-in" style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h3 style={{ marginBottom: '20px', fontFamily: 'var(--font-heading)', color: 'var(--primary-dark)', fontSize: '1.4rem' }}>Sửa thông tin</h3>
            <form onSubmit={saveUserForm}>
              <div className="input-group">
                <label className="input-label">Họ Tên</label>
                <input required className="input-field" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input required type="email" className="input-field" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Quyền hạng</label>
                <select className="input-field" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                  <option value="user">Người dùng (Member)</option>
                  <option value="admin">Ban Quản Trị (Admin)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Token</label>
                  <input type="number" step="0.1" className="input-field" value={userForm.token_balance} onChange={e => setUserForm({...userForm, token_balance: e.target.value})} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Free Đã dùng</label>
                  <input type="number" className="input-field" value={userForm.free_predictions_used} onChange={e => setUserForm({...userForm, free_predictions_used: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '1px solid var(--stroke)', paddingTop: '20px', marginTop: '10px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsUserModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {deleteUserId && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="fade-in" style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fee2e2', color: '#991b1b', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <i className="fas fa-trash-alt"></i>
            </div>
            <h3 style={{ marginBottom: '15px', fontFamily: 'var(--font-heading)', color: 'var(--primary-dark)', fontSize: '1.2rem' }}>Xóa vĩnh viễn</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '25px', lineHeight: 1.6 }}>Bạn định xóa người dùng này khỏi hệ thống? Các lịch sử và hình ảnh giám định của họ cũng sẽ bị hủy bỏ.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              <button className="btn btn-outline" onClick={() => setDeleteUserId(null)} style={{ padding: '10px 20px' }}>Hủy bỏ</button>
              <button className="btn" onClick={() => deleteUserAction(deleteUserId)} style={{ background: 'var(--danger)', color: 'white', padding: '10px 20px' }}>Tiến hành xóa</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function AdminCeramics({ token, notify }) {
  const [lines, setLines] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "", origin: "", country: "", era: "", description: "", style: "", is_featured: false
  });

  const fetchLines = () => {
    axios.get(`${API_BASE}/ceramic-lines`, { headers: { Authorization: "Bearer " + token } })
      .then(res => setLines(res.data.data || []))
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchLines(); }, []);

  const openForm = (line = null) => {
    if (line) {
      setEditingId(line.id);
      setForm({
        name: line.name || "", origin: line.origin || "", country: line.country || "",
        era: line.era || "", description: line.description || "", style: line.style || "",
        is_featured: !!line.is_featured
      });
    } else {
      setEditingId(null);
      setForm({ name: "", origin: "", country: "", era: "", description: "", style: "", is_featured: false });
    }
    setIsModalOpen(true);
  };

  const saveLine = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_BASE}/ceramic-lines/${editingId}`, form, { headers: { Authorization: "Bearer " + token } });
        notify("Cập nhật thành công", "success");
      } else {
        await axios.post(`${API_BASE}/ceramic-lines`, form, { headers: { Authorization: "Bearer " + token } });
        notify("Thêm dòng gốm thành công", "success");
      }
      setIsModalOpen(false);
      fetchLines();
    } catch (err) {
      notify("Có lỗi xảy ra", "error");
    }
  };

  const deleteLine = async (id) => {
    try {
      await axios.delete(`${API_BASE}/ceramic-lines/${id}`, { headers: { Authorization: "Bearer " + token } });
      notify("Xóa thành công", "success");
      setDeleteConfirmId(null);
      fetchLines();
    } catch (err) {
      notify("Có lỗi xảy ra", "error");
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Quản lý Dòng Gốm</h2>
        <button className="btn btn-primary" onClick={() => openForm(null)}>+ Thêm Dòng Gốm Mới</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ background: 'var(--primary-dark)', color: 'white' }}>
          <tr>
            <th style={{ padding: '15px' }}>Tên Dòng Gốm</th>
            <th style={{ padding: '15px' }}>Quốc Gia / Kỷ nguyên</th>
            <th style={{ padding: '15px' }}>Nổi bật</th>
            <th style={{ padding: '15px', textAlign: 'right' }}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid var(--stroke)' }}>
              <td style={{ padding: '15px', fontWeight: 800 }}>{c.name}</td>
              <td style={{ padding: '15px', color: 'var(--text-muted)' }}>
                {c.country || '-'} <br/> <span style={{fontSize:'0.75rem', opacity:0.6}}>{c.era}</span>
              </td>
              <td style={{ padding: '15px' }}>
                  {c.is_featured ? <span style={{color: 'var(--success)', fontWeight:'bold'}}>★ Nổi bật</span> : '-'}
              </td>
              <td style={{ padding: '15px', textAlign: 'right' }}>
                <button onClick={() => openForm(c)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginRight: '15px', fontWeight: 800 }}>Sửa</button>
                <button onClick={() => setDeleteConfirmId(c.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 800 }}>Xóa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="fade-in" style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h3 style={{ marginBottom: '20px', fontFamily: 'var(--font-heading)', color: 'var(--primary-dark)', fontSize: '1.4rem' }}>{editingId ? "Sửa Dòng Gốm" : "Thêm Dòng Gốm Mới"}</h3>
            <form onSubmit={saveLine}>
              <div className="input-group">
                <label className="input-label">Tên dòng gốm</label>
                <input required className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Xuất xứ (Tỉnh/Thành)</label>
                  <input className="input-field" value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Quốc gia</label>
                  <input className="input-field" value={form.country} onChange={e => setForm({...form, country: e.target.value})} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Niên đại (Thời kỳ)</label>
                <input className="input-field" value={form.era} onChange={e => setForm({...form, era: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Đặc trưng phong cách (Style)</label>
                <input className="input-field" value={form.style} onChange={e => setForm({...form, style: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Mô tả lịch sử</label>
                <textarea className="input-field" rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})}></textarea>
              </div>
              <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg)', padding: '15px', borderRadius: '8px' }}>
                <input type="checkbox" id="is_featured" checked={form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                <label htmlFor="is_featured" style={{ fontWeight: 600, color: 'var(--primary-dark)', cursor: 'pointer' }}>🌟 Đánh dấu là Nổi Bật (hiển thị ưu tiên)</label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '1px solid var(--stroke)', paddingTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary">{editingId ? "Cập Nhật" : "Lưu Dòng Gốm"}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {deleteConfirmId && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="fade-in" style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fee2e2', color: '#991b1b', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 style={{ marginBottom: '15px', fontFamily: 'var(--font-heading)', color: 'var(--primary-dark)', fontSize: '1.2rem' }}>Xác nhận xóa</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '25px', lineHeight: 1.6 }}>Bạn có chắc chắn muốn xóa dữ liệu này không? Hành động này sẽ không thể hoàn tác.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              <button className="btn btn-outline" onClick={() => setDeleteConfirmId(null)} style={{ padding: '10px 20px' }}>Hủy bỏ</button>
              <button className="btn" onClick={() => deleteLine(deleteConfirmId)} style={{ background: 'var(--danger)', color: 'white', padding: '10px 20px' }}>Tiến hành xóa</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function AdminPayments({ token }) {
    const [payments, setPayments] = useState([]);
  
    useEffect(() => {
      axios.get(`${API_BASE}/payments`, { headers: { Authorization: "Bearer " + token } })
        .then(res => setPayments(res.data.data || []))
        .catch(err => console.error(err));
    }, [token]);
  
    return (
      <div className="fade-in">
        <h2 className="section-title" style={{ marginBottom: '25px' }}>Lịch sử giao dịch nạp Token</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'var(--primary-dark)', color: 'white' }}>
            <tr>
              <th style={{ padding: '15px' }}>Thời gian</th>
              <th style={{ padding: '15px' }}>Người dùng</th>
              <th style={{ padding: '15px' }}>Gói</th>
              <th style={{ padding: '15px' }}>Số tiền</th>
              <th style={{ padding: '15px' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--stroke)' }}>
                <td style={{ padding: '15px', fontSize: '0.85rem', opacity: 0.7 }}>{new Date(p.created_at).toLocaleString()}</td>
                <td style={{ padding: '15px', fontWeight: 600 }}>{p.user?.name}</td>
                <td style={{ padding: '15px' }}>{p.package_name}</td>
                <td style={{ padding: '15px', fontWeight: 800, color: 'var(--accent)' }}>{new Intl.NumberFormat('vi-VN').format(p.amount_vnd)}đ</td>
                <td style={{ padding: '15px' }}>
                    <span style={{
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        fontWeight: 800,
                        background: p.status === 'completed' ? '#dcfce7' : (p.status==='failed'?'#fee2e2':'#fef3c7'),
                        color: p.status === 'completed' ? '#166534' : (p.status==='failed'?'#991b1b':'#b45309')
                    }}>
                        {p.status}
                    </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
}

export function AdminPredictions({ token }) {
    const [preds, setPreds] = useState([]);
  
    useEffect(() => {
      axios.get(`${API_BASE}/predictions`, { headers: { Authorization: "Bearer " + token } })
        .then(res => setPreds(res.data.data || []))
        .catch(err => console.error(err));
    }, [token]);
  
    return (
      <div className="fade-in">
        <h2 className="section-title" style={{ marginBottom: '25px' }}>Lượt giám định gần nhất</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'var(--primary-dark)', color: 'white' }}>
            <tr>
              <th style={{ padding: '15px' }}>Thời gian</th>
              <th style={{ padding: '15px' }}>Người dùng</th>
              <th style={{ padding: '15px' }}>Kết quả dự đoán</th>
              <th style={{ padding: '15px' }}>Quốc gia</th>
            </tr>
          </thead>
          <tbody>
            {preds.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--stroke)' }}>
                <td style={{ padding: '15px', fontSize: '0.85rem', opacity: 0.7 }}>{new Date(p.created_at).toLocaleString()}</td>
                <td style={{ padding: '15px', fontWeight: 600 }}>{p.user?.name}</td>
                <td style={{ padding: '15px', fontWeight: 800, color: 'var(--primary)' }}>{p.final_prediction}</td>
                <td style={{ padding: '15px' }}>{p.country || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
}
