import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '../stores';
import OptimizedImage from '../components/OptimizedImage';
import type { Product } from '../types';

gsap.registerPlugin(ScrollTrigger);

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
  product,
}: CategorySectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCartStore();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
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
      const addButtonExitX = imagePosition === 'left' ? '-6vw' : '+6vw';
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
        addButtonRef.current,
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
        addButtonRef.current,
        { x: 0, opacity: 1 },
        { x: addButtonExitX, opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        glowRef.current,
        { opacity: 0.25 },
        { opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, [imagePosition]);

  const isLeft = imagePosition === 'left';

  // Alternate between dark and slightly lighter dark backgrounds
  const bgClass = isDark ? 'bg-bg-secondary' : 'bg-bg-primary';

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
        {/* Image */}
        <div
          ref={imageRef}
          className={`absolute ${
            isLeft ? 'left-[6vw]' : 'left-[58vw]'
          } top-[14vh] w-[40vw] h-[72vh]`}
        >
          {/* Glow behind image */}
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
          {/* Gold border on hover area */}
          <div className="absolute inset-0 rounded-2xl border border-gold/10 pointer-events-none" />
        </div>

        {/* Text Content */}
        <div
          className={`absolute ${
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
          className={`absolute ${
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
            onClick={() => window.location.href = '/shop'}
            className="cta-button"
          >
            {cta}
          </button>
        </div>

        {/* Add Button */}
        <button
          ref={addButtonRef}
          onClick={() => {
            if (product) {
              addItem(product, 1);
              toast.success('Added to cart!');
            }
          }}
          className="absolute w-14 h-14 bg-gold rounded-full flex items-center justify-center hover:bg-gold-300 transition-colors shadow-glow-gold"
          style={{
            [isLeft ? 'left' : 'right']: '8vw',
            bottom: '10vh',
          }}
          aria-label="Add to cart"
        >
          <Plus className="w-5 h-5 text-bg-primary" />
        </button>
      </div>
    </section>
  );
}
