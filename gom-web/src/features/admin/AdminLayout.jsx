import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Layers,
  Receipt,
  Sparkles,
  Coins,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Home,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../../components/ui/Avatar';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '../../components/ui/LanguageToggle';

const SIDEBAR_ITEMS = [
  { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard, path: '/admin' },
  { id: 'users', labelKey: 'users', icon: Users, path: '/admin/users' },
  { id: 'ceramics', labelKey: 'ceramicLines', icon: Layers, path: '/admin/ceramics' },
  { id: 'pages', labelKey: 'pages', icon: Layers, path: '/admin/pages' },
  { id: 'payment-packages', labelKey: 'paymentPackages', icon: Receipt, path: '/admin/payment-packages' },
  { id: 'payments', labelKey: 'paymentsHistory', icon: Receipt, path: '/admin/payments' },
  { id: 'predictions', labelKey: 'predictions', icon: Sparkles, path: '/admin/predictions' },
  { id: 'token-history', labelKey: 'tokenHistory', icon: Coins, path: '/admin/token-history' },
  { id: 'payment-settings', labelKey: 'paymentSettings', icon: Receipt, path: '/admin/payment-settings' },
  { id: 'api-settings', labelKey: 'apiSettings', icon: KeyRound, path: '/admin/api-settings' },
];

export const AdminLayout = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout(); // Call API logout
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect even if API fails
      navigate('/auth');
    }
  };

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out dark:bg-gray-800 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6 dark:border-gray-700">
            <h1 className="font-heading text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {t('admin.panelTitle')}
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {/* Back to Homepage */}
            <button
              onClick={() => {
                navigate('/');
                setSidebarOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 mb-2"
            >
              <Home size={18} />
              {t('admin.backToHome')}
            </button>

            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  <Icon size={18} />
                  {t(`admin.${item.labelKey}`)}
                </button>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-3 flex items-center gap-3">
              <Avatar src={user?.avatar} name={user?.name} size="sm" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleTheme}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:hidden"
            >
              <Menu size={24} />
            </button>
            <h1 className="font-heading text-base font-bold text-gray-900 dark:text-white sm:text-lg">
              {SIDEBAR_ITEMS.find((i) => isActive(i.path)) ? t(`admin.${SIDEBAR_ITEMS.find((i) => isActive(i.path)).labelKey}`) : t('admin.panelTitle')}
            </h1>
          </div>
          <div className="hidden items-center gap-4 sm:flex">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('admin.welcomeBack')} <span className="font-semibold text-gray-900 dark:text-white">{user?.name}</span>
            </span>
            <LanguageToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <LogOut className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('admin.confirmLogout')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('admin.logoutMessage')}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t('admin.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              >
                {t('admin.logout')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast container is mounted globally by NotifyProvider in App.jsx */}
    </div>
  );
};

export default AdminLayout;
