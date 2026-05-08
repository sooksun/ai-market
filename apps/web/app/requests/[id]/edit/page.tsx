import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import {
  PurchaseRequestForm,
  type ItemRow,
} from '@/components/purchase-request-form';
import { PR_STATUS_LABELS_TH, type PurchaseRequestStatus } from '@ai-market/shared';

interface PrDetail {
  id: string;
  docNo: string | null;
  title: string;
  reason: string;
  status: PurchaseRequestStatus;
  requesterId: string;
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

  let pr: PrDetail;
  try {
    pr = await apiFetch<PrDetail>(`/purchase-requests/${id}`, {
      cookie: cookieStore.toString(),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  // Owner-only
  if (pr.requesterId !== user.id) {
    redirect(`/requests/${id}`);
  }

  // Status guard — show informative page if not editable
  if (!EDITABLE_STATUSES.includes(pr.status)) {
    return (
      <AppShell user={user}>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          <h1 className="text-base font-semibold">แก้ไขไม่ได้ในสถานะนี้</h1>
          <p className="mt-1">
            คำขอนี้อยู่ในสถานะ <strong>{PR_STATUS_LABELS_TH[pr.status]}</strong> —
            แก้ไขได้เฉพาะ DRAFT หรือ RETURNED เท่านั้น
          </p>
          <a
            href={`/requests/${id}`}
            className="mt-3 inline-block text-brand-600 hover:underline"
          >
            ← กลับไปดูคำขอ
          </a>
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
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-slate-500">{pr.docNo ?? '— (ยังไม่ได้ส่งเรื่อง)'}</p>
          <h1 className="text-xl font-semibold text-slate-800">แก้ไขคำขอซื้อ</h1>
          <p className="mt-1 text-xs text-slate-500">
            สถานะปัจจุบัน: {PR_STATUS_LABELS_TH[pr.status]}
          </p>
        </div>
      </div>

      {pr.status === 'RETURNED' && (
        <div className="mt-4 rounded-md border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-900">
          คำขอนี้ถูกส่งกลับเพื่อแก้ไข — โปรดดูเหตุผลในแถบ "ความเสี่ยง / ข้อเตือน" ที่หน้าคำขอ
        </div>
      )}

      <div className="mt-6">
        <PurchaseRequestForm
          mode="edit"
          prId={pr.id}
          initial={{ title: pr.title, reason: pr.reason, items }}
          redirectTo={`/requests/${pr.id}`}
          submitLabel="บันทึกการแก้ไข"
        />
      </div>
    </AppShell>
  );
}
