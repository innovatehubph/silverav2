import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import OptimizedImage from '../components/OptimizedImage';

const HERO_IMAGE = 'https://s3.innoserver.cloud/silvera/hero/hero-main.webp';

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const goldGlowRef = useRef<HTMLDivElement>(null);
  const accentGlowRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const navigate = useNavigate();

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
        // Load animation
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.fromTo(goldGlowRef.current, { opacity: 0, scale: 0.8 }, { opacity: 0.3, scale: 1, duration: 1.2 }, 0);
        tl.fromTo(accentGlowRef.current, { opacity: 0, scale: 0.9 }, { opacity: 0.2, scale: 1, duration: 1 }, 0.2);
        tl.fromTo(labelRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.1);
        tl.fromTo(headlineRef.current, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, 0.2);
        tl.fromTo(subheadlineRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.5);
        tl.fromTo(ctaRef.current, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.6);
        tl.fromTo(imageRef.current, { x: '8vw', opacity: 0, scale: 0.92 }, { x: 0, opacity: 1, scale: 1, duration: 1.2 }, 0.3);

        // Scroll-driven exit animation
        const scrollTl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=130%',
            pin: true,
            pinSpacing: false,
            scrub: 0.6,
            onLeaveBack: () => {
              gsap.set([headlineRef.current, subheadlineRef.current, ctaRef.current, labelRef.current], { opacity: 1, x: 0, y: 0 });
              gsap.set(imageRef.current, { opacity: 1, x: 0, y: 0, scale: 1 });
            },
          },
        });

        scrollTl.fromTo(imageRef.current, { x: 0, y: 0, scale: 1, opacity: 1 }, { x: '-22vw', y: '-10vh', scale: 0.88, opacity: 0, ease: 'power2.in' }, 0.7);
        scrollTl.fromTo(headlineRef.current, { x: 0, opacity: 1 }, { x: '-18vw', opacity: 0, ease: 'power2.in' }, 0.7);
        scrollTl.fromTo([labelRef.current, subheadlineRef.current], { y: 0, opacity: 1 }, { y: '8vh', opacity: 0, ease: 'power2.in' }, 0.7);
        scrollTl.fromTo(ctaRef.current, { y: 0, opacity: 1 }, { y: '10vh', opacity: 0, ease: 'power2.in' }, 0.72);
        scrollTl.fromTo([goldGlowRef.current, accentGlowRef.current], { opacity: 0.3 }, { opacity: 0, ease: 'power2.in' }, 0.7);
      }, section);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} id="hero" className="section-pinned bg-bg-primary z-10">
      {/* Ambient Gold Glow */}
      <div ref={goldGlowRef} className="absolute w-[700px] h-[700px] rounded-full pointer-events-none" style={{ top: '-15%', right: '5%', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      {/* Secondary Violet Glow */}
      <div ref={accentGlowRef} className="absolute w-[400px] h-[400px] rounded-full pointer-events-none" style={{ bottom: '10%', left: '5%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />

      {/* Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Content Container */}
      <div className="relative w-full h-full flex items-center">
        {/* Left Content */}
        <div className="absolute left-[6vw] top-[16vh] w-[52vw] md:w-[42vw]">
          <p ref={labelRef} className="micro-label text-xs uppercase tracking-[0.2em] text-gold mb-6">
            <ShoppingBag className="inline w-4 h-4 mr-2" />
            Luxury Brands from USA
          </p>
          <h1 ref={headlineRef} className="headline-display text-[clamp(36px,7vw,100px)] text-txt-primary mb-8">
            <span className="text-gradient-gold">SILVERA</span>
            <br />
            <span className="text-txt-primary">LUXURY</span>
          </h1>
        </div>

        <div className="absolute left-[6vw] top-[50vh] md:top-[56vh] w-[90vw] md:w-[38vw]">
          <p ref={subheadlineRef} className="subheadline text-base lg:text-xl text-txt-secondary leading-relaxed mb-8">
            Your premium Filipino shopping experience. Authentic luxury brands, sourced directly from the United States.
          </p>
          <div ref={ctaRef} className="flex flex-wrap items-center gap-4">
            <button className="cta-button group" onClick={() => navigate('/shop')}>
              Shop Now
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="btn-outline border-bdr-strong text-txt-secondary hover:text-txt-primary hover:border-gold/40 px-6 py-4 rounded-xl" onClick={() => navigate('/categories')}>
              Browse Categories
            </button>
          </div>
        </div>

        {/* Right - Hero Image */}
        <div ref={imageRef} className="absolute right-0 top-0 w-[50vw] h-full hidden md:block" style={{ perspective: '1000px' }}>
          <div className="absolute -inset-4 rounded-3xl opacity-40 blur-2xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(212, 175, 55, 0.2) 0%, transparent 70%)' }} />
          <div className="relative w-full h-full overflow-hidden">
            <OptimizedImage src={HERO_IMAGE} alt="Silvera Luxury Brands" className="w-full h-full object-cover object-center" sizes="50vw" width={1280} height={853} eager />
          </div>
        </div>

        {/* Mobile Hero Image */}
        <div className="absolute inset-0 md:hidden opacity-20 pointer-events-none">
          <img src={HERO_IMAGE} alt="" className="w-full h-full object-cover" width={1920} height={1080} loading="eager" />
        </div>
      </div>
    </section>
  );
}
