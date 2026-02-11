import { useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Plus, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '../stores';
import { parseProductImages } from '../utils/product';
import OptimizedImage from '../components/OptimizedImage';
import type { Product } from '../types';

gsap.registerPlugin(ScrollTrigger);

const defaultHeroProduct: Product = {
  id: 1,
  name: 'Signature Leather Handbag',
  slug: 'signature-leather-handbag',
  description: 'Authentic luxury leather handbag with gold hardware',
  price: 2850,
  category_id: 1,
  category_name: 'Signature Bags',
  images: ['/images/hero_bag.jpg'],
  stock: 10,
  featured: true,
  status: 'active',
  created_at: new Date().toISOString(),
};

interface HeroSectionProps {
  product?: Product;
}

export default function HeroSection({ product }: HeroSectionProps) {
  const heroProduct = product || defaultHeroProduct;
  const heroImage = parseProductImages(heroProduct.images)[0];
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const goldGlowRef = useRef<HTMLDivElement>(null);
  const accentGlowRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  // Load animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Gold glow fade in
      tl.fromTo(
        goldGlowRef.current,
        { opacity: 0, scale: 0.8 },
        { opacity: 0.3, scale: 1, duration: 1.2 },
        0
      );

      // Accent glow
      tl.fromTo(
        accentGlowRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 0.2, scale: 1, duration: 1 },
        0.2
      );

      // Label
      tl.fromTo(
        labelRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        0.1
      );

      // Headline animation
      tl.fromTo(
        headlineRef.current,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1 },
        0.2
      );

      // Subheadline
      tl.fromTo(
        subheadlineRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7 },
        0.5
      );

      // CTA
      tl.fromTo(
        ctaRef.current,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        0.6
      );

      // Image - floating card entrance
      tl.fromTo(
        imageRef.current,
        { x: '8vw', opacity: 0, scale: 0.92, rotateY: -8 },
        { x: 0, opacity: 1, scale: 1, rotateY: 0, duration: 1.2 },
        0.3
      );

      // Add button
      tl.fromTo(
        addButtonRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' },
        0.9
      );

      // Floating animation for the image
      gsap.to(imageRef.current, {
        y: -15,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1.5,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Scroll-driven exit animation
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
          onLeaveBack: () => {
            gsap.set([headlineRef.current, subheadlineRef.current, ctaRef.current, labelRef.current], {
              opacity: 1,
              x: 0,
              y: 0,
            });
            gsap.set(imageRef.current, { opacity: 1, x: 0, y: 0, scale: 1 });
            gsap.set(addButtonRef.current, { opacity: 1, x: 0 });
          },
        },
      });

      // EXIT phase (70-100%)
      scrollTl.fromTo(
        imageRef.current,
        { x: 0, y: 0, scale: 1, opacity: 1 },
        { x: '-22vw', y: '-10vh', scale: 0.88, opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        headlineRef.current,
        { x: 0, opacity: 1 },
        { x: '-18vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        [labelRef.current, subheadlineRef.current],
        { y: 0, opacity: 1 },
        { y: '8vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        ctaRef.current,
        { y: 0, opacity: 1 },
        { y: '10vh', opacity: 0, ease: 'power2.in' },
        0.72
      );

      scrollTl.fromTo(
        addButtonRef.current,
        { x: 0, opacity: 1 },
        { x: '6vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        [goldGlowRef.current, accentGlowRef.current],
        { opacity: 0.3 },
        { opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="section-pinned bg-bg-primary z-10"
    >
      {/* Ambient Gold Glow */}
      <div
        ref={goldGlowRef}
        className="absolute w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          top: '-15%',
          right: '5%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Secondary Violet Glow */}
      <div
        ref={accentGlowRef}
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          bottom: '10%',
          left: '5%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content Container */}
      <div className="relative w-full h-full flex items-center">
        {/* Left Content */}
        <div className="absolute left-[6vw] top-[16vh] w-[52vw]">
          <p
            ref={labelRef}
            className="micro-label text-xs uppercase tracking-[0.2em] text-gold mb-6"
          >
            Premium Collection
          </p>
          <h1
            ref={headlineRef}
            className="headline-display text-[clamp(48px,9vw,140px)] text-txt-primary mb-8"
          >
            <span className="text-gradient-gold">SIGNATURE</span>
            <br />
            <span className="text-txt-primary">BAGS</span>
          </h1>
        </div>

        <div className="absolute left-[6vw] top-[56vh] w-[38vw]">
          <p
            ref={subheadlineRef}
            className="subheadline text-lg lg:text-xl text-txt-secondary leading-relaxed mb-8"
          >
            Premium Filipino shopping experience. Authentic luxury brands, sourced from the U.S.
          </p>
          <div ref={ctaRef} className="flex items-center gap-4">
            <button
              className="cta-button group"
              onClick={() => navigate('/shop')}
            >
              Explore Collection
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              className="btn-outline border-bdr-strong text-txt-secondary hover:text-txt-primary hover:border-gold/40 px-6 py-4 rounded-xl"
              onClick={() => navigate('/contact')}
            >
              Request Item
            </button>
          </div>
        </div>

        {/* Right - Floating Product Card */}
        <div
          ref={imageRef}
          className="absolute left-[56vw] top-[12vh] w-[38vw] h-[76vh]"
          style={{ perspective: '1000px' }}
        >
          {/* Glow behind card */}
          <div
            className="absolute -inset-4 rounded-3xl opacity-40 blur-2xl pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(212, 175, 55, 0.2) 0%, transparent 70%)',
            }}
          />

          {/* Product Card */}
          <div className="relative w-full h-full glass-strong rounded-3xl overflow-hidden group">
            <OptimizedImage
              src={heroImage}
              alt={heroProduct.name}
              className="w-full h-full"
              sizes="38vw"
              eager
            />

            {/* Card Overlay - Bottom Info */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <p className="text-gold text-xs uppercase tracking-widest mb-2 font-medium">
                {heroProduct.category_name}
              </p>
              <h3 className="text-txt-primary text-xl font-serif font-bold mb-1">
                {heroProduct.name}
              </h3>
              <p className="text-gold text-2xl font-bold">
                ₱{heroProduct.price.toLocaleString()}
              </p>
            </div>

            {/* Gold border accent */}
            <div className="absolute inset-0 rounded-3xl border border-gold/20 pointer-events-none" />
          </div>
        </div>

        {/* Add Button */}
        <button
          ref={addButtonRef}
          onClick={() => {
            addItem(heroProduct, 1);
            toast.success('Added to cart!');
          }}
          className="add-button absolute right-[8vw] bottom-[10vh] w-14 h-14 bg-gold rounded-full flex items-center justify-center hover:bg-gold-300 transition-colors shadow-glow-gold"
          aria-label="Add to cart"
        >
          <Plus className="w-5 h-5 text-bg-primary" />
        </button>
      </div>
    </section>
  );
}
