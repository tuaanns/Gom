import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PaymentStepper } from './PaymentStepper';
import { LoadingState, ErrorState } from '../../components/ui/states';
import { Button } from '../../components/ui/Button';
import { PackageCard } from './PackageCard';
import { MethodList } from './MethodList';
import { QRStage } from './QRStage';
import { paymentApi } from './api';
import { cn, getErrorMessage } from '../../lib/utils';
import { VIEWS } from '../../lib/constants';
import ShinyText from '../../components/ui/ShinyText';

gsap.registerPlugin(useGSAP);

// Fallback packages when API fails
const FALLBACK_PACKAGES = [
  { id: 1, name: 'Cơ Bản', name_en: 'Basic', credits: 10, price: 150000, discount: null, discount_en: null },
  { id: 2, name: 'Phổ Biến', name_en: 'Popular', credits: 50, price: 600000, discount: 'Tiết kiệm 20%', discount_en: 'Save 20%', featured: true },
  { id: 3, name: 'Chuyên Gia', name_en: 'Expert', credits: 200, price: 2000000, discount: '-30% off', discount_en: '-30% off' },
];

export const PaymentPage = ({ fetchUser, notify, setView }) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [packages, setPackages] = useState([]);
  const [loadingPkg, setLoadingPkg] = useState(true);
  const [pkgError, setPkgError] = useState(null);

  const [stage, setStage] = useState(0); // 0: select, 1: method, 2: pay
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successCredits, setSuccessCredits] = useState(0);
  const [activeMethod, setActiveMethod] = useState('sepay');

  // Animation refs
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const stepperRef = useRef(null);
  const cardsRef = useRef(null);
  const pageRef = useRef(null);
  const hasAnimated = useRef(false);
  const selectionTimeoutRef = useRef(null);

  // Load packages from API
  useEffect(() => {
    let cancelled = false;
    setLoadingPkg(true);
    setPkgError(null);

    // Fetch active payment method
    paymentApi.activeMethod()
      .then((res) => {
        if (!cancelled && (res.data?.data?.payment_method || res.data?.payment_method)) {
          setActiveMethod(res.data.data?.payment_method || res.data?.payment_method);
        }
      })
      .catch(() => {});

    paymentApi
      .packages()
      .then((res) => {
        if (cancelled) return;
        const data = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        setPackages(data.length > 0 ? data : FALLBACK_PACKAGES);
      })
      .catch(() => {
        if (cancelled) return;
        // Soft fallback so user can still pick a package
        setPackages(FALLBACK_PACKAGES);
        setPkgError(null);
      })
      .finally(() => !cancelled && setLoadingPkg(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useGSAP(
    () => {
      if (loadingPkg || stage !== 0 || hasAnimated.current || !pageRef.current) return;

      if (prefersReducedMotion) {
        hasAnimated.current = true;
        return;
      }

      const cards = cardsRef.current?.querySelectorAll('.pricing-card') || [];
      const popularCard = cardsRef.current?.querySelector('.pricing-card-popular');

      const timeline = gsap.timeline({ delay: 0.08, defaults: { ease: 'power3.out' } });

      timeline
        .fromTo(
          titleRef.current,
          { opacity: 0, y: 24, filter: 'blur(10px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.62 },
          0
        )
        .fromTo(
          subtitleRef.current,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.5 },
          0.12
        )
        .fromTo(
          stepperRef.current,
          { opacity: 0, x: -36 },
          { opacity: 1, x: 0, duration: 0.52 },
          0.26
        )
        .fromTo(
          cards,
          { opacity: 0, y: 48, scale: 0.94 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.64,
            stagger: 0.12,
            ease: 'back.out(1.25)',
          },
          0.38
        );

      if (popularCard) {
        timeline
          .fromTo(
            popularCard,
            { y: 0, scale: 1 },
            { y: -7, scale: 1.04, duration: 0.22, ease: 'power2.out' },
            '>-0.05'
          )
          .to(popularCard, { y: 0, scale: 1, duration: 0.28, ease: 'back.out(1.6)' });
      }

      hasAnimated.current = true;

      return () => timeline.kill();
    },
    {
      scope: pageRef,
      dependencies: [loadingPkg, stage, prefersReducedMotion, packages.length],
      revertOnUpdate: true,
    }
  );

  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);

  const selectPackage = (pkg) => {
    setSelectedPkg(pkg);

    if (prefersReducedMotion || !cardsRef.current) {
      if (activeMethod === 'vnpay') {
        buyPackage(pkg);
      } else {
        setStage(1);
      }
      return;
    }

    const selectedCard = cardsRef.current.querySelector(`[data-package-id="${pkg.id}"]`);
    const otherCards = cardsRef.current.querySelectorAll(`[data-package-id]:not([data-package-id="${pkg.id}"])`);

    const timeline = gsap.timeline({ defaults: { ease: 'power2.out' } });
    timeline
      .to(otherCards, { opacity: 0.78, scale: 0.985, duration: 0.2 }, 0)
      .fromTo(selectedCard, { y: 0, scale: 1 }, { y: -10, scale: 1.052, duration: 0.22 }, 0)
      .to(selectedCard, { y: 0, scale: 1, duration: 0.28, ease: 'back.out(1.5)' }, 0.2);

    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }

    selectionTimeoutRef.current = setTimeout(() => {
      if (activeMethod === 'vnpay') {
        buyPackage(pkg);
      } else {
        setStage(1);
      }
    }, 280);
  };

  const reset = () => {
    setStage(0);
    setSelectedPkg(null);
    setQrData(null);
    setPaymentSuccess(false);
    hasAnimated.current = false;
  };

  const buyPackage = async (pkgOverride = null) => {
    const pkg = pkgOverride || selectedPkg;
    if (!pkg) return;
    setPurchasing(true);
    try {
      const res = await paymentApi.create(pkg.id);
      const serverData = res.data?.data || res.data;
      const amount = serverData?.amount || pkg.price;

      if (serverData?.payment_method === 'vnpay') {
        setQrData({
          ...serverData,
          amount,
          payment_method: 'vnpay',
        });
        setStage(2);
        notify?.(t('payment.vnpay.created'), 'success');
      } else {
        const content = serverData?.transfer_content || `GOM NAP ${pkg.id}`;
        const bankInfo = serverData?.bank_info || {};
        const bankName = bankInfo.bank_name || bankInfo.bank || serverData?.bank_name || 'ACB';
        const account = bankInfo.account_number || serverData?.account_number || '28569967';
        const owner = bankInfo.account_name || serverData?.account_name || 'MA GIA TUAN';

        const qrUrl =
          serverData?.qr_url ||
          `https://qr.sepay.vn/img?bank=${encodeURIComponent(
            bankName
          )}&acc=${encodeURIComponent(account)}&template=compact&amount=${amount}&des=${encodeURIComponent(content)}`;

        setQrData({
          ...serverData,
          amount,
          transfer_content: content,
          bank_name: bankName,
          account_number: account,
          account_name: owner,
          qr_url: qrUrl,
          payment_method: 'sepay',
        });
        setStage(2);
        notify?.(t('payment.scanInvite'), 'success');
      }
    } catch (err) {
      notify?.(t('payment.failed'), 'error');
    } finally {
      setPurchasing(false);
    }
  };

  const checkStatus = async () => {
    if (!qrData) return;
    setPurchasing(true);
    try {
      const id = qrData.id || qrData.payment_id;
      const res = await paymentApi.check(id);
      const data = res.data?.data || res.data;
      if (data?.status === 'completed') {
        const credits = data.credit_amount || selectedPkg?.credits || 0;
        setSuccessCredits(credits);
        setPaymentSuccess(true);
        fetchUser?.();
      } else {
        notify?.(t('payment.checking'), 'info');
      }
    } catch (err) {
      notify?.(getErrorMessage(err), 'error');
    } finally {
      setPurchasing(false);
    }
  };

  const simulateSuccess = async () => {
    if (!qrData) return;
    try {
      const id = qrData.payment_id || qrData.id;
      const res = await paymentApi.testComplete(id);
      const data = res.data?.data || res.data;
      if (data?.status === 'completed') {
        setSuccessCredits(data.credit_amount || selectedPkg?.credits || 0);
        setPaymentSuccess(true);
        fetchUser?.();
      }
    } catch (err) {
      notify?.(getErrorMessage(err, t('payment.simulateError')), 'error');
    }
  };

  const finish = () => {
    setPaymentSuccess(false);
    reset();
    setView?.(VIEWS.TRANSACTION_HISTORY);
  };

  const currentStage = Math.max(stage, qrData ? 2 : selectedPkg ? 1 : 0);
  const steps = [
    { id: 0, label: t('payment.steps.package') },
    { id: 1, label: t('payment.steps.method') },
    { id: 2, label: t('payment.steps.pay') },
  ];

  return (
    <PageContainer>
      {/* Enhanced PageHeader with animation refs */}
      <div ref={pageRef} className="mb-8 flex flex-col items-center gap-3 text-center md:mb-10">
        <h2
          ref={titleRef}
          className="font-heading text-3xl font-extrabold leading-[1.35] text-balance md:text-4xl md:leading-[1.32]"
        >
          <ShinyText
            text={t('payment.title')}
            speed={3}
            delay={0}
            color="#0A1A42"
            shineColor="#B8CAD8"
            darkColor="#9CA3AF"
            darkShineColor="#FFFFFF"
            spread={85}
            direction="left"
            yoyo={false}
          />
        </h2>
        <p
          ref={subtitleRef}
          className="mx-auto max-w-2xl text-base leading-paragraph text-muted dark:text-dark-text-muted"
        >
          {t('payment.subtitle')}
        </p>
      </div>

      {/* Animated Stepper */}
      <div ref={stepperRef} className="mb-10 md:mb-12">
        <PaymentStepper steps={steps} current={currentStage} />
      </div>

      {currentStage === 0 && (
        <>
          {loadingPkg && <LoadingState message={t('common.loading')} />}
          {pkgError && <ErrorState message={pkgError} />}
          {!loadingPkg && !pkgError && (
            <div
              ref={cardsRef}
              className="grid gap-6 md:grid-cols-3 md:gap-8"
            >
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  data-package-id={pkg.id}
                  className={cn('pricing-card', (pkg.featured || pkg.is_popular) && 'pricing-card-popular')}
                >
                  <PackageCard
                    pkg={pkg}
                    onSelect={selectPackage}
                    selected={selectedPkg?.id === pkg.id}
                    dimmed={!!selectedPkg && selectedPkg.id !== pkg.id}
                    animatePrice={!hasAnimated.current}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {currentStage === 1 && selectedPkg && (
        <MethodList pkg={selectedPkg} purchasing={purchasing} onBack={reset} onPick={() => buyPackage()} />
      )}

      {currentStage === 2 && qrData && (
        <QRStage
          qrData={qrData}
          purchasing={purchasing}
          notify={notify}
          onConfirm={checkStatus}
          onCancel={reset}
          onSimulate={simulateSuccess}
          onSuccess={(credits) => {
            setSuccessCredits(credits);
            setPaymentSuccess(true);
            fetchUser?.();
          }}
        />
      )}

      {/* Success modal */}
      {paymentSuccess &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="w-full max-w-md rounded-3xl bg-surface p-10 text-center shadow-lg dark:bg-dark-surface"
              >
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/20 text-success">
                  <Check size={36} strokeWidth={3} />
                </div>
                <h3 className="font-heading text-2xl font-bold leading-heading text-navy dark:text-ivory">
                  {t('payment.success.title')}
                </h3>
                <p className="mt-3 text-sm leading-paragraph text-muted dark:text-dark-text-muted">
                  {t('payment.success.msg', { credits: successCredits })}
                </p>
                <Button variant="primary" size="lg" onClick={finish} className="mt-6 w-full">
                  {t('common.confirm')}
                </Button>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </PageContainer>
  );
};

export default PaymentPage;

