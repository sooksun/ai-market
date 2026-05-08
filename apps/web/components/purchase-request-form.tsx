'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ParseItemsResponse } from '@ai-market/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

export interface ItemRow {
  name: string;
  quantity: number;
  unit: string;
  unitPriceEst?: number;
  rawText?: string;
  notes?: string;
  confidence?: number;
}

const EMPTY_ROW: ItemRow = { name: '', quantity: 1, unit: 'ชิ้น' };

export interface PurchaseRequestFormProps {
  mode: 'create' | 'edit';
  prId?: string;
  initial?: {
    title: string;
    reason: string;
    items: ItemRow[];
  };
  redirectTo: string;
  submitLabel?: string;
}

export function PurchaseRequestForm({
  mode,
  prId,
  initial,
  redirectTo,
  submitLabel,
}: PurchaseRequestFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [reason, setReason] = useState(initial?.reason ?? '');
  const [items, setItems] = useState<ItemRow[]>(initial?.items ?? [{ ...EMPTY_ROW }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [parsing, setParsing] = useState(false);
  const [parseInput, setParseInput] = useState('');
  const [parsePreview, setParsePreview] = useState<ParseItemsResponse | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseMode, setParseMode] = useState<'append' | 'replace'>('replace');

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function callAiParse() {
    setParseError(null);
    setParsePreview(null);
    setParsing(true);
    try {
      const res = await fetch(`${API_URL}/ai/parse-items`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', content: parseInput }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? 'AI ไม่ตอบ');
      setParsePreview(body.data);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setParsing(false);
    }
  }

  function applyParsed() {
    if (!parsePreview) return;
    const parsedRows: ItemRow[] = parsePreview.items.map((p) => ({
      name: p.name,
      quantity: p.quantity,
      unit: p.unit,
      unitPriceEst: p.unitPriceEst,
      rawText: p.rawText,
      notes: p.notes,
      confidence: p.confidence,
    }));
    if (parseMode === 'append') {
      setItems((prev) => {
        const filtered = prev.filter((it) => it.name.trim() !== '');
        return [...filtered, ...parsedRows];
      });
    } else {
      setItems(parsedRows);
    }
    setParsePreview(null);
    setParseInput('');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url =
        mode === 'edit' && prId
          ? `${API_URL}/purchase-requests/${prId}`
          : `${API_URL}/purchase-requests`;
      const method = mode === 'edit' ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          reason,
          items: items.map(({ confidence: _c, ...rest }) => rest),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? 'บันทึกไม่สำเร็จ');
      router.push(redirectTo as never);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">ข้อมูลทั่วไป</h2>
        <label className="mt-4 block text-sm">
          เรื่อง
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="mt-4 block text-sm">
          เหตุผลความจำเป็น
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">รายการพัสดุ</h2>
          <button
            type="button"
            onClick={addItem}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
          >
            + เพิ่มแถว
          </button>
        </div>

        <div className="mt-4 rounded-md border border-dashed border-brand-200 bg-brand-50/50 p-4">
          <p className="text-sm font-medium text-brand-700">✨ ให้ AI ช่วยแยกรายการ</p>
          <p className="text-xs text-slate-600">
            วางข้อความแบบรวม เช่น "ปากกา 10 ด้าม กระดาษ A4 5 รีม" แล้วให้ AI แยกเป็นรายการ
          </p>
          <textarea
            value={parseInput}
            onChange={(e) => setParseInput(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            placeholder="ปากกาน้ำเงิน 10 ด้าม กระดาษ A4 5 รีม ..."
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={callAiParse}
              disabled={!parseInput || parsing}
              className="rounded-md bg-brand-500 px-3 py-1 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {parsing ? 'กำลังให้ AI ช่วย...' : 'ให้ AI แยกรายการ'}
            </button>
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="radio"
                name="parseMode"
                checked={parseMode === 'replace'}
                onChange={() => setParseMode('replace')}
              />
              แทนที่ทั้งหมด
            </label>
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="radio"
                name="parseMode"
                checked={parseMode === 'append'}
                onChange={() => setParseMode('append')}
              />
              เพิ่มต่อท้าย
            </label>
            {parseError && <span className="text-xs text-red-600">{parseError}</span>}
          </div>

          {parsePreview && (
            <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">
                AI เสนอ {parsePreview.items.length} รายการ · invocation{' '}
                <code className="font-mono">{parsePreview.invocationId}</code>
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {parsePreview.items.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span>
                      {p.name} — {p.quantity} {p.unit}
                    </span>
                    <span
                      className={`rounded px-1.5 text-xs ${
                        p.confidence >= 0.9
                          ? 'bg-green-100 text-green-800'
                          : p.confidence >= 0.7
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {(p.confidence * 100).toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
              {parsePreview.warnings.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-amber-700">
                  {parsePreview.warnings.map((w, i) => (
                    <li key={i}>⚠ {w.message}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={applyParsed}
                  className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                >
                  {parseMode === 'append' ? 'เพิ่มเข้ารายการ' : 'ใช้รายการนี้แทน'}
                </button>
                <button
                  type="button"
                  onClick={() => setParsePreview(null)}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>

        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="w-10 px-2 py-2">#</th>
              <th className="px-2 py-2">ชื่อ</th>
              <th className="w-24 px-2 py-2">จำนวน</th>
              <th className="w-24 px-2 py-2">หน่วย</th>
              <th className="w-32 px-2 py-2">ราคาประมาณ</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} className="border-t border-slate-100">
                <td className="px-2 py-2 text-xs text-slate-500">{idx + 1}</td>
                <td className="px-2 py-2">
                  <input
                    value={it.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    required
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                    required
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={it.unit}
                    onChange={(e) => updateItem(idx, { unit: e.target.value })}
                    required
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={it.unitPriceEst ?? ''}
                    onChange={(e) =>
                      updateItem(idx, {
                        unitPriceEst: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      ลบ
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

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
          {submitting ? 'กำลังบันทึก...' : (submitLabel ?? 'บันทึก')}
        </button>
      </div>
    </form>
  );
}
