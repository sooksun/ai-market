'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Field, TextInput, Select } from '@/components/ui/form';
import { Button } from '@/components/ui/button';

const ENTITY_TYPES = ['', 'PurchaseRequest', 'AiInvocation', 'AiRiskFlag', 'RuleConfig'];
const ENTITY_TYPE_LABELS: Record<string, string> = {
  '': 'ทุกประเภท',
  PurchaseRequest: 'คำขอซื้อ',
  AiInvocation: 'การเรียก AI',
  AiRiskFlag: 'risk flag',
  RuleConfig: 'rule config',
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
  'rule_config.create',
  'rule_config.update',
  'rule_config.delete',
  'ai.parse_items',
  'ai.parse_items_upload',
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
  'rule_config.create': 'สร้าง rule config',
  'rule_config.update': 'แก้ rule config',
  'rule_config.delete': 'ลบ rule config',
  'ai.parse_items': 'AI: แยกรายการ',
  'ai.parse_items_upload': 'AI: แยกรายการจากไฟล์',
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
    <Card className="p-4">
      <form onSubmit={apply} className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Field label="ประเภทเป้าหมาย">
          <Select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENTITY_TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="การกระทำ">
          <Select value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] ?? a}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Entity ID">
          <TextInput
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="ck..."
            className="font-mono text-xs"
          />
        </Field>
        <Field label="ตั้งแต่วันที่">
          <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </Field>
        <Field label="ถึงวันที่">
          <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </Field>
        <Field label="ค้นหา">
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นใน action / entity"
          />
        </Field>

        <div className="md:col-span-3 lg:col-span-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={reset} icon="X">
            ล้างตัวกรอง
          </Button>
          <Button type="submit" size="sm" icon="Search">
            ค้นหา
          </Button>
        </div>
      </form>
    </Card>
  );
}
