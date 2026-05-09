'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SPEC_MATCH_LABELS_TH,
  type QuotationSpecMatch,
} from '@ai-market/shared';
import { Card } from '@/components/ui/card';
import { Field, TextInput, Textarea, Select } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { SectionTitle } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { fmtNum } from '@/components/ui/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

interface PrItem {
  id: string;
  ordinal: number;
  name: string;
  quantity: number;
  unit: string;
}

interface VendorOption {
  id: string;
  name: string;
  rating: number | null;
}

interface ItemRow {
  unitPrice: string;
  specMatch: QuotationSpecMatch;
  notes: string;
}

export function QuotationForm({
  prId,
  items,
  vendors,
}: {
  prId: string;
  items: PrItem[];
  vendors: VendorOption[];
}) {
  const router = useRouter();
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? '');
  const [source, setSource] = useState('GovTech Marketplace');
  const [shippingFee, setShippingFee] = useState('0');
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [rows, setRows] = useState<Record<string, ItemRow>>(
    Object.fromEntries(
      items.map((it) => [
        it.id,
        { unitPrice: '', specMatch: 'UNKNOWN' as QuotationSpecMatch, notes: '' },
      ]),
    ),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(itemId: string, patch: Partial<ItemRow>) {
    setRows((prev) => ({ ...prev, [itemId]: { ...prev[itemId]!, ...patch } }));
  }

  const filledItems = items.filter(
    (it) => rows[it.id]?.unitPrice && Number(rows[it.id]!.unitPrice) >= 0,
  );
  const itemsTotal = filledItems.reduce(
    (sum, it) => sum + Number(rows[it.id]!.unitPrice) * it.quantity,
    0,
  );
  const grandTotal = itemsTotal + Number(shippingFee || 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (filledItems.length === 0) {
      setError('กรอกราคาอย่างน้อย 1 รายการ');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/purchase-requests/${prId}/quotations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          source,
          shippingFee: Number(shippingFee || 0),
          notes: notes || null,
          validUntil: validUntil
            ? new Date(`${validUntil}T23:59:59`).toISOString()
            : null,
          items: filledItems.map((it) => ({
            purchaseRequestItemId: it.id,
            unitPrice: Number(rows[it.id]!.unitPrice),
            specMatch: rows[it.id]!.specMatch,
            notes: rows[it.id]!.notes || null,
          })),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? `บันทึกไม่สำเร็จ (${res.status})`);
        return;
      }
      router.push(`/compare?prId=${prId}` as never);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card className="p-5">
        <SectionTitle
          icon={<Icon name="Store" className="w-3.5 h-3.5" />}
          title="ข้อมูลใบเสนอราคา"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="ผู้ขาย" required>
            <Select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              required
            >
              <option value="">— เลือกผู้ขาย —</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.rating != null && ` · ${v.rating.toFixed(1)}★`}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="แหล่งที่มา" required hint="เช่น GovTech, e-Catalog, ใบเสนอราคา (กระดาษ)">
            <TextInput
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
            />
          </Field>
          <Field label="ค่าส่ง (บาท)">
            <TextInput
              type="number"
              step="0.01"
              min="0"
              value={shippingFee}
              onChange={(e) => setShippingFee(e.target.value)}
              className="text-right tabular-nums"
            />
          </Field>
          <Field label="ใช้ได้ถึงวันที่">
            <TextInput
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </Field>
          <Field label="หมายเหตุ" className="md:col-span-2">
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เงื่อนไขชำระเงิน เช่น 30 วันหลังตรวจรับ ฯลฯ"
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle
          icon={<Icon name="Package" className="w-3.5 h-3.5" />}
          title="ราคาต่อรายการ"
          sub="ปล่อยช่องว่างถ้าผู้ขายไม่ได้เสนอข้อนั้น"
        />
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr className="text-left">
                <th className="font-medium px-2 py-2 w-8">#</th>
                <th className="font-medium px-2 py-2">รายการ</th>
                <th className="font-medium px-2 py-2 w-24 text-right">จำนวน</th>
                <th className="font-medium px-2 py-2 w-32">ราคา/หน่วย</th>
                <th className="font-medium px-2 py-2 w-32 text-right">รวมรายการ</th>
                <th className="font-medium px-2 py-2 w-32">ตรงสเปก</th>
                <th className="font-medium px-2 py-2">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {items.map((it) => {
                const r = rows[it.id]!;
                const lineTotal = r.unitPrice ? Number(r.unitPrice) * it.quantity : 0;
                return (
                  <tr key={it.id}>
                    <td className="px-2 py-2 text-ink-400 dark:text-ink-300 tabular-nums">
                      {it.ordinal}
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-ink-900 dark:text-white">{it.name}</div>
                      <div className="text-[11px] text-ink-400 dark:text-ink-300">
                        {it.quantity} {it.unit}
                      </div>
                    </td>
                    <td className="px-2 py-2 tabular-nums text-right text-ink-700 dark:text-ink-100">
                      {it.quantity}
                    </td>
                    <td className="px-2 py-2">
                      <TextInput
                        type="number"
                        step="0.01"
                        min="0"
                        value={r.unitPrice}
                        onChange={(e) => updateRow(it.id, { unitPrice: e.target.value })}
                        className="text-right tabular-nums"
                      />
                    </td>
                    <td className="px-2 py-2 tabular-nums text-right text-ink-700 dark:text-ink-100">
                      {lineTotal > 0 ? fmtNum(lineTotal) : '—'}
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={r.specMatch}
                        onChange={(e) =>
                          updateRow(it.id, {
                            specMatch: e.target.value as QuotationSpecMatch,
                          })
                        }
                      >
                        {(['UNKNOWN', 'FULL', 'PARTIAL', 'MISMATCH'] as const).map((v) => (
                          <option key={v} value={v}>
                            {SPEC_MATCH_LABELS_TH[v]}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <TextInput
                        value={r.notes}
                        onChange={(e) => updateRow(it.id, { notes: e.target.value })}
                        placeholder=""
                      />
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-ink-50/40 dark:bg-ink-900/40 font-semibold">
                <td colSpan={4} className="px-2 py-2 text-right text-ink-700 dark:text-ink-100">
                  รวมรายการ
                </td>
                <td className="px-2 py-2 tabular-nums text-right text-ink-900 dark:text-white">
                  {fmtNum(itemsTotal)}
                </td>
                <td colSpan={2}></td>
              </tr>
              <tr className="bg-ink-50/40 dark:bg-ink-900/40 font-semibold">
                <td colSpan={4} className="px-2 py-2 text-right text-ink-700 dark:text-ink-100">
                  ค่าส่ง
                </td>
                <td className="px-2 py-2 tabular-nums text-right text-ink-900 dark:text-white">
                  {fmtNum(Number(shippingFee || 0))}
                </td>
                <td colSpan={2}></td>
              </tr>
              <tr className="bg-brand-50/60 dark:bg-brand-900/20 font-bold">
                <td colSpan={4} className="px-2 py-2 text-right text-ink-900 dark:text-white">
                  รวมทั้งสิ้น
                </td>
                <td className="px-2 py-2 tabular-nums text-right text-brand-700 dark:text-brand-200 text-base">
                  {fmtNum(grandTotal)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {error && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/30 ring-1 ring-rose-200/60 dark:ring-rose-700/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={submitting} icon="Save">
          {submitting ? 'กำลังบันทึก...' : 'บันทึกใบเสนอราคา'}
        </Button>
      </div>
    </form>
  );
}
