import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Landmark, ShieldCheck, Database, Users, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { analysisApi } from '../analysis/api';
import ShinyText from '../../components/ui/ShinyText';
import { AboutBentoGrid, AboutBentoCard, MissionStatementCard } from './AboutCards';

export const AboutPage = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ total_analyzed: null, accuracy: null });

  useEffect(() => {
    analysisApi
      .getStats()
      .then((res) => {
        const payload = res.data?.data || {};
        setStats({
          total_analyzed: payload.total_analyzed ?? 0,
          accuracy: payload.accuracy ?? 0,
        });
      })
      .catch(() => setStats({ total_analyzed: 0, accuracy: 0 }));
  }, []);

  const features = [
    {
      icon: ShieldCheck,
      title: t('about.features.accuracy.title'),
      desc: t('about.features.accuracy.desc'),
    },
    {
      icon: Database,
      title: t('about.features.data.title'),
      desc: t('about.features.data.desc'),
    },
    {
      icon: Users,
      title: t('about.features.community.title'),
      desc: t('about.features.community.desc'),
    },
  ];

  const missionStats = [
    {
      value: stats.total_analyzed ?? 0,
      label: t('about.mission.stats1'),
      icon: ImageIcon,
      progress: 86,
    },
    {
      value: stats.accuracy ?? 0,
      decimals: 1,
      suffix: '%',
      label: t('about.mission.stats2'),
      icon: CheckCircle2,
      progress: Math.min(Math.max(stats.accuracy ?? 0, 0), 100),
    },
  ];

  return (
    <PageContainer>
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
          className="mb-20 text-center"
        >
          <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ceramic-dark dark:text-ceramic leading-eyebrow">
            <Landmark size={14} />
            {t('about.eyebrow')}
          </span>
          <h1 className="mx-auto mt-4 max-w-3xl font-heading text-3xl font-extrabold leading-[1.35] text-balance text-navy dark:text-ivory md:text-5xl md:leading-[1.32]">
            <ShinyText
              text={t('about.title')}
              speed={4}
              delay={0}
              color="#0A1A42"
              shineColor="#B8CAD8"
              darkColor="#9CA3AF"
              darkShineColor="#FFFFFF"
              spread={85}
              direction="left"
              yoyo={false}
            />
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-paragraph text-muted dark:text-dark-text-muted md:text-lg md:leading-paragraph-relaxed">
            {t('about.subtitle')}
          </p>
        </motion.div>

        {/* Features */}
        <AboutBentoGrid className="mb-20">
          <AboutBentoCard
            icon={features[0].icon}
            title={features[0].title}
            desc={features[0].desc}
            className="md:col-span-4"
            index={0}
          />

          <AboutBentoCard
            icon={features[1].icon}
            title={features[1].title}
            desc={features[1].desc}
            className="md:col-span-2"
            index={1}
          />

          <AboutBentoCard
            icon={features[2].icon}
            title={features[2].title}
            desc={features[2].desc}
            className="md:col-span-3"
            index={2}
          />

          <motion.article
            initial={{ opacity: 0, y: 28, x: 20, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.64, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[26px] border border-ceramic-border/80 bg-[#FFFCF7] p-7 shadow-[0_24px_58px_-36px_rgba(16,42,86,0.68)] dark:border-ceramic/30 dark:bg-[#0F1830] md:col-span-3"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-ceramic-soft/35 via-transparent to-[#C9A227]/5 dark:from-ceramic/18 dark:to-[#C9A227]/10" />
            <p className="relative text-xs font-extrabold uppercase tracking-[0.2em] text-ceramic-dark dark:text-ceramic">
              Editorial Narrative
            </p>
            <h3 className="relative mt-3 font-heading text-2xl font-bold leading-[1.22] text-navy dark:text-ivory">
              {t('about.mission.title')} {t('about.mission.highlight')}
            </h3>
            <p className="relative mt-4 text-sm leading-[1.84] text-muted dark:text-dark-text-muted">
              {t('about.mission.p1')}
            </p>
            <div className="relative mt-6 h-px bg-gradient-to-r from-ceramic-hover via-[#C9A227]/70 to-transparent" />
            <p className="relative mt-5 text-sm leading-[1.84] text-muted dark:text-dark-text-muted">
              {t('about.mission.p2')}
            </p>
          </motion.article>
        </AboutBentoGrid>

        {/* Mission */}
        <MissionStatementCard
          title={t('about.mission.title')}
          highlight={t('about.mission.highlight')}
          p1={t('about.mission.p1')}
          p2={t('about.mission.p2')}
          stats={missionStats}
        />
    </PageContainer>
  );
};

export default AboutPage;

