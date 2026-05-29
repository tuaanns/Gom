import { useCallback, useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { STORAGE_KEYS } from '../lib/constants';
import i18n from '../i18n';

// useAuth — token/user state + login/logout/refresh
export function useAuth() {
  const [token, setTokenState] = useState(() => localStorage.getItem(STORAGE_KEYS.TOKEN) || null);
  const [user, setUserState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [quota, setQuota] = useState({ free_used: 0, free_limit: 5, token_balance: 0 });

  const setToken = useCallback((newToken) => {
    if (newToken) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
    setTokenState(newToken);
  }, []);

  const setUser = useCallback((newUser) => {
    if (newUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
    setUserState(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) await apiClient.post('/logout');
    } catch {
      // ignore
    }
    setToken(null);
    setUser(null);
    setQuota({ free_used: 0, free_limit: 5, token_balance: 0 });
  }, [token, setToken, setUser]);

  const fetchUser = useCallback(async () => {
    if (!token) return null;
    try {
      const res = await apiClient.get('/user');
      const u = res.data;
      setUser(u);
      
      // Sync language preference from backend user profile
      if (u.language && u.language !== i18n.language) {
        i18n.changeLanguage(u.language);
      }
      setQuota({
        free_used: u.free_predictions_used ?? u.free_used ?? 0,
        free_limit: u.free_limit ?? 5,
        token_balance: u.token_balance ?? 0,
      });
      return u;
    } catch (err) {
      if (err?.response?.status === 401) {
        setToken(null);
        setUser(null);
      }
      return null;
    }
  }, [token, setUser, setToken]);

  // Auto-fetch user when token changes
  useEffect(() => {
    if (token) fetchUser();
  }, [token, fetchUser]);

  return { token, setToken, user, setUser, quota, setQuota, logout, fetchUser };
}
