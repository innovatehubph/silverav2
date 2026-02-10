import { Instagram, Facebook, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-[#0B0D10] text-[#F4F6FA] py-16 lg:py-20 px-6 lg:px-[6vw]">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 lg:gap-16 mb-16">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="font-display font-bold text-2xl mb-4">
              Silvera PH
            </h3>
            <p className="text-[#F4F6FA]/70 leading-relaxed mb-6 max-w-md">
              Luxury personal shopping service connecting Filipino shoppers with
              authentic signature brands from the United States.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-[#F4F6FA]/10 flex items-center justify-center hover:bg-[#B8B9FF] transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-[#F4F6FA]/10 flex items-center justify-center hover:bg-[#B8B9FF] transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="mailto:hello@silveraph.com"
                className="w-10 h-10 rounded-full bg-[#F4F6FA]/10 flex items-center justify-center hover:bg-[#B8B9FF] transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => scrollToSection('collection')}
                  className="text-[#F4F6FA]/70 hover:text-[#F4F6FA] transition-colors"
                >
                  Collection
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-[#F4F6FA]/70 hover:text-[#F4F6FA] transition-colors"
                >
                  How it Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('request')}
                  className="text-[#F4F6FA]/70 hover:text-[#F4F6FA] transition-colors"
                >
                  Request an Item
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4">
              Contact
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-[#F4F6FA]/70">
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
                  className="text-[#F4F6FA]/70 hover:text-[#F4F6FA] transition-colors"
                >
                  hello@silveraph.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#F4F6FA]/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#F4F6FA]/50">
            &copy; {new Date().getFullYear()} Silvera PH. All rights reserved.
          </p>
          <p className="text-sm text-[#F4F6FA]/50">
            Authentic luxury goods from the U.S. to the Philippines
          </p>
        </div>
      </div>
    </footer>
  );
}
