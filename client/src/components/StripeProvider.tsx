import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import type { ReactNode } from 'react';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

interface StripeProviderProps {
  clientSecret: string;
  children: ReactNode;
}

export default function StripeProvider({ clientSecret, children }: StripeProviderProps) {
  if (!stripePromise) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#C9A96E',
            colorBackground: '#1a1a2e',
            colorText: '#e0e0e0',
            colorDanger: '#ef4444',
            borderRadius: '0.75rem',
            fontFamily: 'inherit',
          },
          rules: {
            '.Input': {
              backgroundColor: '#16213e',
              border: '1px solid #2a2a4a',
            },
            '.Input:focus': {
              borderColor: '#C9A96E',
              boxShadow: '0 0 0 1px #C9A96E',
            },
            '.Tab': {
              backgroundColor: '#16213e',
              border: '1px solid #2a2a4a',
            },
            '.Tab--selected': {
              backgroundColor: '#1a1a2e',
              borderColor: '#C9A96E',
            },
          },
        },
      }}
    >
      {children}
    </Elements>
  );
}
