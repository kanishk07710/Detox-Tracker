import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Detox Tracker',
  description: 'Log your activities, set goals, and track your streak.',
};

// System font stack (set in globals.css): no external font download, no
// layout shift, and the build does not need network access.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
