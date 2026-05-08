import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PR_STATUS_LABELS_TH, type PurchaseRequestStatus } from '@ai-market/shared';
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

  const isOwner = pr.requesterId === user.id;
  const isProcurement = user.roles.includes('PROCUREMENT') || user.roles.includes('ADMIN');
  const canEdit = isOwner && (pr.status === 'DRAFT' || pr.status === 'RETURNED');
  const canViewAudit =
    user.roles.includes('AUDITOR') ||
    user.roles.includes('DIRECTOR') ||
    user.roles.includes('ADMIN');

  return (
    <AppShell user={user}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-slate-500">{pr.docNo ?? '— (ยังไม่ได้ส่งเรื่อง)'}</p>
          <h1 className="text-xl font-semibold text-slate-800">{pr.title}</h1>
          <p className="mt-1 text-xs text-slate-500">
            ผู้ขอ: {pr.requester.fullName} · สร้าง{' '}
            {new Date(pr.createdAt).toLocaleString('th-TH')}
            {pr.submittedAt && (
              <> · ส่งเรื่อง {new Date(pr.submittedAt).toLocaleString('th-TH')}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(pr.status)}`}
          >
            {PR_STATUS_LABELS_TH[pr.status]}
          </span>
          {canEdit && (
            <Link
              href={`/requests/${pr.id}/edit` as never}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
            >
              แก้ไข
            </Link>
          )}
          {canViewAudit && (
            <Link
              href={`/audit-logs?entityType=PurchaseRequest&entityId=${pr.id}` as never}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
            >
              ประวัติ
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700">เหตุผลความจำเป็น</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{pr.reason}</p>
          </section>

          <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <h2 className="border-b border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700">
              รายการพัสดุ ({pr.items.length})
            </h2>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-2">#</th>
                  <th className="px-4 py-2">ชื่อ</th>
                  <th className="w-20 px-4 py-2">จำนวน</th>
                  <th className="w-20 px-4 py-2">หน่วย</th>
                  <th className="w-28 px-4 py-2">ประมาณราคา</th>
                </tr>
              </thead>
              <tbody>
                {pr.items.map((it) => (
                  <tr key={it.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 text-xs text-slate-500">{it.ordinal}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{it.name}</div>
                      {it.notes && <div className="text-xs text-slate-500">{it.notes}</div>}
                      {it.specifications.length > 0 && (
                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-600">
                          {it.specifications.map((s) => (
                            <li key={s.id}>
                              <span className="font-medium">{s.key}:</span> {s.value}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{Number(it.quantity)}</td>
                    <td className="px-4 py-3 text-slate-700">{it.unit}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {it.unitPriceEst ? Number(it.unitPriceEst).toLocaleString('th-TH') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="space-y-6">
          <RiskFlagsPanel
            prId={pr.id}
            flags={pr.riskFlags}
            canDismiss={isProcurement}
            canRecheck={isProcurement}
          />
        </aside>
      </div>

      <PrActions pr={pr} isOwner={isOwner} isProcurement={isProcurement} />
    </AppShell>
  );
}

function statusBadgeClass(status: PurchaseRequestStatus): string {
  if (status === 'DRAFT') return 'bg-slate-100 text-slate-700';
  if (status === 'SUBMITTED') return 'bg-blue-100 text-blue-700';
  if (status === 'REVIEWING') return 'bg-amber-100 text-amber-700';
  if (status === 'RETURNED') return 'bg-red-100 text-red-700';
  if (status === 'APPROVED_FOR_COMPARISON' || status === 'APPROVED' || status === 'CLOSED') {
    return 'bg-green-100 text-green-700';
  }
  if (status === 'REJECTED' || status === 'CANCELLED') return 'bg-slate-200 text-slate-600';
  return 'bg-slate-100 text-slate-700';
}
