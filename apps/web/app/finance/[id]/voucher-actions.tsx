'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PAYMENT_METHOD_LABELS_TH,
  type PaymentMethod,
  type VoucherStatus,
} from '@ai-market/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, TextInput, Textarea, Select } from '@/components/ui/form';
import { SectionTitle } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

interface Voucher {
  id: string;
  status: VoucherStatus;
  voucherNumber: string | null;
}

export function VoucherActions({
  prId,
  prStatus,
  voucher,
}: {
  prId: string;
  prStatus: string;
  voucher: Voucher | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Issue form
  const [voucherNumber, setVoucherNumber] = useState('');
  const [issueNotes, setIssueNotes] = useState('');

  // Pay form
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER');
  const [paymentRef, setPaymentRef] = useState('');

  // Cancel
  const [cancelReason, setCancelReason] = useState('');

  async function call(action: string, body: unknown) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/purchase-requests/${prId}/voucher/${action}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? `ทำรายการไม่สำเร็จ (${res.status})`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const canEnsure = !voucher && (prStatus === 'RECEIVED' || prStatus === 'APPROVED');

  if (canEnsure) {
    return (
      <Card className="mt-5 p-5">
        <SectionTitle
          icon={<Icon name="FilePlus" className="w-3.5 h-3.5" />}
          title="สร้างใบสำคัญใหม่"
          sub="ระบบจะคำนวณยอดจากใบเสนอราคาที่เลือก"
        />
        <div className="mt-3">
          <Button
            type="button"
            icon="FilePlus"
            disabled={busy !== null}
            onClick={() => call('ensure', {})}
          >
            {busy === 'ensure' ? 'กำลังสร้าง...' : 'สร้างใบสำคัญ'}
          </Button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>
        )}
      </Card>
    );
  }

  if (!voucher) {
    return (
      <Card className="mt-5 p-5 text-sm text-ink-500 dark:text-ink-300">
        คำขอนี้ยังไม่ถึงสถานะที่จะสร้างใบสำคัญได้ — ต้องตรวจรับให้เสร็จก่อน
      </Card>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      {voucher.status === 'PENDING' && (
        <Card className="p-5">
          <SectionTitle
            icon={<Icon name="FileSignature" className="w-3.5 h-3.5" />}
            title="ออกเลขใบสำคัญ"
            sub="ระบุเลขใบสำคัญตามรูปแบบของโรงเรียน"
          />
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="เลขใบสำคัญ" required>
              <TextInput
                value={voucherNumber}
                onChange={(e) => setVoucherNumber(e.target.value)}
                placeholder="เช่น 25/2569"
                className="font-mono"
              />
            </Field>
            <Field label="หมายเหตุ">
              <TextInput
                value={issueNotes}
                onChange={(e) => setIssueNotes(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              icon="Stamp"
              disabled={busy !== null || !voucherNumber.trim()}
              onClick={() =>
                call('issue', {
                  voucherNumber: voucherNumber.trim(),
                  notes: issueNotes || null,
                })
              }
            >
              {busy === 'issue' ? 'กำลังออก...' : 'ออกเลขใบสำคัญ'}
            </Button>
          </div>
        </Card>
      )}

      {voucher.status === 'ISSUED' && (
        <Card className="p-5">
          <SectionTitle
            icon={<Icon name="Banknote" className="w-3.5 h-3.5" />}
            title="บันทึกการจ่ายเงิน"
            sub="เมื่อจ่ายเงินจริงแล้ว — ระบบจะปิด PR (CLOSED) + บันทึก SPEND ในงบ"
          />
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Field label="วันที่จ่าย" required>
              <TextInput
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </Field>
            <Field label="วิธีจ่าย">
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                {Object.entries(PAYMENT_METHOD_LABELS_TH).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="เลขอ้างอิง" hint="bank ref / cheque no.">
              <TextInput
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="ABC123456"
                className="font-mono"
              />
            </Field>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              icon="Check"
              disabled={busy !== null}
              onClick={() =>
                call('pay', {
                  paidAt: paidAt
                    ? new Date(`${paidAt}T00:00:00`).toISOString()
                    : undefined,
                  paymentMethod,
                  paymentRef: paymentRef || null,
                })
              }
              className="!bg-emerald-600 hover:!bg-emerald-700 !bg-none"
            >
              {busy === 'pay' ? 'กำลังบันทึก...' : 'ยืนยันจ่ายเงิน'}
            </Button>
          </div>
        </Card>
      )}

      {(voucher.status === 'PENDING' || voucher.status === 'ISSUED') && (
        <Card className="p-5">
          <SectionTitle
            icon={<Icon name="X" className="w-3.5 h-3.5" />}
            title="ยกเลิกใบสำคัญ"
            sub="ใช้เมื่อมีการยกเลิกหลังออกเลขแล้ว — ใบที่จ่ายแล้วยกเลิกไม่ได้"
          />
          <div className="mt-3 grid gap-4">
            <Field label="เหตุผลยกเลิก" required>
              <Textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="ระบุเหตุผล"
              />
            </Field>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              icon="X"
              disabled={busy !== null || !cancelReason.trim()}
              onClick={() => call('cancel', { reason: cancelReason.trim() })}
              className="text-rose-700 dark:text-rose-300 ring-rose-300/60 dark:ring-rose-700/40"
            >
              {busy === 'cancel' ? 'กำลังยกเลิก...' : 'ยกเลิกใบสำคัญ'}
            </Button>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-4 bg-rose-50 dark:bg-rose-900/30 ring-1 ring-rose-200/60 dark:ring-rose-700/40">
          <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
        </Card>
      )}
    </div>
  );
}
