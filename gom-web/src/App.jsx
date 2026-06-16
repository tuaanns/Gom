import React, { useEffect } from 'react';
import { HashRouter, RouterProvider, createHashRouter, useNavigate, useLocation } from 'react-router-dom';
import { routes } from './router/routes';
import { GOOGLE_CLIENT_ID } from './lib/constants';
import { NotifyProvider } from './hooks/useNotify';
import i18n from './i18n';

// Create router instance
const router = createHashRouter(routes);

// Legacy hash redirect component
const LegacyHashRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Handle legacy hash routes like /#payment, /#home, etc.
    const hash = window.location.hash;

    // Extract legacy view from hash (e.g., /#payment -> payment)
    const legacyMatch = hash.match(/^#\/?([^/]+)$/);

    if (legacyMatch) {
      const legacyView = legacyMatch[1];

      // Map legacy views to new routes
      const legacyMap = {
        'debate': '/',
        'home': '/',
        'lines': '/ceramics',
        'ceramics': '/ceramics',
        'history': '/history',
        'profile': '/profile',
        'payment': '/payment',
        'transaction_history': '/transactions',
        'transactions': '/transactions',
        'contact': '/contact',
        'about': '/about',
        'terms': '/terms',
        'privacy': '/privacy',
        'admin_dashboard': '/admin',
        'admin': '/admin',
      };

      const newPath = legacyMap[legacyView];

      if (newPath && location.pathname !== newPath) {
        console.log('[Legacy Redirect]', legacyView, '->', newPath);
        navigate(newPath, { replace: true });
      }
    }
  }, [navigate, location]);

  return null;
};

function App() {
  // Sync language from URL query parameters (?lng=en or #/route?lng=en)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    let lng = searchParams.get('lng') || searchParams.get('lang');
    
    if (!lng && window.location.hash.includes('?')) {
      const hashParts = window.location.hash.split('?');
      if (hashParts.length > 1) {
        const hashParams = new URLSearchParams(hashParts[1]);
        lng = hashParams.get('lng') || hashParams.get('lang');
      }
    }
    
    if (lng && ['vi', 'en'].includes(lng)) {
      if (i18n.language !== lng) {
        i18n.changeLanguage(lng);
      }
    }
  }, []);

  // Set Google client id meta
  useEffect(() => {
    let meta = document.querySelector('meta[name="google-signin-client_id"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'google-signin-client_id');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', GOOGLE_CLIENT_ID);
  }, []);

  return (
    <NotifyProvider>
      <RouterProvider router={router} />
    </NotifyProvider>
  );
}

export default App;

