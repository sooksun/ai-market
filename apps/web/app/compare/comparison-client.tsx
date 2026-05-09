'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  QUOTATION_STATUS_LABELS_TH,
  SPEC_MATCH_LABELS_TH,
  type QuotationSpecMatch,
  type QuotationStatus,
  type CompareSummaryResponse,
} from '@ai-market/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form';
import { SectionTitle } from '@/components/ui/page-header';
import { Confidence } from '@/components/ui/confidence';
import { Icon } from '@/components/ui/icon';
import { fmtNum, classNames } from '@/components/ui/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

interface ComparisonItem {
  itemId: string;
  ordinal: number;
  name: string;
  unit: string;
  quantity: string;
  unitPriceEst: string | null;
  bestUnitPrice: string | null;
  bestQuotationId: string | null;
  byQuotation: Array<{
    quotationId: string;
    unitPrice: string;
    quantity: string | null;
    specMatch: string;
    specMatchDetail: string | null;
    notes: string | null;
    lineTotal: string;
  }>;
}

interface ComparisonQuotation {
  id: string;
  status: string;
  source: string;
  shippingFee: string;
  itemsTotal: string;
  grandTotal: string;
  fullySpecMatched: boolean;
  vendor: { id: string; name: string; rating: number | null; taxId: string | null };
  selectedAt: string | null;
  selectionReason: string | null;
}

interface Props {
  data: {
    prId: string;
    docNo: string | null;
    title: string;
    status: string;
    items: ComparisonItem[];
    quotations: ComparisonQuotation[];
  };
  canSelect: boolean;
}

const SPEC_MATCH_TONE: Record<string, string> = {
  FULL: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  PARTIAL: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  MISMATCH: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
  UNKNOWN: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-200',
};

export function ComparisonClient({ data, canSelect }: Props) {
  const router = useRouter();
  const [aiResp, setAiResp] = useState<CompareSummaryResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectReason, setSelectReason] = useState('');
  const [selectError, setSelectError] = useState<string | null>(null);
  const [selectBusy, setSelectBusy] = useState(false);

  async function callAi() {
    setAiError(null);
    setAiLoading(true);
    setAiResp(null);
    try {
      const res = await fetch(`${API_URL}/ai/compare-summary`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseRequestId: data.prId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'AI ไม่ตอบ');
      setAiResp(json.data);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setAiLoading(false);
    }
  }

  async function selectQuotation() {
    if (!selectingId || !selectReason.trim()) return;
    setSelectBusy(true);
    setSelectError(null);
    try {
      const res = await fetch(
        `${API_URL}/purchase-requests/${data.prId}/quotations/${selectingId}/select`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: selectReason.trim() }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setSelectError(json?.error?.message ?? `เลือกไม่สำเร็จ (${res.status})`);
        return;
      }
      setSelectingId(null);
      setSelectReason('');
      router.refresh();
    } finally {
      setSelectBusy(false);
    }
  }

  if (data.quotations.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Icon name="Scale" className="mx-auto mb-3 h-10 w-10 text-ink-300 dark:text-ink-500" />
        <p className="text-sm text-ink-500 dark:text-ink-300">
          ยังไม่มีใบเสนอราคา — กดปุ่ม "เพิ่มใบเสนอราคา" ด้านบนเพื่อเริ่ม
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* AI summary card */}
      <Card className="p-5 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full grad-brand-soft blur-3xl pointer-events-none" />
        <div className="relative">
          <SectionTitle
            icon={<Icon name="Sparkles" className="w-3.5 h-3.5" />}
            title="AI สรุปแผนการสั่งซื้อ"
            sub={aiResp ? `recommendation: ${aiResp.comparison.recommendation}` : 'ยังไม่ได้เรียก'}
            action={
              aiResp && <Confidence value={aiResp.confidence} />
            }
          />
          {!aiResp ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={callAi} disabled={aiLoading} icon="Sparkles">
                  {aiLoading ? 'AI กำลังวิเคราะห์...' : 'ให้ AI สรุปและแนะนำ'}
                </Button>
                {aiError && (
                  <span className="text-sm text-rose-600 dark:text-rose-300">{aiError}</span>
                )}
              </div>
              {aiLoading && (
                <div className="grid gap-3 lg:grid-cols-2">
                  <AiSkeletonCard />
                  <AiSkeletonCard />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="grid gap-3 lg:grid-cols-2">
                {aiResp.bestOverall && (
                  <div className="rounded-2xl bg-ink-50/60 dark:bg-ink-900/40 p-4">
                    <div className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-200">
                      ผู้ขายเดียวรวมทุกรายการ
                    </div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-ink-900 dark:text-white">
                      {fmtNum(aiResp.bestOverall.totalAmount)} ฿
                    </div>
                    <p className="mt-1 text-sm text-ink-600 dark:text-ink-200">
                      {aiResp.bestOverall.reason}
                    </p>
                    {aiResp.bestOverall.concerns.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                        {aiResp.bestOverall.concerns.map((c, i) => (
                          <li key={i} className="flex gap-1.5">
                            <Icon name="AlertTriangle" className="w-3 h-3 mt-0.5" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {aiResp.bestPerItem && (
                  <div className="rounded-2xl bg-ink-50/60 dark:bg-ink-900/40 p-4">
                    <div className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-200">
                      แยกซื้อรายผู้ขาย ({aiResp.bestPerItem.vendorCount} ร้าน)
                    </div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-ink-900 dark:text-white">
                      {fmtNum(aiResp.bestPerItem.totalAmount)} ฿
                    </div>
                    {aiResp.bestPerItem.concerns.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                        {aiResp.bestPerItem.concerns.map((c, i) => (
                          <li key={i} className="flex gap-1.5">
                            <Icon name="AlertTriangle" className="w-3 h-3 mt-0.5" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-xl grad-brand-soft border border-brand-100 dark:border-brand-800/40 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-800 dark:text-brand-100">
                  <Icon name="Lightbulb" className="w-4 h-4" />
                  AI แนะนำ:{' '}
                  {aiResp.comparison.recommendation === 'best_overall'
                    ? 'ซื้อจากผู้ขายเดียว'
                    : aiResp.comparison.recommendation === 'best_per_item'
                      ? 'แยกซื้อรายผู้ขาย'
                      : 'ข้อมูลยังไม่พอตัดสิน'}
                </div>
                <p className="mt-1 text-sm text-ink-700 dark:text-ink-100">
                  {aiResp.comparison.rationale}
                </p>
                {aiResp.comparison.savings != null && (
                  <p className="mt-1 text-xs text-ink-500 dark:text-ink-300 tabular-nums">
                    ส่วนต่าง: {fmtNum(aiResp.comparison.savings)} ฿{' '}
                    {aiResp.comparison.savingsPct != null &&
                      `(${aiResp.comparison.savingsPct.toFixed(1)}%)`}
                  </p>
                )}
              </div>
              {aiResp.warnings.length > 0 && (
                <ul className="text-xs space-y-1 text-amber-700 dark:text-amber-300">
                  {aiResp.warnings.map((w, i) => (
                    <li key={i} className="flex gap-1.5">
                      <Icon name="AlertTriangle" className="w-3 h-3 mt-0.5" />
                      {w}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-ink-400 dark:text-ink-300">
                ผู้ใช้เป็นผู้ตัดสินใจสุดท้ายเสมอ · ทุก action ถูกบันทึกใน <code className="font-mono">ai_invocations</code>
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Quotation summary cards */}
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {data.quotations.map((q) => {
          const isBest =
            aiResp?.bestOverall?.quotationId === q.id ||
            data.items.every((it) => it.bestQuotationId === q.id);
          const isSelected = q.status === 'SELECTED';
          return (
            <Card
              key={q.id}
              className={classNames(
                'p-4',
                isSelected && 'ring-2 ring-emerald-500',
                isBest && !isSelected && 'ring-2 ring-brand-400',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink-900 dark:text-white truncate">
                    {q.vendor.name}
                  </div>
                  <div className="text-xs text-ink-500 dark:text-ink-300">{q.source}</div>
                </div>
                <span
                  className={classNames(
                    'shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                    q.status === 'SELECTED'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : q.status === 'REJECTED'
                        ? 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300'
                        : 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
                  )}
                >
                  {QUOTATION_STATUS_LABELS_TH[q.status as QuotationStatus] ?? q.status}
                </span>
              </div>
              <div className="mt-3 flex items-end gap-2">
                <div className="text-2xl font-bold tabular-nums text-ink-900 dark:text-white">
                  {fmtNum(Number(q.grandTotal))}
                </div>
                <div className="text-xs text-ink-400 dark:text-ink-300">บาท · รวมค่าส่ง</div>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-ink-500 dark:text-ink-300">
                <div>รายการ: {fmtNum(Number(q.itemsTotal))}</div>
                <div>ค่าส่ง: {fmtNum(Number(q.shippingFee))}</div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                {q.vendor.rating != null && (
                  <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-200">
                    <Icon name="Star" className="w-3 h-3" />
                    {q.vendor.rating.toFixed(1)}
                  </span>
                )}
                <span
                  className={classNames(
                    'rounded px-1.5 py-0.5',
                    q.fullySpecMatched
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
                  )}
                >
                  {q.fullySpecMatched ? 'สเปกครบ' : 'สเปกไม่ครบ'}
                </span>
              </div>
              {isSelected && q.selectionReason && (
                <p className="mt-2 text-[11px] italic text-emerald-700 dark:text-emerald-200">
                  ✓ เลือกแล้ว — {q.selectionReason}
                </p>
              )}
              {canSelect && q.status !== 'SELECTED' && q.status !== 'REJECTED' && (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  icon="Check"
                  onClick={() => setSelectingId(q.id)}
                  className="mt-3 w-full justify-center"
                >
                  เลือกผู้ขายนี้
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Comparison matrix */}
      <Card className="overflow-hidden">
        <SectionTitle
          icon={<Icon name="Scale" className="w-3.5 h-3.5" />}
          title="ตารางเปรียบเทียบ"
          sub="ราคาต่อหน่วย × จำนวน · ราคาต่ำสุดต่อรายการมีไฮไลต์"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[800px]">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="w-10 px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">รายการ</th>
                <th className="w-20 px-3 py-2 font-medium text-right">จำนวน</th>
                {data.quotations.map((q) => (
                  <th key={q.id} className="px-3 py-2 font-medium min-w-[160px]">
                    <div className="text-ink-700 dark:text-ink-100 normal-case">
                      {q.vendor.name}
                    </div>
                    <div className="text-[10px] text-ink-400 dark:text-ink-300 normal-case">
                      {q.source}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {data.items.map((it) => (
                <tr key={it.itemId}>
                  <td className="px-3 py-3 text-xs text-ink-400 dark:text-ink-300 tabular-nums">
                    {it.ordinal}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-ink-900 dark:text-white">{it.name}</div>
                    <div className="text-[11px] text-ink-400 dark:text-ink-300">
                      {Number(it.quantity)} {it.unit}
                    </div>
                  </td>
                  <td className="px-3 py-3 tabular-nums text-right text-ink-700 dark:text-ink-100">
                    {Number(it.quantity)}
                  </td>
                  {data.quotations.map((q) => {
                    const cell = it.byQuotation.find((bq) => bq.quotationId === q.id);
                    if (!cell) {
                      return (
                        <td
                          key={q.id}
                          className="px-3 py-3 text-center text-ink-300 dark:text-ink-500"
                        >
                          —
                        </td>
                      );
                    }
                    const isBestPrice = it.bestQuotationId === q.id;
                    return (
                      <td
                        key={q.id}
                        className={classNames(
                          'px-3 py-3',
                          isBestPrice &&
                            'bg-emerald-50/60 dark:bg-emerald-900/15',
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="tabular-nums font-medium text-ink-900 dark:text-white">
                            {fmtNum(Number(cell.unitPrice))}
                          </span>
                          {isBestPrice && (
                            <Icon name="TrendingDown" className="w-3 h-3 text-emerald-600" />
                          )}
                        </div>
                        <div className="text-[10px] text-ink-400 dark:text-ink-300 tabular-nums">
                          รวม {fmtNum(Number(cell.lineTotal))}
                        </div>
                        <span
                          className={classNames(
                            'inline-block mt-1 rounded px-1 py-0 text-[9px] font-medium',
                            SPEC_MATCH_TONE[cell.specMatch] ?? SPEC_MATCH_TONE.UNKNOWN,
                          )}
                        >
                          {SPEC_MATCH_LABELS_TH[cell.specMatch as QuotationSpecMatch] ?? cell.specMatch}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-ink-50/40 dark:bg-ink-900/40 font-semibold">
                <td colSpan={3} className="px-3 py-2 text-right text-ink-700 dark:text-ink-100">
                  รวมทั้งสิ้น (รวมค่าส่ง)
                </td>
                {data.quotations.map((q) => (
                  <td
                    key={q.id}
                    className="px-3 py-2 tabular-nums text-ink-900 dark:text-white"
                  >
                    {fmtNum(Number(q.grandTotal))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Select-quotation modal */}
      {selectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-ink-900 dark:text-white">
              เลือกผู้ขายนี้
            </h3>
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">
              ระบุเหตุผล — ใบเสนอราคารายอื่นจะถูกตั้งเป็น REJECTED · PR จะเลื่อนเป็น
              PENDING_APPROVAL
            </p>
            <Textarea
              value={selectReason}
              onChange={(e) => setSelectReason(e.target.value)}
              rows={4}
              className="mt-3"
              placeholder="เช่น ราคาดี สเปกครบ คะแนนร้าน 4.7 มีประวัติส่งดี"
            />
            {selectError && (
              <p className="mt-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 text-sm text-rose-700 dark:text-rose-200">
                {selectError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectingId(null);
                  setSelectReason('');
                }}
              >
                ยกเลิก
              </Button>
              <Button
                size="sm"
                disabled={!selectReason.trim() || selectBusy}
                onClick={selectQuotation}
                icon="Check"
              >
                {selectBusy ? 'กำลังเลือก...' : 'ยืนยันเลือก'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function AiSkeletonCard() {
  return (
    <div className="rounded-2xl bg-ink-50/60 dark:bg-ink-900/40 p-4 animate-pulse">
      <div className="h-3 w-28 rounded bg-ink-200/80 dark:bg-ink-700" />
      <div className="mt-2 h-7 w-40 rounded bg-ink-200/80 dark:bg-ink-700" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-ink-200/60 dark:bg-ink-700/70" />
        <div className="h-3 w-5/6 rounded bg-ink-200/60 dark:bg-ink-700/70" />
        <div className="h-3 w-2/3 rounded bg-ink-200/60 dark:bg-ink-700/70" />
      </div>
    </div>
  );
}
