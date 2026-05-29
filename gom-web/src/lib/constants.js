export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
export const AI_BASE = import.meta.env.VITE_AI_BASE || 'http://127.0.0.1:8001';
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '208231172368-34f26e0l7771ngcqa89j9ufj01gm6mtt.apps.googleusercontent.com';

export const APP_NAME = 'The Archivist';
export const APP_TAGLINE = 'AI Multi-Agent Debate for Vietnamese Ceramics';

export const VIEWS = {
  DEBATE: 'debate',
  LINES: 'lines',
  HISTORY: 'history',
  PROFILE: 'profile',
  TRANSACTION_HISTORY: 'transaction_history',
  PAYMENT: 'payment',
  CONTACT: 'contact',
  ABOUT: 'about',
  TERMS: 'terms',
  PRIVACY: 'privacy',
  ADMIN: 'admin_dashboard',
  ADMIN_USERS: 'admin_users',
  ADMIN_CERAMICS: 'admin_ceramics',
  ADMIN_PAYMENTS: 'admin_payments',
  ADMIN_PREDICTIONS: 'admin_predictions',
};

export const PUBLIC_VIEWS = [
  VIEWS.DEBATE,
  VIEWS.LINES,
  VIEWS.CONTACT,
  VIEWS.ABOUT,
  VIEWS.TERMS,
  VIEWS.PRIVACY,
];

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
  LANG: 'i18nextLng',
};

