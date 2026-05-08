'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Field, TextInput, Select, Textarea } from '@/components/ui/form';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

export interface BudgetFormProps {
  mode: 'create' | 'edit';
  id?: string;
  initial?: {
    projectId: string;
    budgetSourceId: string;
    fiscalYear: number;
    amount: string;
    notes: string | null;
  };
  projects: Array<{ id: string; code: string | null; name: string; fiscalYear: number }>;
  sources: Array<{
    id: string;
    code: string | null;
    name: string;
    type: string;
    fiscalYear: number;
  }>;
}

const CURRENT_BE = new Date().getFullYear() + 543;
const YEARS = [CURRENT_BE - 1, CURRENT_BE, CURRENT_BE + 1];

export function BudgetForm({ mode, id, initial, projects, sources }: BudgetFormProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(initial?.projectId ?? '');
  const [budgetSourceId, setBudgetSourceId] = useState(initial?.budgetSourceId ?? '');
  const [fiscalYear, setFiscalYear] = useState(initial?.fiscalYear ?? CURRENT_BE);
  const [amount, setAmount] = useState(initial?.amount ?? '0');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url =
        mode === 'edit' && id ? `${API_URL}/budgets/${id}` : `${API_URL}/budgets`;
      const method = mode === 'edit' ? 'PATCH' : 'POST';
      const body =
        mode === 'edit'
          ? { amount: Number(amount), notes: notes || null }
          : {
              projectId,
              budgetSourceId,
              fiscalYear,
              amount: Number(amount),
              notes: notes || null,
            };
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? `บันทึกไม่สำเร็จ (${res.status})`);
        return;
      }
      router.push('/admin/budgets');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="โครงการ" required hint={mode === 'edit' ? 'แก้ไม่ได้' : undefined}>
            <Select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={mode === 'edit'}
              required
            >
              <option value="">— เลือกโครงการ —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `[${p.code}] ` : ''}
                  {p.name} (ปี {p.fiscalYear})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="แหล่งงบ" required hint={mode === 'edit' ? 'แก้ไม่ได้' : undefined}>
            <Select
              value={budgetSourceId}
              onChange={(e) => setBudgetSourceId(e.target.value)}
              disabled={mode === 'edit'}
              required
            >
              <option value="">— เลือกแหล่งงบ —</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code ? `[${s.code}] ` : ''}
                  {s.name} · {s.type} (ปี {s.fiscalYear})
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="ปีงบประมาณ" required hint={mode === 'edit' ? 'แก้ไม่ได้' : undefined}>
            <Select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              disabled={mode === 'edit'}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="วงเงินจัดสรร (บาท)" required>
            <TextInput
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="text-right tabular-nums"
            />
          </Field>
        </div>

        <Field label="หมายเหตุ">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="เช่น ใช้สำหรับครุภัณฑ์เท่านั้น"
          />
        </Field>

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
                : 'จัดสรร'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
