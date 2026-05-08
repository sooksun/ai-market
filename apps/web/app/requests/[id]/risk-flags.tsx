'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { classNames } from '@/components/ui/format';

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

const SEVERITY_STYLE: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
  HIGH: 'border-l-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-100',
  MEDIUM:
    'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100',
  LOW: 'border-l-ink-300 bg-ink-50 dark:bg-ink-800/40 text-ink-800 dark:text-ink-100',
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
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-100 dark:border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center w-7 h-7 rounded-lg grad-brand text-white">
            <Icon name="Sparkles" className="w-3.5 h-3.5" strokeWidth={2} />
          </span>
          <div>
            <div className="text-sm font-semibold text-ink-900 dark:text-white">
              ความเสี่ยง / ข้อเตือน
            </div>
            <div className="text-[11px] text-ink-400 dark:text-ink-300">
              ตรวจโดย AI · ผู้ใช้ตัดสินใจสุดท้าย
            </div>
          </div>
          {active.length > 0 && (
            <span className="ml-auto rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200 px-2 py-0.5 text-[11px] font-medium tabular-nums">
              {active.length}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {canRecheck && (
          <Button
            type="button"
            size="sm"
            variant="soft"
            icon="RefreshCw"
            onClick={recheck}
            disabled={rechecking}
            className="w-full justify-center"
          >
            {rechecking ? 'กำลังตรวจอีกครั้ง...' : 'ให้ AI ตรวจอีกครั้ง'}
          </Button>
        )}

        {error && (
          <p className="rounded-lg bg-rose-50 dark:bg-rose-900/30 px-2 py-1 text-xs text-rose-700 dark:text-rose-200">
            {error}
          </p>
        )}

        {active.length === 0 && dismissed.length === 0 && (
          <div className="text-center py-6 text-xs text-ink-400 dark:text-ink-300">
            <Icon name="ShieldCheck" className="w-7 h-7 mx-auto text-emerald-400" />
            <p className="mt-2">ยังไม่มี risk flag</p>
          </div>
        )}

        <ul className="space-y-2">
          {active.map((f) => (
            <li
              key={f.id}
              className={classNames(
                'rounded-xl border-l-4 p-3 text-sm',
                SEVERITY_STYLE[f.severity],
              )}
            >
              <div className="flex items-start gap-2">
                <Icon
                  name={f.severity === 'HIGH' ? 'AlertOctagon' : 'AlertTriangle'}
                  className="w-4 h-4 mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide opacity-75">
                    {TYPE_LABELS[f.type] ?? f.type} · {f.severity}
                  </p>
                  <p className="mt-1">{f.message}</p>
                  {f.detail?.suggestion && (
                    <p className="mt-1 text-xs italic opacity-80">
                      💡 {f.detail.suggestion}
                    </p>
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
                      <Textarea
                        value={dismissReason}
                        onChange={(e) => setDismissReason(e.target.value)}
                        placeholder="เหตุผลที่รับทราบ/ปิดประเด็นนี้"
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => dismiss(f.id)}
                          disabled={!dismissReason.trim()}
                        >
                          ยืนยัน dismiss
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDismissing(null);
                            setDismissReason('');
                          }}
                        >
                          ยกเลิก
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
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
          <details className="text-xs text-ink-400 dark:text-ink-300">
            <summary className="cursor-pointer">
              flag ที่ถูก dismiss แล้ว ({dismissed.length})
            </summary>
            <ul className="mt-2 space-y-2">
              {dismissed.map((f) => (
                <li
                  key={f.id}
                  className="rounded-lg bg-ink-50 dark:bg-ink-800/40 p-2"
                >
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
    </Card>
  );
}
