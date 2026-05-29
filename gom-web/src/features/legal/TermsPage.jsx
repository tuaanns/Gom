import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { SEO } from '../../components/SEO';

export const TermsPage = () => {
  const { t } = useTranslation();
  const sections = [
    { title: t('legal.terms.s1Title'), body: t('legal.terms.s1Body') },
    { title: t('legal.terms.s2Title'), body: t('legal.terms.s2Body') },
    { title: t('legal.terms.s3Title'), body: t('legal.terms.s3Body') },
    { title: t('legal.terms.s4Title'), body: t('legal.terms.s4Body') },
  ];

  return (
    <PageContainer narrow>
      <SEO 
        title={t('legal.terms.seoTitle', { defaultValue: t('legal.terms.title') })}
        description={t('legal.terms.seoDescription', { defaultValue: t('legal.terms.subtitle') })}
        keywords={t('legal.terms.seoKeywords', { defaultValue: 'điều khoản, dịch vụ, the archivist, terms of service' })}
      />
        <PageHeader
          title={t('legal.terms.title')}
          subtitle={t('legal.terms.subtitle')}
          centered
        />
        <Card padded={false} className="px-8 py-10 md:px-12 md:py-12">
          <div className="space-y-8">
            {sections.map((s, i) => (
              <section key={i}>
                <h3 className="mb-3 font-heading text-lg font-extrabold text-navy dark:text-ivory">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted dark:text-dark-text-muted">
                  {s.body}
                </p>
              </section>
            ))}
          </div>
        </Card>
    </PageContainer>
  );
};

export default TermsPage;

