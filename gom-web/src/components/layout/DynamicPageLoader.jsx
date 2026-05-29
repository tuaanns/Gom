import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { apiClient } from '../../lib/apiClient';
import { PageContainer } from './PageContainer';
import { LoadingState } from '../ui/states';
import { NotFoundPage } from '../../features/errors/NotFoundPage';
import ShinyText from '../ui/ShinyText';
import { SEO } from '../SEO';

export const DynamicPageLoader = ({ slug: propSlug, title, subtitle, children }) => {
  const { t, i18n } = useTranslation();
  const { slug: paramSlug } = useParams();
  const slug = propSlug || paramSlug;
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    setLoading(true);
    setNotFound(false);

    apiClient
      .get(`/pages/${slug}`)
      .then((res) => {
        if (isMounted && res.data?.data) {
          const pageData = res.data.data;
          if (pageData.content && pageData.content.trim() !== '') {
            setPage(pageData);
          } else {
            setNotFound(true);
          }
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setNotFound(true);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <PageContainer narrow>
        <LoadingState message="Loading..." />
      </PageContainer>
    );
  }

  // If DB page exists with content, render the DB content
  if (page && page.content) {
    const isEn = (i18n.language || 'vi').startsWith('en');
    const pageTitle = page.title_en && isEn ? page.title_en : (page.title || title);

    return (
      <PageContainer>
        <SEO
          title={page.seo_title || pageTitle}
          description={page.seo_description}
          keywords={page.seo_keywords}
        />
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 text-center"
        >
          <span className="text-xs font-extrabold uppercase tracking-wider leading-eyebrow text-ceramic-dark dark:text-ceramic">
            {t('admin.pagesPage.customPageDesc')}
          </span>
          <h1 className="mx-auto mt-4 max-w-3xl font-heading text-3xl font-extrabold leading-[1.35] text-balance text-navy dark:text-ivory md:text-5xl md:leading-[1.32]">
            <ShinyText
              text={pageTitle}
              speed={3.5}
              delay={0}
              color="#0A1A42"
              shineColor="#C9D8E6"
              darkColor="#9CA3AF"
              darkShineColor="#FFFFFF"
              spread={90}
              direction="left"
              yoyo={false}
            />
          </h1>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-paragraph text-muted dark:text-dark-text-muted md:text-base md:leading-paragraph-relaxed">
              {subtitle}
            </p>
          )}
        </motion.div>

        {/* Content Section */}
        <motion.div
          initial={{ opacity: 0, y: 26, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative overflow-hidden rounded-[26px] border border-ceramic-border/60 bg-[#FFFCF7] p-8 md:p-12 shadow-[0_20px_50px_-30px_rgba(16,42,86,0.25)] dark:border-ceramic/20 dark:bg-[#0F1830] dark:shadow-[0_20px_50px_-30px_rgba(0,0,0,0.7)]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-ceramic-soft/10 via-transparent to-transparent dark:from-ceramic/5 dark:to-transparent" />
            
            {/* Unsafe HTML rendering for admin content */}
            <div 
              className="prose dark:prose-invert max-w-none text-left"
              dangerouslySetInnerHTML={{ __html: page.content }} 
            />
          </div>
        </motion.div>
      </PageContainer>
    );
  }

  // If page not found and we have no fallback children, render NotFoundPage
  if (notFound && !children) {
    return <NotFoundPage />;
  }

  // Fallback to hardcoded React component
  return <>{children}</>;
};
