'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Field, TextInput, Select } from '@/components/ui/form';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

const TYPE_OPTIONS = ['อุดหนุน', 'รายได้', 'โครงการเฉพาะ', 'อื่น ๆ'];

export interface BudgetSourceFormProps {
  mode: 'create' | 'edit';
  id?: string;
  initial?: {
    code: string | null;
    name: string;
    type: string;
    fiscalYear: number;
    totalAmount: string;
    active: boolean;
  };
}

const CURRENT_BE = new Date().getFullYear() + 543;
const YEARS = [CURRENT_BE - 1, CURRENT_BE, CURRENT_BE + 1];

export function BudgetSourceForm({ mode, id, initial }: BudgetSourceFormProps) {
  const router = useRouter();
  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState(initial?.type ?? TYPE_OPTIONS[0]!);
  const [fiscalYear, setFiscalYear] = useState(initial?.fiscalYear ?? CURRENT_BE);
  const [totalAmount, setTotalAmount] = useState(initial?.totalAmount ?? '0');
  const [active, setActive] = useState(initial?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url =
        mode === 'edit' && id
          ? `${API_URL}/budget-sources/${id}`
          : `${API_URL}/budget-sources`;
      const method = mode === 'edit' ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code || null,
          name,
          type,
          fiscalYear,
          totalAmount: Number(totalAmount),
          active,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? `บันทึกไม่สำเร็จ (${res.status})`);
        return;
      }
      router.push('/admin/budget-sources');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="รหัส (code)" hint="เช่น BS-01">
            <TextInput
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="BS-01"
              className="font-mono"
            />
          </Field>
          <Field label="ปีงบประมาณ (พ.ศ.)" required>
            <Select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="ชื่อแหล่งงบ" required>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="เช่น เงินอุดหนุนทั่วไป"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="ประเภท" required>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="วงเงินรวม (บาท)" required>
            <TextInput
              type="number"
              step="0.01"
              min="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              required
              className="text-right tabular-nums"
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="accent-brand-500 w-4 h-4"
          />
          <span className="text-ink-700 dark:text-ink-100">เปิดใช้งาน (active)</span>
        </label>

        {error && (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/30 ring-1 ring-rose-200/60 dark:ring-rose-700/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            ยกเลิก
          </Button>
          <Button type="submit" disabled={submitting} icon="Save">
            {submitting
              ? 'กำลังบันทึก...'
              : mode === 'edit'
                ? 'บันทึกการแก้ไข'
                : 'สร้างแหล่งงบ'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
