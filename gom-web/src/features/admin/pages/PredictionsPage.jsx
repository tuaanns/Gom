import React, { useEffect, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { PredictionDetailModal } from '../components/PredictionDetailModal';
import { ImageWithFallback } from '../../../components/ui/ImageWithFallback';
import { adminApi } from '../api';
import { formatDate, getErrorMessage } from '../../../lib/utils';
import { useTranslation } from 'react-i18next';

export const PredictionsPage = ({ notify }) => {
  const { t } = useTranslation();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const res = await adminApi.predictions();
      const data = res.data?.data || res.data;
      setPredictions(Array.isArray(data) ? data : []);
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (prediction) => {
    // Show modal immediately with light data, then enrich with full AI result.
    setSelectedPrediction(prediction);
    setShowModal(true);
    try {
      const res = await adminApi.getPrediction(prediction.id);
      const full = res.data?.data || res.data;
      if (full && (full.id === prediction.id || !full.id)) {
        setSelectedPrediction((prev) => ({ ...prev, ...full }));
      }
    } catch (err) {
      // Silent: modal still works with list-level data.
      // eslint-disable-next-line no-console
      console.warn('[admin] getPrediction failed', err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPrediction(null);
  };

  const handleExport = () => {
    // Convert predictions to CSV
    const headers = ['ID', 'Label', 'Confidence', 'User', 'Date'];
    const csvContent = [
      headers.join(','),
      ...predictions.map(p => {
        const rawConf = p.confidence ?? p.certainty ?? 0;
        const conf = rawConf > 1 ? Math.round(rawConf) : Math.round(rawConf * 100);
        return [
          p.id,
          `"${(p.predicted_label || p.label || '').replace(/"/g, '""')}"`,
          conf,
          `"${p.user?.name || t('admin.predictionsPage.unknown')}"`,
          formatDate(p.created_at)
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    notify?.(t('admin.predictionsPage.exportSuccess'), 'success');
  };

  const columns = [
    {
      key: 'id',
      header: t('admin.predictionsPage.table.id'),
      accessor: (row) => row.id,
      cell: (row) => (
        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
          #{row.id}
        </span>
      ),
      sortable: true,
      searchable: false,
    },
    {
      key: 'image',
      header: t('admin.predictionsPage.table.image'),
      accessor: () => '',
      cell: (row) => {
        const imgSrc =
          row.image_url || row.image || (row.image_path ? `/storage/${row.image_path}` : null);
        return (
          <ImageWithFallback
            src={imgSrc}
            alt={row.predicted_label || row.label || 'Prediction'}
            className="h-12 w-12 rounded-lg"
          />
        );
      },
      sortable: false,
      searchable: false,
    },
    {
      key: 'label',
      header: t('admin.predictionsPage.table.result'),
      accessor: (row) => row.predicted_label || row.label,
      cell: (row) => {
        let displayLabel = row.predicted_label || row.label || '—';
        let displayEra = row.era;
        
        if (displayLabel.length > 50) {
          const boldMatch = displayLabel.match(/\*\*([^*]{3,40})\*\*/);
          const quoteMatch = displayLabel.match(/"([^"]{3,40})"/);
          const patternMatch = displayLabel.match(/(?:[tT]huộc dòng|[lL]à dòng|[dD]òng gốm|[sS]ản phẩm của|[tT]huộc về|[gG]ốm sứ|[sS]ứ|[gG]ốm)\s+([A-ZÀ-Ỹ][\wÀ-ỹ\s/()]{2,35}?)(?=[.,;!?\n]|\s+(?:[cC]ủa|[tT]huộc|[xX]uất|[vV]ới|[cC]ó|[lL]à|[đĐ]ược|[tT]ừ|[tT]hế|[nN]iên|[qQ]uốc))/);
          if (boldMatch) displayLabel = boldMatch[1];
          else if (quoteMatch) displayLabel = quoteMatch[1];
          else if (patternMatch) displayLabel = patternMatch[1].trim();
          else {
            const firstClause = displayLabel.split(/[.!?\n,;:]/)[0] || displayLabel;
            displayLabel = firstClause.length > 40 ? firstClause.substring(0, 37) + '...' : firstClause;
          }
          
          if (!displayEra || displayEra === 'AI Conclusion' || displayEra === 'Google Lens') {
            const boldEra = (row.predicted_label || '').match(/(?:niên đại|thời kỳ|thời đại)[^*]*\*\*([^*]{2,40})\*\*/i)
              || (row.predicted_label || '').match(/\*\*(thế kỷ[^*]{2,20})\*\*/i)
              || (row.predicted_label || '').match(/\*\*(khoảng\s+\d{4}[^*]{0,15})\*\*/i);
            if (boldEra) {
              displayEra = boldEra[1] || boldEra[0]?.replace(/\*\*/g, '');
            } else {
              const plainEra = (row.predicted_label || '').match(/(?:thuộc về |thuộc |là )(thời kỳ[^,.]{3,30})/i)
                || (row.predicted_label || '').match(/(từ những năm \d{3,4}[^,.]{0,20})/i)
                || (row.predicted_label || '').match(/(?:có lịch sử|phát triển)[^,.]*(?:từ |thời )([\wÀ-ỹ ]{5,35})/i)
                || (row.predicted_label || '').match(/(thế kỷ\s+\d+\s+đến\s+thế kỷ\s+\d+)/i)
                || (row.predicted_label || '').match(/(thế kỷ\s+\d+[-–]\d+)/i)
                || (row.predicted_label || '').match(/(thế kỷ\s+\d+)/i)
                || (row.predicted_label || '').match(/(khoảng\s+\d{4}[-–]\d{4})/i)
                || (row.predicted_label || '').match(/(khoảng\s+năm\s+\d{4})/i);
              if (plainEra) {
                displayEra = plainEra[1].trim();
              } else if ((row.predicted_label || '').toLowerCase().includes('hiện đại')) {
                displayEra = 'Hiện đại';
              } else if ((row.predicted_label || '').toLowerCase().includes('cổ vật') || (row.predicted_label || '').toLowerCase().includes('đồ cổ') || (row.predicted_label || '').toLowerCase().includes('cổ đại')) {
                displayEra = 'Cổ đại';
              } else if ((row.predicted_label || '').toLowerCase().includes('không xác định') || (row.predicted_label || '').toLowerCase().includes('chưa xác định')) {
                displayEra = 'Chưa xác định';
              }
            }
          }
        }

        return (
          <div>
            <p className="font-semibold text-gray-900 dark:text-white" title={row.predicted_label || row.label}>
              {displayLabel}
            </p>
            {displayEra && displayEra !== 'AI Conclusion' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{displayEra}</p>
            )}
          </div>
        );
      },
      sortable: true,
      searchable: true,
    },
    {
      key: 'confidence',
      header: t('admin.predictionsPage.table.confidence'),
      accessor: (row) => row.confidence || row.certainty || 0,
      cell: (row) => {
        const rawConf = row.confidence ?? row.certainty ?? 0;
        const confidence = rawConf > 1 ? Math.round(rawConf) : Math.round(rawConf * 100);
        
        const color = confidence >= 80 ? 'text-green-600' : confidence >= 60 ? 'text-yellow-600' : 'text-red-600';
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-full ${confidence >= 80 ? 'bg-green-600' : confidence >= 60 ? 'bg-yellow-600' : 'bg-red-600'}`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className={`text-sm font-semibold ${color}`}>
              {confidence}%
            </span>
          </div>
        );
      },
      sortable: true,
      searchable: false,
    },
    {
      key: 'user',
      header: t('admin.predictionsPage.table.user'),
      accessor: (row) => row.user?.name || row.user_id,
      cell: (row) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {row.user?.name || t('admin.predictionsPage.unknown')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {row.user?.email || `ID: ${row.user_id}`}
          </p>
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'created_at',
      header: t('admin.predictionsPage.table.date'),
      accessor: (row) => row.created_at,
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(row.created_at)}
        </span>
      ),
      sortable: true,
      searchable: false,
    },
    {
      key: 'actions',
      header: t('admin.predictionsPage.table.actions'),
      accessor: () => '',
      cell: (row) => (
        <button
          onClick={() => handleViewDetails(row)}
          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
          title={t('admin.predictionsPage.viewDetails')}
        >
          <Eye size={16} />
        </button>
      ),
      sortable: false,
      searchable: false,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-96 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.predictionsPage.title')}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('admin.predictionsPage.subtitle')}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Download size={16} />
          {t('admin.predictionsPage.exportCsv')}
        </button>
      </div>

      <DataTable
        data={predictions}
        columns={columns}
        searchPlaceholder={t('admin.predictionsPage.searchPlaceholder')}
        pageSize={10}
      />

      <PredictionDetailModal
        isOpen={showModal}
        onClose={handleCloseModal}
        prediction={selectedPrediction}
      />
    </div>
  );
};

export default PredictionsPage;
