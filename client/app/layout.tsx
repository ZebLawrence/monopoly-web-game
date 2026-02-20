import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Monopoly',
  description: 'A web-based Monopoly board game',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
