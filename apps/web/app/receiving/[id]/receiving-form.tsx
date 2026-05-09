'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RECEIVE_CONDITION_LABELS_TH,
  RECEIVING_STATUS_LABELS_TH,
  type ItemReceiveCondition,
  type ReceivingStatus,
} from '@ai-market/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, TextInput, Textarea, Select } from '@/components/ui/form';
import { SectionTitle } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { classNames, fmtNum } from '@/components/ui/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

interface PrItem {
  id: string;
  ordinal: number;
  name: string;
  unit: string;
  quantityRequested: number;
}

interface ExistingItem {
  id: string;
  purchaseRequestItemId: string;
  quantityReceived: string | null;
  condition: string | null;
  conditionNotes: string | null;
  inspectedAt: string | null;
}

interface ExistingRecord {
  id: string;
  status: ReceivingStatus;
  startedAt: string;
  finalizedAt: string | null;
  comment: string | null;
  items: ExistingItem[];
}

interface RowState {
  qty: string;
  condition: ItemReceiveCondition;
  notes: string;
  receivingItemId: string | null;
  inspectedAt: string | null;
}

const STATUS_TONE: Record<ReceivingStatus, string> = {
  IN_PROGRESS: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200',
  COMPLETE: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200',
  PARTIAL: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200',
  REJECTED: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-200',
  CANCELLED: 'bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300',
};

export function ReceivingForm({
  prId,
  items,
  existing,
  canEdit,
  canStart,
}: {
  prId: string;
  items: PrItem[];
  existing: ExistingRecord | null;
  canEdit: boolean;
  canStart: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {};
    for (const it of items) {
      const ex = existing?.items.find((x) => x.purchaseRequestItemId === it.id);
      init[it.id] = {
        qty: ex?.quantityReceived ? String(ex.quantityReceived) : String(it.quantityRequested),
        condition: ((ex?.condition ?? 'GOOD') as ItemReceiveCondition),
        notes: ex?.conditionNotes ?? '',
        receivingItemId: ex?.id ?? null,
        inspectedAt: ex?.inspectedAt ?? null,
      };
    }
    return init;
  });
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setRow(itemId: string, patch: Partial<RowState>) {
    setRows((p) => ({ ...p, [itemId]: { ...p[itemId]!, ...patch } }));
  }

  async function startReceiving() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/purchase-requests/${prId}/receiving/start`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? `เริ่มไม่สำเร็จ (${res.status})`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveRow(itemId: string) {
    const r = rows[itemId];
    if (!r?.receivingItemId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/purchase-requests/${prId}/receiving/items/${r.receivingItemId}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantityReceived: r.qty ? Number(r.qty) : null,
            condition: r.condition,
            conditionNotes: r.notes || null,
          }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? `บันทึกไม่สำเร็จ (${res.status})`);
        return;
      }
      setRow(itemId, { inspectedAt: new Date().toISOString() });
    } finally {
      setBusy(false);
    }
  }

  async function finalize(decision: 'COMPLETE' | 'PARTIAL' | 'REJECTED') {
    if (!confirm(`ยืนยันปิดใบตรวจรับเป็น "${decision}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/purchase-requests/${prId}/receiving/finalize`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comment: comment || null }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? `ปิดไม่สำเร็จ (${res.status})`);
        return;
      }
      router.push(`/requests/${prId}` as never);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!existing && canStart) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-xl grad-brand text-white">
            <Icon name="ClipboardCheck" className="w-5 h-5" />
          </span>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-ink-900 dark:text-white">
              ยังไม่มีใบตรวจรับ
            </h2>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-200">
              กดเริ่มเพื่อสร้างใบตรวจรับสำหรับ {items.length} รายการ — สถานะ PR จะเปลี่ยนเป็น
              IN_RECEIVING และจำนวนรับเริ่มต้นจะตั้งเท่ากับจำนวนที่ขอซื้อ
            </p>
            <div className="mt-3">
              <Button onClick={startReceiving} disabled={busy} icon="Play">
                {busy ? 'กำลังเริ่ม...' : 'เริ่มตรวจรับ'}
              </Button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (!existing) return null;

  const isClosed = existing.status !== 'IN_PROGRESS';

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionTitle
          icon={<Icon name="ClipboardCheck" className="w-3.5 h-3.5" />}
          title="ใบตรวจรับ"
          sub={`เริ่ม ${new Date(existing.startedAt).toLocaleString('th-TH')}${
            existing.finalizedAt
              ? ` · ปิด ${new Date(existing.finalizedAt).toLocaleString('th-TH')}`
              : ''
          }`}
          action={
            <span
              className={classNames(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                STATUS_TONE[existing.status],
              )}
            >
              {RECEIVING_STATUS_LABELS_TH[existing.status]}
            </span>
          }
        />

        {isClosed && existing.comment && (
          <p className="mt-3 rounded-lg bg-ink-50 dark:bg-ink-900/40 p-3 text-sm text-ink-700 dark:text-ink-100">
            <span className="font-medium">บันทึก: </span>
            {existing.comment}
          </p>
        )}

        <div className="mt-4 overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr className="text-left">
                <th className="font-medium px-2 py-2 w-10">#</th>
                <th className="font-medium px-2 py-2">รายการ</th>
                <th className="font-medium px-2 py-2 w-28 text-right">จำนวนขอ</th>
                <th className="font-medium px-2 py-2 w-32">จำนวนรับจริง</th>
                <th className="font-medium px-2 py-2 w-36">สภาพ</th>
                <th className="font-medium px-2 py-2">หมายเหตุ</th>
                <th className="font-medium px-2 py-2 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {items.map((it) => {
                const r = rows[it.id]!;
                const matches = r.qty && Number(r.qty) === it.quantityRequested;
                return (
                  <tr key={it.id}>
                    <td className="px-2 py-2 text-ink-400 dark:text-ink-300 tabular-nums">
                      {it.ordinal}
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-ink-900 dark:text-white">{it.name}</div>
                      <div className="text-[11px] text-ink-400 dark:text-ink-300">{it.unit}</div>
                    </td>
                    <td className="px-2 py-2 tabular-nums text-right text-ink-700 dark:text-ink-100">
                      {fmtNum(it.quantityRequested)}
                    </td>
                    <td className="px-2 py-2">
                      <TextInput
                        type="number"
                        step="0.01"
                        min="0"
                        value={r.qty}
                        onChange={(e) => setRow(it.id, { qty: e.target.value })}
                        disabled={!canEdit}
                        className={classNames(
                          'text-right tabular-nums',
                          !matches && r.qty && '!border-amber-400',
                        )}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={r.condition}
                        onChange={(e) =>
                          setRow(it.id, {
                            condition: e.target.value as ItemReceiveCondition,
                          })
                        }
                        disabled={!canEdit}
                      >
                        {(
                          [
                            'GOOD',
                            'DAMAGED',
                            'WRONG_SPEC',
                            'SHORT_QUANTITY',
                            'NOT_RECEIVED',
                          ] as ItemReceiveCondition[]
                        ).map((c) => (
                          <option key={c} value={c}>
                            {RECEIVE_CONDITION_LABELS_TH[c]}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <TextInput
                        value={r.notes}
                        onChange={(e) => setRow(it.id, { notes: e.target.value })}
                        disabled={!canEdit}
                        placeholder=""
                      />
                    </td>
                    <td className="px-2 py-2">
                      {canEdit ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="soft"
                          icon="Save"
                          onClick={() => saveRow(it.id)}
                          disabled={busy}
                        >
                          บันทึก
                        </Button>
                      ) : r.inspectedAt ? (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-300">
                          ✓ ตรวจแล้ว
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-400 dark:text-ink-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <Field label="ความเห็นการตรวจรับ" hint="เขียนสรุปการตรวจรับโดยรวม" className="mt-4">
            <Textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="เช่น ของครบตามรายการ สภาพดี"
            />
          </Field>
        )}

        {error && (
          <div className="mt-3 rounded-lg bg-rose-50 dark:bg-rose-900/30 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
            {error}
          </div>
        )}

        {canEdit && (
          <div className="mt-4 flex flex-wrap gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              icon="X"
              onClick={() => finalize('REJECTED')}
              disabled={busy}
              className="text-rose-700 dark:text-rose-300 ring-rose-300/60 dark:ring-rose-700/40"
            >
              ไม่รับ (คืนผู้ขาย)
            </Button>
            <Button
              type="button"
              variant="outline"
              icon="AlertTriangle"
              onClick={() => finalize('PARTIAL')}
              disabled={busy}
              className="text-amber-700 dark:text-amber-200 ring-amber-300/60 dark:ring-amber-700/40"
            >
              รับบางส่วน
            </Button>
            <Button
              type="button"
              icon="Check"
              onClick={() => finalize('COMPLETE')}
              disabled={busy}
              className="!bg-emerald-600 hover:!bg-emerald-700 !bg-none"
            >
              รับครบ — ปิดใบ
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
