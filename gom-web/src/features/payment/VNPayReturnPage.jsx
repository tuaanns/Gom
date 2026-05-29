import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { paymentApi } from './api';
import { Check, X, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import ShinyText from '../../components/ui/ShinyText';
import { useTranslation } from 'react-i18next';

export const VNPayReturnPage = ({ fetchUser, notify }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [credits, setCredits] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      setStatus('verifying');
      const params = Object.fromEntries(searchParams.entries());
      const res = await paymentApi.vnpayReturn(params);
      const data = res.data?.data || res.data;
      if (data?.status === 'completed') {
        const creditAmount = data.credit_amount || 0;
        setCredits(creditAmount);
        setStatus('success');
        fetchUser?.();
        notify?.(t('payment.success.title'), 'success');

        // Báo cho parent window nếu nằm trong iframe
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'vnpay_payment_result',
            status: 'success',
            credits: creditAmount
          }, '*');
        }
      } else {
        setStatus('error');
        setErrorMessage(t('payment.vnpay.failedTitle'));

        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'vnpay_payment_result',
            status: 'error',
            message: t('payment.vnpay.failedTitle')
          }, '*');
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || t('payment.failed');
      setStatus('error');
      setErrorMessage(errMsg);

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'vnpay_payment_result',
          status: 'error',
          message: errMsg
        }, '*');
      }
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16 px-4 bg-surface dark:bg-dark-surface">
      <AnimatePresence mode="wait">
        {status === 'verifying' && (
          <motion.div
            key="verifying"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center text-center max-w-md p-10 rounded-[30px] border border-ceramic-border bg-white shadow-lg dark:border-ceramic/20 dark:bg-dark-surface-alt"
          >
            <Loader2 className="h-16 w-16 text-ceramic animate-spin mb-6" />
            <h2 className="font-heading text-2xl font-bold text-navy dark:text-ivory">
              {t('payment.vnpay.verifyingTitle')}
            </h2>
            <p className="mt-3 text-sm text-muted dark:text-dark-text-muted leading-relaxed">
              {t('payment.vnpay.verifyingDesc')}
            </p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="flex flex-col items-center text-center max-w-md p-10 rounded-[30px] border border-success/30 bg-[#F4FBF7] shadow-[0_20px_50px_-30px_rgba(16,185,129,0.3)] dark:bg-[#0E2018] lg:w-[480px]"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/20 text-success shadow-inner">
              <Check size={36} strokeWidth={3.5} />
            </div>
            <h2 className="font-heading text-3xl font-extrabold text-navy dark:text-ivory">
              <ShinyText text={t('payment.vnpay.successTitle')} speed={3.5} color="#10B981" shineColor="#A7F3D0" spread={90} />
            </h2>
            <p className="mt-4 text-sm text-muted dark:text-dark-text-muted leading-relaxed">
              {t('payment.vnpay.successDesc')}
            </p>
            
            <div className="mt-6 p-4 w-full bg-white dark:bg-dark-surface rounded-2xl border border-success/20 flex flex-col gap-2">
              <div className="text-xs text-muted dark:text-dark-text-muted uppercase tracking-wider font-extrabold">{t('payment.vnpay.creditsCharged')}</div>
              <div className="text-4xl font-black text-success">+{credits}</div>
              <div className="text-xs text-muted dark:text-dark-text-muted">{t('payment.vnpay.creditsNote')}</div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/')}
              className="mt-8 w-full flex items-center justify-center gap-2 font-bold"
            >
              <span>{t('payment.vnpay.appraiseNow')}</span>
              <ArrowRight size={16} />
            </Button>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex flex-col items-center text-center max-w-md p-10 rounded-[30px] border border-danger/30 bg-[#FFF5F5] shadow-[0_20px_50px_-30px_rgba(239,68,68,0.3)] dark:bg-[#2A1212] lg:w-[480px]"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-danger/20 text-danger">
              <X size={36} strokeWidth={3.5} />
            </div>
            <h2 className="font-heading text-2xl font-bold text-navy dark:text-ivory">
              {t('payment.vnpay.failedTitle')}
            </h2>
            <p className="mt-4 text-sm text-muted dark:text-dark-text-muted leading-relaxed">
              {errorMessage}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full">
              <Button
                variant="ghost"
                onClick={() => navigate('/payment')}
                className="flex-1 font-bold"
              >
                {t('payment.vnpay.retry')}
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/')}
                className="flex-1 font-bold"
              >
                {t('payment.vnpay.goHome')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VNPayReturnPage;
