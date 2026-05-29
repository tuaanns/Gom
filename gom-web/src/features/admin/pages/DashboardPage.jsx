import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Sparkles,
  Layers,
  Receipt,
  Coins,
  Star,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../api';
import { useTranslation } from 'react-i18next';
import { ImageWithFallback } from '../../../components/ui/ImageWithFallback';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { formatVND, formatNumber, formatDate, getErrorMessage, cn } from '../../../lib/utils';
import { translateCeramicTerm } from '../../../lib/ceramicTranslations';

const StatCard = ({ title, value, icon: Icon, color = 'blue', helper }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    teal: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-2 truncate text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {helper && (
            <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{helper}</p>
          )}
        </div>
        <div className={cn('shrink-0 rounded-full p-3', colorClasses[color])}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  if (status === 'completed') {
    return (
      <Badge variant="success">
        <CheckCircle2 size={10} className="mr-1" />
        completed
      </Badge>
    );
  }
  if (status === 'pending') {
    return (
      <Badge variant="warning">
        <Clock size={10} className="mr-1" />
        pending
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge variant="danger">
        <XCircle size={10} className="mr-1" />
        failed
      </Badge>
    );
  }
  return <Badge>{status}</Badge>;
};

const ListSection = ({ title, viewAllHref, viewAllLabel, children, empty = 'No data yet' }) => (
  <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {viewAllHref && (
        <Link
          to={viewAllHref}
          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {viewAllLabel || 'View all'} →
        </Link>
      )}
    </div>
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {React.Children.count(children) === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">{empty}</p>
      ) : (
        children
      )}
    </div>
  </div>
);

export const DashboardPage = ({ notify }) => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.dashboard();
      const payload = res.data?.data || res.data;
      setData(payload || {});
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      notify?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-72 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 py-16 text-center dark:border-red-900/40 dark:bg-red-900/10">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <RefreshCw size={16} /> {t('admin.retry')}
        </button>
      </div>
    );
  }

  const stats = data?.stats || {};
  const recentUsers = data?.recent_users || [];
  const recentPredictions = data?.recent_predictions || [];
  const recentPayments = data?.recent_payments || [];

  const kpis = [
    {
      title: t('admin.totalUsers'),
      value: formatNumber(stats.total_users ?? 0),
      icon: Users,
      color: 'blue',
    },
    {
      title: t('admin.totalPredictions'),
      value: formatNumber(stats.total_predictions ?? 0),
      icon: Sparkles,
      color: 'purple',
    },
    {
      title: t('admin.totalCeramics'),
      value: formatNumber(stats.total_ceramics ?? 0),
      icon: Layers,
      color: 'green',
      helper:
        stats.total_ceramics_featured != null
          ? t('admin.featuredCount', { count: stats.total_ceramics_featured })
          : undefined,
    },
    {
      title: t('admin.totalRevenue'),
      value: formatVND(stats.total_revenue ?? 0),
      icon: Receipt,
      color: 'orange',
      helper:
        stats.payments_completed != null
          ? t('admin.completedPaymentsCount', { count: stats.payments_completed })
          : undefined,
    },
    {
      title: t('admin.creditsSold'),
      value: formatNumber(stats.total_credits_sold ?? 0),
      icon: Coins,
      color: 'teal',
    },
    {
      title: t('admin.featuredCeramics'),
      value: formatNumber(stats.total_ceramics_featured ?? 0),
      icon: Star,
      color: 'yellow',
    },
    {
      title: t('admin.pendingPayments'),
      value: formatNumber(stats.payments_pending ?? 0),
      icon: Clock,
      color: 'yellow',
    },
    {
      title: t('admin.failedPayments'),
      value: formatNumber(stats.payments_failed ?? 0),
      icon: XCircle,
      color: 'red',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('admin.dashboardOverview')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListSection
          title={t('admin.recentUsers')}
          viewAllHref="/admin/users"
          viewAllLabel={t('admin.viewAll')}
          empty={t('admin.noUsersYet')}
        >
          {recentUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar src={u.avatar} name={u.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {u.name}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <Badge variant={u.role === 'admin' ? 'admin' : 'user'}>{u.role || 'user'}</Badge>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {formatDate(u.created_at, { dateStyle: 'short' })}
                </span>
              </div>
            </div>
          ))}
        </ListSection>

        <ListSection
          title={t('admin.recentPayments')}
          viewAllHref="/admin/payments"
          viewAllLabel={t('admin.viewAll')}
          empty={t('admin.noPaymentsYet')}
        >
          {recentPayments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3">
              <div className="rounded-full bg-orange-100 p-2 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                <Receipt size={16} />
              </div>              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {((p.package_name === 'Cơ Bản' || p.package_name === 'Basic') && i18n.language.startsWith('en')) ? 'Basic' : 
                   ((p.package_name === 'Phổ Biến' || p.package_name === 'Popular') && i18n.language.startsWith('en')) ? 'Popular' :
                   ((p.package_name === 'Chuyên Gia' || p.package_name === 'Expert') && i18n.language.startsWith('en')) ? 'Expert' :
                   p.package_name || 'Payment'}{' '}
                  <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                    {p.hex_id ? `#${p.hex_id}` : ''}
                  </span>
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {p.user?.name || `User #${p.user_id}`} • {formatVND(p.amount)} •{' '}
                  {p.credit_amount ?? 0} credits
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <StatusBadge status={p.status} />
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {formatDate(p.created_at, { dateStyle: 'short' })}
                </span>
              </div>
            </div>
          ))}
        </ListSection>
      </div>
 
      <ListSection
        title={t('admin.recentPredictions')}
        viewAllHref="/admin/predictions"
        viewAllLabel={t('admin.viewAll')}
        empty={t('admin.noPredictionsYet')}
      >
        {recentPredictions.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-5 py-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <ImageWithFallback
                src={p.image_url}
                alt={p.predicted_label || 'Prediction'}
                className="h-12 w-12"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {translateCeramicTerm(p.predicted_label || '—', i18n.language)}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {translateCeramicTerm(p.country || '—', i18n.language)} • {translateCeramicTerm(p.era || '—', i18n.language)} • by {p.user?.name || 'Unknown'}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-gray-500 dark:text-gray-400">
              {formatDate(p.created_at, { dateStyle: 'short' })}
            </span>
          </div>
        ))}
      </ListSection>
    </div>
  );
};

export default DashboardPage;
