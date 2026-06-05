import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, ChevronDown, Check } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/states';
import { CeramicDetailModal } from './CeramicDetailModal';
import { ceramicsApi } from './api';
import { cn, getErrorMessage } from '../../lib/utils';
import { translateCeramicTerm } from '../../lib/ceramicTranslations';
import ShinyText from '../../components/ui/ShinyText';
import { SEO } from '../../components/SEO';

export const CeramicsPage = ({ notify }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get('openId');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = React.useRef(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    ceramicsApi
      .list()
      .then((res) => {
        if (cancelled) return;
        const data = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setList(data);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = getErrorMessage(err);
        setError(msg);
        notify?.(msg, 'error');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [notify]);

  useEffect(() => {
    if (list.length > 0 && openId) {
      const matched = list.find((it) => it.id.toString() === openId.toString());
      if (matched) {
        setSelected(matched);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('openId');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [list, openId, searchParams, setSearchParams]);

  const countries = useMemo(() => {
    const set = new Set(list.map((it) => it.country).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((it) => {
      if (country !== 'all' && it.country !== country) return false;
      if (!q) return true;
      return [it.name, it.origin, it.country, it.style, it.era]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [list, search, country]);

  return (
    <PageContainer>
      <SEO 
        title={t('ceramics.seoTitle', { defaultValue: t('ceramics.title') })}
        description={t('ceramics.seoDescription', { defaultValue: t('ceramics.subtitle') })}
        keywords={t('ceramics.seoKeywords', { defaultValue: 'dòng gốm, gốm việt nam, gốm lịch sử, men lam, men ngọc' })}
      />
        <PageHeader
          title={
            <ShinyText
              text={t('ceramics.title')}
              speed={3}
              delay={0}
              color="#0A1A42"
              shineColor="#B8CAD8"
              darkColor="#9CA3AF"
              darkShineColor="#FFFFFF"
              spread={80}
              direction="left"
              yoyo={false}
            />
          }
          subtitle={t('ceramics.subtitle')}
        />

        <div className="mb-8 space-y-4">
          {/* Search and Filter Row */}
          <div className="flex gap-3">
            {/* Search Bar */}
            <div className="flex-1">
              <Input
                placeholder={t('ceramics.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search size={16} />}
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all',
                  showDropdown
                    ? 'border-navy bg-navy text-white dark:border-ceramic dark:bg-ceramic dark:text-navy-dark'
                    : 'border-stroke bg-surface text-navy hover:border-navy/50 dark:border-dark-stroke dark:bg-dark-surface dark:text-ivory dark:hover:border-ceramic/50'
                )}
              >
                <Filter size={16} />
                <span>{country === 'all' ? t('ceramics.filterAll') : translateCeramicTerm(country, lang)}</span>
                <ChevronDown size={16} className={cn('transition-transform', showDropdown && 'rotate-180')} />
              </button>

              {/* Dropdown Menu with Scrollbar */}
              {showDropdown && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-stroke bg-surface shadow-lg dark:border-dark-stroke dark:bg-dark-surface">
                  <div className="p-2">
                    <div className="mb-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted dark:text-dark-text-muted">
                      {t('ceramics.filterCountry')}
                    </div>
                    {/* Scrollable container with custom scrollbar */}
                    <div className="max-h-64 overflow-y-auto pr-1" style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(15, 38, 92, 0.3) transparent'
                    }}>
                      {countries.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setCountry(c);
                            setShowDropdown(false);
                          }}
                          className={cn(
                            'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            country === c
                              ? 'bg-navy text-white dark:bg-ceramic dark:text-navy-dark'
                              : 'text-navy hover:bg-surface-alt dark:text-ivory dark:hover:bg-dark-surface-alt'
                          )}
                        >
                          <span>{c === 'all' ? t('ceramics.filterAll') : translateCeramicTerm(c, lang)}</span>
                          {country === c && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Count and Clear */}
          {!loading && !error && (
            <div className="flex items-center justify-between text-xs text-muted dark:text-dark-text-muted">
              <span>
                {filtered.length === list.length
                  ? `${filtered.length} dòng gốm`
                  : `${filtered.length} / ${list.length} kết quả`}
              </span>
              {(search || country !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setCountry('all');
                  }}
                  className="text-danger hover:underline"
                >
                  ✕ Xóa bộ lọc
                </button>
              )}
            </div>
          )}
        </div>

        {loading && <LoadingState message={t('common.loading')} />}
        {!loading && error && <ErrorState message={error} />}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState icon={Filter} title={t('ceramics.noResults')} />
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((line) => (
              <Card
                key={line.id}
                padded={false}
                hoverable
                className="cursor-pointer overflow-hidden"
                onClick={() => setSelected(line)}
              >
                <div className="aspect-[4/3] overflow-hidden bg-surface-alt dark:bg-dark-surface-alt">
                  {line.image_url ? (
                    <img
                      src={line.image_url}
                      alt={line.name}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=800';
                        e.currentTarget.onerror = null;
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted">
                      <Search size={36} />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="mb-2 flex items-center gap-2">
                    {line.is_featured && <Badge variant="gold">{t('ceramics.featured')}</Badge>}
                    {line.country && <Badge variant="navy">{lang === 'en' && line.country_en ? line.country_en : translateCeramicTerm(line.country, lang)}</Badge>}
                  </div>
                  <h3 className="font-heading text-lg font-bold leading-card text-navy dark:text-ivory">
                    {lang === 'en' && line.name_en ? line.name_en : translateCeramicTerm(line.name, lang)}
                  </h3>
                  {line.era && (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider leading-eyebrow text-ceramic-dark">
                      {lang === 'en' && line.era_en ? line.era_en : translateCeramicTerm(line.era, lang)}
                    </p>
                  )}
                  {line.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-paragraph text-muted dark:text-dark-text-muted">
                      {lang === 'en' && line.description_en ? line.description_en : translateCeramicTerm(line.description, lang)}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <CeramicDetailModal item={selected} onClose={() => setSelected(null)} />
    </PageContainer>
  );
};

export default CeramicsPage;

