import React, { useMemo, useState, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Box } from 'lucide-react';

const ModelViewer = lazy(() => import('../../components/3d/ModelViewer'));

// ModelShowcaseSection — 3D ceramic sample showcase for visual engagement
export const ModelShowcaseSection = () => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [isViewerHovered, setIsViewerHovered] = useState(false);

  // Stable props to prevent ModelViewer remount
  const viewerProps = useMemo(() => ({
    url: "/models/source/Pyxis_724 mit Deckel.glb",
    width: "100%",
    height: 480,
    modelXOffset: 0,
    modelYOffset: 0,
    environmentPreset: "sunset",
    autoRotate: true,
    autoRotateSpeed: 0.3,
    showScreenshotButton: true,
  }), []);

  return (
    <section className="relative overflow-hidden py-20">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-gold/5 to-transparent" />

      <div className="relative">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Eyebrow */}
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-ceramic/15 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-ceramic-dark">
              <Box size={14} />
              {t('home.3d.eyebrow')}
            </span>
          </div>

          {/* Title */}
          <h2 className="font-heading text-3xl font-extrabold leading-[1.35] text-navy dark:text-ivory md:text-4xl md:leading-[1.32]">
            {t('home.3d.title')}
          </h2>

          {/* Description */}
          <p className="mx-auto mt-4 max-w-2xl text-base leading-paragraph text-muted dark:text-dark-text-muted">
            {t('home.3d.description')}
          </p>
        </motion.div>

        {/* 3D Viewer Container */}
        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 flex justify-center"
        >
          <div className="relative w-full max-w-2xl">
            {/* Interactive badge */}
            <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-1.5 text-xs font-bold text-white shadow-lg dark:bg-ceramic dark:text-navy-dark">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75 dark:bg-navy-dark" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white dark:bg-navy-dark" />
                </span>
                {t('home.3d.badge')}
              </span>
            </div>

            {/* 3D Viewer - stable props, no key prop */}
            <motion.div
              onMouseEnter={() => setIsViewerHovered(true)}
              onMouseLeave={() => setIsViewerHovered(false)}
              whileHover={
                prefersReducedMotion
                  ? undefined
                  : {
                    y: -10,
                    scale: 1.014,
                  }
              }
              transition={{ type: 'spring', stiffness: 240, damping: 24 }}
              className="group relative overflow-hidden rounded-[30px] border border-ceramic-border/80 bg-[#FFFCF7] p-2 shadow-[0_28px_60px_-40px_rgba(16,42,86,0.7)] dark:border-ceramic/35 dark:bg-[#101A33]"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    'radial-gradient(420px circle at 50% 20%, rgba(201, 216, 230, 0.3), transparent 70%)',
                }}
              />

              {!prefersReducedMotion && (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute top-0 h-px w-28 bg-gradient-to-r from-transparent via-ceramic-hover to-transparent"
                  animate={{ x: ['-10%', '320%'] }}
                  transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }}
                />
              )}

              <motion.div
                animate={
                  prefersReducedMotion
                    ? undefined
                    : {
                      rotateX: isViewerHovered ? 1.8 : 0,
                      rotateY: isViewerHovered ? -1.8 : 0,
                    }
                }
                style={{ transformPerspective: 1200 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="relative"
              >
                <Suspense fallback={<div className="flex h-[480px] w-full items-center justify-center text-muted">Đang tải mô hình 3D...</div>}>
                  <ModelViewer {...viewerProps} t={t} />
                </Suspense>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ModelShowcaseSection;

