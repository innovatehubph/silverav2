import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MessageSquare, Search, Truck } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

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

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Title animation
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

      // Cards animation with stagger
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

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="bg-[#F4F6FA] py-24 lg:py-32 px-6 lg:px-[6vw]"
      style={{ zIndex: 100 }}
    >
      <div className="max-w-6xl mx-auto">
        <h2
          ref={titleRef}
          className="font-display font-extrabold text-[clamp(32px,4.5vw,64px)] text-[#0B0D10] mb-16 lg:mb-20"
        >
          How personal shopping works
        </h2>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <div
              key={step.title}
              ref={(el) => { cardsRef.current[index] = el; }}
              className="step-card"
            >
              <div className="w-12 h-12 rounded-xl bg-[#B8B9FF]/20 flex items-center justify-center mb-6">
                <step.icon className="w-6 h-6 text-[#0B0D10]" />
              </div>
              <div className="text-sm font-semibold text-[#B8B9FF] mb-2">
                Step {index + 1}
              </div>
              <h3 className="font-display font-bold text-xl text-[#0B0D10] mb-3">
                {step.title}
              </h3>
              <p className="text-[#6B7280] leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
