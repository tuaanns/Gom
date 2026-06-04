import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { translateCeramicTerm } from '../../lib/ceramicTranslations';

const fallbackImage =
  'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=900';

export const FeaturedCeramicMotionCard = ({
  item,
  onClick,
  className,
}) => {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const prefersReducedMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const [imgSrc, setImgSrc] = useState(item?.image_url || fallbackImage);

  return (
    <motion.article
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={
        prefersReducedMotion
          ? undefined
          : {
              y: -10,
              scale: 1.028,
            }
      }
      whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 260, damping: 23 }}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-[26px] border border-ceramic-border/80 bg-[#FFFCF7] shadow-[0_18px_36px_-26px_rgba(16,42,86,0.68)]',
        'dark:border-ceramic/35 dark:bg-[#101A33] dark:shadow-[0_20px_52px_-30px_rgba(0,0,0,0.82)]',
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-alt dark:bg-dark-surface-alt">
        <motion.img
          src={imgSrc}
          alt={item?.name || 'Featured ceramic'}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  scale: isHovered ? 1.08 : 1,
                  rotate: isHovered ? -0.5 : 0,
                }
          }
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="h-full w-full object-cover"
          onError={() => setImgSrc(fallbackImage)}
        />

        <motion.div
          aria-hidden
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  opacity: isHovered ? 0.92 : 0.65,
                }
          }
          transition={{ duration: 0.35 }}
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/30 to-transparent dark:from-[#070D1B]/88"
        />

        {!prefersReducedMotion && (
          <motion.span
            aria-hidden
            animate={{
              x: isHovered ? '245%' : '-130%',
              opacity: isHovered ? 0.6 : 0,
            }}
            transition={{ duration: 0.75, ease: 'easeInOut' }}
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
          />
        )}

        <div className="absolute inset-x-5 bottom-4 text-porcelain">
          <motion.p
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    y: isHovered ? -1 : 6,
                    opacity: isHovered ? 1 : 0.86,
                  }
            }
            transition={{ duration: 0.35 }}
            className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ceramic-soft"
          >
            {lang === 'en' && item?.era_en ? item.era_en : translateCeramicTerm(item?.era, lang)}
          </motion.p>
          <motion.h3
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    y: isHovered ? 0 : 8,
                    opacity: isHovered ? 1 : 0.9,
                  }
            }
            transition={{ duration: 0.38, delay: 0.04 }}
            className="mt-1 font-heading text-xl font-bold leading-[1.25] text-ivory"
          >
            {lang === 'en' && item?.name_en ? item.name_en : translateCeramicTerm(item?.name, lang)}
          </motion.h3>
        </div>
      </div>

      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : {
                y: isHovered ? -5 : 0,
              }
        }
        transition={{ duration: 0.35 }}
        className="relative p-5"
      >
        <p className="line-clamp-2 text-sm leading-[1.8] text-muted dark:text-dark-text-muted">
          {lang === 'en' && item?.description_en ? item.description_en : translateCeramicTerm(item?.description, lang)}
        </p>
      </motion.div>
    </motion.article>
  );
};

export default FeaturedCeramicMotionCard;