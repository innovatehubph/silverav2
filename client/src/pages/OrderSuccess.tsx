import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { SEO } from '../components/SEO';

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const fromPayment = searchParams.get('from') === 'payment';

  return (
    <>
      <SEO title="Order Confirmed" description="Your order has been placed successfully! Thank you for shopping with Silvera PH." url="https://silvera.innoserver.cloud/order-success" />
      <div className="container-custom py-16 text-center animate-fade-in">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <CheckCircle className="w-20 h-20 mx-auto text-green-500" />
        </div>

        <h1 className="text-3xl font-serif font-bold text-txt-primary mb-3">
          {fromPayment ? 'Payment Confirmed!' : 'Order Placed!'}
        </h1>

        <p className="text-txt-secondary mb-2">
          Thank you for your purchase.
        </p>
        <p className="text-txt-tertiary text-sm mb-8">
          {fromPayment
            ? 'Your payment has been received and your order is now being processed.'
            : 'We\'ll send you an email confirmation with your order details.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/orders"
            className="btn-primary flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            View My Orders
          </Link>
          <Link
            to="/shop"
            className="btn-outline flex items-center justify-center gap-2"
          >
            Continue Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
