'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  BudgetSourceSummary,
  ParseItemsResponse,
  ProjectSummary,
} from '@ai-market/shared';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Field, TextInput, Textarea, Select } from './ui/form';
import { SectionTitle } from './ui/page-header';
import { Confidence } from './ui/confidence';
import { Icon } from './ui/icon';
import { Tabs } from './ui/tabs';
import { classNames } from './ui/format';

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
    projectId?: string | null;
    budgetSourceId?: string | null;
    items: ItemRow[];
  };
  projects: ProjectSummary[];
  budgetSources: BudgetSourceSummary[];
  redirectTo: string;
  submitLabel?: string;
}

export function PurchaseRequestForm({
  mode,
  prId,
  initial,
  projects,
  budgetSources,
  redirectTo,
  submitLabel,
}: PurchaseRequestFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [reason, setReason] = useState(initial?.reason ?? '');
  const [projectId, setProjectId] = useState<string>(initial?.projectId ?? '');
  const [budgetSourceId, setBudgetSourceId] = useState<string>(initial?.budgetSourceId ?? '');
  const [items, setItems] = useState<ItemRow[]>(initial?.items ?? [{ ...EMPTY_ROW }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [parsing, setParsing] = useState(false);
  const [parseInput, setParseInput] = useState('');
  const [parseFile, setParseFile] = useState<File | null>(null);
  const [parsePreview, setParsePreview] = useState<ParseItemsResponse | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseMode, setParseMode] = useState<'append' | 'replace'>('replace');
  const [parseTab, setParseTab] = useState<'text' | 'file'>('text');

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
      let res: Response;
      if (parseTab === 'file') {
        if (!parseFile) {
          setParseError('กรุณาเลือกไฟล์ก่อน');
          return;
        }
        const fd = new FormData();
        fd.append('file', parseFile);
        res = await fetch(`${API_URL}/ai/parse-items/upload`, {
          method: 'POST',
          credentials: 'include',
          body: fd,
        });
      } else {
        res = await fetch(`${API_URL}/ai/parse-items`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'text', content: parseInput }),
        });
      }
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
    setParseFile(null);
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
          projectId: projectId || null,
          budgetSourceId: budgetSourceId || null,
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
    <form onSubmit={onSubmit} className="space-y-5">
      <Card className="p-5">
        <SectionTitle
          icon={<Icon name="FileEdit" className="w-3.5 h-3.5" />}
          title="ข้อมูลคำขอ"
          sub="กรอกชื่อคำขอ โครงการ และเหตุผลความจำเป็น"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="ชื่อคำขอซื้อ" required className="md:col-span-2">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="เช่น จัดซื้อคอมพิวเตอร์ตั้งโต๊ะห้องเรียน ม.6/2"
            />
          </Field>
          <Field
            label="โครงการ"
            hint={projects.length === 0 ? 'รอ Phase 2 เปิด UI ตั้งโครงการ' : 'เลือกได้ภายหลัง'}
          >
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— ยังไม่ระบุ —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `[${p.code}] ` : ''}
                  {p.name} (ปี {p.fiscalYear})
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="แหล่งงบประมาณ"
            hint={budgetSources.length === 0 ? 'รอ Phase 2 เปิด UI ตั้งงบ' : 'เลือกได้ภายหลัง'}
          >
            <Select
              value={budgetSourceId}
              onChange={(e) => setBudgetSourceId(e.target.value)}
            >
              <option value="">— ยังไม่ระบุ —</option>
              {budgetSources.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code ? `[${b.code}] ` : ''}
                  {b.name} · {b.type}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="เหตุผลความจำเป็น"
            required
            hint="AI ช่วยปรับเป็นภาษาราชการได้ใน Phase ถัดไป"
            className="md:col-span-2"
          >
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="ทดแทนเครื่องคอมพิวเตอร์เดิมที่ใช้งานมากว่า 8 ปี เพื่อรองรับการเรียนการสอน..."
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle
          icon={<Icon name="Package" className="w-3.5 h-3.5" />}
          title="รายการพัสดุ"
          sub={`${items.length} รายการ`}
          action={
            <Button type="button" size="sm" variant="outline" icon="Plus" onClick={addItem}>
              เพิ่มแถว
            </Button>
          }
        />

        {/* AI parse panel */}
        <div className="mt-4 rounded-2xl grad-brand-soft border border-brand-100 dark:border-brand-800/40 p-4">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-7 h-7 rounded-lg grad-brand text-white">
              <Icon name="Sparkles" className="w-3.5 h-3.5" strokeWidth={2} />
            </span>
            <div className="text-sm font-semibold text-brand-800 dark:text-brand-100">
              ให้ AI ช่วยแยกรายการ
            </div>
          </div>

          <div className="mt-3">
            <Tabs
              tabs={[
                { value: 'text', label: 'วางข้อความ' },
                { value: 'file', label: 'อัปโหลดไฟล์ (Excel / CSV)' },
              ]}
              value={parseTab}
              onChange={(v) => setParseTab(v as 'text' | 'file')}
            />
          </div>

          {parseTab === 'text' ? (
            <Textarea
              rows={3}
              value={parseInput}
              onChange={(e) => setParseInput(e.target.value)}
              placeholder='เช่น "ปากกาน้ำเงิน 10 ด้าม กระดาษ A4 5 รีม ..."'
              className="mt-3"
            />
          ) : (
            <div className="mt-3">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
                onChange={(e) => setParseFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-ink-700 dark:text-ink-100 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 dark:file:bg-brand-900/40 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand-700 dark:file:text-brand-200 hover:file:bg-brand-200 dark:hover:file:bg-brand-900/60"
              />
              {parseFile && (
                <p className="mt-1.5 text-xs text-ink-500 dark:text-ink-300">
                  ไฟล์: <span className="font-mono">{parseFile.name}</span> ({(parseFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
              <p className="mt-1.5 text-[11px] text-ink-400 dark:text-ink-300">
                รองรับ .xlsx / .xls / .csv / .txt — ไม่เกิน 5MB · AI จะอ่าน sheet แรก
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              icon="Sparkles"
              onClick={callAiParse}
              disabled={parsing || (parseTab === 'text' ? !parseInput : !parseFile)}
            >
              {parsing ? 'กำลังให้ AI ช่วย...' : 'ให้ AI แยกรายการ'}
            </Button>
            <label className="flex items-center gap-1.5 text-[12px] text-ink-600 dark:text-ink-200">
              <input
                type="radio"
                name="parseMode"
                checked={parseMode === 'replace'}
                onChange={() => setParseMode('replace')}
                className="accent-brand-500"
              />
              แทนที่ทั้งหมด
            </label>
            <label className="flex items-center gap-1.5 text-[12px] text-ink-600 dark:text-ink-200">
              <input
                type="radio"
                name="parseMode"
                checked={parseMode === 'append'}
                onChange={() => setParseMode('append')}
                className="accent-brand-500"
              />
              เพิ่มต่อท้าย
            </label>
            {parseError && (
              <span className="text-xs text-rose-600 dark:text-rose-300">{parseError}</span>
            )}
          </div>

          {parsePreview && (
            <Card className="mt-3 p-3">
              <div className="text-xs text-ink-500 dark:text-ink-300">
                AI เสนอ {parsePreview.items.length} รายการ · invocation{' '}
                <code className="font-mono">{parsePreview.invocationId}</code>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {parsePreview.items.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-ink-700 dark:text-ink-100">
                    <span>
                      {p.name} — {p.quantity} {p.unit}
                    </span>
                    <Confidence value={p.confidence} />
                  </li>
                ))}
              </ul>
              {parsePreview.warnings.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-amber-700 dark:text-amber-300">
                  {parsePreview.warnings.map((w, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <Icon name="AlertTriangle" className="w-3 h-3" />
                      {w.message}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  icon="Check"
                  onClick={applyParsed}
                >
                  {parseMode === 'append' ? 'เพิ่มเข้ารายการ' : 'ใช้รายการนี้แทน'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setParsePreview(null)}
                >
                  ยกเลิก
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Items table */}
        <div className="mt-4 overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr className="text-left">
                <th className="font-medium px-2 py-2 w-8">#</th>
                <th className="font-medium px-2 py-2">ชื่อ</th>
                <th className="font-medium px-2 py-2 w-24 text-right">จำนวน</th>
                <th className="font-medium px-2 py-2 w-24">หน่วย</th>
                <th className="font-medium px-2 py-2 w-32 text-right">ราคาประมาณ</th>
                <th className="font-medium px-2 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-2 text-ink-400 dark:text-ink-300 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="px-2 py-2">
                    <TextInput
                      value={it.name}
                      onChange={(e) => updateItem(idx, { name: e.target.value })}
                      required
                    />
                  </td>
                  <td className="px-2 py-2">
                    <TextInput
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                      required
                      className="text-right"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <TextInput
                      value={it.unit}
                      onChange={(e) => updateItem(idx, { unit: e.target.value })}
                      required
                    />
                  </td>
                  <td className="px-2 py-2">
                    <TextInput
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.unitPriceEst ?? ''}
                      onChange={(e) =>
                        updateItem(idx, {
                          unitPriceEst: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="text-right"
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-ink-300 hover:text-rose-500 transition-colors p-1"
                        aria-label="ลบรายการ"
                      >
                        <Icon name="Trash2" className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
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
          {submitting ? 'กำลังบันทึก...' : (submitLabel ?? 'บันทึก')}
        </Button>
      </div>
    </form>
  );
}
