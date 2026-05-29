import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { cn } from '../../lib/utils';

import apiClient from '../../lib/apiClient';
import { STORAGE_KEYS } from '../../lib/constants';

export const LanguageToggle = ({ className }) => {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || 'vi').slice(0, 2);

  const toggle = async () => {
    const next = current === 'vi' ? 'en' : 'vi';
    await i18n.changeLanguage(next);
    
    // Sync with backend if logged in
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      try {
        await apiClient.post('/profile/update', { language: next });
      } catch (err) {
        console.error('Failed to sync language preference with backend', err);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-stroke bg-surface px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-navy transition-colors',
        'hover:bg-surface-alt dark:border-dark-stroke dark:bg-dark-surface dark:text-dark-text dark:hover:bg-dark-surface-alt',
        className
      )}
      aria-label="Toggle language"
    >
      <Languages size={14} />
      {current.toUpperCase()}
    </button>
  );
};

export default LanguageToggle;

