import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/apiClient';

/**
 * Hook that fetches admin page content overrides from the API
 * and merges them into the i18n translation resources.
 *
 * This allows admin-edited text to appear on all pages without
 * modifying any page component code.
 *
 * Call this once in your root App component.
 */
export const usePageOverrides = () => {
  const { i18n } = useTranslation();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadOverrides = async () => {
      try {
        const res = await apiClient.get('/pages/overrides');
        const overrides = res.data?.data || res.data || {};

        // overrides = { "about.title": "Custom title", "contact.subtitle": "Custom sub", ... }
        if (typeof overrides === 'object' && Object.keys(overrides).length > 0) {
          const currentLang = i18n.language || 'vi';

          // Build a nested object from dotted keys
          const nested = {};
          for (const [dotKey, value] of Object.entries(overrides)) {
            const parts = dotKey.split('.');
            let current = nested;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!current[parts[i]]) current[parts[i]] = {};
              current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = value;
          }

          // Deep merge into current language resources
          i18n.addResourceBundle(currentLang, 'translation', nested, true, true);
        }
      } catch (err) {
        // Silently fail — overrides are non-critical
        console.warn('[PageOverrides] Failed to load:', err?.message);
      } finally {
        setLoaded(true);
      }
    };

    loadOverrides();
  }, [i18n]);

  return loaded;
};
