import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { type PurchaseRequestStatus } from '@ai-market/shared';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { fmtNum } from '@/components/ui/format';
import { PrActions } from './actions';
import { RiskFlagsPanel } from './risk-flags';

interface PrDetail {
  id: string;
  schoolId: string;
  docNo: string | null;
  title: string;
  reason: string;
  status: PurchaseRequestStatus;
  requesterId: string;
  totalAmount: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requester: { id: string; fullName: string; email: string };
  project: { id: string; code: string | null; name: string; fiscalYear: number } | null;
  budgetSource: {
    id: string;
    code: string | null;
    name: string;
    type: string;
    fiscalYear: number;
  } | null;
  items: Array<{
    id: string;
    ordinal: number;
    name: string;
    quantity: string;
    unit: string;
    unitPriceEst: string | null;
    classifiedType: string;
    notes: string | null;
    specifications: Array<{
      id: string;
      key: string;
      value: string;
      level: string;
      source: string;
    }>;
  }>;
  riskFlags: Array<{
    id: string;
    itemId: string | null;
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
    detail: { suggestion?: string } | null;
    modelVersion: string | null;
    invocationId: string | null;
    dismissedAt: string | null;
    dismissedReason: string | null;
    createdAt: string;
  }>;
}

const STATUS_TO_BADGE: Record<PurchaseRequestStatus, string> = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REVIEWING: 'reviewing',
  RETURNED: 'returned',
  APPROVED_FOR_COMPARISON: 'approved',
  IN_COMPARISON: 'reviewing',
  PENDING_APPROVAL: 'reviewing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  IN_RECEIVING: 'reviewing',
  RECEIVED: 'completed',
  CLOSED: 'completed',
  CANCELLED: 'rejected',
};

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const cookieStore = await cookies();

  let pr: PrDetail;
  try {
    pr = await apiFetch<PrDetail>(`/purchase-requests/${id}`, {
      cookie: cookieStore.toString(),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const tStatus = await getTranslations('prStatus');

  const isOwner = pr.requesterId === user.id;
  const isProcurement = user.roles.includes('PROCUREMENT') || user.roles.includes('ADMIN');
  const canEdit = isOwner && (pr.status === 'DRAFT' || pr.status === 'RETURNED');
  const canViewAudit =
    user.roles.includes('AUDITOR') ||
    user.roles.includes('DIRECTOR') ||
    user.roles.includes('ADMIN');

  const totalEst = pr.items.reduce((sum, it) => {
    const q = Number(it.quantity);
    const p = it.unitPriceEst != null ? Number(it.unitPriceEst) : 0;
    return sum + q * p;
  }, 0);

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow={`คำขอซื้อ · ${pr.docNo ?? 'ยังไม่ได้ส่งเรื่อง'}`}
          title={pr.title}
          subtitle={
            <>
              ผู้ขอ: {pr.requester.fullName} · สร้าง {new Date(pr.createdAt).toLocaleString('th-TH')}
              {pr.submittedAt && (
                <> · ส่งเรื่อง {new Date(pr.submittedAt).toLocaleString('th-TH')}</>
              )}
            </>
          }
          actions={
            <>
              <StatusBadge status={STATUS_TO_BADGE[pr.status]!} label={tStatus(pr.status)} />
              {canEdit && (
                <Link href={`/requests/${pr.id}/edit` as never}>
                  <Button variant="outline" size="sm" icon="Pencil">
                    แก้ไข
                  </Button>
                </Link>
              )}
              {canViewAudit && (
                <Link
                  href={
                    `/audit-logs?entityType=PurchaseRequest&entityId=${pr.id}` as never
                  }
                >
                  <Button variant="outline" size="sm" icon="History">
                    ประวัติ
                  </Button>
                </Link>
              )}
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1'}/purchase-requests/${pr.id}/export.xlsx`}
              >
                <Button variant="outline" size="sm" icon="FileSpreadsheet">
                  Excel
                </Button>
              </a>
              <Link href={`/requests/${pr.id}/print` as never} target="_blank">
                <Button variant="outline" size="sm" icon="Printer">
                  พิมพ์ / PDF
                </Button>
              </Link>
            </>
          }
        />

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Card className="p-5">
              <SectionTitle
                icon={<Icon name="MessageSquare" className="w-3.5 h-3.5" />}
                title="เหตุผลความจำเป็น"
              />
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700 dark:text-ink-100">
                {pr.reason}
              </p>
            </Card>

            <Card className="p-5">
              <SectionTitle
                icon={<Icon name="Wallet" className="w-3.5 h-3.5" />}
                title="โครงการ / แหล่งงบ"
                sub="Phase 1 placeholder · Phase 2 จะเพิ่มข้อมูลงบคงเหลือ"
              />
              <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-ink-500 dark:text-ink-300">โครงการ</dt>
                  <dd className="mt-0.5 text-ink-900 dark:text-white">
                    {pr.project ? (
                      <>
                        {pr.project.code && (
                          <span className="font-mono text-xs text-ink-400 dark:text-ink-300">
                            [{pr.project.code}]{' '}
                          </span>
                        )}
                        {pr.project.name}
                        <span className="ml-1 text-xs text-ink-400 dark:text-ink-300">
                          (ปี {pr.project.fiscalYear})
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-400 dark:text-ink-300">— ยังไม่ระบุ —</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-500 dark:text-ink-300">แหล่งงบ</dt>
                  <dd className="mt-0.5 text-ink-900 dark:text-white">
                    {pr.budgetSource ? (
                      <>
                        {pr.budgetSource.code && (
                          <span className="font-mono text-xs text-ink-400 dark:text-ink-300">
                            [{pr.budgetSource.code}]{' '}
                          </span>
                        )}
                        {pr.budgetSource.name}
                        <span className="ml-1 text-xs text-ink-400 dark:text-ink-300">
                          · {pr.budgetSource.type}
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-400 dark:text-ink-300">— ยังไม่ระบุ —</span>
                    )}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card className="overflow-hidden">
              <SectionTitle
                icon={<Icon name="Package" className="w-3.5 h-3.5" />}
                title={`รายการพัสดุ (${pr.items.length})`}
                sub={
                  totalEst > 0
                    ? `ประมาณการรวม ${fmtNum(totalEst)} บาท`
                    : 'ยังไม่ได้ระบุราคาประมาณ'
                }
              />
              <table className="w-full text-sm">
                <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
                  <tr>
                    <th className="w-10 px-4 py-2 font-medium">#</th>
                    <th className="px-4 py-2 font-medium">รายการ</th>
                    <th className="w-20 px-4 py-2 font-medium text-right">จำนวน</th>
                    <th className="w-20 px-4 py-2 font-medium">หน่วย</th>
                    <th className="w-32 px-4 py-2 font-medium text-right">ราคาประมาณ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-white/5">
                  {pr.items.map((it) => (
                    <tr key={it.id} className="align-top">
                      <td className="px-4 py-3 text-xs text-ink-400 dark:text-ink-300 tabular-nums">
                        {it.ordinal}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-900 dark:text-white">{it.name}</div>
                        {it.notes && (
                          <div className="text-xs text-ink-400 dark:text-ink-300">{it.notes}</div>
                        )}
                        {it.specifications.length > 0 && (
                          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-600 dark:text-ink-200">
                            {it.specifications.map((s) => (
                              <li key={s.id}>
                                <span className="font-medium">{s.key}:</span> {s.value}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-right text-ink-700 dark:text-ink-100">
                        {Number(it.quantity)}
                      </td>
                      <td className="px-4 py-3 text-ink-700 dark:text-ink-100">{it.unit}</td>
                      <td className="px-4 py-3 tabular-nums text-right text-ink-700 dark:text-ink-100">
                        {it.unitPriceEst
                          ? Number(it.unitPriceEst).toLocaleString('th-TH')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <aside className="space-y-5">
            <RiskFlagsPanel
              prId={pr.id}
              flags={pr.riskFlags}
              canDismiss={isProcurement}
              canRecheck={isProcurement}
            />
          </aside>
        </div>

        <PrActions pr={pr} isOwner={isOwner} isProcurement={isProcurement} />
      </div>
    </AppShell>
  );
}
