import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Calendar, 
  Target, 
  TrendingUp, 
  Users, 
  Sparkles,
  MapPin,
  Clock,
  Eye,
  Code2,
  Search,
  ExternalLink
} from 'lucide-react';
import { Badge } from './Badge';
import { formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { translateCeramicTerm } from '../../lib/ceramicTranslations';
import { AI_BASE } from '../../lib/constants';

const cleanExtractedLabel = (value) => {
  return String(value || '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()
    .replace(/\s*\([^)]*$/, '')
    .replace(/^(?:là|là dòng|thuộc dòng)\s+/i, '')
    .trim();
};

export const extractLensLabel = (fullText) => {
  const text = String(fullText || '').trim();
  if (!text) return '';

  const leadingNameMatch = text.match(/^\s*((?:gốm|sứ|đồ gốm|đồ sứ|ấm trà|bình|lọ|chum|vase|pottery|porcelain)\s+[A-ZÀ-Ỹ0-9][^.,;:\n]{2,80}(?:\([^)]{2,40}\))?)/i);
  if (leadingNameMatch) {
    return cleanExtractedLabel(leadingNameMatch[1]);
  }

  const boldMatch = text.match(/\*\*([^*]{3,60})\*\*/);
  if (boldMatch) {
    return cleanExtractedLabel(boldMatch[1]);
  }

  const quoteMatch = text.match(/"([^"]{3,60})"/);
  if (quoteMatch) {
    return cleanExtractedLabel(quoteMatch[1]);
  }

  const patternMatch = text.match(/(?:[tT]huộc dòng|[lL]à dòng|[dD]òng gốm|[sS]ản phẩm của|[tT]huộc về|[gG]ốm sứ|[sS]ứ|[gG]ốm)\s+([A-ZÀ-Ỹ][\wÀ-ỹ\s/()]{2,60}?)(?=[.,;!?\n]|\s+(?:[cC]ủa|[tT]huộc|[xX]uất|[vV]ới|[cC]ó|[lL]à|[đĐ]ược|[tT]ừ|[tT]hế|[nN]iên))/)
    || text.match(/(?:[cC]eramic line|[kK]iln|[bB]rand|[pP]orcelain|[pP]ottery)[:\s]+([A-Z][\w\s/()]{2,60}?)(?=[.,;!?\n]|\s+(?:[fF]rom|[oO]f|[iI]n|[wW]ith|[iI]s|[wW]as|[dD]ating))/);

  if (patternMatch) {
    return cleanExtractedLabel(patternMatch[1]);
  }

  const firstClause = text.split(/[.!?\n,;:]/)[0] || text;
  const cleaned = cleanExtractedLabel(firstClause);
  return cleaned.length > 40 ? `${cleaned.substring(0, 37)}...` : cleaned;
};

export const PredictionDetailView = ({ prediction, imageUrl, showUserInfo = true, showDebugInfo = true }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  if (!prediction) return null;

  // Normalize data from different sources
  const result = prediction.result || prediction.result_json || prediction;
  const finalReport = { ...(result.final_report || result) };
  
  let label = finalReport.final_prediction || prediction.predicted_label || prediction.label || '—';
  let country = finalReport.final_country || prediction.country || '—';
  let era = finalReport.final_era || prediction.era || '—';
  
  const isLens = prediction.source_type === 'lens' || result.isLensMode;

  // For Lens, the label often contains the entire summarized paragraph. 
  // Extract the actual ceramic line name, country, era and move the full text to verdict.
  if (isLens && label.length > 50) {
    finalReport.verdict = label;
    const fullText = label;
    label = extractLensLabel(fullText);

    // Extract country from AI text (patterns: "xuất xứ...là **Trung Quốc**", "của **Nhật Bản**")
    if (!country || country === '—' || country === 'Google Lens') {
      const countryMatch = fullText.match(/(?:xuất xứ|quốc gia)[^*]*\*\*([^*]{2,25})\*\*/i)
        || fullText.match(/của\s+\*\*([^*]{2,20})\*\*/i)
        || fullText.match(/(?:xuất xứ|quốc gia)[^.]*là\s+([A-ZÀ-Ỹa-zà-ỹ\s]{2,25}?)(?=\.|\s+niên|\s+đại|$)/i)
        || fullText.match(/gốm sứ truyền thống của\s+([A-ZÀ-Ỹa-zà-ỹ\s]{2,25}?)(?=\.|,|$)/i);
      if (countryMatch) country = countryMatch[1]?.trim();
    }

    // Extract era from AI text
    if (!era || era === '—' || era === 'AI Conclusion') {
      const boldEra = fullText.match(/(?:niên đại|thời kỳ|thời đại)[^*]*\*\*([^*]{2,40})\*\*/i)
        || fullText.match(/\*\*(thế kỷ[^*]{2,20})\*\*/i)
        || fullText.match(/\*\*(khoảng\s+\d{4}[^*]{0,15})\*\*/i);
      if (boldEra) {
        era = boldEra[1] || boldEra[0]?.replace(/\*\*/g, '');
      } else {
        const plainEra = fullText.match(/(?:thuộc về |thuộc |là )(thời kỳ[^,.]{3,30})/i)
          || fullText.match(/(từ những năm \d{3,4}[^,.]{0,20})/i)
          || fullText.match(/(?:có lịch sử|phát triển)[^,.]*(?:từ |thời )([\wÀ-ỹ ]{5,35})/i)
          || fullText.match(/(thế kỷ\s+\d+\s+đến\s+thế kỷ\s+\d+)/i)
          || fullText.match(/(thế kỷ\s+\d+[-–]\d+)/i)
          || fullText.match(/(thế kỷ\s+\d+)/i)
          || fullText.match(/(khoảng\s+\d{4}[-–]\d{4})/i)
          || fullText.match(/(khoảng\s+năm\s+\d{4})/i);
        if (plainEra) {
          era = plainEra[1]?.trim();
        } else if (fullText.toLowerCase().includes('hiện đại')) {
          era = 'Hiện đại';
        } else if (fullText.toLowerCase().includes('cổ vật') || fullText.toLowerCase().includes('đồ cổ') || fullText.toLowerCase().includes('cổ đại')) {
          era = 'Cổ đại';
        } else if (fullText.toLowerCase().includes('không xác định') || fullText.toLowerCase().includes('chưa xác định')) {
          era = 'Chưa xác định';
        }
      }
    }
  }

  // Read confidence from result_json (where Python AI stores it for Lens)
  let rawConfidence = finalReport.final_confidence
    ?? finalReport.confidence
    ?? finalReport.certainty
    ?? prediction.confidence
    ?? prediction.certainty
    ?? result.confidence;

  // Fallback: only if backend truly didn't return any confidence
  if (rawConfidence == null) {
    rawConfidence = 0;
  }

  const confidence = typeof rawConfidence === 'string'
    ? Math.round(parseFloat(rawConfidence) || 0)
    : Math.round(rawConfidence > 1 ? rawConfidence : rawConfidence * 100);
  
  const agentPredictions = result.agents || result.agent_predictions || [];
  const debate = result.debate || [];
  const visualFeatures = result.visual_features || null;
  const lensResults = prediction.lens_results || result.lens_results || [];
  const rawLensStatus = prediction.lens_status || result.lens_status || null;
  const hasDebatePipeline = !isLens && (
    Array.isArray(agentPredictions) && agentPredictions.length > 0
    || !!visualFeatures
    || !!result.final_report
  );
  const lensStatus = rawLensStatus || (hasDebatePipeline ? {
    attempted: true,
    count: Array.isArray(lensResults) ? lensResults.length : 0,
    ok: Array.isArray(lensResults) && lensResults.length > 0,
    message: Array.isArray(lensResults) && lensResults.length > 0
      ? 'Google Lens returned reference sources'
      : 'Google Lens was used as reference context for this appraisal, but it did not return direct source links for this image.',
  } : null);

  const imgSrc = imageUrl || prediction.image_url || prediction.image;

  return (
    <div className="space-y-6">
      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Image */}
        <div className="space-y-4">
          <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-stroke bg-surface-alt dark:border-dark-stroke dark:bg-dark-surface-alt">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={label}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=800';
                }}
              />
            ) : (
              <Sparkles size={48} className="text-muted dark:text-dark-text-muted" />
            )}
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="space-y-4">
          {/* Prediction Result Card */}
          <div className="rounded-xl border border-stroke bg-gradient-to-br from-navy/5 to-ceramic/5 p-6 dark:border-dark-stroke dark:from-navy/10 dark:to-ceramic/10">
            <div className="mb-2 flex items-center gap-2">
              <Target size={20} className="text-navy dark:text-ceramic" />
              <span className="text-sm font-medium text-muted dark:text-dark-text-muted">
                {t('analysis.result.name')}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-navy dark:text-ivory">
              {translateCeramicTerm(label, lang)}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {country && country !== '—' && country !== 'Google Lens' && (
                <div className="flex items-center gap-1.5 rounded-full bg-ceramic/20 px-3 py-1 text-sm dark:bg-ceramic/30">
                  <MapPin size={14} className="text-ceramic-dark dark:text-ceramic" />
                  <span className="font-semibold text-ceramic-dark dark:text-ceramic">{translateCeramicTerm(country, lang)}</span>
                </div>
              )}
              {era && era !== '—' && era !== 'AI Conclusion' && (
                <div className="flex items-center gap-1.5 rounded-full bg-navy/10 px-3 py-1 text-sm dark:bg-ivory/10">
                  <Clock size={14} className="text-navy dark:text-ivory" />
                  <span className="font-semibold text-navy dark:text-ivory">{translateCeramicTerm(era, lang)}</span>
                </div>
              )}
              {isLens && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-sm dark:bg-emerald-500/25">
                  <Search size={14} className="text-emerald-700 dark:text-emerald-400" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Google Lens</span>
                </div>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* User Info */}
            {showUserInfo && prediction.user && (
              <div className="rounded-xl border border-stroke bg-surface p-4 dark:border-dark-stroke dark:bg-dark-surface">
                <div className="mb-2 flex items-center gap-2 text-muted dark:text-dark-text-muted">
                  <User size={16} />
                  <span className="text-xs font-medium uppercase tracking-wide">User</span>
                </div>
                <p className="font-semibold text-navy dark:text-ivory">
                  {prediction.user.name || 'Unknown'}
                </p>
                <p className="text-sm text-muted dark:text-dark-text-muted">
                  {prediction.user.email || `ID: ${prediction.user_id}`}
                </p>
              </div>
            )}

            {/* Date Info */}
            <div className="rounded-xl border border-stroke bg-surface p-4 dark:border-dark-stroke dark:bg-dark-surface">
              <div className="mb-2 flex items-center gap-2 text-muted dark:text-dark-text-muted">
                <Calendar size={16} />
                <span className="text-xs font-medium uppercase tracking-wide">Date</span>
              </div>
              <p className="font-semibold text-navy dark:text-ivory">
                {formatDate(prediction.created_at || prediction.db_created_at || new Date().toISOString())}
              </p>
              {(prediction.id || prediction.db_id) && (
                <p className="text-sm text-muted dark:text-dark-text-muted">
                  ID: #{prediction.id || prediction.db_id}
                </p>
              )}
            </div>

            {/* Confidence Level - Moved here */}
            <div className="rounded-xl border border-stroke bg-surface p-4 dark:border-dark-stroke dark:bg-dark-surface">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted dark:text-dark-text-muted">
                  <TrendingUp size={16} />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Confidence Level
                  </span>
                </div>
                <span
                  className={`text-lg font-bold ${
                    confidence >= 80
                      ? 'text-success'
                      : confidence >= 60
                      ? 'text-warning'
                      : 'text-danger'
                  }`}
                >
                  {confidence}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-stroke dark:bg-dark-stroke">
                <div
                  className={`h-full transition-all duration-500 ${
                    confidence >= 80
                      ? 'bg-success'
                      : confidence >= 60
                      ? 'bg-warning'
                      : 'bg-danger'
                  }`}
                  style={{ width: `${confidence}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Result Sections */}
      <AIResultSections 
        agentPredictions={agentPredictions}
        debate={debate}
        finalReport={finalReport}
        visualFeatures={visualFeatures}
        result={result}
        showDebugInfo={showDebugInfo}
        isLens={isLens}
        lensResults={lensResults}
        lensStatus={lensStatus}
      />
    </div>
  );
};

// Translation cache to avoid repeated API calls
const translationCache = new Map();

// AI Result Sections Component
const AIResultSections = ({ agentPredictions, debate, finalReport, visualFeatures, result, showDebugInfo, isLens, lensResults, lensStatus }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [translatedText, setTranslatedText] = React.useState(null);
  const [translating, setTranslating] = React.useState(false);
const originalText = finalReport?.reasoning || finalReport?.final_reasoning || finalReport?.verdict || '';

  const [translateError, setTranslateError] = React.useState(false);

  const performTranslation = React.useCallback(async (abortSignal) => {
    const originalLang = result?.lang || 'vi';
    if (!originalText || originalText.length < 10 || originalLang === lang) {
      setTranslatedText(null);
      setTranslateError(false);
      return;
    }

    const cacheKey = `${originalText.substring(0, 50)}_${lang}`;
    if (translationCache.has(cacheKey)) {
      setTranslatedText(translationCache.get(cacheKey));
      setTranslateError(false);
      return;
    }

    setTranslating(true);
    setTranslateError(false);

    try {
      let translated = '';
      try {
        const res = await fetch(`${AI_BASE}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: originalText, target_lang: lang }),
          signal: abortSignal,
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        translated = data.translated_text || originalText;
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.warn('AI translation failed, falling back to Google Translate:', err);
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(originalText)}`;
        const gRes = await fetch(url, { signal: abortSignal });
        if (!gRes.ok) throw new Error(`Google Translate returned ${gRes.status}`);
        const gJson = await gRes.json();
        if (gJson && gJson[0]) {
          translated = gJson[0].map(item => item[0]).join('');
        } else {
          translated = originalText;
        }
      }
      translationCache.set(cacheKey, translated);
      setTranslatedText(translated);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Auto-translation failed:', err);
        setTranslateError(true);
        setTranslatedText(null);
      }
    } finally {
      setTranslating(false);
    }
  }, [lang, originalText]);

  // Auto-translate when language changes to non-VI
  React.useEffect(() => {
    const controller = new AbortController();
    performTranslation(controller.signal);
    return () => controller.abort();
  }, [performTranslation]);

  const lensMentioned = /google\s+lens/i.test(originalText || '');
  const shouldShowLens = (Array.isArray(lensResults) && lensResults.length > 0)
    || !!lensStatus?.attempted
    || lensMentioned
    || isLens;

  if (!agentPredictions?.length && !debate?.length && !finalReport?.reasoning && !finalReport?.verdict && !visualFeatures && !lensResults?.length && !shouldShowLens) {
    return null;
  }

  const displayText = (lang !== 'vi' && translatedText) ? translatedText : originalText;

  return (
    <div className="space-y-4 border-t border-stroke pt-6 dark:border-dark-stroke">
      {/* Final Report Reasoning */}
      {finalReport && (finalReport.reasoning || finalReport.final_reasoning || finalReport.verdict) && (
        <div className="rounded-xl border border-navy/20 bg-gradient-to-br from-navy/5 to-ceramic/5 p-5 dark:border-ceramic/20 dark:from-navy/10 dark:to-ceramic/10">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-white dark:bg-ceramic dark:text-navy-dark">
                <Target size={16} />
              </div>
              <h4 className="text-sm font-bold text-navy dark:text-ivory">
                {isLens ? t('analysis.lens.resultTitle', 'Kết luận từ AI (Google Lens)') : t('analysis.result.verdict')}
              </h4>
              {translating && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-ceramic">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  <span>Translating...</span>
                </div>
              )}
            </div>
            {translateError && lang !== 'vi' && !translating && (
              <button
                onClick={() => performTranslation()}
                className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
              >
                ⚠️ Translation failed. Retry?
              </button>
            )}
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-navy dark:text-ivory">
            {displayText}
          </p>
        </div>
      )}

      {/* Google Lens Sources */}
      {Array.isArray(lensResults) && lensResults.length > 0 && (
        <div className="rounded-xl border border-stroke bg-surface p-5 dark:border-dark-stroke dark:bg-dark-surface">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy dark:text-ivory">
            <Search size={16} className="text-ceramic-dark dark:text-ceramic" />
            {t('analysis.lens.sourcesTitle', 'Tài liệu Google Lens tìm được')} ({lensResults.length})
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {lensResults.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-lg border border-stroke bg-surface-alt p-3 transition-all hover:border-ceramic/50 hover:shadow-md dark:border-dark-stroke dark:bg-dark-surface-alt dark:hover:border-ceramic/40"
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ceramic/20 text-ceramic-dark dark:bg-ceramic/30 dark:text-ceramic">
                  <ExternalLink size={12} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-navy group-hover:text-ceramic-dark dark:text-ivory dark:group-hover:text-ceramic">
                    {item.title?.split('\n')[0] || `Source ${idx + 1}`}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted dark:text-dark-text-muted">
                    {(() => { try { return new URL(item.url).hostname; } catch { return item.url; } })()}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {shouldShowLens && (!Array.isArray(lensResults) || lensResults.length === 0) && (
        <div className="rounded-xl border border-stroke bg-surface p-5 dark:border-dark-stroke dark:bg-dark-surface">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-navy dark:text-ivory">
              <Search size={16} className="text-ceramic-dark dark:text-ceramic" />
              Google Lens
            </h4>
            <Badge variant="gold" className="text-xs">
              {t('analysis.lens.noDirectSources', 'No direct sources')}
            </Badge>
          </div>
          <div className="rounded-lg border border-stroke bg-surface-alt p-4 text-sm leading-relaxed text-muted dark:border-dark-stroke dark:bg-dark-surface-alt dark:text-dark-text-muted">
            {lensStatus?.message
              || t(
                'analysis.lens.noSourcesStatus',
                'Google Lens was used as reference context for this appraisal, but it did not return direct source links for this image.'
              )}
            {lensMentioned && (
              <p className="mt-2 text-navy dark:text-ivory">
                {t(
                  'analysis.lens.mentionedInVerdict',
                  'The final verdict still includes the Lens signal in its reasoning.'
                )}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Agent Predictions */}
      {Array.isArray(agentPredictions) && agentPredictions.length > 0 && (
        <div className="rounded-xl border border-stroke bg-surface p-5 dark:border-dark-stroke dark:bg-dark-surface">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy dark:text-ivory">
            <Sparkles size={16} className="text-ceramic-dark dark:text-ceramic" />
            {t('analysis.result.agents')} ({agentPredictions.length})
          </h4>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {agentPredictions.map((agent, i) => (
              <AgentCard key={i} agent={agent} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Debate Transcript */}
      {Array.isArray(debate) && debate.length > 0 && (
        <div className="rounded-xl border border-stroke bg-surface p-5 dark:border-dark-stroke dark:bg-dark-surface">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy dark:text-ivory">
            <Users size={16} className="text-clay" />
            {t('analysis.result.debate')} ({debate.length})
          </h4>
          <div className="space-y-3">
            {debate.map((d, i) => (
              <div
                key={i}
                className="rounded-lg border border-stroke bg-surface-alt p-3 dark:border-dark-stroke dark:bg-dark-surface-alt"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="navy" className="text-xs">
                    {d.agent || d.role || `Round ${i + 1}`}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-navy dark:text-ivory">
                  {d.content || d.argument || d.message || d.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Features */}
      {showDebugInfo && visualFeatures && (
        <details className="rounded-xl border border-stroke bg-surface p-4 dark:border-dark-stroke dark:bg-dark-surface">
          <summary className="cursor-pointer select-none text-sm font-semibold text-navy hover:text-navy-light dark:text-ivory dark:hover:text-ceramic">
            <span className="inline-flex items-center gap-2">
              <Eye size={16} className="text-ceramic-dark dark:text-ceramic" />
              Visual Features
            </span>
          </summary>
          <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-surface-alt p-3 text-xs text-navy dark:bg-dark-surface-alt dark:text-ivory">
            {JSON.stringify(visualFeatures, null, 2)}
          </pre>
        </details>
      )}

      {/* Raw JSON */}
      {showDebugInfo && result && (
        <details className="rounded-xl border border-stroke bg-surface p-4 dark:border-dark-stroke dark:bg-dark-surface">
          <summary className="cursor-pointer select-none text-sm font-semibold text-navy hover:text-navy-light dark:text-ivory dark:hover:text-ceramic">
            <span className="inline-flex items-center gap-2">
              <Code2 size={16} className="text-navy dark:text-ceramic" />
              Raw JSON Data
            </span>
          </summary>
          <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-surface-alt p-3 text-xs text-navy dark:bg-dark-surface-alt dark:text-ivory">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

// Agent Card Component
const AgentCard = ({ agent, index }) => {
  const { t, i18n } = useTranslation();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const lang = i18n.language;

  const conf = agent?.confidence != null ? Math.round(agent.confidence * 100) : null;
  const pred = agent?.prediction || {};
  const label = pred.ceramic_line || agent?.label || agent?.verdict || agent?.agent_name || `Agent ${index + 1}`;
  const name = agent?.agent_name || `Agent ${index + 1}`;
  const country = pred.country || agent?.country;
  const era = pred.era || agent?.era;
  const evidence = agent?.evidence || agent?.reasoning;
  const displayName = translateCeramicTerm(name, lang);
  const displayLabel = translateCeramicTerm(label, lang);
  const displayCountry = translateCeramicTerm(country, lang);
  const displayEra = translateCeramicTerm(era, lang);

  return (
    <div className="group rounded-xl border-2 border-stroke bg-gradient-to-br from-surface to-surface-alt p-4 transition-all hover:border-navy/30 hover:shadow-md dark:border-dark-stroke dark:from-dark-surface dark:to-dark-surface-alt dark:hover:border-ceramic/30">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold text-navy dark:text-ceramic">
          {displayName}
        </p>
        {conf != null && (
          <Badge variant="gold" className="text-xs">
            {conf}%
          </Badge>
        )}
      </div>
      <p className="mb-2 text-sm font-bold text-navy dark:text-ivory">
        {displayLabel}
      </p>
      {(country || era) && (
        <div className="mb-2 flex flex-wrap gap-1 text-xs">
          {country && (
            <span className="rounded-full bg-ceramic/20 px-2 py-0.5 text-ceramic-dark dark:bg-ceramic/30 dark:text-ceramic">
              {displayCountry}
            </span>
          )}
          {era && (
            <span className="rounded-full bg-navy/10 px-2 py-0.5 text-navy dark:bg-ivory/10 dark:text-ivory">
              {displayEra}
            </span>
          )}
        </div>
      )}
      {evidence && (
        <div className="mt-2">
          <p className={`text-xs leading-relaxed text-muted dark:text-dark-text-muted ${!isExpanded ? 'line-clamp-3' : ''}`}>
            {evidence}
          </p>
          {evidence.length > 150 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="mt-1 text-xs font-semibold text-ceramic transition-colors hover:text-navy dark:text-ceramic dark:hover:text-ivory"
            >
              {isExpanded ? t('common.less', 'Thu gọn') : t('common.more', 'Xem thêm')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PredictionDetailView;
