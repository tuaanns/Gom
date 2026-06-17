import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ToastContainer } from '../components/ui/Toast';
import vi from '../i18n/locales/vi.json';
import en from '../i18n/locales/en.json';

// Global toast notification system — single Context owns toast queue, NotifyProvider mounts ToastContainer once

const exactMap = {};
const patternKeys = [];

const extractVarNames = (str) => {
  const matches = str.match(/\{\{(.*?)\}\}/g) || [];
  return matches.map((m) => m.replace(/\{\{|\}\}/g, '').trim());
};

const makeRegex = (template) => {
  let escaped = template.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  escaped = escaped.replace(/\\\{\\\{(.*?)\\\}\\\}/g, '([\\s\\S]*?)');
  return new RegExp('^' + escaped + '$');
};

const processTranslations = (viObj, enObj, prefix = '') => {
  for (const k in viObj) {
    if (Object.prototype.hasOwnProperty.call(viObj, k)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      const viVal = viObj[k];
      const enVal = enObj?.[k];

      if (typeof viVal === 'object' && viVal !== null && !Array.isArray(viVal)) {
        processTranslations(viVal, enVal, fullKey);
      } else if (typeof viVal === 'string') {
        const hasViVars = viVal.includes('{{');
        const hasEnVars = enVal && typeof enVal === 'string' && enVal.includes('{{');

        if (hasViVars || hasEnVars) {
          const viVars = extractVarNames(viVal);
          const enVars = enVal && typeof enVal === 'string' ? extractVarNames(enVal) : [];
          const varNames = viVars.length ? viVars : enVars;

          patternKeys.push({
            key: fullKey,
            regexVi: makeRegex(viVal),
            regexEn: enVal && typeof enVal === 'string' ? makeRegex(enVal) : null,
            varNames,
          });
        } else {
          exactMap[viVal.trim()] = fullKey;
          if (enVal && typeof enVal === 'string') {
            exactMap[enVal.trim()] = fullKey;
          }
        }
      }
    }
  }
};

processTranslations(vi, en);

const findI18nKey = (text) => {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (exactMap[trimmed]) {
    return { key: exactMap[trimmed], options: {} };
  }

  for (const pk of patternKeys) {
    if (pk.regexVi && pk.regexVi.test(trimmed)) {
      const match = trimmed.match(pk.regexVi);
      const options = {};
      pk.varNames.forEach((name, i) => {
        options[name] = match[i + 1];
      });
      return { key: pk.key, options };
    }
    if (pk.regexEn && pk.regexEn.test(trimmed)) {
      const match = trimmed.match(pk.regexEn);
      const options = {};
      pk.varNames.forEach((name, i) => {
        options[name] = match[i + 1];
      });
      return { key: pk.key, options };
    }
  }

  return null;
};

const NotifyContext = createContext(null);

const DEFAULT_DURATION = 4500;
const VALID_TYPES = new Set(['success', 'error', 'info', 'warning']);

export const NotifyProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  // Track active timers so we can clear them on dismiss / unmount.
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message, type = 'info', duration = DEFAULT_DURATION) => {
      if (message == null) return;
      const safeType = VALID_TYPES.has(type) ? type : 'info';
      // Coerce non-string messages (Error objects, axios errors) to a readable string.
      let text;
      if (typeof message === 'string') text = message;
      else if (message?.message) text = String(message.message);
      else {
        try { text = JSON.stringify(message); } catch { text = String(message); }
      }

      const match = findI18nKey(text);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      if (match) {
        setToasts((prev) => [...prev, { id, message: match.key, options: match.options, isKey: true, type: safeType }]);
      } else {
        setToasts((prev) => [...prev, { id, message: text, options: {}, isKey: false, type: safeType }]);
      }

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toasts, notify, dismiss }), [toasts, notify, dismiss]);

  return (
    <NotifyContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </NotifyContext.Provider>
  );
};

// Returns global { toasts, notify, dismiss }. Falls back to no-op if provider is missing.
export function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) {
    if (typeof window !== 'undefined' && !window.__notifyWarned) {
      // eslint-disable-next-line no-console
      console.warn('[useNotify] NotifyProvider is not mounted. Toasts will be no-ops.');
      window.__notifyWarned = true;
    }
    return {
      toasts: [],
      notify: () => undefined,
      dismiss: () => undefined,
    };
  }
  return ctx;
}

export default useNotify;
