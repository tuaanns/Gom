import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';

export const PrivacyPage = () => {
  const { t } = useTranslation();
  const items = t('legal.privacy.s2Items', { returnObjects: true }) || [];

  return (
    <PageContainer narrow>
        <PageHeader
          title={t('legal.privacy.title')}
          subtitle={t('legal.privacy.subtitle')}
          centered
        />
        <Card padded={false} className="px-8 py-10 md:px-12 md:py-12">
          <div className="space-y-8">
            <section>
              <h3 className="mb-3 font-heading text-lg font-extrabold text-navy dark:text-ivory">
                {t('legal.privacy.s1Title')}
              </h3>
              <p className="text-sm leading-relaxed text-muted dark:text-dark-text-muted">
                {t('legal.privacy.s1Body')}
              </p>
            </section>

            <section>
              <h3 className="mb-3 font-heading text-lg font-extrabold text-navy dark:text-ivory">
                {t('legal.privacy.s2Title')}
              </h3>
              <ul className="ml-5 list-disc space-y-1 text-sm leading-relaxed text-muted dark:text-dark-text-muted">
                {Array.isArray(items) && items.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </section>

            <section>
              <h3 className="mb-3 font-heading text-lg font-extrabold text-navy dark:text-ivory">
                {t('legal.privacy.s3Title')}
              </h3>
              <p className="text-sm leading-relaxed text-muted dark:text-dark-text-muted">
                {t('legal.privacy.s3Body')}
              </p>
            </section>

            <section>
              <h3 className="mb-3 font-heading text-lg font-extrabold text-navy dark:text-ivory">
                {t('legal.privacy.s4Title')}
              </h3>
              <p className="text-sm leading-relaxed text-muted dark:text-dark-text-muted">
                {t('legal.privacy.s4Body')}
              </p>
            </section>
          </div>
        </Card>
    </PageContainer>
  );
};

export default PrivacyPage;

