import { Instagram, Facebook, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-bg-primary border-t border-bdr-subtle text-txt-primary py-16 lg:py-20 px-6 lg:px-[6vw]">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 lg:gap-16 mb-16">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="font-display font-bold text-2xl mb-4">
              <span className="text-gradient-gold">Silvera</span>{' '}
              <span className="text-txt-secondary">PH</span>
            </h3>
            <p className="text-txt-tertiary leading-relaxed mb-6 max-w-md">
              Luxury personal shopping service connecting Filipino shoppers with
              authentic signature brands from the United States.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="w-10 h-10 rounded-full glass-strong flex items-center justify-center hover:bg-gold/10 hover:border-gold/30 transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 text-txt-secondary" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full glass-strong flex items-center justify-center hover:bg-gold/10 hover:border-gold/30 transition-all"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5 text-txt-secondary" />
              </a>
              <a
                href="mailto:hello@silveraph.com"
                className="w-10 h-10 rounded-full glass-strong flex items-center justify-center hover:bg-gold/10 hover:border-gold/30 transition-all"
                aria-label="Email us"
              >
                <Mail className="w-5 h-5 text-txt-secondary" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-txt-secondary mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => scrollToSection('collection')}
                  className="text-txt-tertiary hover:text-gold transition-colors"
                >
                  Collection
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-txt-tertiary hover:text-gold transition-colors"
                >
                  How it Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('request')}
                  className="text-txt-tertiary hover:text-gold transition-colors"
                >
                  Request an Item
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-txt-secondary mb-4">
              Contact
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-txt-tertiary">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>
                  U.S. Based
                  <br />
                  Shipping to Philippines
                </span>
              </li>
              <li>
                <a
                  href="mailto:hello@silveraph.com"
                  className="text-txt-tertiary hover:text-gold transition-colors"
                >
                  hello@silveraph.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-bdr-subtle flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-txt-tertiary">
            &copy; {new Date().getFullYear()} Silvera PH. All rights reserved.
          </p>
          <p className="text-sm text-txt-tertiary">
            Authentic luxury goods from the U.S. to the Philippines
          </p>
        </div>
      </div>
    </footer>
  );
}
