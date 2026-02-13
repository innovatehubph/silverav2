import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, Lock } from 'lucide-react';

interface StripeCardFormProps {
  amount: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function StripeCardForm({ amount, onSuccess, onError }: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/order-success`,
        },
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else {
        onSuccess();
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-bg-tertiary rounded-xl p-4">
        <PaymentElement
          options={{ layout: 'tabs' }}
          onReady={() => setReady(true)}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing || !ready}
        className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing payment...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Pay ₱{amount.toFixed(2)}
          </>
        )}
      </button>

      <div className="flex items-center gap-2 justify-center text-xs text-txt-tertiary">
        <Lock className="w-3.5 h-3.5" />
        <span>Payment handled by Stripe — we never see your card number</span>
      </div>
    </form>
  );
}
