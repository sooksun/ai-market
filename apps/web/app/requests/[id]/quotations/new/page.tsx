import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { QuotationForm } from './quotation-form';

interface PrLite {
  id: string;
  docNo: string | null;
  title: string;
  status: string;
  items: Array<{ id: string; ordinal: number; name: string; quantity: string; unit: string }>;
}

interface VendorLite {
  id: string;
  name: string;
  rating: number | null;
}

const ALLOWED = ['PROCUREMENT', 'ADMIN'];
const COMPARISON_STATUSES = ['APPROVED_FOR_COMPARISON', 'IN_COMPARISON'];

export default async function NewQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect(`/requests/${id}`);
  }
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  let pr: PrLite;
  try {
    pr = await apiFetch<PrLite>(`/purchase-requests/${id}`, { cookie });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  if (!COMPARISON_STATUSES.includes(pr.status)) {
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
                  เพิ่มใบเสนอราคาไม่ได้ในสถานะนี้
                </h1>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-200">
                  เพิ่มได้เฉพาะ PR ใน APPROVED_FOR_COMPARISON หรือ IN_COMPARISON
                  เท่านั้น (ปัจจุบัน: <strong>{pr.status}</strong>)
                </p>
                <Link
                  href={`/requests/${id}` as never}
                  className="mt-3 inline-block text-sm text-brand-600 dark:text-brand-300 hover:underline"
                >
                  ← กลับไปคำขอ
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  const vendors = await apiFetch<VendorLite[]>('/vendors', { cookie });

  return (
    <AppShell user={user}>
      <div className="fade-up max-w-4xl">
        <Link
          href={`/compare?prId=${id}` as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปเปรียบเทียบราคา
        </Link>
        <PageHeader
          eyebrow={`คำขอ ${pr.docNo ?? id}`}
          title="เพิ่มใบเสนอราคา"
          subtitle="กรอกราคาต่อหน่วยของแต่ละรายการ + ระบุค่าส่ง · ระบบจะรวมและเปรียบเทียบให้"
        />

        <QuotationForm
          prId={pr.id}
          items={pr.items.map((it) => ({
            id: it.id,
            ordinal: it.ordinal,
            name: it.name,
            quantity: Number(it.quantity),
            unit: it.unit,
          }))}
          vendors={vendors}
        />
      </div>
    </AppShell>
  );
}
