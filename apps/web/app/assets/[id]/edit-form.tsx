'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ASSET_STATUS_LABELS_TH,
  type AssetStatus,
} from '@ai-market/shared';
import { Card } from '@/components/ui/card';
import { Field, TextInput, Textarea, Select } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { SectionTitle } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

export function AssetEditForm({
  id,
  initial,
}: {
  id: string;
  initial: {
    location: string | null;
    custodianId: string | null;
    status: AssetStatus;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [location, setLocation] = useState(initial.location ?? '');
  const [custodianId, setCustodianId] = useState(initial.custodianId ?? '');
  const [status, setStatus] = useState<AssetStatus>(initial.status);
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/assets/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location || null,
          custodianId: custodianId || null,
          status,
          notes: notes || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? `บันทึกไม่สำเร็จ (${res.status})`);
        return;
      }
      setSavedAt(new Date());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-5 p-5">
      <SectionTitle
        icon={<Icon name="Pencil" className="w-3.5 h-3.5" />}
        title="แก้ไขข้อมูล"
        sub="ที่ตั้ง / ผู้รับผิดชอบ / สถานะ / หมายเหตุ"
      />
      <form onSubmit={submit} className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field label="ที่ตั้ง">
          <TextInput
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="ห้องเรียน 6/2 / ห้องคอมพิวเตอร์ 1"
          />
        </Field>
        <Field label="ผู้รับผิดชอบ (user id)">
          <TextInput
            value={custodianId}
            onChange={(e) => setCustodianId(e.target.value)}
            placeholder="user_xxx"
            className="font-mono"
          />
        </Field>
        <Field label="สถานะ">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as AssetStatus)}
          >
            {Object.entries(ASSET_STATUS_LABELS_TH).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="หมายเหตุ" className="sm:col-span-2">
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        {error && (
          <div className="sm:col-span-2 rounded-2xl bg-rose-50 dark:bg-rose-900/30 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
            {error}
          </div>
        )}
        <div className="sm:col-span-2 flex items-center justify-end gap-3">
          {savedAt && (
            <span className="text-xs text-emerald-600 dark:text-emerald-300">
              ✓ บันทึก {savedAt.toLocaleTimeString('th-TH')}
            </span>
          )}
          <Button type="submit" disabled={busy} icon="Save">
            {busy ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
