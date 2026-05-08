'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PurchaseRequestStatus } from '@ai-market/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form';
import { Card } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

interface Props {
  pr: { id: string; status: PurchaseRequestStatus };
  isOwner: boolean;
  isProcurement: boolean;
}

export function PrActions({ pr, isOwner, isProcurement }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [showReturn, setShowReturn] = useState(false);

  async function call(action: string, body?: unknown) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/purchase-requests/${pr.id}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `ทำรายการไม่สำเร็จ (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setBusy(null);
    }
  }

  const buttons: React.ReactNode[] = [];

  if (isOwner && (pr.status === 'DRAFT' || pr.status === 'RETURNED')) {
    buttons.push(
      <Button
        key="submit"
        disabled={busy !== null}
        onClick={() => call('submit')}
        icon="Send"
      >
        {busy === 'submit' ? 'กำลังส่ง...' : 'ส่งเรื่อง'}
      </Button>,
    );
  }

  if (isOwner && (pr.status === 'DRAFT' || pr.status === 'SUBMITTED')) {
    buttons.push(
      <Button
        key="withdraw"
        variant="outline"
        disabled={busy !== null}
        onClick={() => call('withdraw')}
        icon="Undo2"
      >
        ถอนเรื่อง
      </Button>,
    );
  }

  if (isProcurement && pr.status === 'SUBMITTED') {
    buttons.push(
      <Button
        key="claim"
        disabled={busy !== null}
        onClick={() => call('claim')}
        icon="ClipboardCheck"
      >
        รับเรื่องเข้าตรวจ
      </Button>,
    );
  }

  if (isProcurement && pr.status === 'REVIEWING') {
    buttons.push(
      <Button
        key="return"
        variant="outline"
        disabled={busy !== null}
        onClick={() => setShowReturn(true)}
        icon="Undo2"
        className="text-rose-700 dark:text-rose-300 ring-rose-300/60 dark:ring-rose-700/40 hover:bg-rose-50 dark:hover:bg-rose-900/30"
      >
        ส่งกลับแก้ไข
      </Button>,
      <Button
        key="approve"
        disabled={busy !== null}
        onClick={() => call('approve-for-comparison')}
        icon="CheckCheck"
        className="!bg-emerald-600 hover:!bg-emerald-700 !bg-none"
      >
        อนุมัติเข้ารอบเปรียบเทียบ
      </Button>,
    );
  }

  if (buttons.length === 0 && !error) return null;

  return (
    <>
      <div className="sticky bottom-4 mt-8 rounded-2xl bg-white/90 dark:bg-ink-800/90 backdrop-blur-md border border-ink-100 dark:border-white/5 shadow-pop px-5 py-3">
        {error && (
          <p className="mb-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 text-sm text-rose-700 dark:text-rose-200">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">{buttons}</div>
      </div>

      {showReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-ink-900 dark:text-white">
              ส่งกลับเพื่อแก้ไข
            </h3>
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">
              ระบุเหตุผลที่ส่งกลับ — ผู้ขอจะเห็นเหตุผลนี้
            </p>
            <Textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              rows={4}
              className="mt-3"
              placeholder="เช่น สเปกยังไม่ระบุชนิด ความเร็ว และการเชื่อมต่อ"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReturn(false)}
              >
                ยกเลิก
              </Button>
              <Button
                size="sm"
                disabled={!returnReason.trim() || busy !== null}
                onClick={async () => {
                  await call('return', { reason: returnReason.trim() });
                  setShowReturn(false);
                  setReturnReason('');
                }}
                className="!bg-rose-600 hover:!bg-rose-700 !bg-none"
              >
                ส่งกลับ
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
