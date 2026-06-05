import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Receipt, RefreshCw } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/states';
import { paymentApi } from '../payment/api';
import { formatVND, formatDate, formatNumber, getErrorMessage, getLocalisedPackageName } from '../../lib/utils';
import { VIEWS } from '../../lib/constants';

const STATUS_VARIANT = {
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
};

export const TransactionsPage = ({ setView, notify }) => {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await paymentApi.history();
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setList(data);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      notify?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PageContainer>
      <PageHeader
        title={t('transactions.title')}
        subtitle={t('transactions.subtitle')}
        actions={
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />} onClick={fetchData}>
            {t('common.retry')}
          </Button>
        }
      />

      {loading && <LoadingState message={t('common.loading')} />}

      {!loading && error && <ErrorState message={error} onRetry={fetchData} />}

      {!loading && !error && list.length === 0 && (
        <EmptyState
          icon={Receipt}
          title={t('transactions.empty')}
          action={
            <Button variant="primary" onClick={() => setView?.(VIEWS.PAYMENT)}>
              {t('header.topup')}
            </Button>
          }
        />
      )}

      {!loading && !error && list.length > 0 && (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-stroke bg-surface-alt text-left dark:border-dark-stroke dark:bg-dark-surface-alt">
                <tr className="text-xs uppercase tracking-wider text-muted dark:text-dark-text-muted">
                  <th className="px-4 py-3 font-bold">{t('transactions.table.id')}</th>
                  <th className="px-4 py-3 font-bold">{t('transactions.table.package')}</th>
                  <th className="px-4 py-3 font-bold">{t('transactions.table.amount')}</th>
                  <th className="px-4 py-3 font-bold">{t('transactions.table.credits')}</th>
                  <th className="px-4 py-3 font-bold">{t('transactions.table.status')}</th>
                  <th className="px-4 py-3 font-bold">{t('transactions.table.date')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-stroke last:border-b-0 hover:bg-surface-alt dark:border-dark-stroke dark:hover:bg-dark-surface-alt"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted dark:text-dark-text-muted">
                      #{tx.id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-navy dark:text-ivory">
                      {getLocalisedPackageName(tx.package_name) || tx.package_id || '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-navy dark:text-ivory">
                      {formatVND(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-muted dark:text-dark-text-muted">
                      {formatNumber(tx.credit_amount || tx.credits || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[tx.status] || 'default'}>
                        {t(`transactions.status.${tx.status}`, tx.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted dark:text-dark-text-muted">
                      {formatDate(tx.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageContainer>
  );
};

export default TransactionsPage;

