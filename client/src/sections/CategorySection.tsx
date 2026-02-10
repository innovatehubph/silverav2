import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '../stores';
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
  const blobRef = useRef<HTMLDivElement>(null);
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

      // ENTRANCE (0-30%)
      const imageStartX = imagePosition === 'left' ? '-60vw' : '+60vw';
      const headlineStartX = imagePosition === 'left' ? '+40vw' : '-40vw';
      const addButtonExitX = imagePosition === 'left' ? '-6vw' : '+6vw';
      const headlineExitX = imagePosition === 'left' ? '+12vw' : '-12vw';
      const imageExitX = imagePosition === 'left' ? '-18vw' : '+18vw';
      const imageExitY = imagePosition === 'left' ? '-8vh' : '+8vh';

      // Image entrance
      scrollTl.fromTo(
        imageRef.current,
        { x: imageStartX, opacity: 0, scale: 0.96 },
        { x: 0, opacity: 1, scale: 1, ease: 'none' },
        0
      );

      // Headline entrance
      scrollTl.fromTo(
        headlineRef.current,
        { x: headlineStartX, opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0
      );

      // Subheadline + CTA entrance
      scrollTl.fromTo(
        [subheadlineRef.current, ctaRef.current],
        { y: '10vh', opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0.05
      );

      // Add button entrance
      scrollTl.fromTo(
        addButtonRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, ease: 'back.out(2)' },
        0.1
      );

      // Blob entrance
      scrollTl.fromTo(
        blobRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 0.22, scale: 1, ease: 'none' },
        0
      );

      // SETTLE (30-70%) - elements hold position

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
        blobRef.current,
        { opacity: 0.22 },
        { opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, [imagePosition]);

  const isLeft = imagePosition === 'left';

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`section-pinned ${isDark ? 'bg-[#0B0D10]' : 'bg-[#F4F6FA]'} relative`}
      style={{ zIndex }}
    >
      {/* Gradient Blob */}
      <div
        ref={blobRef}
        className={`gradient-blob w-[500px] h-[500px] rounded-full blur-3xl absolute ${
          isDark ? 'bg-white/10' : 'bg-[#B8B9FF]/20'
        }`}
        style={{
          top: '10%',
          [isLeft ? 'left' : 'right']: '15%',
        }}
      />

      {/* Content Container */}
      <div className="relative w-full h-full flex items-center">
        {/* Image (Left or Right) */}
        <div
          ref={imageRef}
          className={`absolute ${
            isLeft ? 'left-[6vw]' : 'left-[58vw]'
          } top-[14vh] w-[40vw] h-[72vh]`}
        >
          <img
            src={image}
            alt={headline}
            className={`w-full h-full object-cover rounded-2xl ${
              isDark ? '' : 'shadow-2xl'
            }`}
          />
        </div>

        {/* Text Content (Opposite side) */}
        <div
          className={`absolute ${
            isLeft ? 'right-[6vw]' : 'left-[6vw]'
          } top-[18vh] w-[50vw] ${isLeft ? 'text-right' : 'text-left'}`}
        >
          <h2
            ref={headlineRef}
            className={`text-[clamp(48px,9vw,140px)] font-serif font-bold leading-tight ${
              isDark ? 'text-[#F4F6FA]' : 'text-[#0B0D10]'
            }`}
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
            className={`text-lg lg:text-xl leading-relaxed mb-8 ${
              isDark ? 'text-[#F4F6FA]/90' : 'text-[#0B0D10]'
            }`}
          >
            {subheadline}
          </p>
          <button
            ref={ctaRef}
            onClick={() => window.location.href = '/shop'}
            className={`px-8 py-4 rounded-full font-medium transition-colors ${
              isDark 
                ? 'bg-[#F4F6FA] text-[#0B0D10] hover:bg-white' 
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
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
          className="absolute w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors shadow-lg"
          style={{
            [isLeft ? 'left' : 'right']: '8vw',
            bottom: '10vh',
          }}
          aria-label="Add to cart"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>
    </section>
  );
}
