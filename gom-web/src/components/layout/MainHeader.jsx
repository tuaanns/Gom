import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Plus, User, CreditCard, FileText, LogOut, Shield, ChevronDown, Zap, Gift } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { LanguageToggle } from '../ui/LanguageToggle';
import { ThemeToggle } from '../../theme/ThemeToggle';
import { useTheme } from '../../theme/ThemeProvider';
import PillNav from '../ui/PillNav';
import { cn } from '../../lib/utils';
import { apiClient } from '../../lib/apiClient';

export const MainHeader = ({ user, quota, logout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const badgeRef = useRef(null);
  const [customPages, setCustomPages] = useState([]);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/pages')
      .then((res) => {
        if (isMounted && res.data?.data) {
          const allPages = res.data.data;
          const defaultSlugs = ['home', 'ceramics', 'history', 'contact', 'about', 'terms', 'privacy', 'header', 'footer'];
          const custom = allPages.filter(p => !defaultSlugs.includes(p.slug));
          setCustomPages(custom);
        }
      })
      .catch((err) => {
        console.warn('Failed to load dynamic pages:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const rawNavItems = t('header.navItems', { returnObjects: true });
  const navItems = Array.isArray(rawNavItems) ? rawNavItems : [
    { href: '/', label: t('nav.home') },
    { href: '/ceramics', label: t('nav.lines') },
    { href: '/history', label: t('nav.history') },
    { href: '/contact', label: t('nav.contact') },
    { href: '/about', label: t('nav.about') },
  ];

  const mergedNavItems = [
    ...navItems,
    ...customPages.map(p => ({ href: `/${p.slug}`, label: p.title }))
  ];

  // Filter out private routes if the user is not authenticated
  const filteredNavItems = mergedNavItems.filter(item => {
    if (!user) {
      // Hide history and payment-related pages for guest users
      return !['/history', '/payment', '/transactions'].includes(item.href);
    }
    return true;
  });

  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!showDropdown && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 10, right: window.innerWidth - rect.right });
    }
    setShowDropdown((prev) => !prev);
  };

  useEffect(() => {
    if (!showDropdown) return;
    const handler = () => setShowDropdown(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showDropdown]);

  const remainingFree = Math.max(0, (quota?.free_limit ?? 0) - (quota?.free_used ?? 0));
  const tokenBalance = quota?.token_balance ?? 0;
  const noQuota = remainingFree <= 0 && tokenBalance <= 0;

  // PillNav colors based on theme - FIXED for proper contrast
  const pillNavColors = resolvedTheme === 'dark'
    ? {
      baseColor: 'rgba(255, 255, 255, 0.06)',     // Subtle container background
      pillColor: '#F7F2E8',                        // Ivory for active pill
      hoveredPillTextColor: '#102A56',             // Navy text on hover (when pill is ivory)
      pillTextColor: '#F7F2E8',                    // Ivory text for inactive pills
    }
    : {
      baseColor: 'rgba(16, 42, 86, 0.04)',        // Subtle navy tint container
      pillColor: '#102A56',                        // Navy for active pill
      hoveredPillTextColor: '#FFFFFF',             // White text on hover (when pill is navy)
      pillTextColor: '#102A56',                    // Navy text for inactive pills
    };

  return (
    <header className="sticky top-0 z-40 border-b border-stroke/60 bg-ivory/85 backdrop-blur-md dark:border-dark-stroke dark:bg-dark-bg/85">
      <div className="mx-auto flex h-16 max-w-content items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo Text - visible on larger screens */}
        <Link
          to="/"
          className="hidden shrink-0 items-center gap-2 transition-opacity hover:opacity-80 lg:flex"
          aria-label="Home"
        >
          <img
            src="/logo.png"
            alt={t('brand.name')}
            className="h-10 w-auto object-contain"
            loading="eager"
          />
          <span className="sr-only">{t('brand.name')}</span>
        </Link>

        {/* PillNav - NO logo, just nav items */}
        <div className="flex-1 flex justify-center lg:flex-initial">
          <PillNav
            showLogo={false}
            items={filteredNavItems}
            activeHref={location.pathname}
            initialLoadAnimation={false}
            {...pillNavColors}
          />
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              {/* Quota - Hover to see label */}
              <div className="hidden items-center gap-2 md:flex">
                {tokenBalance > 0 && (
                  <div 
                    className="group relative flex items-center gap-1.5 rounded-full bg-ceramic/15 px-3 py-1.5 transition-all hover:bg-ceramic/25"
                    title={t('payment.credits')}
                  >
                    <Zap size={14} className="text-ceramic-dark" />
                    <span className="text-xs font-bold text-ceramic-dark">{tokenBalance}</span>
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-navy px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-ivory dark:text-navy">
                      {t('payment.credits')}
                    </span>
                  </div>
                )}
                {remainingFree > 0 && (
                  <div 
                    className="group relative flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 transition-all hover:bg-success/25"
                    title={t('header.freeQuota')}
                  >
                    <Gift size={14} className="text-success" />
                    <span className="text-xs font-bold text-success">{remainingFree}</span>
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-navy px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-ivory dark:text-navy">
                      {t('header.freeQuota')}
                    </span>
                  </div>
                )}
                {noQuota && (
                  <span className="rounded-full bg-danger/15 px-3 py-1.5 text-xs font-bold text-danger">
                    {t('header.noQuota')}
                  </span>
                )}
              </div>

              {/* Top up CTA */}
              <Link
                to="/payment"
                className="hidden items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-navy-light hover:shadow-md active:scale-95 dark:bg-ceramic dark:text-navy-dark dark:hover:bg-ceramic-hover sm:inline-flex"
              >
                <Plus size={14} strokeWidth={3} />
                <span>{t('header.topupShort')}</span>
              </Link>
            </>
          ) : (
            // Login button for guest users
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-navy-light hover:shadow-md active:scale-95 dark:bg-ceramic dark:text-navy-dark dark:hover:bg-ceramic-hover"
            >
              <span>{t('auth.loginBtn', { defaultValue: 'Đăng nhập' })}</span>
            </Link>
          )}

          {/* Theme */}
          <ThemeToggle />

          {/* Language */}
          <LanguageToggle className="hidden md:inline-flex" />

          {/* Avatar */}
          {user && (
            <button
              ref={badgeRef}
              type="button"
              onClick={toggleDropdown}
              className="flex items-center gap-2 rounded-full border border-stroke bg-surface px-1.5 py-1.5 transition-colors hover:bg-surface-alt dark:border-dark-stroke dark:bg-dark-surface dark:hover:bg-dark-surface-alt"
            >
              <Avatar src={user?.avatar} name={user?.name} size="sm" />
              <ChevronDown size={14} className="mr-1 text-muted dark:text-dark-text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown &&
        createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[9999] w-60 origin-top-right animate-fade-in rounded-2xl border border-stroke bg-surface p-2 shadow-lg dark:border-dark-stroke dark:bg-dark-surface"
            style={{ top: dropdownPos.top, right: dropdownPos.right }}
          >
            <div className="mb-2 border-b border-stroke px-3 py-2 dark:border-dark-stroke">
              <p className="truncate text-sm font-bold text-navy dark:text-ivory">{user?.name}</p>
              <p className="truncate text-xs text-muted dark:text-dark-text-muted">{user?.email}</p>
            </div>

            <DropdownItem
              icon={<User size={16} />}
              label={t('header.myProfile')}
              onClick={() => {
                navigate('/profile');
                setShowDropdown(false);
              }}
            />
            <DropdownItem
              icon={<FileText size={16} />}
              label={t('header.transactionHistory')}
              onClick={() => {
                navigate('/transactions');
                setShowDropdown(false);
              }}
            />
            <DropdownItem
              icon={<CreditCard size={16} />}
              label={t('header.topup')}
              onClick={() => {
                navigate('/payment');
                setShowDropdown(false);
              }}
            />

            {user?.role === 'admin' && (
              <>
                <div className="my-2 h-px bg-stroke dark:bg-dark-stroke" />
                <DropdownItem
                  icon={<Shield size={16} />}
                  label="Dashboard Admin"
                  variant="gold"
                  onClick={() => {
                    navigate('/admin');
                    setShowDropdown(false);
                  }}
                />
              </>
            )}

            <div className="my-2 h-px bg-stroke dark:bg-dark-stroke" />
            <DropdownItem
              icon={<LogOut size={16} />}
              label={t('nav.logout')}
              variant="danger"
              onClick={async () => {
                setShowDropdown(false);
                await logout();
                navigate('/auth');
              }}
            />
          </div>,
          document.body
        )}
    </header>
  );
};

const DropdownItem = ({ icon, label, onClick, variant = 'default' }) => {
  const cls = {
    default: 'text-navy hover:bg-surface-alt dark:text-dark-text dark:hover:bg-dark-surface-alt',
    gold: 'text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/20',
    danger: 'text-danger hover:bg-danger/10',
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors', cls)}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default MainHeader;

