import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HeroSection } from './HeroSection';
import { UploadSection } from './UploadSection';
import { ResultDashboard } from './ResultDashboard';
import { ModelShowcaseSection } from './ModelShowcaseSection';
import { HomeSpotlightCard } from './HomeSpotlightCard';
import { FeaturedCeramicMotionCard } from './FeaturedCeramicMotionCard';
import { analysisApi } from './api';
import { ceramicsApi } from '../ceramics/api';
import { historyApi } from '../history/api';
import { getErrorMessage } from '../../lib/utils';
import { VIEWS } from '../../lib/constants';

import { SEO } from '../../components/SEO';

export const AnalysisPage = ({ token, notify, quota, setQuota, setView, user }) => {
  const { t, i18n } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [featuredLines, setFeaturedLines] = useState([]);

  useEffect(() => {
    ceramicsApi
      .list({ featured: 1 })
      .then((res) => {
        const data = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        setFeaturedLines(data);
      })
      .catch(() => setFeaturedLines([]));
  }, []);

  // Auto-retranslate Lens results when language changes
  const prevLangRef = useRef(i18n.language);
  useEffect(() => {
    const currentLang = i18n.language;
    if (prevLangRef.current === currentLang) return;
    prevLangRef.current = currentLang;

    if (result?.isLensMode && result?.lens_results?.length > 0) {
      setLoading(true);
      analysisApi
        .retranslateLens(result.lens_results, currentLang)
        .then((res) => {
          const data = res.data;
          setResult({
            ...result,
            final_prediction: data.final_prediction,
          });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [i18n.language]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  };

  const onClear = () => {
    setFile(null);
    setPreview(null);
    setError('');
  };

  const analyze = async () => {
    if (!token) {
      notify?.(t('auth.loginRequired', { defaultValue: 'Vui lòng đăng nhập để bắt đầu giám định.' }), 'warning');
      setView?.('auth');
      return;
    }
    if ((quota?.free_used ?? 0) >= (quota?.free_limit ?? 0) && (quota?.token_balance ?? 0) <= 0) {
      notify?.(t('analysis.noQuota'), 'error');
      setView?.(VIEWS.PAYMENT);
      return;
    }
    if (!file) {
      setError(t('analysis.needFile'));
      return;
    }
    setLoading(true);
    setError('');
    const startedAt = Date.now();

    const formData = new FormData();
    formData.append('image', file);
    formData.append('lang', i18n.language);

    try {
      const res = await analysisApi.predict(formData);
      const data = res.data?.data || res.data;
      const q = res.data?.quota || data?.quota || {};
      const predictionId = res.data?.db_id || data?.db_id;
      
      if (q.free_used !== undefined && setQuota) {
        setQuota({
          free_used: q.free_used,
          free_limit: q.free_limit ?? quota?.free_limit ?? 5,
          token_balance: q.token_balance ?? quota?.token_balance ?? 0,
        });
      }
      
      notify?.(t('analysis.completeMsg'), 'success');
      
      // Redirect to history with prediction ID in URL
      if (predictionId) {
        window.location.hash = `#/history?openId=${predictionId}`;
      } else {
        // Fallback: show result on current page
        setResult(data);
      }
    } catch (err) {
      const isConnectionError = !err?.response || err?.code === 'ECONNABORTED';

      if (isConnectionError) {
        try {
          const historyResponse = await historyApi.list();
          const history = Array.isArray(historyResponse.data)
            ? historyResponse.data
            : historyResponse.data?.data || [];
          const recentPrediction = history.find((item) => {
            const createdAt = Date.parse(item?.created_at);
            return Number.isFinite(createdAt) && createdAt >= startedAt - 10000;
          });

          if (recentPrediction?.id) {
            notify?.(t('analysis.processingContinues'), 'info');
            window.location.hash = `#/history?openId=${recentPrediction.id}`;
            return;
          }
        } catch {
          // Fall through to the original connection error when recovery fails.
        }
      }

      const msg = getErrorMessage(err, t('errors.server'));
      setError(msg);
      notify?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };


  const reset = () => {
    setResult(null);
    setFile(null);
    setPreview(null);
    setError('');
  };

  const scrollToUpload = () => {
    document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartAppraisal = () => {
    if (!token) {
      notify?.(t('auth.loginRequired', { defaultValue: 'Vui lòng đăng nhập để bắt đầu giám định.' }), 'warning');
      setView?.('auth');
    } else {
      scrollToUpload();
    }
  };

  // If we have a result, show dashboard
  if (result) {
    return (
      <PageContainer>
        <ResultDashboard result={result} preview={preview} user={user} onReset={reset} />
      </PageContainer>
    );
  }

  const featuredImage = featuredLines[0]?.image_url;
  const trustItems = [
    { icon: Sparkles, k: 'expert' },
    { icon: ShieldCheck, k: 'secure' },
    { icon: Zap, k: 'instant' },
  ];

  const trustContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0.04 : 0.14,
      },
    },
  };

  const trustCardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0.35 : 0.65,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <PageContainer>
      <SEO 
        title={t('home.seoTitle', { defaultValue: t('app.name') })}
        description={t('home.seoDescription', { defaultValue: t('app.tagline') })}
        keywords={t('home.seoKeywords', { defaultValue: 'gốm sứ, đồ cổ, the archivist, ai giám định, gốm việt nam, gốm sứ cổ' })}
      />
        <HeroSection
          onUpload={handleStartAppraisal}
          onExplore={() => setView?.(VIEWS.LINES)}
          featuredImage={featuredImage}
        />

        {/* Trust signals */}
        <section className="py-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mb-7"
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-ceramic-dark dark:text-ceramic">
              Museum-grade Authentication
            </p>
          </motion.div>

          <motion.div
            variants={trustContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.12 }}
            className="grid gap-6 md:grid-cols-3"
          >
            {trustItems.map((it, i) => (
              <motion.div key={it.k} variants={trustCardVariants}>
                <HomeSpotlightCard
                  icon={it.icon}
                  title={t('home.trust.' + it.k)}
                  description={t('home.trust.' + it.k + 'Desc')}
                  withBeam={i === 1}
                />
              </motion.div>
            ))}
          </motion.div>
        </section>

        <UploadSection
          file={file}
          preview={preview}
          loading={loading}
          error={error}
          onFileChange={onFileChange}
          onAnalyze={analyze}
          onClear={onClear}
          isLoggedIn={!!token}
        />

        {/* 3D Model Showcase */}
        <ModelShowcaseSection setView={setView} />

        {/* Featured lines */}
        <section className="py-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mb-10 flex items-center justify-between"
          >
            <h2 className="font-heading text-3xl font-extrabold leading-[1.25] text-navy dark:text-ivory">
              {t('home.featured.title')}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight size={14} />}
              onClick={() => setView?.(VIEWS.LINES)}
            >
              {t('common.viewAll')}
            </Button>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredLines.length === 0 &&
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} padded={false} className="overflow-hidden">
                  <div className="aspect-[4/3] animate-pulse bg-surface-alt dark:bg-dark-surface-alt" />
                  <div className="space-y-2 p-5">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-surface-alt dark:bg-dark-surface-alt" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-surface-alt dark:bg-dark-surface-alt" />
                  </div>
                </Card>
              ))}
            {featuredLines.slice(0, 3).map((line, i) => (
              <motion.div
                key={line.id || i}
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  delay: i * 0.1,
                  duration: prefersReducedMotion ? 0.35 : 0.62,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <FeaturedCeramicMotionCard
                  item={line}
                  onClick={() => setView?.(VIEWS.LINES, '?openId=' + line.id)}
                />
              </motion.div>
            ))}
          </div>
        </section>
    </PageContainer>
  );
};

export default AnalysisPage;

