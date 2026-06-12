import React, { useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { MainHeader } from './MainHeader';
import { Footer } from './Footer';
import { useNotify } from '../../hooks/useNotify';
import { FloatingChatbot } from '../ui/FloatingChatbot';
import { usePageOverrides } from '../../hooks/usePageOverrides';

// AppLayout — main app shell with header, footer, and content area
export const AppLayout = () => {
  const { token, user, quota, setQuota, logout, fetchUser } = useAuth();
  const { notify } = useNotify();

  // Load admin page content overrides into i18n
  usePageOverrides();

  // Sync token balance when chatbot deducts tokens
  const handleQuotaChange = useCallback(
    (changes) => {
      if (changes?.token_balance !== undefined) {
        setQuota((prev) => ({
          ...prev,
          token_balance: changes.token_balance,
        }));
      }
    },
    [setQuota]
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-ivory dark:bg-dark-bg">
      <MainHeader
        user={user}
        quota={quota}
        logout={logout}
      />

      <main className="flex-1">
        <Outlet context={{ notify, fetchUser }} />
      </main>

      <Footer />

      {/* Floating Chatbot — available on all pages */}
      <FloatingChatbot
        user={token ? user : null}
        quota={quota}
        onQuotaChange={handleQuotaChange}
      />
    </div>
  );
};

