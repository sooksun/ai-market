'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Field, TextInput, Textarea } from '@/components/ui/form';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

export interface RuleFormProps {
  mode: 'create' | 'edit';
  id?: string;
  initial?: {
    key: string;
    type: string;
    value: unknown;
    description: string | null;
  };
}

const TYPE_HINTS: Record<string, string> = {
  list: '{ "words": ["..."] }',
  thresholds: '{ "specific_method_max": 500000 }',
  checklist: '{ "SPECIFIC_METHOD": ["memo", "compare_table"] }',
  number: '12345',
  string: '"ค่าข้อความ"',
};

export function RuleForm({ mode, id, initial }: RuleFormProps) {
  const router = useRouter();
  const [key, setKey] = useState(initial?.key ?? '');
  const [type, setType] = useState(initial?.type ?? 'list');
  const [valueJson, setValueJson] = useState(JSON.stringify(initial?.value ?? {}, null, 2));
  const [description, setDescription] = useState(initial?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(valueJson);
    } catch {
      setError('value ไม่ใช่ JSON ที่ถูกต้อง');
      return;
    }

    setSubmitting(true);
    try {
      const url =
        mode === 'edit' && id
          ? `${API_URL}/rule-configs/${id}`
          : `${API_URL}/rule-configs`;
      const method = mode === 'edit' ? 'PATCH' : 'POST';

      const body =
        mode === 'edit'
          ? {
              type,
              value: parsedValue,
              description: description || null,
            }
          : {
              key,
              type,
              value: parsedValue,
              description: description || null,
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
      router.push('/admin/rule-configs');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const hint = TYPE_HINTS[type];

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-5">
        <Field
          label="Key"
          required
          hint={mode === 'edit' ? 'แก้ key หลังสร้างไม่ได้' : 'ตัวพิมพ์เล็ก ขีดล่าง ตัวเลข เริ่มด้วยตัวอักษร'}
        >
          <TextInput
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            disabled={mode === 'edit'}
            placeholder="เช่น procurement_thresholds"
            className="font-mono disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </Field>

        <Field label="Type (label)" required>
          <TextInput
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
            placeholder="เช่น list / thresholds / checklist / number"
            className="font-mono"
          />
        </Field>

        <Field
          label="Value (JSON)"
          required
          hint={hint ? `ตัวอย่าง type "${type}": ${hint}` : undefined}
        >
          <Textarea
            value={valueJson}
            onChange={(e) => setValueJson(e.target.value)}
            rows={10}
            required
            className="font-mono text-xs bg-ink-50 dark:bg-ink-900/40"
          />
        </Field>

        <Field label="คำอธิบาย">
          <TextInput
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="คำอธิบายสั้น ๆ สำหรับเพื่อนร่วมงาน"
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
                : 'สร้าง rule'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
