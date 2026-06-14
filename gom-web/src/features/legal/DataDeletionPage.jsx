import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';

export const DataDeletionPage = () => {
  const { t } = useTranslation();
  const s2Items = t('legal.dataDeletion.s2Items', { returnObjects: true }) || [];
  const s3Items = t('legal.dataDeletion.s3Items', { returnObjects: true }) || [];

  return (
    <PageContainer narrow>
      <PageHeader
        title={t('legal.dataDeletion.title')}
        subtitle={t('legal.dataDeletion.subtitle')}
        centered
      />
      <Card padded={false} className="px-8 py-10 md:px-12 md:py-12 shadow-sm border border-stroke dark:border-dark-stroke bg-surface dark:bg-dark-surface">
        <div className="space-y-8">
          
          <section>
            <h3 className="mb-3 font-heading text-lg font-extrabold text-navy dark:text-ivory">
              {t('legal.dataDeletion.s1Title')}
            </h3>
            <p className="text-sm leading-relaxed text-muted dark:text-dark-text-muted">
              {t('legal.dataDeletion.s1Body')}
            </p>
          </section>

          <section>
            <h3 className="mb-3 font-heading text-lg font-extrabold text-navy dark:text-ivory">
              {t('legal.dataDeletion.s2Title')}
            </h3>
            <p className="text-sm leading-relaxed text-muted dark:text-dark-text-muted mb-3">
              {t('legal.dataDeletion.s2Body')}
            </p>
            <ul className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-muted dark:text-dark-text-muted">
              {Array.isArray(s2Items) && s2Items.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
          </section>

          <section>
            <h3 className="mb-3 font-heading text-lg font-extrabold text-navy dark:text-ivory">
              {t('legal.dataDeletion.s3Title')}
            </h3>
            <p className="text-sm leading-relaxed text-muted dark:text-dark-text-muted mb-3">
              {t('legal.dataDeletion.s3Body')}
            </p>
            <ul className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-muted dark:text-dark-text-muted">
              {Array.isArray(s3Items) && s3Items.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
          </section>

          <section>
            <h3 className="mb-3 font-heading text-lg font-extrabold text-navy dark:text-ivory">
              {t('legal.dataDeletion.s4Title')}
            </h3>
            <p className="text-sm leading-relaxed text-muted dark:text-dark-text-muted">
              {t('legal.dataDeletion.s4Body')}
            </p>
          </section>

        </div>
      </Card>
    </PageContainer>
  );
};

export default DataDeletionPage;
