import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ExternalLink, Copy, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { paymentsApi } from '../utils/api';
import { SEO } from '../components/SEO';

type PaymentState = 'loading' | 'pending' | 'paid' | 'failed' | 'expired' | 'error';

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_TIME = 30 * 60 * 1000; // 30 minutes

export default function PaymentStatus() {
  const { ref } = useParams<{ ref: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const checkoutUrl = searchParams.get('checkout_url') || '';
  const amount = searchParams.get('amount') || '0';
  const method = searchParams.get('method') || '';

  const [status, setStatus] = useState<PaymentState>('loading');
  const [hasRedirected, setHasRedirected] = useState(false);
  const pollStartTime = useRef(Date.now());
  const pollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const pollPaymentStatus = useCallback(async () => {
    if (!ref) return;

    try {
      const response = await paymentsApi.getStatus(ref);
      const paymentStatus = response.data.status;

      if (paymentStatus === 'paid') {
        setStatus('paid');
        return; // Stop polling
      } else if (paymentStatus === 'failed') {
        setStatus('failed');
        return;
      }

      // Check if we've been polling too long
      if (Date.now() - pollStartTime.current > MAX_POLL_TIME) {
        setStatus('expired');
        return;
      }

      // Continue polling
      setStatus('pending');
      pollTimerRef.current = setTimeout(pollPaymentStatus, POLL_INTERVAL);
    } catch {
      // On 404 or network error, keep polling for a bit
      if (Date.now() - pollStartTime.current > MAX_POLL_TIME) {
        setStatus('error');
      } else {
        setStatus('pending');
        pollTimerRef.current = setTimeout(pollPaymentStatus, POLL_INTERVAL);
      }
    }
  }, [ref]);

  // Start polling on mount
  useEffect(() => {
    pollStartTime.current = Date.now();
    pollPaymentStatus();

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [pollPaymentStatus]);

  // Auto-redirect to orders on success after delay
  useEffect(() => {
    if (status === 'paid') {
      const timer = setTimeout(() => {
        navigate('/order-success?from=payment');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  const handleOpenPayment = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      setHasRedirected(true);
    }
  };

  const handleCopyRef = () => {
    if (ref) {
      navigator.clipboard.writeText(ref);
      toast.success('Payment reference copied');
    }
  };

  const formattedAmount = parseFloat(amount).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
  });

  const methodLabel: Record<string, string> = {
    gcash: 'GCash',
    card: 'Credit/Debit Card',
    maya: 'Maya',
    grabpay: 'GrabPay',
    bdo: 'BDO',
    bpi: 'BPI',
    unionbank: 'UnionBank',
  };

  return (
    <>
      <SEO title="Payment Status" description="Check the status of your payment on Silvera PH." />
      <div className="container-custom py-12 animate-fade-in">
      <div className="max-w-lg mx-auto">
        {/* Status Card */}
        <div className="card p-8 text-center">
          {/* Status Icon */}
          {status === 'loading' && (
            <Loader2 className="w-16 h-16 mx-auto text-gold animate-spin mb-6" />
          )}
          {status === 'pending' && (
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-gold/20" />
              <div className="absolute inset-0 rounded-full border-4 border-gold border-t-transparent animate-spin" />
              <Clock className="absolute inset-0 m-auto w-8 h-8 text-gold" />
            </div>
          )}
          {status === 'paid' && (
            <div className="mb-6">
              <CheckCircle className="w-20 h-20 mx-auto text-green-500" />
            </div>
          )}
          {(status === 'failed' || status === 'error') && (
            <div className="mb-6">
              <XCircle className="w-20 h-20 mx-auto text-red-500" />
            </div>
          )}
          {status === 'expired' && (
            <div className="mb-6">
              <AlertTriangle className="w-20 h-20 mx-auto text-yellow-500" />
            </div>
          )}

          {/* Status Title */}
          <h1 className="text-2xl font-serif font-bold text-txt-primary mb-2">
            {status === 'loading' && 'Preparing Payment...'}
            {status === 'pending' && 'Awaiting Payment'}
            {status === 'paid' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
            {status === 'expired' && 'Payment Expired'}
            {status === 'error' && 'Something Went Wrong'}
          </h1>

          <p className="text-txt-secondary mb-6">
            {status === 'loading' && 'Setting up your payment session...'}
            {status === 'pending' && 'Complete your payment to confirm the order.'}
            {status === 'paid' && 'Your order has been confirmed. Redirecting...'}
            {status === 'failed' && 'Your payment could not be processed.'}
            {status === 'expired' && 'The payment session has timed out.'}
            {status === 'error' && 'We couldn\'t verify your payment status.'}
          </p>

          {/* Amount Display */}
          {(status === 'pending' || status === 'loading') && (
            <div className="bg-bg-tertiary rounded-2xl p-6 mb-6">
              <p className="text-txt-tertiary text-sm mb-1">Amount Due</p>
              <p className="text-3xl font-bold text-gradient-gold">{formattedAmount}</p>
              {method && (
                <p className="text-txt-secondary text-sm mt-2">
                  via {methodLabel[method] || method}
                </p>
              )}
            </div>
          )}

          {/* Payment Reference */}
          {ref && (
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-txt-tertiary text-sm">Ref:</span>
              <code className="text-txt-secondary text-sm bg-bg-tertiary px-3 py-1 rounded-lg">
                {ref}
              </code>
              <button
                onClick={handleCopyRef}
                className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors"
                aria-label="Copy reference"
              >
                <Copy className="w-4 h-4 text-txt-tertiary" />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          {status === 'pending' && checkoutUrl && (
            <div className="space-y-3">
              {!hasRedirected ? (
                <button
                  onClick={handleOpenPayment}
                  className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Pay with NexusPay
                </button>
              ) : (
                <button
                  onClick={handleOpenPayment}
                  className="w-full btn-secondary py-4 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Reopen Payment Page
                </button>
              )}

              <p className="text-txt-tertiary text-xs">
                After completing payment, this page will update automatically.
              </p>
            </div>
          )}

          {status === 'pending' && !checkoutUrl && (
            <div className="bg-bg-tertiary rounded-xl p-4">
              <Loader2 className="w-5 h-5 mx-auto text-gold animate-spin mb-2" />
              <p className="text-txt-secondary text-sm">
                Checking payment status...
              </p>
            </div>
          )}

          {status === 'paid' && (
            <div className="space-y-3">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <p className="text-green-400 text-sm font-medium">
                  Payment confirmed! Your order is being processed.
                </p>
              </div>
              <button
                onClick={() => navigate('/orders')}
                className="w-full btn-primary py-3"
              >
                View My Orders
              </button>
            </div>
          )}

          {(status === 'failed' || status === 'error') && (
            <div className="space-y-3">
              <button
                onClick={() => navigate('/checkout')}
                className="w-full btn-primary py-3"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/orders')}
                className="w-full btn-outline py-3"
              >
                View My Orders
              </button>
            </div>
          )}

          {status === 'expired' && (
            <div className="space-y-3">
              <button
                onClick={() => navigate('/checkout')}
                className="w-full btn-primary py-3"
              >
                Start New Payment
              </button>
              <button
                onClick={() => navigate('/orders')}
                className="w-full btn-outline py-3"
              >
                View My Orders
              </button>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 flex items-start gap-3 text-txt-tertiary text-xs">
          <div className="w-4 h-4 mt-0.5 flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <p>
            Your payment is processed securely through NexusPay. We never store your payment details.
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
