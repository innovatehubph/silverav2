import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Send, Check } from 'lucide-react';
import { toast } from 'sonner';

gsap.registerPlugin(ScrollTrigger);

export default function RequestSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    item: '',
    message: '',
  });

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        [headlineRef.current, bodyRef.current],
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: headlineRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      gsap.fromTo(
        formRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: formRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    toast.success('Request sent! We will contact you within 24 hours.');
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: '', email: '', item: '', message: '' });
    }, 3000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <section
      ref={sectionRef}
      id="request"
      className="bg-[#F4F6FA] py-24 lg:py-32 px-6 lg:px-[6vw] relative overflow-hidden"
      style={{ zIndex: 100 }}
    >
      {/* Gradient Blob */}
      <div
        className="gradient-blob w-[600px] h-[600px] bg-[#B8B9FF]"
        style={{
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />

      <div className="max-w-6xl mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left Column - Text */}
          <div>
            <h2
              ref={headlineRef}
              className="font-display font-extrabold text-[clamp(32px,4.5vw,56px)] text-[#0B0D10] mb-6"
            >
              Request an item
            </h2>
            <p
              ref={bodyRef}
              className="text-lg text-[#6B7280] leading-relaxed mb-8"
            >
              Tell us what you are looking for. We will confirm availability,
              pricing, and delivery timeline.
            </p>
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Typical reply within 24 hours
            </div>
          </div>

          {/* Right Column - Form */}
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-8 lg:p-10 shadow-lg"
          >
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-[#0B0D10] mb-2"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[#0B0D10] mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label
                  htmlFor="item"
                  className="block text-sm font-medium text-[#0B0D10] mb-2"
                >
                  Item / Brand / Size
                </label>
                <input
                  type="text"
                  id="item"
                  name="item"
                  value={formData.item}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="e.g., Gucci Marmont Bag, Medium"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-[#0B0D10] mb-2"
                >
                  Message (optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="form-input resize-none"
                  placeholder="Any specific details or questions..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitted}
                className={`w-full cta-button py-4 flex items-center justify-center gap-2 ${
                  isSubmitted ? 'bg-green-600' : ''
                }`}
              >
                {isSubmitted ? (
                  <>
                    <Check className="w-5 h-5" />
                    Request Sent
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
