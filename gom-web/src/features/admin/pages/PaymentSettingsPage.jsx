import React, { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { getErrorMessage } from '../../../lib/utils';
import { useTranslation } from 'react-i18next';
import { CreditCard, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export const PaymentSettingsPage = ({ notify }) => {
  const { t } = useTranslation();
  const [method, setMethod] = useState('sepay');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPaymentSettings();
      const data = res.data?.data || res.data;
      if (data?.payment_method) {
        setMethod(data.payment_method);
      }
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await adminApi.updatePaymentSettings({ payment_method: method });
      notify?.(res.data?.message || t('admin.paymentSettingsPage.saveSuccess'), 'success');
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.paymentSettingsPage.title')}</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t('admin.paymentSettingsPage.subtitle')}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* SePay Option */}
          <div
            onClick={() => setMethod('sepay')}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 p-6 cursor-pointer transition-all ${
              method === 'sepay'
                ? 'border-blue-600 bg-blue-50/30 dark:border-blue-500 dark:bg-blue-900/10'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <Zap size={24} />
                </div>
                {method === 'sepay' && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    {t('admin.paymentSettingsPage.active')}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('admin.paymentSettingsPage.sepayTitle')}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('admin.paymentSettingsPage.sepayDesc')}
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              <ShieldCheck size={14} className="text-success" />
              <span>{t('admin.paymentSettingsPage.sepayNote')}</span>
            </div>
          </div>

          {/* VNPay Option */}
          <div
            onClick={() => setMethod('vnpay')}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 p-6 cursor-pointer transition-all ${
              method === 'vnpay'
                ? 'border-blue-600 bg-blue-50/30 dark:border-blue-500 dark:bg-blue-900/10'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <CreditCard size={24} />
                </div>
                {method === 'vnpay' && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    {t('admin.paymentSettingsPage.active')}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('admin.paymentSettingsPage.vnpayTitle')}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('admin.paymentSettingsPage.vnpayDesc')}
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              <ShieldCheck size={14} className="text-success" />
              <span>{t('admin.paymentSettingsPage.vnpayNote')}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            className="px-6 py-2.5 font-bold"
          >
            {t('admin.paymentSettingsPage.saveBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettingsPage;
