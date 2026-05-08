'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const [valueJson, setValueJson] = useState(
    JSON.stringify(initial?.value ?? {}, null, 2),
  );
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
    <form onSubmit={onSubmit} className="space-y-5 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block text-sm">
        Key
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
          disabled={mode === 'edit'}
          placeholder="เช่น procurement_thresholds"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm disabled:bg-slate-50 disabled:text-slate-500"
        />
        <span className="mt-1 block text-xs text-slate-500">
          ตัวพิมพ์เล็ก ขีดล่าง ตัวเลข เริ่มด้วยตัวอักษร · {mode === 'edit' && 'แก้ key หลังสร้างไม่ได้'}
        </span>
      </label>

      <label className="block text-sm">
        Type (label)
        <input
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
          placeholder="เช่น list / thresholds / checklist / number"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
        />
      </label>

      <label className="block text-sm">
        Value (JSON)
        <textarea
          value={valueJson}
          onChange={(e) => setValueJson(e.target.value)}
          rows={10}
          required
          className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs"
        />
        {hint && (
          <span className="mt-1 block text-xs text-slate-500">
            ตัวอย่าง type "{type}": <code>{hint}</code>
          </span>
        )}
      </label>

      <label className="block text-sm">
        คำอธิบาย
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="คำอธิบายสั้น ๆ สำหรับเพื่อนร่วมงาน"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting ? 'กำลังบันทึก...' : mode === 'edit' ? 'บันทึกการแก้ไข' : 'สร้าง rule'}
        </button>
      </div>
    </form>
  );
}
