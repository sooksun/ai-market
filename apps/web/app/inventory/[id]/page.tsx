import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import {
  STOCK_MOVEMENT_LABELS_TH,
  type StockMovementType,
} from '@ai-market/shared';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { fmtNum, classNames } from '@/components/ui/format';
import { IssueOutButton } from './issue-out-button';

interface MovementRow {
  id: string;
  type: StockMovementType;
  quantity: string;
  refType: string | null;
  refId: string | null;
  unitCost: string | null;
  notes: string | null;
  createdAt: string;
  createdById: string | null;
}

interface InventoryDetail {
  id: string;
  name: string;
  unit: string;
  category: string | null;
  currentQty: string;
  reorderPoint: string | null;
  notes: string | null;
  updatedAt: string;
  movements: MovementRow[];
}

const ALLOWED = ['PROCUREMENT', 'INSPECTOR', 'FINANCE', 'DIRECTOR', 'AUDITOR', 'ADMIN'];

const TYPE_TONE: Record<StockMovementType, string> = {
  IN: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200',
  OUT: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200',
  ADJUST: 'bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-200',
  WRITE_OFF: 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200',
};

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  let item: InventoryDetail;
  try {
    item = await apiFetch<InventoryDetail>(`/inventory/${id}`, {
      cookie: cookieStore.toString(),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const canIssue =
    user.roles.includes('PROCUREMENT') || user.roles.includes('ADMIN');

  return (
    <AppShell user={user}>
      <div className="fade-up max-w-4xl">
        <Link
          href={'/inventory' as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปคลังพัสดุ
        </Link>
        <PageHeader
          eyebrow={`วัสดุ · ${item.unit}`}
          title={item.name}
          subtitle={item.category ?? undefined}
          actions={
            canIssue && <IssueOutButton id={item.id} currentQty={Number(item.currentQty)} />
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <div className="text-xs uppercase text-ink-400 dark:text-ink-300">คงเหลือ</div>
            <div className="mt-1 text-3xl font-bold tabular-nums text-ink-900 dark:text-white">
              {fmtNum(Number(item.currentQty))}
            </div>
            <div className="text-xs text-ink-500 dark:text-ink-300">{item.unit}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase text-ink-400 dark:text-ink-300">จุดสั่งซื้อ</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-ink-900 dark:text-white">
              {item.reorderPoint != null ? fmtNum(Number(item.reorderPoint)) : '—'}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase text-ink-400 dark:text-ink-300">อัปเดตล่าสุด</div>
            <div className="mt-1 text-sm text-ink-700 dark:text-ink-100 tabular-nums">
              {new Date(item.updatedAt).toLocaleString('th-TH')}
            </div>
          </Card>
        </div>

        <Card className="mt-5 overflow-hidden">
          <SectionTitle
            icon={<Icon name="Activity" className="w-3.5 h-3.5" />}
            title="ประวัติการเคลื่อนไหว"
            sub={`${item.movements.length} รายการล่าสุด`}
          />
          <table className="w-full text-sm mt-2">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="px-4 py-2 w-44 font-medium">เวลา</th>
                <th className="px-4 py-2 w-28 font-medium">ประเภท</th>
                <th className="px-4 py-2 w-28 font-medium text-right">จำนวน</th>
                <th className="px-4 py-2 w-32 font-medium text-right">ราคา/หน่วย</th>
                <th className="px-4 py-2 font-medium">อ้างอิง / หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {item.movements.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-ink-400 dark:text-ink-300"
                  >
                    ยังไม่มีการเคลื่อนไหว
                  </td>
                </tr>
              )}
              {item.movements.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-xs text-ink-500 dark:text-ink-300 tabular-nums">
                    {new Date(m.createdAt).toLocaleString('th-TH')}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={classNames(
                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                        TYPE_TONE[m.type],
                      )}
                    >
                      {STOCK_MOVEMENT_LABELS_TH[m.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2 tabular-nums text-right font-medium text-ink-900 dark:text-white">
                    {m.type === 'IN'
                      ? `+${fmtNum(Number(m.quantity))}`
                      : `-${fmtNum(Number(m.quantity))}`}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-right text-ink-700 dark:text-ink-100">
                    {m.unitCost ? fmtNum(Number(m.unitCost)) : '—'}
                  </td>
                  <td className="px-4 py-2 text-ink-700 dark:text-ink-100">
                    {m.notes ?? (m.refType ? <code className="font-mono text-xs">{m.refType}#{m.refId?.slice(0, 8)}</code> : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </AppShell>
  );
}
