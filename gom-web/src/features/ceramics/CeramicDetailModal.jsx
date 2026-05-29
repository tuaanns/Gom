import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Box } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import ModelViewer from '../../components/3d/ModelViewer';
import { cn } from '../../lib/utils';
import { translateCeramicTerm } from '../../lib/ceramicTranslations';
import { AI_BASE } from '../../lib/constants';

const translationCache = new Map();

export const CeramicDetailModal = ({ item, onClose }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [viewMode, setViewMode] = useState('image');

  // Auto-translate long text logic
  const [translatedContent, setTranslatedContent] = useState({});
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState(false);

  const performTranslation = React.useCallback(async (abortSignal) => {
    if (lang === 'vi' || !item) {
      setTranslatedContent({});
      setTranslateError(false);
      return;
    }

    const textsToTranslate = {
      description: item?.description,
      characteristics: item?.characteristics,
      techniques: item?.techniques
    };

    const newTranslatedContent = {};
    let needsApiCall = false;
    let fullTextToTranslate = '';

    // Check local dictionary and cache first
    for (const [key, text] of Object.entries(textsToTranslate)) {
      if (!text) continue;

      const localTrans = translateCeramicTerm(text, lang);
      if (localTrans !== text) {
        newTranslatedContent[key] = localTrans;
        continue;
      }

      const cacheKey = `${text.substring(0, 50)}_${lang}`;
      if (translationCache.has(cacheKey)) {
        newTranslatedContent[key] = translationCache.get(cacheKey);
      } else {
        needsApiCall = true;
        fullTextToTranslate += `[${key}]\n${text}\n\n`;
      }
    }

    if (!needsApiCall) {
      setTranslatedContent((prev) => ({ ...prev, ...newTranslatedContent }));
      setTranslateError(false);
      return;
    }

    setTranslating(true);
    setTranslateError(false);

    try {
      const res = await fetch(`${AI_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullTextToTranslate, target_lang: lang }),
        signal: abortSignal,
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const translated = data.translated_text || '';
      
      // Parse the combined translated text back to individual fields
      let currentKey = null;
      let currentText = '';
      
      const lines = translated.split('\n');
      for (const line of lines) {
        if (line.startsWith('[description]')) {
          if (currentKey) newTranslatedContent[currentKey] = currentText.trim();
          currentKey = 'description';
          currentText = '';
        } else if (line.startsWith('[characteristics]')) {
          if (currentKey) newTranslatedContent[currentKey] = currentText.trim();
          currentKey = 'characteristics';
          currentText = '';
        } else if (line.startsWith('[techniques]')) {
          if (currentKey) newTranslatedContent[currentKey] = currentText.trim();
          currentKey = 'techniques';
          currentText = '';
        } else if (currentKey) {
          currentText += line + '\n';
        }
      }
      if (currentKey) newTranslatedContent[currentKey] = currentText.trim();

      // Cache the results
      for (const [key, text] of Object.entries(textsToTranslate)) {
        if (text && newTranslatedContent[key]) {
          const cacheKey = `${text.substring(0, 50)}_${lang}`;
          translationCache.set(cacheKey, newTranslatedContent[key]);
        }
      }
      
      setTranslatedContent((prev) => ({ ...prev, ...newTranslatedContent }));
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('AI translation failed, falling back to Google Translate:', err);
        // Fallback to free Google Translate for each remaining field individually
        try {
          for (const [key, text] of Object.entries(textsToTranslate)) {
            if (!text || newTranslatedContent[key]) continue;
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
            const gRes = await fetch(url, { signal: abortSignal });
            if (gRes.ok) {
              const gJson = await gRes.json();
              if (gJson && gJson[0]) {
                const translated = gJson[0].map(item => item[0]).join('');
                newTranslatedContent[key] = translated;
                const cacheKey = `${text.substring(0, 50)}_${lang}`;
                translationCache.set(cacheKey, translated);
              }
            }
          }
          setTranslatedContent((prev) => ({ ...prev, ...newTranslatedContent }));
        } catch (gErr) {
          if (gErr.name !== 'AbortError') {
            console.error('All translation fallbacks failed:', gErr);
            setTranslateError(true);
          }
        }
      }
    } finally {
      setTranslating(false);
    }
  }, [lang, item]);

  React.useEffect(() => {
    const controller = new AbortController();
    performTranslation(controller.signal);
    return () => controller.abort();
  }, [performTranslation]);

  if (!item) return null;
  const has3DModel = item.model_url || item.model_3d_url;

  return (
    <Modal open={!!item} onClose={onClose} size="xl" title={translateCeramicTerm(item.name, lang)}>
      <div className="grid gap-6 p-6 lg:grid-cols-2">
        {/* Left side: Image or 3D viewer */}
        <div className="space-y-4">
          {/* View mode toggle */}
          {has3DModel && (
            <div className="flex gap-2 rounded-xl bg-surface-alt p-1 dark:bg-dark-surface-alt">
              <button
                onClick={() => setViewMode('image')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                  viewMode === 'image'
                    ? 'bg-navy text-white shadow-sm dark:bg-ceramic dark:text-navy-dark'
                    : 'text-muted hover:text-navy dark:text-dark-text-muted dark:hover:text-ivory'
                )}
              >
                <Image size={16} />
                <span>{t('ceramics.detail.imageView') || 'Image'}</span>
              </button>
              <button
                onClick={() => setViewMode('3d')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                  viewMode === '3d'
                    ? 'bg-navy text-white shadow-sm dark:bg-ceramic dark:text-navy-dark'
                    : 'text-muted hover:text-navy dark:text-dark-text-muted dark:hover:text-ivory'
                )}
              >
                <Box size={16} />
                <span>{t('ceramics.detail.3dView') || '3D View'}</span>
              </button>
            </div>
          )}

          {/* Content area */}
          <div className="overflow-hidden rounded-2xl bg-surface-alt dark:bg-dark-surface-alt">
            {viewMode === 'image' ? (
              // Image view
              item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-muted">
                  No image
                </div>
              )
            ) : (
              // 3D view - only show if model URL exists
              <div className="flex items-center justify-center p-4">
                <ModelViewer
                  url={item.model_url || item.model_3d_url}
                  width="100%"
                  height={500}
                  modelXOffset={0}
                  modelYOffset={0}
                  enableMouseParallax
                  enableHoverRotation
                  environmentPreset="sunset"
                  fadeIn={true}
                  autoRotate={false}
                  autoRotateSpeed={0.35}
                  showScreenshotButton
                />
              </div>
            )}
          </div>
        </div>

        {/* Right side: Details */}
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {item.is_featured && <Badge variant="gold">{t('ceramics.featured')}</Badge>}
            {item.country && <Badge variant="navy">{translateCeramicTerm(item.country, lang)}</Badge>}
            {item.era && <Badge variant="info">{translateCeramicTerm(item.era, lang)}</Badge>}
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-heading text-3xl font-bold text-navy dark:text-ivory">{translateCeramicTerm(item.name, lang)}</h2>
            {translating && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-ceramic">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <span>Translating...</span>
              </div>
            )}
            {translateError && lang !== 'vi' && !translating && (
              <button
                onClick={() => performTranslation()}
                className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
              >
                ⚠️ Translation failed. Retry?
              </button>
            )}
          </div>

          <div className="grid gap-3 text-sm">
            {item.origin && (
              <DetailRow label={t('ceramics.detail.origin')} value={translateCeramicTerm(item.origin, lang)} />
            )}
            {item.country && (
              <DetailRow label={t('ceramics.detail.country')} value={translateCeramicTerm(item.country, lang)} />
            )}
            {item.era && <DetailRow label={t('ceramics.detail.era')} value={translateCeramicTerm(item.era, lang)} />}
            {item.style && <DetailRow label={t('ceramics.detail.style')} value={translateCeramicTerm(item.style, lang)} />}
          </div>

          {item.description && (
            <Section title={t('ceramics.detail.history')}>
              <p className="whitespace-pre-line">{translatedContent.description || item.description}</p>
            </Section>
          )}
          {item.characteristics && (
            <Section title={t('ceramics.detail.characteristics')}>
              <p className="whitespace-pre-line">{translatedContent.characteristics || item.characteristics}</p>
            </Section>
          )}
          {item.techniques && (
            <Section title={t('ceramics.detail.techniques')}>
              <p className="whitespace-pre-line">{translatedContent.techniques || item.techniques}</p>
            </Section>
          )}
        </div>
      </div>
    </Modal>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 rounded-xl border border-stroke px-4 py-2.5 dark:border-dark-stroke">
    <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-dark-text-muted">
      {label}
    </span>
    <span className="text-right text-sm font-semibold text-navy dark:text-ivory">{value}</span>
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <h4 className="mb-2 font-heading text-base font-bold text-navy dark:text-ivory">{title}</h4>
    <div className="text-sm leading-relaxed text-muted dark:text-dark-text-muted">{children}</div>
  </div>
);

export default CeramicDetailModal;

