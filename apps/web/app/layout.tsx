import type { Metadata } from 'next';
import { Sarabun, JetBrains_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { CsrfFetchPatch } from '@/components/csrf-fetch-patch';
import './globals.css';

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sarabun',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FinProcure AI · การเงินพัสดุอัจฉริยะ',
  description: 'ผู้ช่วยพัสดุและการเงินโรงเรียนด้วย AI',
  icons: { icon: '/finprocure-icon.png' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      className={`${sarabun.variable} ${jetBrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <CsrfFetchPatch />
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Bangkok">
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
