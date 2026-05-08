'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ENTITY_TYPES = ['', 'PurchaseRequest', 'AiInvocation', 'AiRiskFlag'];
const ENTITY_TYPE_LABELS: Record<string, string> = {
  '': 'ทุกประเภท',
  PurchaseRequest: 'คำขอซื้อ',
  AiInvocation: 'การเรียก AI',
  AiRiskFlag: 'risk flag',
};

const ACTIONS = [
  '',
  'purchase_request.create',
  'purchase_request.update',
  'purchase_request.submit',
  'purchase_request.withdraw',
  'purchase_request.claim',
  'purchase_request.return',
  'purchase_request.approve_for_comparison',
  'purchase_request.dismiss_risk_flag',
  'ai.parse_items',
  'ai.check_cloudiness',
];
const ACTION_LABELS: Record<string, string> = {
  '': 'ทุกการกระทำ',
  'purchase_request.create': 'สร้างคำขอซื้อ',
  'purchase_request.update': 'แก้ไขคำขอซื้อ',
  'purchase_request.submit': 'ส่งเรื่อง',
  'purchase_request.withdraw': 'ถอนเรื่อง',
  'purchase_request.claim': 'รับเรื่องเข้าตรวจ',
  'purchase_request.return': 'ส่งกลับแก้ไข',
  'purchase_request.approve_for_comparison': 'อนุมัติเข้ารอบเปรียบเทียบ',
  'purchase_request.dismiss_risk_flag': 'ปิด risk flag',
  'ai.parse_items': 'AI: แยกรายการ',
  'ai.check_cloudiness': 'AI: ตรวจความคลุมเครือ',
};

interface Initial {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
}

export function AuditLogFilters({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [entityType, setEntityType] = useState(initial.entityType ?? '');
  const [entityId, setEntityId] = useState(initial.entityId ?? '');
  const [action, setAction] = useState(initial.action ?? '');
  const [dateFrom, setDateFrom] = useState(initial.dateFrom?.slice(0, 10) ?? '');
  const [dateTo, setDateTo] = useState(initial.dateTo?.slice(0, 10) ?? '');
  const [q, setQ] = useState(initial.q ?? '');

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (entityType) qs.set('entityType', entityType);
    if (entityId) qs.set('entityId', entityId);
    if (action) qs.set('action', action);
    if (dateFrom) qs.set('dateFrom', new Date(`${dateFrom}T00:00:00`).toISOString());
    if (dateTo) qs.set('dateTo', new Date(`${dateTo}T23:59:59`).toISOString());
    if (q) qs.set('q', q);
    router.push(`/audit-logs?${qs.toString()}` as never);
  }

  function reset() {
    setEntityType('');
    setEntityId('');
    setAction('');
    setDateFrom('');
    setDateTo('');
    setQ('');
    router.push('/audit-logs' as never);
  }

  return (
    <form
      onSubmit={apply}
      className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3 lg:grid-cols-6"
    >
      <label className="text-xs">
        ประเภทเป้าหมาย
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ENTITY_TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs">
        การกระทำ
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        >
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a] ?? a}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs">
        Entity ID
        <input
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          placeholder="ck..."
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 font-mono text-xs"
        />
      </label>

      <label className="text-xs">
        ตั้งแต่วันที่
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </label>

      <label className="text-xs">
        ถึงวันที่
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </label>

      <label className="text-xs">
        ค้นหา
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นใน action / entity"
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </label>

      <div className="md:col-span-3 lg:col-span-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
        >
          ล้างตัวกรอง
        </button>
        <button
          type="submit"
          className="rounded-md bg-brand-500 px-3 py-1 text-xs font-medium text-white hover:bg-brand-600"
        >
          ค้นหา
        </button>
      </div>
    </form>
  );
}
