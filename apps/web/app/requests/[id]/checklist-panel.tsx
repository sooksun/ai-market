'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ChecklistResponse } from '@ai-market/shared';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { fmtNum, classNames } from '@/components/ui/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

const AMOUNT_SOURCE_LABEL: Record<ChecklistResponse['amountSource'], string> = {
  selected_quotation: 'จากใบเสนอราคาที่เลือก',
  items_estimate: 'จากราคาประมาณการในรายการ',
  none: 'ยังไม่มียอด',
};

export function ChecklistPanel({
  prId,
  initial,
}: {
  prId: string;
  initial: ChecklistResponse;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [renderingKey, setRenderingKey] = useState<string | null>(null);

  async function generate(templateKey: string) {
    setRenderingKey(templateKey);
    try {
      const res = await fetch(
        `${API_URL}/purchase-requests/${prId}/documents/render`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateKey }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        alert(json?.error?.message ?? `Render ไม่สำเร็จ (${res.status})`);
        return;
      }
      // Reload checklist
      const cRes = await fetch(`${API_URL}/purchase-requests/${prId}/checklist`, {
        credentials: 'include',
      });
      const cJson = await cRes.json().catch(() => null);
      if (cRes.ok && cJson?.data) setData(cJson.data);
      router.refresh();
    } finally {
      setRenderingKey(null);
    }
  }

  const completionPct =
    data.totalRequired > 0
      ? Math.round((data.totalPresent / data.totalRequired) * 100)
      : 0;

  return (
    <Card className="p-5">
      <SectionTitle
        icon={<Icon name="ListChecks" className="w-3.5 h-3.5" />}
        title="ระเบียบ + เอกสารที่ต้องมี"
        sub={`วงเงิน ${fmtNum(data.amount)} ฿ · ${AMOUNT_SOURCE_LABEL[data.amountSource]}`}
      />

      <div className="mt-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/40 p-3">
        <div className="text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
          วิธีจัดซื้อที่ระบบเลือกให้
        </div>
        <div className="mt-1 text-sm font-semibold text-brand-700 dark:text-brand-200">
          {data.methodLabel}
        </div>
        {data.matchedTier && data.matchedTier.max != null && (
          <div className="text-[11px] text-ink-500 dark:text-ink-300">
            (สำหรับวงเงิน ≤ {fmtNum(data.matchedTier.max)} ฿)
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-700 dark:text-ink-100">
            ความครบถ้วน · {data.totalPresent}/{data.totalRequired}
          </span>
          <span
            className={classNames(
              'font-mono tabular-nums font-semibold',
              data.complete
                ? 'text-emerald-600 dark:text-emerald-300'
                : 'text-amber-600 dark:text-amber-300',
            )}
          >
            {completionPct}%
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
          <div
            className={classNames(
              'h-full rounded-full',
              data.complete ? 'bg-emerald-500' : 'grad-brand',
            )}
            style={{ width: `${Math.max(completionPct, 4)}%` }}
          />
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {data.docs.length === 0 ? (
          <li className="text-xs text-ink-400 dark:text-ink-300">
            ไม่ได้กำหนดเอกสารสำหรับวิธีนี้ — ตรวจ rule_configs
          </li>
        ) : (
          data.docs.map((d) => (
            <li
              key={d.key}
              className="flex items-start gap-2.5 rounded-xl border border-ink-100 dark:border-white/5 p-2.5"
            >
              <span
                className={classNames(
                  'mt-0.5 grid place-items-center w-5 h-5 rounded-md shrink-0',
                  d.present
                    ? 'bg-emerald-500 text-white'
                    : d.required
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                      : 'bg-ink-100 dark:bg-ink-800 text-ink-400 dark:text-ink-300',
                )}
              >
                <Icon
                  name={d.present ? 'Check' : d.required ? 'AlertCircle' : 'Minus'}
                  className="w-3 h-3"
                  strokeWidth={2.5}
                />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-ink-900 dark:text-white">
                  {d.labelTh}
                  {!d.required && (
                    <span className="ml-1 text-[10px] text-ink-400 dark:text-ink-300">
                      (ไม่บังคับ)
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-ink-400 dark:text-ink-300">
                  {d.key}
                </div>
              </div>
              <div className="shrink-0">
                {d.present && d.documentId ? (
                  <Link
                    href={`/documents/${d.documentId}` as never}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-md text-[11px] px-2 py-0.5 text-brand-600 dark:text-brand-300 hover:underline"
                  >
                    <Icon name="Eye" className="w-3 h-3" /> ดู
                  </Link>
                ) : d.templateAvailable ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="soft"
                    onClick={() => generate(d.key)}
                    disabled={renderingKey !== null}
                    icon="FilePlus2"
                  >
                    {renderingKey === d.key ? '...' : 'ออก'}
                  </Button>
                ) : (
                  <span className="text-[10px] text-ink-400 dark:text-ink-300 italic">
                    ไม่มี template
                  </span>
                )}
              </div>
            </li>
          ))
        )}
      </ul>

      <p className="mt-3 text-[10px] text-ink-400 dark:text-ink-300">
        ปรับเกณฑ์ผ่าน <code className="font-mono">/admin/rule-configs</code> · key:
        procurement_thresholds, required_docs_by_method
      </p>
    </Card>
  );
}
