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
  Code2
} from 'lucide-react';
import { Badge } from './Badge';
import { formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';

export const PredictionDetailView = ({ prediction, imageUrl, showUserInfo = true, showDebugInfo = true }) => {
  const { t } = useTranslation();

  if (!prediction) return null;

  // Normalize data from different sources
  const result = prediction.result || prediction.result_json || prediction;
  const finalReport = result.final_report || result;
  
  const label = finalReport.final_prediction || prediction.predicted_label || prediction.label || '—';
  const country = finalReport.final_country || prediction.country || '—';
  const era = finalReport.final_era || prediction.era || '—';
  const rawConfidence = finalReport.final_confidence
    ?? finalReport.confidence
    ?? finalReport.certainty
    ?? prediction.confidence
    ?? prediction.certainty
    ?? 0;
  const confidence = typeof rawConfidence === 'string'
    ? Math.round(parseFloat(rawConfidence) || 0)
    : Math.round(rawConfidence > 1 ? rawConfidence : rawConfidence * 100);
  
  const agentPredictions = result.agents || result.agent_predictions || [];
  const debate = result.debate || [];
  const visualFeatures = result.visual_features || null;

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
              {label}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {country && country !== '—' && (
                <div className="flex items-center gap-1.5 rounded-full bg-ceramic/20 px-3 py-1 text-sm dark:bg-ceramic/30">
                  <MapPin size={14} className="text-ceramic-dark dark:text-ceramic" />
                  <span className="font-semibold text-ceramic-dark dark:text-ceramic">{country}</span>
                </div>
              )}
              {era && era !== '—' && (
                <div className="flex items-center gap-1.5 rounded-full bg-navy/10 px-3 py-1 text-sm dark:bg-ivory/10">
                  <Clock size={14} className="text-navy dark:text-ivory" />
                  <span className="font-semibold text-navy dark:text-ivory">{era}</span>
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
                {formatDate(prediction.created_at)}
              </p>
              <p className="text-sm text-muted dark:text-dark-text-muted">
                ID: #{prediction.id}
              </p>
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
      />
    </div>
  );
};

// AI Result Sections Component
const AIResultSections = ({ agentPredictions, debate, finalReport, visualFeatures, result, showDebugInfo }) => {
  const { t } = useTranslation();

  if (!agentPredictions?.length && !debate?.length && !finalReport?.reasoning && !visualFeatures) {
    return null;
  }

  return (
    <div className="space-y-4 border-t border-stroke pt-6 dark:border-dark-stroke">
      {/* Final Report Reasoning */}
      {finalReport && (finalReport.reasoning || finalReport.final_reasoning || finalReport.verdict) && (
        <div className="rounded-xl border border-navy/20 bg-gradient-to-br from-navy/5 to-ceramic/5 p-5 dark:border-ceramic/20 dark:from-navy/10 dark:to-ceramic/10">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-white dark:bg-ceramic dark:text-navy-dark">
              <Target size={16} />
            </div>
            <h4 className="text-sm font-bold text-navy dark:text-ivory">
              {t('analysis.result.verdict')}
            </h4>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-navy dark:text-ivory">
            {finalReport.reasoning || finalReport.final_reasoning || finalReport.verdict}
          </p>
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
  const conf = agent?.confidence != null ? Math.round(agent.confidence * 100) : null;
  const pred = agent?.prediction || {};
  const label = pred.ceramic_line || agent?.label || agent?.verdict || agent?.agent_name || `Agent ${index + 1}`;
  const name = agent?.agent_name || `Agent ${index + 1}`;
  const country = pred.country || agent?.country;
  const era = pred.era || agent?.era;
  const evidence = agent?.evidence || agent?.reasoning;

  return (
    <div className="group rounded-xl border-2 border-stroke bg-gradient-to-br from-surface to-surface-alt p-4 transition-all hover:border-navy/30 hover:shadow-md dark:border-dark-stroke dark:from-dark-surface dark:to-dark-surface-alt dark:hover:border-ceramic/30">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold text-navy dark:text-ceramic">
          {name}
        </p>
        {conf != null && (
          <Badge variant="gold" className="text-xs">
            {conf}%
          </Badge>
        )}
      </div>
      <p className="mb-2 text-sm font-bold text-navy dark:text-ivory">
        {label}
      </p>
      {(country || era) && (
        <div className="mb-2 flex flex-wrap gap-1 text-xs">
          {country && (
            <span className="rounded-full bg-ceramic/20 px-2 py-0.5 text-ceramic-dark dark:bg-ceramic/30 dark:text-ceramic">
              {country}
            </span>
          )}
          {era && (
            <span className="rounded-full bg-navy/10 px-2 py-0.5 text-navy dark:bg-ivory/10 dark:text-ivory">
              {era}
            </span>
          )}
        </div>
      )}
      {evidence && (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted dark:text-dark-text-muted">
          {evidence}
        </p>
      )}
    </div>
  );
};

export default PredictionDetailView;
