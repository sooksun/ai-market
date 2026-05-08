'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SPEC_TONE_LABELS_TH,
  type SpecTone,
  type SpecWriterResponse,
  type SpecWriterRisk,
  type SpecWriterSpec,
} from '@ai-market/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, TextInput, Textarea, Select } from '@/components/ui/form';
import { SectionTitle } from '@/components/ui/page-header';
import { Confidence } from '@/components/ui/confidence';
import { RiskBadge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Tabs } from '@/components/ui/tabs';
import { classNames } from '@/components/ui/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

const LEVEL_LABELS: Record<'MUST_HAVE' | 'NICE_TO_HAVE' | 'INFO', string> = {
  MUST_HAVE: 'จำเป็น',
  NICE_TO_HAVE: 'น่ามี',
  INFO: 'หมายเหตุ',
};

interface SpecRow {
  key: string;
  value: string;
  level: 'MUST_HAVE' | 'NICE_TO_HAVE' | 'INFO';
  source: 'HUMAN' | 'AI';
}

interface SpecHelperClientProps {
  prId: string;
  itemId: string;
  itemName: string;
  itemUnit: string;
  itemQuantity: string;
  itemNotes: string;
  existingSpecs: SpecRow[];
  canEdit: boolean;
}

export function SpecHelperClient({
  prId,
  itemId,
  itemName,
  itemUnit,
  itemQuantity,
  itemNotes,
  existingSpecs,
  canEdit,
}: SpecHelperClientProps) {
  const router = useRouter();
  const [tone, setTone] = useState<SpecTone>('balanced');
  const [rawSpec, setRawSpec] = useState(
    existingSpecs.map((s) => `${s.key}: ${s.value}`).join('\n') || itemNotes,
  );
  const [working, setWorking] = useState<SpecRow[]>(existingSpecs);
  const [aiResp, setAiResp] = useState<SpecWriterResponse | null>(null);
  const [calling, setCalling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function callAi() {
    setError(null);
    setCalling(true);
    setAiResp(null);
    try {
      const res = await fetch(`${API_URL}/ai/spec-writer`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          tone,
          rawSpec: rawSpec.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'AI ไม่ตอบ');
      setAiResp(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setCalling(false);
    }
  }

  function applyAiSpec(s: SpecWriterSpec) {
    setWorking((prev) => {
      const next = [...prev];
      const idx = next.findIndex(
        (x) => x.key.trim().toLowerCase() === s.key.trim().toLowerCase(),
      );
      if (idx >= 0) {
        next[idx] = { ...s, source: 'AI' };
      } else {
        next.push({ ...s, source: 'AI' });
      }
      return next;
    });
  }

  function applyAllAi() {
    if (!aiResp) return;
    const merged: SpecRow[] = aiResp.specifications.map((s) => ({
      ...s,
      source: 'AI' as const,
    }));
    setWorking(merged);
  }

  function updateWorking(idx: number, patch: Partial<SpecRow>) {
    setWorking((prev) => prev.map((w, i) => (i === idx ? { ...w, ...patch } : w)));
  }

  function removeWorking(idx: number) {
    setWorking((prev) => prev.filter((_, i) => i !== idx));
  }

  function addEmpty() {
    setWorking((prev) => [
      ...prev,
      { key: '', value: '', level: 'MUST_HAVE', source: 'HUMAN' },
    ]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/purchase-requests/${prId}/items/${itemId}/specifications`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            specifications: working
              .filter((w) => w.key.trim() && w.value.trim())
              .map((w) => ({
                key: w.key.trim(),
                value: w.value.trim(),
                level: w.level,
                source: w.source,
              })),
          }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? `บันทึกไม่สำเร็จ (${res.status})`);
        return;
      }
      router.push(`/requests/${prId}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionTitle
          icon={<Icon name="Package" className="w-3.5 h-3.5" />}
          title={itemName}
          sub={`จำนวน ${Number(itemQuantity)} ${itemUnit}`}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="โทนการเขียน" hint="กระทบความเข้มงวดของสเปก">
            <Select value={tone} onChange={(e) => setTone(e.target.value as SpecTone)}>
              {(['balanced', 'strict', 'minimal'] as SpecTone[]).map((t) => (
                <option key={t} value={t}>
                  {SPEC_TONE_LABELS_TH[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="สเปกต้นฉบับ (raw)"
            hint="ปล่อยว่างเพื่อใช้สเปก/หมายเหตุปัจจุบัน"
            className="md:col-span-2"
          >
            <Textarea
              rows={3}
              value={rawSpec}
              onChange={(e) => setRawSpec(e.target.value)}
              placeholder="เช่น Intel Core i5 RAM 16GB SSD 512GB จอ 24 นิ้ว Windows 11 Pro"
              className="font-mono text-xs"
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={callAi} disabled={calling} icon="Sparkles">
            {calling ? 'AI กำลังเขียน...' : 'ให้ AI เขียนสเปกใหม่'}
          </Button>
          {aiResp && (
            <Button variant="soft" onClick={applyAllAi} icon="CheckCheck">
              ใช้สเปกที่ AI เสนอทั้งหมด
            </Button>
          )}
          {error && (
            <span className="text-sm text-rose-600 dark:text-rose-300 self-center">
              {error}
            </span>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5">
          <SectionTitle
            icon={<Icon name="FileEdit" className="w-3.5 h-3.5" />}
            title="สเปกที่จะใช้จริง"
            sub={`${working.length} ข้อ — แก้ได้ก่อนบันทึก`}
            action={
              canEdit && (
                <Button type="button" size="sm" variant="outline" icon="Plus" onClick={addEmpty}>
                  เพิ่มข้อ
                </Button>
              )
            }
          />
          {working.length === 0 ? (
            <p className="mt-3 text-sm text-ink-400 dark:text-ink-300">
              ยังไม่มีสเปก — กดปุ่ม AI ด้านบนเพื่อให้ AI ช่วย
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {working.map((w, idx) => (
                <li
                  key={idx}
                  className="rounded-xl border border-ink-100 dark:border-white/5 p-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={classNames(
                        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                        w.source === 'AI'
                          ? 'grad-brand text-white'
                          : 'bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-200',
                      )}
                    >
                      {w.source === 'AI' && <Icon name="Sparkles" className="w-2.5 h-2.5" />}
                      {w.source}
                    </span>
                    <Select
                      value={w.level}
                      onChange={(e) =>
                        updateWorking(idx, {
                          level: e.target.value as SpecRow['level'],
                        })
                      }
                      disabled={!canEdit}
                      className="!w-auto !py-1 !text-[11px]"
                    >
                      {(['MUST_HAVE', 'NICE_TO_HAVE', 'INFO'] as const).map((l) => (
                        <option key={l} value={l}>
                          {LEVEL_LABELS[l]}
                        </option>
                      ))}
                    </Select>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => removeWorking(idx)}
                        className="text-ink-300 hover:text-rose-500"
                        aria-label="ลบ"
                      >
                        <Icon name="Trash2" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Field label="หัวข้อ">
                    <TextInput
                      value={w.key}
                      onChange={(e) => updateWorking(idx, { key: e.target.value })}
                      disabled={!canEdit}
                      className="font-mono text-xs"
                    />
                  </Field>
                  <div className="mt-2">
                    <Field label="ค่า">
                      <Textarea
                        rows={2}
                        value={w.value}
                        onChange={(e) => updateWorking(idx, { value: e.target.value })}
                        disabled={!canEdit}
                        className="text-xs"
                      />
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full grad-brand-soft blur-3xl pointer-events-none" />
          <div className="relative">
            <SectionTitle
              icon={<Icon name="Sparkles" className="w-3.5 h-3.5" />}
              title="สเปกที่ AI เสนอ"
              sub={aiResp ? `tone: ${SPEC_TONE_LABELS_TH[aiResp.tone]}` : 'ยังไม่ได้เรียก AI'}
              action={aiResp && <Confidence value={aiResp.confidence} />}
            />
            {!aiResp ? (
              <p className="mt-3 text-sm text-ink-400 dark:text-ink-300">
                กดปุ่ม "ให้ AI เขียนสเปกใหม่" ด้านบน
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {aiResp.specifications.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-xl bg-ink-50/60 dark:bg-ink-900/40 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-ink-500 dark:text-ink-300">
                        {s.key}
                      </span>
                      <span
                        className={classNames(
                          'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                          s.level === 'MUST_HAVE'
                            ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200'
                            : 'bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-200',
                        )}
                      >
                        {LEVEL_LABELS[s.level]}
                      </span>
                    </div>
                    <p className="mt-1 text-ink-800 dark:text-ink-100 leading-relaxed">
                      {s.value}
                    </p>
                    {canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        variant="soft"
                        icon="Check"
                        onClick={() => applyAiSpec(s)}
                        className="mt-2"
                      >
                        ใช้ข้อนี้
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle
            icon={<Icon name="ShieldAlert" className="w-3.5 h-3.5" />}
            title="ความเสี่ยง / ข้อเสนอแนะ"
            sub={aiResp ? `${aiResp.risks.length} รายการ` : '—'}
          />
          {!aiResp ? (
            <p className="mt-3 text-sm text-ink-400 dark:text-ink-300">รอผล AI</p>
          ) : aiResp.risks.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
              <Icon name="ShieldCheck" className="w-4 h-4" />
              ไม่พบความเสี่ยงที่ต้องแก้
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {aiResp.risks.map((r, i) => (
                <RiskItem key={i} risk={r} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      {canEdit && (
        <div className="sticky bottom-4 mt-2 rounded-2xl bg-white/90 dark:bg-ink-800/90 backdrop-blur-md border border-ink-100 dark:border-white/5 shadow-pop px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-ink-500 dark:text-ink-300">
              {working.length} ข้อ ·{' '}
              {working.filter((w) => w.source === 'AI').length} ข้อจาก AI
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push(`/requests/${prId}`)}
              >
                ยกเลิก
              </Button>
              <Button type="button" icon="Save" onClick={save} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกสเปก'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskItem({ risk }: { risk: SpecWriterRisk }) {
  const sevKey =
    risk.severity === 'HIGH' ? 'high' : risk.severity === 'MEDIUM' ? 'medium' : 'low';
  return (
    <li className="rounded-xl border border-ink-100 dark:border-white/5 p-3">
      <div className="flex items-center gap-2 mb-1">
        <RiskBadge level={sevKey} />
        <div className="text-sm font-medium text-ink-900 dark:text-white">{risk.type}</div>
      </div>
      <p className="text-[13px] text-ink-700 dark:text-ink-100 leading-relaxed">
        {risk.message}
      </p>
      {risk.suggestion && (
        <p className="mt-1 text-[12px] italic text-ink-500 dark:text-ink-300">
          💡 {risk.suggestion}
        </p>
      )}
    </li>
  );
}
