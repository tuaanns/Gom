import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Phone,
  MapPin,
  User as UserIcon,
  AtSign,
  Tag,
  Send,
  Brain,
  Database,
  Zap,
  Globe,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Input, Textarea, Label } from '../../components/ui/Input';
import { contactApi } from './api';
import { getErrorMessage, isValidEmail } from '../../lib/utils';
import ShinyText from '../../components/ui/ShinyText';
import {
  ContactHoverGrid,
  ContactFormCard,
  MagneticShimmerButton,
  AnimatedFAQCard,
} from './ContactCards';

export const ContactPage = ({ notify }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, msg: null });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setFeedback({ type: 'error', msg: t('contact.form.error') });
      return;
    }
    if (!isValidEmail(form.email)) {
      setFeedback({ type: 'error', msg: t('contact.form.error') });
      return;
    }

    setSending(true);
    setFeedback({ type: null, msg: null });
    try {
      await contactApi.submit(form);
      setForm({ name: '', email: '', subject: '', message: '' });
      setFeedback({ type: 'success', msg: t('contact.form.success') });
      notify?.(t('contact.form.success'), 'success');
      setTimeout(() => setFeedback({ type: null, msg: null }), 8000);
    } catch (err) {
      const msg = getErrorMessage(err, t('contact.form.fail'));
      setFeedback({ type: 'error', msg });
      notify?.(msg, 'error');
    } finally {
      setSending(false);
    }
  };

  const systemItems = [
    { icon: Brain, text: t('contact.system.items.ai') },
    { icon: Database, text: t('contact.system.items.data') },
    { icon: Zap, text: t('contact.system.items.speed') },
    { icon: Globe, text: t('contact.system.items.global') },
  ];

  const contactCards = [
    {
      icon: Mail,
      title: t('contact.info.email'),
      value: 'dongnguyenkh123@gmail.com',
      note: t('contact.info.emailNote'),
      ctaText: t('contact.info.emailCta'),
      ctaLink: 'mailto:dongnguyenkh123@gmail.com',
    },
    {
      icon: Phone,
      title: t('contact.info.phone'),
      value: '0949 085 842',
      note: t('contact.info.phoneNote'),
      ctaText: t('contact.info.phoneCta'),
      ctaLink: 'tel:0949085842',
    },
    {
      icon: MapPin,
      title: t('contact.info.address'),
      value: t('contact.info.addressValue'),
      note: t('contact.info.addressNote'),
      ctaText: t('contact.info.addressCta'),
      ctaLink: '#',
    },
  ];

  const faqItems = [
    { question: t('contact.faq.q1'), answer: t('contact.faq.a1') },
    { question: t('contact.faq.q2'), answer: t('contact.faq.a2') },
    { question: t('contact.faq.q3'), answer: t('contact.faq.a3') },
  ];

  const inputFocusClass =
    'focus:shadow-[0_0_0_4px_rgba(159,183,201,0.28)] dark:focus:shadow-[0_0_0_4px_rgba(201,216,230,0.2)]';

  return (
    <PageContainer>
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 text-center"
        >
          <span className="text-xs font-extrabold uppercase tracking-wider leading-eyebrow text-ceramic-dark dark:text-ceramic">
            {t('contact.eyebrow')}
          </span>
          <h1 className="mt-4 font-heading text-3xl font-extrabold leading-[1.35] text-balance text-navy dark:text-ivory md:text-5xl md:leading-[1.32]">
            <ShinyText
              text={t('contact.title')}
              speed={3.5}
              delay={0}
              color="#0A1A42"
              shineColor="#C9D8E6"
              darkColor="#9CA3AF"
              darkShineColor="#FFFFFF"
              spread={90}
              direction="left"
              yoyo={false}
            />
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-paragraph text-muted dark:text-dark-text-muted md:text-base md:leading-paragraph-relaxed">
            {t('contact.subtitle')}
          </p>
        </motion.div>

        {/* Info cards */}
        <motion.div
          initial={{ opacity: 0, y: 26, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12"
        >
          <ContactHoverGrid items={contactCards} />
        </motion.div>

        {/* Main */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form */}
          <ContactFormCard
            title={t('contact.form.title')}
            subtitle={t('contact.form.subtitle')}
            className="lg:col-span-2"
          >

            <AnimatePresence>
              {feedback.type === 'success' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 flex items-center gap-3 rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success"
                >
                  <CheckCircle2 size={18} />
                  {feedback.msg}
                </motion.div>
              )}
              {feedback.type === 'error' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 flex items-center gap-3 rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger"
                >
                  <AlertTriangle size={18} />
                  {feedback.msg}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('contact.form.name')}</Label>
                  <Input
                    className={inputFocusClass}
                    name="name"
                    placeholder={t('contact.form.namePh')}
                    value={form.name}
                    onChange={onChange}
                    leftIcon={<UserIcon size={16} />}
                    required
                  />
                </div>
                <div>
                  <Label>{t('contact.form.email')}</Label>
                  <Input
                    className={inputFocusClass}
                    type="email"
                    name="email"
                    placeholder={t('contact.form.emailPh')}
                    value={form.email}
                    onChange={onChange}
                    leftIcon={<AtSign size={16} />}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>{t('contact.form.subject')}</Label>
                <Input
                  className={inputFocusClass}
                  name="subject"
                  placeholder={t('contact.form.subjectPh')}
                  value={form.subject}
                  onChange={onChange}
                  leftIcon={<Tag size={16} />}
                />
              </div>

              <div>
                <Label>{t('contact.form.message')}</Label>
                <Textarea
                  className={inputFocusClass}
                  name="message"
                  placeholder={t('contact.form.messagePh')}
                  value={form.message}
                  onChange={onChange}
                  rows={6}
                  required
                />
              </div>

              <MagneticShimmerButton
                type="submit"
                loading={sending}
                rightIcon={!sending && <Send size={16} />}
                aria-label={t('contact.form.submit')}
              >
                {sending ? t('contact.form.sending') : t('contact.form.submit')}
              </MagneticShimmerButton>
            </form>
          </ContactFormCard>

          {/* Side */}
          <motion.div
            initial={{ opacity: 0, x: 22 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <Card className="rounded-[26px] border-ceramic-border/75 bg-[#FFFCF7] dark:border-ceramic/30 dark:bg-[#101B36]">
              <h4 className="mb-4 flex items-center gap-2 font-heading text-base font-bold leading-card text-navy dark:text-ivory">
                <ShieldCheck className="text-ceramic" size={18} />
                {t('contact.system.title')}
              </h4>
              <ul className="space-y-3">
                {systemItems.map((it, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.35 }}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ceramic/15 text-ceramic-dark dark:bg-ceramic/20 dark:text-ceramic-soft">
                      <it.icon size={14} />
                    </div>
                    <span className="text-muted dark:text-dark-text-muted">{it.text}</span>
                  </motion.li>
                ))}
              </ul>
            </Card>

            <AnimatedFAQCard title={t('contact.faq.title')} items={faqItems} />
          </motion.div>
        </div>
    </PageContainer>
  );
};

export default ContactPage;

