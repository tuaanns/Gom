import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2, Copy, FlaskConical, CreditCard } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { copyToClipboard, formatNumber } from '../../lib/utils';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const QRStage = ({ qrData, purchasing, notify, onConfirm, onCancel, onSimulate, onSuccess }) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  const copy = async (text) => {
    const ok = await copyToClipboard(text);
    if (ok) notify?.(t('common.copied'), 'info');
  };

  const items = [
    { label: t('payment.qr.bank'), value: qrData?.bank_name || 'ACB' },
    { label: t('payment.qr.account'), value: qrData?.account_number || '28569967', copy: true },
    { label: t('payment.qr.owner'), value: qrData?.account_name || 'MA GIA TUAN' },
    {
      label: t('payment.qr.content'),
      value: qrData?.transfer_content || '—',
      copy: true,
      featured: true,
    },
  ];

  const isVNPay = qrData?.payment_method === 'vnpay';

  if (isVNPay) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-2xl"
      >
        <Card
          className="overflow-hidden rounded-[30px] border-ceramic-border/75 bg-[#FFFCF7] p-8 shadow-[0_24px_58px_-34px_rgba(16,42,86,0.72)] dark:border-ceramic/28 dark:bg-[#101B35] text-center space-y-6"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <CreditCard size={32} />
          </div>

          <div>
            <h3 className="font-heading text-2xl font-bold text-navy dark:text-ivory">
              {t('payment.vnpay.title')}
            </h3>
            <p className="mt-2 text-sm text-muted dark:text-dark-text-muted">
              {t('payment.qr.details')}: <span className="font-bold">{qrData?.package?.name}</span> — {formatNumber(qrData?.package?.credits)} {t('payment.credits')}
            </p>
          </div>

          <div className="py-6 border-t border-b border-stroke dark:border-dark-stroke">
            <div className="text-xs text-muted dark:text-dark-text-muted uppercase tracking-wider font-extrabold mb-1">{t('payment.vnpay.amount')}</div>
            <div className="text-4xl font-black text-navy dark:text-ivory">{formatNumber(qrData?.amount)} đ</div>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => window.location.href = qrData.vnpay_url}
              className="w-full font-bold py-3.5"
            >
              {t('payment.vnpay.payBtn')}
            </Button>
            <Button variant="ghost" size="md" onClick={onCancel} className="w-full font-bold">
              {t('payment.qr.cancel')}
            </Button>

            {isDevelopment && (
              <div className="border-t border-stroke pt-4 text-center dark:border-dark-stroke">
                <button
                  type="button"
                  onClick={onSimulate}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-ceramic underline-offset-2 hover:underline"
                >
                  <FlaskConical size={12} />
                  {t('payment.qr.simulate')}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-left">
            <p className="text-xs font-semibold leading-relaxed text-warning">
              ⚠️ {t('payment.vnpay.warning')}
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-4xl"
    >
      <Card
        padded={false}
        className="overflow-hidden rounded-[30px] border-ceramic-border/75 bg-[#FFFCF7] shadow-[0_24px_58px_-34px_rgba(16,42,86,0.72)] dark:border-ceramic/28 dark:bg-[#101B35]"
      >
        <div className="flex flex-col lg:flex-row">
          {/* QR side */}
          <div className="flex flex-col items-center justify-center bg-surface-alt p-10 dark:bg-dark-surface-alt lg:w-2/5">
            <div className="mb-6 text-center">
              <p className="text-xs font-extrabold uppercase tracking-widest text-ceramic-dark">
                {t('payment.qr.title')}
              </p>
              <h3 className="mt-2 font-heading text-base font-extrabold text-navy dark:text-ivory">
                {t('payment.qr.subtitle')}
              </h3>
            </div>

            <motion.div
              whileHover={
                prefersReducedMotion
                  ? undefined
                  : {
                      y: -8,
                      scale: 1.02,
                    }
              }
              transition={{ type: 'spring', stiffness: 230, damping: 22 }}
              className="relative rounded-3xl bg-white p-5 shadow-md"
            >
              <img
                src={qrData?.qr_url}
                alt="VietQR"
                className="block h-64 w-64 sm:h-72 sm:w-72"
              />
              <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-3xl border-l-4 border-t-4 border-ceramic" />
              <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-3xl border-r-4 border-t-4 border-ceramic" />
              <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-3xl border-b-4 border-l-4 border-ceramic" />
              <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-3xl border-b-4 border-r-4 border-ceramic" />
              {!prefersReducedMotion && (
                <motion.span
                  className="pointer-events-none absolute top-0 h-px w-20 bg-gradient-to-r from-transparent via-ceramic-hover to-transparent"
                  animate={{ x: ['-20%', '350%'] }}
                  transition={{ repeat: Infinity, duration: 3.1, ease: 'easeInOut' }}
                />
              )}
            </motion.div>

            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-muted dark:text-dark-text-muted">
              <Loader2 className="animate-spin" size={14} />
              {t('payment.qr.waiting')}
            </div>
          </div>

          {/* Details side */}
          <div className="flex-1 p-10">
            <div className="mb-8">
              <p className="text-xs font-extrabold uppercase tracking-widest text-muted dark:text-dark-text-muted">
                {t('payment.qr.details')}
              </p>
              <p className="mt-1 font-heading text-3xl font-black text-navy dark:text-ivory">
                {formatNumber(qrData?.amount ?? 0)} đ
              </p>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className={
                    it.featured
                      ? 'rounded-xl border border-dashed border-ceramic bg-ceramic/10 p-4 shadow-[0_16px_35px_-28px_rgba(16,42,86,0.65)]'
                      : ''
                  }
                >
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted dark:text-dark-text-muted">
                    {it.label}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span
                      className={
                        'font-bold text-navy dark:text-ivory ' +
                        (it.featured ? 'text-base' : 'text-sm')
                      }
                    >
                      {it.value}
                    </span>
                    {it.copy && (
                      <button
                        type="button"
                        onClick={() => copy(it.value)}
                        className="inline-flex items-center gap-1 rounded-lg bg-surface-alt px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-navy hover:bg-stroke dark:bg-dark-surface-alt dark:text-dark-text"
                      >
                        <Copy size={10} />
                        {t('common.copy')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 space-y-3">
              <Button
                variant="primary"
                size="lg"
                loading={purchasing}
                onClick={onConfirm}
                className="w-full"
              >
                {t('payment.qr.confirm')}
              </Button>
              <Button variant="ghost" size="md" onClick={onCancel} className="w-full">
                {t('payment.qr.cancel')}
              </Button>

              {isDevelopment && (
                <div className="border-t border-stroke pt-4 text-center dark:border-dark-stroke">
                  <button
                    type="button"
                    onClick={onSimulate}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-ceramic underline-offset-2 hover:underline"
                  >
                    <FlaskConical size={12} />
                    {t('payment.qr.simulate')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6 rounded-2xl border border-warning/30 bg-warning/10 p-5 text-center">
        <p className="text-xs font-semibold leading-relaxed text-warning">
          ⚠️ {t('payment.qr.warning')}
        </p>
      </div>
    </motion.div>
  );
};

export default QRStage;

