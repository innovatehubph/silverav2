import { useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '../stores';
import { parseProductImages } from '../utils/product';
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
  const ctaRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  // Load animation (auto-play on mount)
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Blob fade in
      tl.fromTo(
        blobRef.current,
        { opacity: 0, scale: 0.96 },
        { opacity: 0.22, scale: 1, duration: 0.9 },
        0
      );

      // Headline animation
      tl.fromTo(
        headlineRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        0.1
      );

      // Subheadline
      tl.fromTo(
        subheadlineRef.current,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        0.4
      );

      // CTA
      tl.fromTo(
        ctaRef.current,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        0.5
      );

      // Image
      tl.fromTo(
        imageRef.current,
        { x: '12vw', opacity: 0, scale: 0.98 },
        { x: 0, opacity: 1, scale: 1, duration: 1 },
        0.2
      );

      // Add button
      tl.fromTo(
        addButtonRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' },
        0.7
      );
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
            // Reset all elements when scrolling back to top
            gsap.set([headlineRef.current, subheadlineRef.current, ctaRef.current], {
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
      // Image exits left and up
      scrollTl.fromTo(
        imageRef.current,
        { x: 0, y: 0, scale: 1, opacity: 1 },
        { x: '-22vw', y: '-10vh', scale: 0.92, opacity: 0, ease: 'power2.in' },
        0.7
      );

      // Headline exits left
      scrollTl.fromTo(
        headlineRef.current,
        { x: 0, opacity: 1 },
        { x: '-18vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      // Subheadline exits down
      scrollTl.fromTo(
        subheadlineRef.current,
        { y: 0, opacity: 1 },
        { y: '10vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      // CTA exits down
      scrollTl.fromTo(
        ctaRef.current,
        { y: 0, opacity: 1 },
        { y: '10vh', opacity: 0, ease: 'power2.in' },
        0.72
      );

      // Add button exits right
      scrollTl.fromTo(
        addButtonRef.current,
        { x: 0, opacity: 1 },
        { x: '6vw', opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="section-pinned bg-[#F4F6FA] z-10"
    >
      {/* Gradient Blob */}
      <div
        ref={blobRef}
        className="gradient-blob w-[600px] h-[600px] bg-[#B8B9FF]"
        style={{ top: '-10%', right: '10%' }}
      />

      {/* Content Container */}
      <div className="relative w-full h-full flex items-center">
        {/* Left Content */}
        <div className="absolute left-[6vw] top-[18vh] w-[52vw]">
          <p className="micro-label text-xs uppercase tracking-[0.12em] text-[#6B7280] mb-6">
            Silvera PH
          </p>
          <h1
            ref={headlineRef}
            className="headline-display text-[clamp(48px,9vw,140px)] text-[#0B0D10] mb-8"
          >
            SIGNATURE
            <br />
            BAGS
          </h1>
        </div>

        <div className="absolute left-[6vw] top-[56vh] w-[34vw]">
          <p
            ref={subheadlineRef}
            className="subheadline text-lg lg:text-xl text-[#0B0D10] leading-relaxed mb-8"
          >
            Premium Filipino shopping experience. Quality products, exceptional service.
          </p>
          <button 
            ref={ctaRef} 
            className="cta-button bg-primary-600 text-white px-8 py-4 rounded-full font-medium hover:bg-primary-700 transition-colors"
            onClick={() => navigate('/shop')}
          >
            Explore the collection
          </button>
        </div>

        {/* Right Image */}
        <div
          ref={imageRef}
          className="absolute left-[58vw] top-[14vh] w-[36vw] h-[72vh]"
        >
          <img
            src={heroImage}
            alt={heroProduct.name}
            className="w-full h-full object-cover rounded-2xl shadow-2xl"
          />
        </div>

        {/* Add Button */}
        <button
          ref={addButtonRef}
          onClick={() => {
            addItem(heroProduct, 1);
            toast.success('Added to cart!');
          }}
          className="add-button absolute right-[8vw] bottom-[10vh] w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors shadow-lg"
          aria-label="Add to cart"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>
    </section>
  );
}
