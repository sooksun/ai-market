'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, TextInput, Textarea } from '@/components/ui/form';
import { fmtNum } from '@/components/ui/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

export function IssueOutButton({
  id,
  currentQty,
}: {
  id: string;
  currentQty: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState('1');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!qty || Number(qty) <= 0) {
      setError('จำนวนต้องมากกว่า 0');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/inventory/${id}/issue-out`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: Number(qty), notes: notes || null }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? `เบิกไม่สำเร็จ (${res.status})`);
        return;
      }
      setOpen(false);
      setQty('1');
      setNotes('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button icon="LogOut" onClick={() => setOpen(true)}>
        เบิกออก
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-ink-900 dark:text-white">
              เบิกพัสดุออกจากคลัง
            </h3>
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">
              คงเหลือปัจจุบัน <strong className="tabular-nums">{fmtNum(currentQty)}</strong>
            </p>
            <Field label="จำนวนที่เบิก" required className="mt-3">
              <TextInput
                type="number"
                step="0.01"
                min="0.01"
                max={currentQty}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="text-right tabular-nums"
              />
            </Field>
            <Field label="หมายเหตุ" className="mt-3">
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น เบิกให้กลุ่มสาระวิทย์"
              />
            </Field>
            {error && (
              <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <Button size="sm" disabled={busy} onClick={submit} icon="Check">
                {busy ? 'กำลังเบิก...' : 'ยืนยันเบิก'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
