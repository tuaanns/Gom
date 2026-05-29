import React, { useEffect, useState, useMemo } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { FormField, Input, Select } from '../components/FormField';
import { adminApi } from '../api';
import { Badge } from '../../../components/ui/Badge';
import { formatDate, getErrorMessage, formatNumber } from '../../../lib/utils';
import { useTranslation } from 'react-i18next';

// Token History admin page — read-only, filter by user_id, type (in/out), date range
export const TokenHistoryPage = ({ notify }) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    user_id: '',
    type: '',
    from: '',
    to: '',
  });

  const fetchRows = async (params = filters) => {
    setLoading(true);
    try {
      const cleaned = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v != null)
      );
      const res = await adminApi.tokenHistory(cleaned);
      const data = res.data?.data || res.data;
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((v) => v !== ''),
    [filters]
  );

  const columns = [
    {
      key: 'id',
      header: t('admin.tokenHistoryPage.table.id'),
      accessor: (r) => r.id,
      cell: (r) => (
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">#{r.id}</span>
      ),
      sortable: true,
      searchable: false,
    },
    {
      key: 'user',
      header: t('admin.tokenHistoryPage.table.user'),
      accessor: (r) => r.user?.name || r.user_id,
      cell: (r) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {r.user?.name || `User #${r.user_id}`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {r.user?.email || '—'}
          </p>
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'type',
      header: t('admin.tokenHistoryPage.table.type'),
      accessor: (r) => r.type,
      cell: (r) =>
        r.type === 'in' ? (
          <Badge variant="success">+ IN</Badge>
        ) : (
          <Badge variant="danger">- OUT</Badge>
        ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'amount',
      header: t('admin.tokenHistoryPage.table.amount'),
      accessor: (r) => Number(r.amount) || 0,
      cell: (r) => {
        const n = Number(r.amount) || 0;
        return (
          <span
            className={
              r.type === 'in'
                ? 'font-semibold text-green-600 dark:text-green-400'
                : 'font-semibold text-red-600 dark:text-red-400'
            }
          >
            {r.type === 'in' ? '+' : '-'}
            {formatNumber(n)}
          </span>
        );
      },
      sortable: true,
      searchable: false,
    },
    {
      key: 'description',
      header: t('admin.tokenHistoryPage.table.description'),
      accessor: (r) => r.description || '',
      cell: (r) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {r.description || '—'}
        </span>
      ),
      sortable: false,
      searchable: true,
    },
    {
      key: 'created_at',
      header: t('admin.tokenHistoryPage.table.date'),
      accessor: (r) => r.created_at,
      cell: (r) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDate(r.created_at)}
        </span>
      ),
      sortable: true,
      searchable: false,
    },
  ];

  const handleApply = () => {
    setShowFilters(false);
    fetchRows();
  };

  const handleReset = () => {
    const reset = { user_id: '', type: '', from: '', to: '' };
    setFilters(reset);
    setShowFilters(false);
    fetchRows(reset);
  };

  if (loading && rows.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.tokenHistoryPage.title')}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('admin.tokenHistoryPage.subtitle')}
            {hasActiveFilters && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">{t('admin.tokenHistoryPage.filtered')}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fetchRows()}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RefreshCw size={16} />
            {t('admin.tokenHistoryPage.refresh')}
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${hasActiveFilters
                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
          >
            <Filter size={16} />
            {t('admin.tokenHistoryPage.filter')}
            {hasActiveFilters && (
              <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                {Object.values(filters).filter((v) => v !== '').length}
              </span>
            )}
          </button>
        </div>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchPlaceholder={t('admin.tokenHistoryPage.searchPlaceholder')}
        pageSize={15}
      />

      <Modal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title={t('admin.tokenHistoryPage.filterModalTitle')}
        size="md"
      >
        <div className="space-y-4">
          <FormField label={t('admin.tokenHistoryPage.userId')}>
            <Input
              type="number"
              min="1"
              value={filters.user_id}
              onChange={(e) => setFilters((p) => ({ ...p, user_id: e.target.value }))}
              placeholder={t('admin.tokenHistoryPage.userIdPlaceholder')}
            />
          </FormField>
          <FormField label={t('admin.tokenHistoryPage.type')}>
            <Select
              value={filters.type}
              onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="">{t('admin.tokenHistoryPage.allTypes')}</option>
              <option value="in">{t('admin.tokenHistoryPage.typeIn')}</option>
              <option value="out">{t('admin.tokenHistoryPage.typeOut')}</option>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('admin.tokenHistoryPage.from')}>
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
              />
            </FormField>
            <FormField label={t('admin.tokenHistoryPage.to')}>
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t('admin.tokenHistoryPage.reset')}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('admin.tokenHistoryPage.apply')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TokenHistoryPage;
