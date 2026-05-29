import React, { useEffect, useState, useMemo } from 'react';
import { Download, Filter } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { PaymentFilterModal } from '../components/PaymentFilterModal';
import { adminApi } from '../api';
import { formatVND, formatDate, getErrorMessage } from '../../../lib/utils';
import { Badge } from '../../../components/ui/Badge';
import { useTranslation } from 'react-i18next';

export const PaymentsPage = ({ notify }) => {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    method: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await adminApi.payments();
      const data = res.data?.data || res.data;
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter payments based on current filters
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      // Status filter
      if (filters.status && payment.status !== filters.status) {
        return false;
      }

      // Method filter
      if (filters.method && (payment.payment_method || 'bank_transfer') !== filters.method) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom) {
        const paymentDate = new Date(payment.created_at);
        const fromDate = new Date(filters.dateFrom);
        if (paymentDate < fromDate) return false;
      }

      if (filters.dateTo) {
        const paymentDate = new Date(payment.created_at);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (paymentDate > toDate) return false;
      }

      // Amount range filter
      if (filters.minAmount && payment.amount < parseInt(filters.minAmount)) {
        return false;
      }

      if (filters.maxAmount && payment.amount > parseInt(filters.maxAmount)) {
        return false;
      }

      return true;
    });
  }, [payments, filters]);

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const handleExport = () => {
    const headers = ['ID', 'User', 'Amount', 'Credits', 'Status', 'Method', 'Date'];
    const csvContent = [
      headers.join(','),
      ...filteredPayments.map(p => [
        p.id,
        `"${p.user?.name || t('admin.paymentsPage.unknown')}"`,
        p.amount,
        p.credit_amount || 0,
        p.status,
        p.payment_method || 'bank_transfer',
        formatDate(p.created_at)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    notify?.(t('admin.paymentsPage.exportSuccess'), 'success');
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'danger';
      default:
        return 'default';
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const columns = [
    {
      key: 'id',
      header: t('admin.paymentsPage.table.id'),
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
      key: 'user',
      header: t('admin.paymentsPage.table.user'),
      accessor: (row) => row.user?.name || row.user_id,
      cell: (row) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {row.user?.name || t('admin.paymentsPage.unknown')}
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
      key: 'amount',
      header: t('admin.paymentsPage.table.amount'),
      accessor: (row) => row.amount,
      cell: (row) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatVND(row.amount)}
        </span>
      ),
      sortable: true,
      searchable: false,
    },
    {
      key: 'credit_amount',
      header: t('admin.paymentsPage.table.credits'),
      accessor: (row) => row.credit_amount ?? 0,
      cell: (row) => (
        <span className="text-gray-700 dark:text-gray-300">
          {row.credit_amount ?? 0}
        </span>
      ),
      sortable: true,
      searchable: false,
    },
    {
      key: 'status',
      header: t('admin.paymentsPage.table.status'),
      accessor: (row) => row.status,
      cell: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {row.status}
        </Badge>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'payment_method',
      header: t('admin.paymentsPage.table.method'),
      accessor: (row) => row.payment_method || 'bank_transfer',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.payment_method || t('admin.paymentsPage.bankTransfer')}
        </span>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'created_at',
      header: t('admin.paymentsPage.table.date'),
      accessor: (row) => row.created_at,
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(row.created_at)}
        </span>
      ),
      sortable: true,
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.paymentsPage.title')}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('admin.paymentsPage.subtitle')}
            {hasActiveFilters && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                {t('admin.paymentsPage.filtered', { filtered: filteredPayments.length, total: payments.length })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilterModal(true)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              hasActiveFilters
                ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <Filter size={16} />
            {t('admin.paymentsPage.filter')}
            {hasActiveFilters && (
              <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                {Object.values(filters).filter(v => v !== '').length}
              </span>
            )}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Download size={16} />
            {t('admin.paymentsPage.exportCsv')}
          </button>
        </div>
      </div>

      <DataTable
        data={filteredPayments}
        columns={columns}
        searchPlaceholder={t('admin.paymentsPage.searchPlaceholder')}
        pageSize={10}
      />

      <PaymentFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
      />
    </div>
  );
};

export default PaymentsPage;
