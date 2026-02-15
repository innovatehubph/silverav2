import { useRef, useEffect } from 'react';
import { MessageSquare, Search, Truck } from 'lucide-react';

const steps = [
  {
    icon: MessageSquare,
    title: 'Request an item',
    description: 'Share the brand, model, size, or a photo.',
  },
  {
    icon: Search,
    title: 'We source in the U.S.',
    description: 'We verify authenticity and confirm pricing.',
  },
  {
    icon: Truck,
    title: 'Receive in the Philippines',
    description: 'Door-to-door delivery with updates.',
  },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
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
        gsap.fromTo(
          titleRef.current,
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: titleRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );

        cardsRef.current.forEach((card, index) => {
          if (!card) return;
          gsap.fromTo(
            card,
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              delay: index * 0.12,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                toggleActions: 'play none none reverse',
              },
            }
          );
        });
      }, section);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="bg-bg-secondary py-24 lg:py-32 px-6 lg:px-[6vw] border-t border-bdr-subtle"
      style={{ zIndex: 100 }}
    >
      <div className="max-w-6xl mx-auto">
        <h2
          ref={titleRef}
          className="font-display font-extrabold text-[clamp(32px,4.5vw,64px)] text-txt-primary mb-16 lg:mb-20"
        >
          How personal shopping{' '}
          <span className="text-gradient-gold">works</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <div
              key={step.title}
              ref={(el) => { cardsRef.current[index] = el; }}
              className="step-card group"
            >
              <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-6 group-hover:bg-gold/20 transition-colors">
                <step.icon className="w-6 h-6 text-gold" />
              </div>
              <div className="text-sm font-semibold text-gold mb-2">
                Step {index + 1}
              </div>
              <h3 className="font-display font-bold text-xl text-txt-primary mb-3">
                {step.title}
              </h3>
              <p className="text-txt-tertiary leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
