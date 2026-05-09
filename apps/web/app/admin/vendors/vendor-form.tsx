'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Field, TextInput, Textarea } from '@/components/ui/form';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

export interface VendorFormProps {
  mode: 'create' | 'edit';
  id?: string;
  initial?: {
    name: string;
    taxId: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    rating: number | null;
    notes: string | null;
    active: boolean;
  };
}

export function VendorForm({ mode, id, initial }: VendorFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [taxId, setTaxId] = useState(initial?.taxId ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [rating, setRating] = useState(
    initial?.rating != null ? String(initial.rating) : '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url = mode === 'edit' && id ? `${API_URL}/vendors/${id}` : `${API_URL}/vendors`;
      const method = mode === 'edit' ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          taxId: taxId || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          rating: rating ? Number(rating) : null,
          notes: notes || null,
          active,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? `บันทึกไม่สำเร็จ (${res.status})`);
        return;
      }
      router.push('/admin/vendors' as never);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="ชื่อผู้ขาย" required>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="เช่น บริษัท เอสไอเอส ดิสทริบิวชั่น จำกัด"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="เลขผู้เสียภาษี">
            <TextInput
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="0105541081234"
              className="font-mono"
            />
          </Field>
          <Field label="คะแนนภายใน (0–5)">
            <TextInput
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              placeholder="4.5"
              className="text-right tabular-nums"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="เบอร์ติดต่อ">
            <TextInput
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="02-555-1234"
            />
          </Field>
          <Field label="อีเมล">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@example.com"
            />
          </Field>
        </div>

        <Field label="ที่อยู่">
          <Textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
          />
        </Field>

        <Field label="หมายเหตุ">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="เช่น เป็นผู้ขายในระบบ e-Catalog ภาครัฐ"
          />
        </Field>

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
                : 'สร้างผู้ขาย'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
