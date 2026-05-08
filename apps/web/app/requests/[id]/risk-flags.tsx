'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

interface Flag {
  id: string;
  itemId: string | null;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  detail: { suggestion?: string } | null;
  modelVersion: string | null;
  invocationId: string | null;
  dismissedAt: string | null;
  dismissedReason: string | null;
  createdAt: string;
}

interface Props {
  prId: string;
  flags: Flag[];
  canDismiss: boolean;
  canRecheck: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  AMBIGUOUS_SPEC: 'สเปกคลุมเครือ',
  BRAND_LOCK: 'เสี่ยงล็อกยี่ห้อ',
  PRICE_OUTLIER: 'ราคาผิดปกติ',
  INSUFFICIENT_QUOTES: 'ใบเสนอราคาน้อย',
  MISSING_DOC: 'เอกสารขาด',
  BUDGET_OVERRUN: 'งบไม่พอ',
  REASON_MISSING: 'เหตุผลความจำเป็นไม่ชัดเจน',
  CLASSIFICATION_UNCERTAIN: 'หมวดพัสดุไม่ชัดเจน',
  OTHER: 'อื่น ๆ',
};

export function RiskFlagsPanel({ prId, flags, canDismiss, canRecheck }: Props) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState(false);

  const active = flags.filter((f) => !f.dismissedAt);
  const dismissed = flags.filter((f) => f.dismissedAt);

  async function recheck() {
    setRechecking(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/ai/check-cloudiness`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: prId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? 'AI ไม่ตอบ');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setRechecking(false);
    }
  }

  async function dismiss(flagId: string) {
    if (!dismissReason.trim()) return;
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/purchase-requests/${prId}/risk-flags/${flagId}/dismiss`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: dismissReason.trim() }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? 'ไม่สามารถ dismiss ได้');
      }
      setDismissing(null);
      setDismissReason('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-700">
          ความเสี่ยง / ข้อเตือน
          {active.length > 0 && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
              {active.length}
            </span>
          )}
        </h2>
        {canRecheck && (
          <button
            onClick={recheck}
            disabled={rechecking}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
          >
            {rechecking ? 'กำลังตรวจ...' : '✨ ให้ AI ตรวจอีกครั้ง'}
          </button>
        )}
      </div>

      <div className="px-4 py-3">
        {error && (
          <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p>
        )}

        {active.length === 0 && dismissed.length === 0 && (
          <p className="text-xs text-slate-500">
            ยังไม่มี risk flag — กดปุ่มด้านบนให้ AI ช่วยตรวจ
          </p>
        )}

        <ul className="space-y-3">
          {active.map((f) => (
            <li
              key={f.id}
              className={`rounded-md border-l-4 p-3 text-sm ${severityClasses(f.severity)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide opacity-75">
                    {TYPE_LABELS[f.type] ?? f.type} · {f.severity}
                  </p>
                  <p className="mt-1">{f.message}</p>
                  {f.detail?.suggestion && (
                    <p className="mt-1 text-xs italic opacity-80">💡 {f.detail.suggestion}</p>
                  )}
                  {f.invocationId && (
                    <p className="mt-1 font-mono text-[10px] opacity-60">
                      AI ref: {f.invocationId}
                    </p>
                  )}
                </div>
              </div>

              {canDismiss && (
                <div className="mt-2">
                  {dismissing === f.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={dismissReason}
                        onChange={(e) => setDismissReason(e.target.value)}
                        placeholder="เหตุผลที่รับทราบ/ปิดประเด็นนี้"
                        rows={2}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => dismiss(f.id)}
                          disabled={!dismissReason.trim()}
                          className="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          ยืนยัน dismiss
                        </button>
                        <button
                          onClick={() => {
                            setDismissing(null);
                            setDismissReason('');
                          }}
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDismissing(f.id)}
                      className="text-xs underline opacity-75 hover:opacity-100"
                    >
                      dismiss
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>

        {dismissed.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-slate-500">
              flag ที่ถูก dismiss แล้ว ({dismissed.length})
            </summary>
            <ul className="mt-2 space-y-2 text-xs text-slate-500">
              {dismissed.map((f) => (
                <li key={f.id} className="rounded bg-slate-50 p-2">
                  <p className="line-through">{f.message}</p>
                  {f.dismissedReason && (
                    <p className="mt-1 italic">เหตุผลปิด: {f.dismissedReason}</p>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}

function severityClasses(s: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  if (s === 'HIGH') return 'border-red-500 bg-red-50 text-red-900';
  if (s === 'MEDIUM') return 'border-amber-500 bg-amber-50 text-amber-900';
  return 'border-slate-300 bg-slate-50 text-slate-800';
}
