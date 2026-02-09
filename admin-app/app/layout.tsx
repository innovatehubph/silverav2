import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SilveraV2 Admin Dashboard',
  description: 'Modern admin dashboard for SilveraV2 e-commerce platform',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
