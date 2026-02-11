import { useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    // Simulate send — replace with API call when backend supports it
    await new Promise(r => setTimeout(r, 800));
    toast.success('Message sent! We\'ll get back to you soon.');
    setFormData({ name: '', email: '', message: '' });
    setIsSending(false);
  };

  return (
    <div className="container-custom py-12 animate-fade-in">
      <h1 className="section-title mb-4">Contact Us</h1>
      <p className="section-subtitle mb-12">We'd love to hear from you</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-txt-secondary mb-1">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-txt-secondary mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-txt-secondary mb-1">Message</label>
            <textarea
              required
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={isSending} className="btn-primary w-full">
            {isSending ? 'Sending...' : 'Send Message'}
          </button>
        </form>

        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <Mail className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">Email</h3>
              <p className="text-txt-secondary">support@silvera.ph</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Phone className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">Phone</h3>
              <p className="text-txt-secondary">+63 912 345 6789</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <MapPin className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-1">Address</h3>
              <p className="text-txt-secondary">Manila, Philippines</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
