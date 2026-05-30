import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Sparkles, Shield, Zap, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useNotify } from '../../hooks/useNotify';
import { authApi } from '../../features/auth/api';
import { Aurora } from '../ui/Aurora';
import './NewAuthShell.css';

// Compat shim so we don't have to rewrite all call sites in this file
const api = {
  login: (data) => authApi.login(data),
  register: (data) => authApi.register(data),
  loginSocial: (provider, token) => authApi.socialLogin({ provider, token }),
  forgotPassword: (email) => authApi.forgotPassword({ email }),
  resetPassword: (data) => authApi.resetPassword(data),
};
const isMockMode = () => false;

// GOOGLE IDENTITY BUTTON COMPONENT - Handles its own lifecycle
const GoogleIdentityButton = ({ mode, onCredential }) => {
  const { t, i18n } = useTranslation();
  const containerRef = useRef(null);
  const retryTimerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Only render for login/register
    if (mode !== 'login' && mode !== 'register') return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20;

    const renderButton = () => {
      if (cancelled) return;

      const container = containerRef.current;

      // Wait for container and Google script
      if (!container || !window.google?.accounts?.id) {
        attempts += 1;
        if (attempts <= maxAttempts) {
          retryTimerRef.current = setTimeout(renderButton, 200);
        } else {
          console.error('[Google Button] Failed after', maxAttempts, 'attempts');
        }
        return;
      }

      try {
        // Always clear container before rendering
        container.innerHTML = '';
        setIsReady(false);

        console.log('[Google Button] Rendering for', mode);

        // Initialize Google Identity Services
        window.google.accounts.id.initialize({
          client_id: '208231172368-34f26e0l7771ngcqa89j9ufj01gm6mtt.apps.googleusercontent.com',
          callback: (res) => {
            if (res?.credential) {
              console.log('[Google Button] Credential received');
              onCredential(res.credential);
            }
          },
        });

        // Calculate width (responsive)
        const width = Math.min(360, container.offsetWidth || 360);

        // Render button
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width,
          locale: i18n.language === 'vi' ? 'vi' : 'en',
        });

        setIsReady(true);
        console.log('[Google Button] Rendered successfully');
      } catch (err) {
        console.error('[Google Button] Render error:', err);
      }
    };

    // Start rendering immediately
    retryTimerRef.current = setTimeout(renderButton, 0);

    // Cleanup
    return () => {
      cancelled = true;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [mode, onCredential, i18n.language]);

  return (
    <div className="auth-google-slot">
      {!isReady && <div className="auth-google-loading">{t('auth.loadingGoogle')}</div>}
      <div
        ref={containerRef}
        className="auth-google-render-target"
        style={{ display: isReady ? 'flex' : 'none', width: '100%' }}
      />
    </div>
  );
};

export const NewAuthShell = () => {
  const { setToken, setUser } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();
  const location = useLocation();

  const [subView, setSubView] = useState('login');
  const [resetEmail, setResetEmail] = useState('');

  // Get intended route from location state
  const from = location.state?.from?.pathname || '/';

  return (
    <div className="auth-shell">
      {/* LAYER 0: Aurora Background */}
      <div className="auth-aurora-layer">
        <Aurora colorStops={['#0F265C', '#D4AF37', '#F7F1E8', '#9A6A4F']} />
      </div>

      {/* LAYER 1: Decorative Elements */}
      <div className="auth-grid-overlay" />
      <div className="auth-glow-orb auth-glow-orb-1" />
      <div className="auth-glow-orb auth-glow-orb-2" />

      {/* Language Switcher */}
      <AuthLanguageSwitcher />

      {/* LAYER 2: Content */}
      <motion.div
        className="auth-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <BrandPanel />
        <FormPanel
          setToken={setToken}
          setUser={setUser}
          notify={notify}
          navigate={navigate}
          from={from}
          subView={subView}
          setSubView={setSubView}
          resetEmail={resetEmail}
          setResetEmail={setResetEmail}
        />
      </motion.div>
    </div>
  );
};

// LANGUAGE SWITCHER FOR AUTH PAGE
const AuthLanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const toggle = () => i18n.changeLanguage(lang === 'vi' ? 'en' : 'vi');

  return (
    <button
      onClick={toggle}
      className="auth-lang-switcher"
      title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
      style={{
        position: 'absolute', top: 24, right: 24, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 999,
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(15,38,92,0.2)',
        color: '#0F265C', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,1)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
    >
      <Globe size={15} />
      {lang === 'vi' ? 'EN' : 'VI'}
    </button>
  );
};

// BRAND PANEL
const BrandPanel = () => {
  const { t } = useTranslation();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div className="auth-brand-panel" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div className="auth-brand-header" variants={itemVariants}>
        <img src="/logo.png" alt="The Archivist" className="auth-brand-logo" />
        <h1 className="auth-brand-title">The Archivist</h1>
        <p className="auth-brand-subtitle">{t('auth.brandSubtitle')}</p>
        <p className="auth-brand-tagline">AI-Powered Ceramic Authentication Archive</p>
      </motion.div>

      <motion.div className="auth-brand-features" variants={containerVariants}>
        <motion.div className="auth-brand-feature" variants={itemVariants}>
          <div className="auth-brand-feature-icon">
            <Sparkles size={24} />
          </div>
          <div className="auth-brand-feature-text">
            <div className="auth-brand-feature-title">{t('auth.feature1Title')}</div>
            <div className="auth-brand-feature-desc">{t('auth.feature1Desc')}</div>
          </div>
        </motion.div>

        <motion.div className="auth-brand-feature" variants={itemVariants}>
          <div className="auth-brand-feature-icon">
            <Shield size={24} />
          </div>
          <div className="auth-brand-feature-text">
            <div className="auth-brand-feature-title">{t('auth.feature2Title')}</div>
            <div className="auth-brand-feature-desc">{t('auth.feature2Desc')}</div>
          </div>
        </motion.div>

        <motion.div className="auth-brand-feature" variants={itemVariants}>
          <div className="auth-brand-feature-icon">
            <Zap size={24} />
          </div>
          <div className="auth-brand-feature-text">
            <div className="auth-brand-feature-title">{t('auth.feature3Title')}</div>
            <div className="auth-brand-feature-desc">{t('auth.feature3Desc')}</div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// FORM PANEL
const FormPanel = ({ setToken, setUser, notify, navigate, from, subView, setSubView, resetEmail, setResetEmail }) => {
  if (subView === 'forgot') {
    return <ForgotPasswordForm setSubView={setSubView} notify={notify} setResetEmail={setResetEmail} />;
  }

  if (subView === 'reset') {
    return <ResetPasswordForm setSubView={setSubView} notify={notify} email={resetEmail} />;
  }

  return (
    <LoginRegisterForm
      setToken={setToken}
      setUser={setUser}
      notify={notify}
      navigate={navigate}
      from={from}
      subView={subView}
      setSubView={setSubView}
    />
  );
};

// LOGIN/REGISTER FORM
const LoginRegisterForm = ({ setToken, setUser, notify, navigate, from, subView, setSubView }) => {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const isLogin = subView === 'login';

  // Social auth with navigation
  const sendSocialAuth = async (provider, token) => {
    setLoading(true);
    try {
      const res = await api.loginSocial(provider, token);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      if (res.data.user.language) {
        await i18n.changeLanguage(res.data.user.language);
      }
      notify(t('auth.welcomeJoin', { name: res.data.user.name }), 'success');
      // Navigate to intended route after successful login
      navigate(from, { replace: true });
    } catch (err) {
      notify(err.response?.data?.message || t('auth.socialError', { provider }), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Use useCallback to prevent unnecessary re-renders of GoogleIdentityButton
  const handleGoogleCredential = useCallback(
    (credential) => {
      sendSocialAuth('google', credential);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Form submit with navigation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = isLogin ? await api.login(form) : await api.register(form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      if (res.data.user.language) {
        await i18n.changeLanguage(res.data.user.language);
      }
      const message = isLogin
        ? t('auth.welcomeBackUser', { name: res.data.user.name })
        : t('auth.welcomeJoin', { name: res.data.user.name });
      notify(message, 'success');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || t('auth.authError'));
    }
    setLoading(false);
  };

  // Facebook login
  const handleSocialLogin = (provider) => {
    if (provider === 'Facebook') {
      // In mock mode, simulate Facebook login
      if (isMockMode()) {
        sendSocialAuth('facebook', 'mock_facebook_token');
        return;
      }

      if (window.FB) {
        window.FB.login(
          (res) => {
            if (res.authResponse) {
              sendSocialAuth('facebook', res.authResponse.accessToken);
            } else notify(t('auth.cancelledFacebook'), 'info');
          },
          { scope: 'public_profile,email' }
        );
      } else notify(t('auth.loadingFacebook'), 'info');
    }
  };

  const panelVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
    exit: {
      opacity: 0,
      x: -50,
      transition: { duration: 0.3 },
    },
  };

  return (
    <div className="auth-form-container">
      <AnimatePresence mode="wait">
        <motion.div
          key={subView}
          className={`auth-card ${!isLogin ? 'is-register' : ''}`}
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="auth-card-header">
            <h2 className="auth-card-title">{isLogin ? t('auth.welcomeBack') : t('auth.joinSystem')}</h2>
            <p className="auth-card-subtitle">
              {isLogin ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
            </p>
          </div>

          {error && (
            <motion.div className="auth-error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className={`auth-form ${!isLogin ? 'is-register' : ''}`}>
            {!isLogin && (
              <div className="auth-input-group">
                <label className="auth-input-label">{t('auth.nameLabel')}</label>
                <div className="auth-input-wrapper">
                  <div className="auth-input-icon">
                    <User size={20} />
                  </div>
                  <input
                    className="auth-input"
                    placeholder={t('auth.namePlaceholder')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            <div className="auth-input-group">
              <label className="auth-input-label">EMAIL</label>
              <div className="auth-input-wrapper">
                <div className="auth-input-icon">
                  <Mail size={20} />
                </div>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <div className="auth-input-label-row">
                <label className="auth-input-label">{t('auth.passwordLabel')}</label>
                {isLogin && (
                  <span className="auth-forgot-link" onClick={() => setSubView('forgot')}>
                    {t('auth.forgotPassword')}
                  </span>
                )}
              </div>
              <div className="auth-input-wrapper">
                <div className="auth-input-icon">
                  <Lock size={20} />
                </div>
                <input
                  className="auth-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <div className="auth-input-right" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </div>
              </div>
            </div>

            {!isLogin && (
              <div className="auth-input-group">
                <label className="auth-input-label">{t('auth.confirmPasswordLabel')}</label>
                <div className="auth-input-wrapper">
                  <div className="auth-input-icon">
                    <Lock size={20} />
                  </div>
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="••••••••"
                    value={form.password_confirmation}
                    onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? t('auth.processing') : isLogin ? t('auth.loginBtn') : t('auth.registerBtn')}
            </button>
          </form>

          <div className="auth-divider">
            <span>{t('auth.orConnectVia')}</span>
          </div>

          <div className="auth-social-stack">
            <GoogleIdentityButton key={`google-btn-${i18n.language}`} mode={subView} onCredential={handleGoogleCredential} />
            <button className="auth-social-native auth-facebook-button" onClick={() => handleSocialLogin('Facebook')} type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              {t('auth.loginFacebook')}
            </button>
          </div>

          <p className="auth-switch">
            {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}
            <span className="auth-switch-link" onClick={() => setSubView(isLogin ? 'register' : 'login')}>
              {isLogin ? t('auth.registerNow') : t('auth.loginNow')}
            </span>
          </p>

          <div className="auth-terms" dangerouslySetInnerHTML={{ __html: t('auth.terms') }} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// FORGOT PASSWORD FORM
const ForgotPasswordForm = ({ setSubView, notify, setResetEmail }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.forgotPassword(email);
      notify(t('auth.forgotCodeSent'), 'success');
      setResetEmail(email);
      setSubView('reset');
    } catch (err) {
      notify(err.response?.data?.message || t('auth.forgotError'), 'error');
    }
    setLoading(false);
  };

  return (
    <div className="auth-form-container">
      <motion.div className="auth-card" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
        <div className="auth-back-button" onClick={() => setSubView('login')}>
          <ArrowLeft size={20} />
          <span>{t('auth.goBack')}</span>
        </div>

        <div className="auth-card-header">
          <h2 className="auth-card-title">{t('auth.forgotTitle')}</h2>
          <p className="auth-card-subtitle">{t('auth.forgotSubtitle')}</p>
        </div>

        <form onSubmit={handleReset} className="auth-form">
          <div className="auth-input-group">
            <label className="auth-input-label">EMAIL</label>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <Mail size={20} />
              </div>
              <input
                className="auth-input"
                type="email"
                placeholder={t('auth.emailContactPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? t('auth.processing') : t('auth.sendRequest')}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// RESET PASSWORD FORM
const ResetPasswordForm = ({ setSubView, notify, email }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ code: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.resetPassword({ ...form, email });
      notify(t('auth.resetSuccess2'), 'success');
      setSubView('login');
    } catch (err) {
      notify(err.response?.data?.message || t('auth.resetCodeError'), 'error');
    }
    setLoading(false);
  };

  return (
    <div className="auth-form-container">
      <motion.div className="auth-card" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
        <div className="auth-back-button" onClick={() => setSubView('login')}>
          <ArrowLeft size={20} />
          <span>{t('auth.goBack')}</span>
        </div>

        <div className="auth-card-header">
          <h2 className="auth-card-title">{t('auth.resetTitle')}</h2>
          <p className="auth-card-subtitle">
            {t('auth.resetSubtitle')} <b style={{ color: '#0F265C' }}>{email}</b>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label className="auth-input-label">{t('auth.codeLabel')}</label>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <Mail size={20} />
              </div>
              <input
                className="auth-input"
                placeholder={t('auth.codePlaceholder')}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label className="auth-input-label">{t('auth.newPasswordLabel')}</label>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <Lock size={20} />
              </div>
              <input
                className="auth-input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </div>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? t('auth.processing') : t('auth.confirmReset')}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

