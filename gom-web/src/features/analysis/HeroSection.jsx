import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Upload, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { GlareHover } from '../../components/ui/GlareHover';
import RotatingText from '../../components/ui/RotatingText';

export const HeroSection = ({ onUpload, onExplore, featuredImage }) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(1); // 1 = right to left, -1 = left to right
  const [images, setImages] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const overrideImagesRaw = t('home.heroImages', { returnObjects: true, defaultValue: '' });
  // Memoize it so useEffect doesn't trigger infinitely if it's an array reference change
  const overrideImages = React.useMemo(() => {
    if (typeof overrideImagesRaw === 'string' && overrideImagesRaw.trim() !== '') {
      return overrideImagesRaw.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (Array.isArray(overrideImagesRaw) && overrideImagesRaw.length > 0 && overrideImagesRaw[0] !== '') {
      return overrideImagesRaw;
    }
    return [];
  }, [overrideImagesRaw]);

  // Fetch featured ceramic images from API or use overrides
  React.useEffect(() => {
    const fetchImages = async () => {
      // If admin provided custom image links, use them directly
      if (overrideImages.length > 0) {
        setImages(overrideImages);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'}/ceramic-lines?featured=1`);
        const data = await response.json();
        const ceramicImages = data.data
          ?.filter(item => item.image_url)
          .map(item => item.image_url)
          .slice(0, 5) || [];
        
        // Fallback images if no data
        const fallbackImages = [
          'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=900',
          'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=900',
          'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&q=80&w=900',
        ];
        
        setImages(ceramicImages.length > 0 ? ceramicImages : fallbackImages);
      } catch (error) {
        console.error('Failed to fetch ceramic images:', error);
        setImages([
          'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=900',
          'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=900',
          'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&q=80&w=900',
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchImages();
  }, [overrideImages]);

  // Auto-rotate carousel (right to left by default)
  React.useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setDirection(1); // Always go right to left on auto
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  const nextImage = () => {
    setDirection(1); // Right to left
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setDirection(-1); // Left to right
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const rotatingWordsRaw = t('home.heroRotatingWords', { returnObjects: true });
  const rotatingWords = typeof rotatingWordsRaw === 'string' 
    ? rotatingWordsRaw.split(',').map(s => s.trim()) 
    : rotatingWordsRaw;
    
  const safeRotatingWords =
    Array.isArray(rotatingWords) && rotatingWords.length > 0
      ? rotatingWords
      : ['di sản', 'tinh hoa', 'kho tàng', 'bảo vật'];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-ceramic/15 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-navy/10 blur-3xl" />
      </div>

      <div className="grid gap-12 py-12 lg:grid-cols-2 lg:gap-20 lg:py-20">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col justify-center"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-ceramic/15 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-ceramic-dark leading-eyebrow">
            <Sparkles size={12} />
            {t('home.heroEyebrow')}
          </span>
          <h1 className="mt-6 font-heading text-4xl font-extrabold leading-[1.35] text-balance text-navy dark:text-ivory md:text-5xl md:leading-[1.32] lg:text-6xl lg:leading-[1.3]">
            {t('home.heroPrefix')}{' '}
            <RotatingText
              texts={safeRotatingWords}
              mainClassName="px-2 sm:px-3 bg-gradient-to-r from-ceramic via-ceramic-soft to-ceramic text-navy overflow-hidden py-1 sm:py-1.5 md:py-2 justify-center rounded-lg inline-flex"
              staggerFrom="last"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-120%' }}
              staggerDuration={0.025}
              splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1"
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              rotationInterval={2500}
              splitBy="characters"
              autoloop
            />{' '}
            {t('home.heroSuffix')}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-paragraph text-muted dark:text-dark-text-muted md:text-lg md:leading-paragraph-relaxed">
            {t('home.heroSubtitle')}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <GlareHover
              glareColor="#ffffff"
              glareOpacity={0.3}
              glareAngle={-30}
              glareSize={260}
              transitionDuration={600}
              playOnce={false}
              className="rounded-2xl"
            >
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Upload size={18} />}
                onClick={onUpload}
              >
                {t('home.ctaUpload')}
              </Button>
            </GlareHover>

            <GlareHover
              glareColor="#ffffff"
              glareOpacity={0.26}
              glareAngle={-28}
              glareSize={240}
              transitionDuration={600}
              playOnce={false}
              className="rounded-2xl"
            >
              <Button
                variant="outline"
                size="lg"
                rightIcon={<ArrowRight size={18} />}
                onClick={onExplore}
              >
                {t('home.ctaExplore')}
              </Button>
            </GlareHover>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute inset-0 -z-10 rounded-[40px] bg-gradient-navy opacity-10 blur-2xl" />
          
          {/* Carousel Container */}
          <div className="relative w-full overflow-hidden rounded-[40px] border-4 border-stroke bg-surface shadow-xl dark:border-dark-stroke dark:bg-dark-surface">
            {isLoading ? (
              <div className="flex h-[420px] w-full items-center justify-center md:h-[500px]">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-ceramic border-t-transparent" />
              </div>
            ) : (
              <>
                <AnimatePresence mode="wait" initial={false} custom={direction}>
                  <motion.img
                    key={currentIndex}
                    custom={direction}
                    src={images[currentIndex]}
                    alt={`Heritage ceramic ${currentIndex + 1}`}
                    className="h-[420px] w-full object-cover md:h-[500px]"
                    initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      duration: 0.5
                    }}
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=900';
                      e.currentTarget.onerror = null;
                    }}
                  />
                </AnimatePresence>

                {/* Navigation Buttons - Navy color */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-navy/90 p-2.5 text-white backdrop-blur-sm transition-all hover:bg-navy hover:scale-110 active:scale-95 dark:bg-navy/90 dark:hover:bg-navy-light"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={24} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-navy/90 p-2.5 text-white backdrop-blur-sm transition-all hover:bg-navy hover:scale-110 active:scale-95 dark:bg-navy/90 dark:hover:bg-navy-light"
                      aria-label="Next image"
                    >
                      <ChevronRight size={24} strokeWidth={2.5} />
                    </button>

                    {/* Dots Indicator - Navy color */}
                    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setDirection(idx > currentIndex ? 1 : -1);
                            setCurrentIndex(idx);
                          }}
                          className={`h-2 rounded-full transition-all ${
                            idx === currentIndex
                              ? 'w-8 bg-navy dark:bg-ceramic'
                              : 'w-2 bg-white/60 hover:bg-white/90'
                          }`}
                          aria-label={`Go to image ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;

