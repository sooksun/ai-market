import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Market — ผู้ช่วยพัสดุโรงเรียน',
  description: 'AI Procurement & Inventory Helper for School',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
