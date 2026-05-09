'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Field, TextInput } from '@/components/ui/form';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('requester@test.local');
  const [password, setPassword] = useState('dev1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? `เข้าสู่ระบบไม่สำเร็จ (${res.status})`);
      }
      const next = params.get('next') ?? '/requests';
      router.push(next as never);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 aurora">
      <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-white/90 dark:bg-ink-800/80 backdrop-blur-sm border border-ink-100 dark:border-white/5 shadow-pop p-8"
      >
        <div className="flex flex-col items-center text-center">
          <Image
            src="/finprocure-fullmark.png"
            alt="FinProcure AI · การเงินพัสดุอัจฉริยะ"
            width={814}
            height={220}
            priority
            className="h-auto w-[300px] drop-shadow-sm"
          />
          <p className="mt-2 text-xs text-ink-400 dark:text-ink-300">
            เข้าสู่ระบบเพื่อเริ่มใช้งาน
          </p>
        </div>

        <div className="mt-7 space-y-4">
          <Field label="อีเมล" required>
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>
          <Field label="รหัสผ่าน" required>
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-900/30 ring-1 ring-rose-200/60 dark:ring-rose-700/40 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="mt-6 w-full justify-center" icon="LogIn">
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </Button>

        <div className="mt-6 rounded-xl bg-ink-50 dark:bg-ink-900/40 px-3 py-2.5 text-[11.5px] text-ink-500 dark:text-ink-300 leading-relaxed">
          <p className="font-medium text-ink-600 dark:text-ink-200">ผู้ใช้ทดสอบ (รหัสผ่าน <code className="font-mono">dev1234</code>)</p>
          <p className="mt-1 font-mono">
            requester@ · procurement@ · director@ · admin@test.local
          </p>
        </div>
      </form>
    </main>
  );
}
