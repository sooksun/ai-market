'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PurchaseRequestStatus } from '@ai-market/shared';

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
      <button
        key="submit"
        disabled={busy !== null}
        onClick={() => call('submit')}
        className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {busy === 'submit' ? 'กำลังส่ง...' : 'ส่งเรื่อง'}
      </button>,
    );
  }

  if (isOwner && (pr.status === 'DRAFT' || pr.status === 'SUBMITTED')) {
    buttons.push(
      <button
        key="withdraw"
        disabled={busy !== null}
        onClick={() => call('withdraw')}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
      >
        ถอนเรื่อง
      </button>,
    );
  }

  if (isProcurement && pr.status === 'SUBMITTED') {
    buttons.push(
      <button
        key="claim"
        disabled={busy !== null}
        onClick={() => call('claim')}
        className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        รับเรื่องเข้าตรวจ
      </button>,
    );
  }

  if (isProcurement && pr.status === 'REVIEWING') {
    buttons.push(
      <button
        key="return"
        disabled={busy !== null}
        onClick={() => setShowReturn(true)}
        className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        ส่งกลับแก้ไข
      </button>,
      <button
        key="approve"
        disabled={busy !== null}
        onClick={() => call('approve-for-comparison')}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        อนุมัติเข้ารอบเปรียบเทียบ
      </button>,
    );
  }

  if (buttons.length === 0 && !error) return null;

  return (
    <>
      <div className="sticky bottom-0 mt-8 -mx-6 border-t border-slate-200 bg-white px-6 py-3 shadow-[0_-2px_4px_rgba(0,0,0,0.04)]">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap items-center justify-end gap-2">{buttons}</div>
      </div>

      {showReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-md bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold">ส่งกลับเพื่อแก้ไข</h3>
            <p className="mt-1 text-xs text-slate-500">
              ระบุเหตุผลที่ส่งกลับ — ผู้ขอจะเห็นเหตุผลนี้
            </p>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="เช่น สเปกยังไม่ระบุชนิด ความเร็ว และการเชื่อมต่อ"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowReturn(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              >
                ยกเลิก
              </button>
              <button
                disabled={!returnReason.trim() || busy !== null}
                onClick={async () => {
                  await call('return', { reason: returnReason.trim() });
                  setShowReturn(false);
                  setReturnReason('');
                }}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                ส่งกลับ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
