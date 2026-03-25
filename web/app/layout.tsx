import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Market Story Engine',
  description: 'Legally-defensible market intelligence briefs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
