import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';
import OptimizedImage from '../components/OptimizedImage';
import type { Product } from '../types';

const SECTION_ORDER = ['hero', 'apparel', 'footwear', 'accessories', 'dresses', 'how-it-works'];

interface CategorySectionProps {
  id: string;
  headline: string;
  subheadline: string;
  cta: string;
  image: string;
  imagePosition: 'left' | 'right';
  isDark?: boolean;
  zIndex: number;
  product?: Product;
  categorySlug?: string;
}

export default function CategorySection({
  id,
  headline,
  subheadline,
  cta,
  image,
  imagePosition,
  isDark = false,
  zIndex,
  categorySlug,
}: CategorySectionProps) {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const handleCategoryClick = () => {
    if (categorySlug) {
      navigate(`/shop?category=${categorySlug}`);
    } else {
      navigate('/shop');
    }
  };

  const scrollToSection = (direction: 'prev' | 'next') => {
    const idx = SECTION_ORDER.indexOf(id);
    const targetId = direction === 'prev'
      ? SECTION_ORDER[idx - 1]
      : SECTION_ORDER[idx + 1];
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    let ctx: any;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const section = sectionRef.current;
      if (!section) return;

      ctx = gsap.context(() => {
        const scrollTl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=130%',
            pin: true,
            scrub: 0.6,
          },
        });

        const imageStartX = imagePosition === 'left' ? '-60vw' : '+60vw';
        const headlineStartX = imagePosition === 'left' ? '+40vw' : '-40vw';
        const headlineExitX = imagePosition === 'left' ? '+12vw' : '-12vw';
        const imageExitX = imagePosition === 'left' ? '-18vw' : '+18vw';
        const imageExitY = imagePosition === 'left' ? '-8vh' : '+8vh';

        // ENTRANCE (0-30%)
        scrollTl.fromTo(
          imageRef.current,
          { x: imageStartX, opacity: 0, scale: 0.96 },
          { x: 0, opacity: 1, scale: 1, ease: 'none' },
          0
        );

        scrollTl.fromTo(
          headlineRef.current,
          { x: headlineStartX, opacity: 0 },
          { x: 0, opacity: 1, ease: 'none' },
          0
        );

        scrollTl.fromTo(
          [subheadlineRef.current, ctaRef.current],
          { y: '10vh', opacity: 0 },
          { y: 0, opacity: 1, ease: 'none' },
          0.05
        );

        scrollTl.fromTo(
          navRef.current,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, ease: 'back.out(2)' },
          0.1
        );

        scrollTl.fromTo(
          glowRef.current,
          { opacity: 0, scale: 0.9 },
          { opacity: 0.25, scale: 1, ease: 'none' },
          0
        );

        // EXIT (70-100%)
        scrollTl.fromTo(
          imageRef.current,
          { x: 0, y: 0, opacity: 1 },
          { x: imageExitX, y: imageExitY, opacity: 0, ease: 'power2.in' },
          0.7
        );

        scrollTl.fromTo(
          headlineRef.current,
          { x: 0, opacity: 1 },
          { x: headlineExitX, opacity: 0, ease: 'power2.in' },
          0.7
        );

        scrollTl.fromTo(
          [subheadlineRef.current, ctaRef.current],
          { y: 0, opacity: 1 },
          { y: '10vh', opacity: 0, ease: 'power2.in' },
          0.7
        );

        scrollTl.fromTo(
          navRef.current,
          { opacity: 1 },
          { opacity: 0, ease: 'power2.in' },
          0.7
        );

        scrollTl.fromTo(
          glowRef.current,
          { opacity: 0.25 },
          { opacity: 0, ease: 'power2.in' },
          0.7
        );
      }, section);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [imagePosition]);

  const isLeft = imagePosition === 'left';
  const bgClass = isDark ? 'bg-bg-secondary' : 'bg-bg-primary';
  const idx = SECTION_ORDER.indexOf(id);
  const hasPrev = idx > 0;
  const hasNext = idx < SECTION_ORDER.length - 1;

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`section-pinned ${bgClass} relative`}
      style={{ zIndex }}
    >
      {/* Gold/Violet Glow */}
      <div
        ref={glowRef}
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          top: '10%',
          [isLeft ? 'left' : 'right']: '15%',
          background: isDark
            ? 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Content Container */}
      <div className="relative w-full h-full flex items-center">
        {/* Image — z-0 so it stays behind text */}
        <div
          ref={imageRef}
          className={`absolute z-0 ${
            isLeft ? 'left-[6vw]' : 'left-[58vw]'
          } top-[14vh] w-[40vw] h-[72vh]`}
        >
          <div
            className="absolute -inset-3 rounded-2xl opacity-30 blur-xl pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
            }}
          />
          <OptimizedImage
            src={image}
            alt={headline}
            className="relative w-full h-full rounded-2xl border border-bdr-subtle"
            sizes="40vw"
          />
          <div className="absolute inset-0 rounded-2xl border border-gold/10 pointer-events-none" />
        </div>

        {/* Text Content — z-10 so it stays above image */}
        <div
          className={`absolute z-10 ${
            isLeft ? 'right-[6vw]' : 'left-[6vw]'
          } top-[18vh] w-[50vw] ${isLeft ? 'text-right' : 'text-left'}`}
        >
          <h2
            ref={headlineRef}
            className="text-[clamp(48px,9vw,140px)] font-serif font-bold leading-tight text-gradient-gold"
          >
            {headline}
          </h2>
        </div>

        <div
          className={`absolute z-10 ${
            isLeft ? 'right-[6vw]' : 'left-[6vw]'
          } top-[56vh] w-[34vw] ${isLeft ? 'text-right' : 'text-left'}`}
        >
          <p
            ref={subheadlineRef}
            className="text-lg lg:text-xl leading-relaxed mb-8 text-txt-secondary"
          >
            {subheadline}
          </p>
          <button
            ref={ctaRef}
            onClick={handleCategoryClick}
            className="cta-button"
          >
            {cta}
          </button>
        </div>

        {/* Prev / Next Navigation Buttons */}
        <div
          ref={navRef}
          className="absolute z-10 flex flex-col gap-3"
          style={{
            [isLeft ? 'left' : 'right']: '8vw',
            bottom: '10vh',
          }}
        >
          {hasPrev && (
            <button
              onClick={() => scrollToSection('prev')}
              className="w-12 h-12 rounded-full border border-gold/40 bg-bg-primary/60 backdrop-blur flex items-center justify-center hover:bg-gold/20 transition-colors"
              aria-label="Previous section"
            >
              <ChevronUp className="w-5 h-5 text-gold" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => scrollToSection('next')}
              className="w-12 h-12 rounded-full border border-gold/40 bg-bg-primary/60 backdrop-blur flex items-center justify-center hover:bg-gold/20 transition-colors"
              aria-label="Next section"
            >
              <ChevronDown className="w-5 h-5 text-gold" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
