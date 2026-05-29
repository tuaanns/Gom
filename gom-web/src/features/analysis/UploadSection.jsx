import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, ImagePlus, Loader2, X, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { GlareHover } from '../../components/ui/GlareHover';

export const UploadSection = ({ file, preview, loading, error, onFileChange, onAnalyze, onClear }) => {
  const { t } = useTranslation();
  const fileRef = useRef(null);

  return (
    <section id="analysis-section" className="py-16">
      <Card className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-3xl font-extrabold text-navy dark:text-ivory md:text-4xl">
          {t('analysis.title')}
        </h2>
        <p className="mt-2 text-sm text-muted dark:text-dark-text-muted md:text-base">
          {t('analysis.subtitle')}
        </p>

        <div className="mt-8">
          <div
            className="relative mx-auto flex aspect-video max-w-2xl cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-stroke bg-surface-alt transition-all hover:border-ceramic dark:border-dark-stroke dark:bg-dark-surface-alt"
            onClick={() => !preview && fileRef.current?.click()}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Preview"
                  className="h-full w-full rounded-3xl object-contain"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear?.();
                  }}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                  aria-label="Clear"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ceramic/15 text-ceramic-dark">
                  <ImagePlus size={28} />
                </div>
                <p className="text-sm font-bold text-navy dark:text-ivory">
                  {t('analysis.uploadHint')}
                </p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
          </div>

          {error && (
            <p className="mt-4 text-sm font-semibold text-danger">{error}</p>
          )}

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              variant="ghost"
              size="md"
              onClick={() => fileRef.current?.click()}
              leftIcon={<Upload size={16} />}
              className="w-full sm:w-auto"
            >
              {file ? t('analysis.changeFile') : t('analysis.selectFile')}
            </Button>
            
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <GlareHover
                glareColor="#ffffff"
                glareOpacity={0.32}
                glareAngle={-30}
                glareSize={260}
                transitionDuration={600}
                playOnce={false}
                className="rounded-2xl"
              >
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onAnalyze}
                  disabled={!file || loading}
                  leftIcon={loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  className="w-full sm:w-auto"
                >
                  {loading ? t('analysis.analyzing') : t('analysis.analyzeBtn')}
                </Button>
              </GlareHover>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
};

export default UploadSection;

