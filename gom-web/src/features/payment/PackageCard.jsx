import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShimmerBadge } from '../../components/ui/ShimmerBadge';
import { PricingMotionCard } from './PricingMotionCard';
import { PackageSelectButton } from './PackageSelectButton';
import { AnimatedPrice } from './AnimatedPrice';
import { formatNumber } from '../../lib/utils';

const EN_PACKAGE_FALLBACKS = {
  1: { name: 'Basic', discount: null },
  2: { name: 'Popular', discount: 'Save 20%' },
  3: { name: 'Expert', discount: '-30%' },
};

const getEnglishFallback = (pkg) => {
  const byId = EN_PACKAGE_FALLBACKS[pkg.id];
  if (byId) return byId;

  if ((pkg.credits ?? pkg.credit_amount) === 10) return EN_PACKAGE_FALLBACKS[1];
  if ((pkg.credits ?? pkg.credit_amount) === 50) return EN_PACKAGE_FALLBACKS[2];
  if ((pkg.credits ?? pkg.credit_amount) === 200) return EN_PACKAGE_FALLBACKS[3];

  return {};
};

export const PackageCard = ({
  pkg,
  onSelect,
  selected = false,
  animatePrice = false,
  dimmed = false,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';
  const isEn = currentLang.startsWith('en');
  const englishFallback = getEnglishFallback(pkg);
  const pkgName = isEn ? (pkg.name_en || englishFallback.name || pkg.name) : pkg.name;
  const pkgDiscount = isEn ? (pkg.discount_en || englishFallback.discount || pkg.discount) : pkg.discount;
  
  const featured = !!pkg.featured || pkg.is_popular;
  const credits = pkg.credits ?? pkg.credit_amount ?? 0;
  const price = pkg.price ?? pkg.amount ?? 0;
  const pricePerCredit = credits > 0 ? Math.round(price / credits) : 0;

  return (
    <PricingMotionCard
      featured={featured}
      selected={selected}
      dimmed={dimmed}
      onClick={() => onSelect(pkg)}
      className="flex flex-col"
    >
      {/* Top section: Label + Badge */}
      <div className="mb-4 flex min-h-[32px] items-center gap-2">
        <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted dark:text-dark-text-muted">
          {pkgName}
        </span>
        {pkgDiscount && <ShimmerBadge variant="ceramic">{pkgDiscount}</ShimmerBadge>}
        {featured && !pkgDiscount && <ShimmerBadge variant="ceramic">{t('payment.popularBadge')}</ShimmerBadge>}
      </div>

      {/* Credits amount */}
      <h3 className="font-heading text-2xl font-extrabold leading-tight text-navy dark:text-ivory md:text-3xl">
        {formatNumber(credits)} {t('payment.credits')}
      </h3>
      
      {/* Price per credit */}
      <p className="mt-2 text-xs font-medium text-muted dark:text-dark-text-muted">
        {t('payment.perCredit', { price: formatNumber(pricePerCredit) })}
      </p>

      {/* Price - with count-up animation */}
      <div className="mt-6 flex items-baseline gap-1.5">
        <AnimatedPrice
          value={price}
          play={animatePrice}
          suffix=" đ"
          className="font-heading text-4xl font-black text-navy dark:text-ivory md:text-[2.85rem]"
        />
      </div>

      {/* Button - aligned at bottom */}
      <div className="mt-8 border-t border-ceramic-border/60 pt-5 dark:border-ceramic/22">
        <PackageSelectButton
          selected={selected || featured}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(pkg);
          }}
          aria-label={`${t('payment.select')} ${pkgName}`}
        >
          {t('payment.select')}
        </PackageSelectButton>
      </div>
    </PricingMotionCard>
  );
};

export default PackageCard;

