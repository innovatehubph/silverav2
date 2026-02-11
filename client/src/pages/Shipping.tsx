import { Truck, Clock, Shield, MapPin } from 'lucide-react';

export default function Shipping() {
  return (
    <div className="container-custom py-12 animate-fade-in max-w-4xl mx-auto">
      <h1 className="section-title mb-4 text-center">Shipping Information</h1>
      <p className="section-subtitle mb-12 text-center">Everything you need to know about delivery</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="card p-6 flex items-start gap-4">
          <Truck className="w-8 h-8 text-gold flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-lg mb-2">Free Shipping</h3>
            <p className="text-txt-secondary">Orders over &#8369;1,000 qualify for free standard shipping anywhere in the Philippines.</p>
          </div>
        </div>
        <div className="card p-6 flex items-start gap-4">
          <Clock className="w-8 h-8 text-gold flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-lg mb-2">Delivery Times</h3>
            <p className="text-txt-secondary">Metro Manila: 3-5 business days. Provinces: 5-7 business days. Express: 1-2 business days.</p>
          </div>
        </div>
        <div className="card p-6 flex items-start gap-4">
          <Shield className="w-8 h-8 text-gold flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-lg mb-2">Secure Packaging</h3>
            <p className="text-txt-secondary">All items are carefully packaged to ensure they arrive in perfect condition.</p>
          </div>
        </div>
        <div className="card p-6 flex items-start gap-4">
          <MapPin className="w-8 h-8 text-gold flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-lg mb-2">Coverage</h3>
            <p className="text-txt-secondary">We deliver to all provinces and cities across the Philippines.</p>
          </div>
        </div>
      </div>

      <div className="card p-8">
        <h2 className="text-xl font-semibold mb-4">Shipping Rates</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="pb-3 text-txt-tertiary font-medium">Region</th>
              <th className="pb-3 text-txt-tertiary font-medium">Standard</th>
              <th className="pb-3 text-txt-tertiary font-medium">Express</th>
            </tr>
          </thead>
          <tbody className="text-txt-secondary">
            <tr className="border-b">
              <td className="py-3">Metro Manila</td>
              <td className="py-3">&#8369;99</td>
              <td className="py-3">&#8369;199</td>
            </tr>
            <tr className="border-b">
              <td className="py-3">Luzon</td>
              <td className="py-3">&#8369;149</td>
              <td className="py-3">&#8369;299</td>
            </tr>
            <tr className="border-b">
              <td className="py-3">Visayas</td>
              <td className="py-3">&#8369;199</td>
              <td className="py-3">&#8369;349</td>
            </tr>
            <tr>
              <td className="py-3">Mindanao</td>
              <td className="py-3">&#8369;199</td>
              <td className="py-3">&#8369;349</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-txt-tertiary mt-4">Free standard shipping on all orders over &#8369;1,000.</p>
      </div>
    </div>
  );
}
