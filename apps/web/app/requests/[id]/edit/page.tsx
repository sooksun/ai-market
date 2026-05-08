import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import {
  PurchaseRequestForm,
  type ItemRow,
  type BudgetSummary,
} from '@/components/purchase-request-form';
import {
  type BudgetSourceSummary,
  type ProjectSummary,
  type PurchaseRequestStatus,
} from '@ai-market/shared';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';

interface PrDetail {
  id: string;
  docNo: string | null;
  title: string;
  reason: string;
  status: PurchaseRequestStatus;
  requesterId: string;
  projectId: string | null;
  budgetSourceId: string | null;
  items: Array<{
    ordinal: number;
    name: string;
    quantity: string;
    unit: string;
    unitPriceEst: string | null;
    rawText: string | null;
    notes: string | null;
  }>;
}

const EDITABLE_STATUSES: PurchaseRequestStatus[] = ['DRAFT', 'RETURNED'];

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  let pr: PrDetail;
  try {
    pr = await apiFetch<PrDetail>(`/purchase-requests/${id}`, { cookie });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const [projects, budgetSources, budgets] = await Promise.all([
    apiFetch<ProjectSummary[]>('/projects', { cookie }),
    apiFetch<BudgetSourceSummary[]>('/budget-sources', { cookie }),
    apiFetch<BudgetSummary[]>('/budgets', { cookie }),
  ]);
  const tStatus = await getTranslations('prStatus');

  if (pr.requesterId !== user.id) {
    redirect(`/requests/${id}`);
  }

  if (!EDITABLE_STATUSES.includes(pr.status)) {
    return (
      <AppShell user={user}>
        <div className="fade-up max-w-xl">
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200">
                <Icon name="AlertTriangle" className="w-4 h-4" />
              </span>
              <div>
                <h1 className="text-base font-semibold text-ink-900 dark:text-white">
                  แก้ไขไม่ได้ในสถานะนี้
                </h1>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-200">
                  คำขอนี้อยู่ในสถานะ <strong>{tStatus(pr.status)}</strong> —
                  แก้ไขได้เฉพาะ DRAFT หรือ RETURNED เท่านั้น
                </p>
                <Link
                  href={`/requests/${id}` as never}
                  className="mt-3 inline-block text-sm text-brand-600 dark:text-brand-300 hover:underline"
                >
                  ← กลับไปดูคำขอ
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  const items: ItemRow[] = pr.items.map((it) => ({
    name: it.name,
    quantity: Number(it.quantity),
    unit: it.unit,
    unitPriceEst: it.unitPriceEst != null ? Number(it.unitPriceEst) : undefined,
    rawText: it.rawText ?? undefined,
    notes: it.notes ?? undefined,
  }));

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow={`คำขอซื้อ · ${pr.docNo ?? 'ยังไม่ได้ส่งเรื่อง'}`}
          title="แก้ไขคำขอซื้อ"
          subtitle={`สถานะปัจจุบัน: ${tStatus(pr.status)}`}
        />

        {pr.status === 'RETURNED' && (
          <div className="mb-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 ring-1 ring-rose-200/60 dark:ring-rose-700/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-200 flex items-start gap-3">
            <Icon name="MessageSquareWarning" className="w-4 h-4 mt-0.5" />
            <p>
              คำขอนี้ถูกส่งกลับเพื่อแก้ไข — โปรดดูเหตุผลในแถบ "ความเสี่ยง / ข้อเตือน" ที่หน้าคำขอ
            </p>
          </div>
        )}

        <PurchaseRequestForm
          mode="edit"
          prId={pr.id}
          initial={{
            title: pr.title,
            reason: pr.reason,
            projectId: pr.projectId,
            budgetSourceId: pr.budgetSourceId,
            items,
          }}
          projects={projects}
          budgetSources={budgetSources}
          budgets={budgets}
          redirectTo={`/requests/${pr.id}`}
          submitLabel="บันทึกการแก้ไข"
        />
      </div>
    </AppShell>
  );
}
