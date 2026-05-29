import apiClient from '../../lib/apiClient';

// Centralized admin API client — all admin pages use these helpers
export const adminApi = {
  // Dashboard
  dashboard: () => apiClient.get('/admin/dashboard'),

  // Users
  users: (params) => apiClient.get('/admin/users', { params }),
  getUser: (id) => apiClient.get(`/admin/users/${id}`),
  updateUser: (id, data) => apiClient.put(`/admin/users/${id}`, data),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),

  // Ceramic lines
  ceramics: (params) => apiClient.get('/admin/ceramic-lines', { params }),
  getCeramic: (id) => apiClient.get(`/admin/ceramic-lines/${id}`),
  createCeramic: (data) => apiClient.post('/admin/ceramic-lines', data),
  updateCeramic: (id, data) => apiClient.put(`/admin/ceramic-lines/${id}`, data),
  deleteCeramic: (id) => apiClient.delete(`/admin/ceramic-lines/${id}`),

  // Payments (read-only)
  payments: (params) => apiClient.get('/admin/payments', { params }),
  getPayment: (id) => apiClient.get(`/admin/payments/${id}`),

  // Predictions (read-only + detail)
  predictions: (params) => apiClient.get('/admin/predictions', { params }),
  getPrediction: (id) => apiClient.get(`/admin/predictions/${id}`),

  // Payment Packages (CRUD)
  paymentPackages: () => apiClient.get('/admin/payment-packages'),
  createPaymentPackage: (data) => apiClient.post('/admin/payment-packages', data),
  updatePaymentPackage: (id, data) => apiClient.put(`/admin/payment-packages/${id}`, data),
  deletePaymentPackage: (id) => apiClient.delete(`/admin/payment-packages/${id}`),

  // Pages (CRUD)
  pages: () => apiClient.get('/admin/pages'),
  createPage: (data) => apiClient.post('/admin/pages', data),
  updatePage: (id, data) => apiClient.put(`/admin/pages/${id}`, data),
  deletePage: (id) => apiClient.delete(`/admin/pages/${id}`),

  // Token history (read-only)
  tokenHistory: (params) => apiClient.get('/admin/token-history', { params }),

  // Payment Settings (CRUD)
  getPaymentSettings: () => apiClient.get('/admin/payment-settings'),
  updatePaymentSettings: (data) => apiClient.post('/admin/payment-settings', data),

  // API & AI model settings
  getApiSettings: () => apiClient.get('/admin/api-settings'),
  updateApiSettings: (config) => apiClient.post('/admin/api-settings', { config }),
};

