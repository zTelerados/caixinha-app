import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegister, InstallBanner } from './sw-register';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Caixinha - Dashboard Financeiro',
  description: 'Gerencie suas finanças com inteligência',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    shortcut: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Caixinha',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://caixinha.app',
    title: 'Caixinha - Dashboard Financeiro',
    description: 'Gerencie suas finanças com inteligência',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  minimumScale: 1.0,
  maximumScale: 5.0,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="color-scheme" content="dark" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${inter.variable} antialiased bg-caixa-bg text-caixa-text`}
      >
        {children}
        <ServiceWorkerRegister />
        <InstallBanner />
      </body>
    </html>
  );
}
