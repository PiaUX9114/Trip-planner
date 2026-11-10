import type { Metadata, Viewport } from 'next';
import './globals.css';
import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/legal/site-info';

export const metadata: Metadata = {
  title: 'Trip Planner | Plan Your Trip',
  description: 'Plan trips, keep your itinerary organized, and collaborate on travel.',
  applicationName: 'Trip Planner',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Trip Planner' },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2869d7',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="border-t border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-600">
          <nav aria-label="Legal and support" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:underline">Contact support</a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
