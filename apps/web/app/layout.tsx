import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Market — ผู้ช่วยพัสดุโรงเรียน',
  description: 'AI Procurement & Inventory Helper for School',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Bangkok">
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
