'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Field, TextInput } from '@/components/ui/form';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

export function ScanLauncher() {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function run() {
    setError(null);
    const body: Record<string, unknown> = { useAi };
    if (dateFrom) body.dateFrom = dateFrom;
    if (dateTo) body.dateTo = dateTo;

    try {
      const res = await fetch(`${API_URL}/audit/scan`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as
        | { data: { scanId: string } }
        | { error: { message: string } };
      if (!res.ok) {
        const msg =
          'error' in json ? json.error.message : `HTTP ${res.status}`;
        setError(msg);
        return;
      }
      const scanId = 'data' in json ? json.data.scanId : null;
      if (scanId) {
        startTransition(() => {
          router.push(`/audit/${scanId}` as never);
          router.refresh();
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200">
          <Icon name="Sparkles" className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
            สแกนความเสี่ยง
          </h3>
          <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-300">
            ระบุช่วงวันที่ (ไม่บังคับ) — ค่าเริ่มต้น 50 PR ล่าสุด
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="ตั้งแต่">
          <TextInput
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </Field>
        <Field label="ถึง">
          <TextInput
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </Field>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-ink-700 dark:text-ink-200">
        <input
          type="checkbox"
          checked={useAi}
          onChange={(e) => setUseAi(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
        />
        ใช้ AI qualitative pass (Claude) — ตรวจล็อกสเปก / pattern ข้าม PR
      </label>

      {error && (
        <div className="mt-3 rounded-lg bg-rose-50 dark:bg-rose-900/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-200">
          {error}
        </div>
      )}

      <Button
        onClick={run}
        disabled={pending}
        className="mt-4 w-full"
        icon="Sparkles"
      >
        {pending ? 'กำลังสแกน...' : 'เริ่มสแกน'}
      </Button>
    </Card>
  );
}
