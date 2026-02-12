import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SEO } from '../components/SEO';

const faqs = [
  {
    q: 'How long does shipping take?',
    a: 'Standard shipping within Metro Manila takes 3-5 business days. Provincial orders take 5-7 business days. Express shipping is available for select areas.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept GCash, Maya, bank transfers, credit/debit cards, and cash on delivery for Metro Manila orders.',
  },
  {
    q: 'Can I return or exchange an item?',
    a: 'Yes! We offer a 30-day return policy for unused items in original packaging. Contact us at support@silvera.ph to initiate a return.',
  },
  {
    q: 'Are your products authentic?',
    a: 'Absolutely. All products are 100% authentic and sourced directly from authorized distributors. We guarantee authenticity on every item.',
  },
  {
    q: 'How do I track my order?',
    a: 'Once your order ships, you\'ll receive a tracking number via email. You can also check your order status anytime from your profile page.',
  },
  {
    q: 'Do you ship internationally?',
    a: 'Currently we ship within the Philippines only. International shipping is coming soon.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <SEO title="FAQ" description="Frequently asked questions about Silvera PH. Shipping, returns, payments, and more." url="https://silvera.innoserver.cloud/faq" keywords="faq, frequently asked questions, shipping, returns, payments, silvera ph" />
      <div className="container-custom py-12 animate-fade-in max-w-3xl mx-auto">
      <h1 className="section-title mb-4 text-center">Frequently Asked Questions</h1>
      <p className="section-subtitle mb-12 text-center">Find answers to common questions</p>

      <div className="space-y-3">
        {faqs.map((faq, idx) => (
          <div key={idx} className="card overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full flex items-center justify-between p-5 text-left font-medium hover:bg-bg-hover transition-colors"
            >
              {faq.q}
              <ChevronDown
                className={`w-5 h-5 text-txt-tertiary transition-transform ${
                  openIndex === idx ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === idx && (
              <div className="px-5 pb-5 text-txt-secondary leading-relaxed">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
