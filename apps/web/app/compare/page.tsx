import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ComparisonClient } from './comparison-client';

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ prId?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();

  if (!params.prId) {
    return (
      <AppShell user={user}>
        <div className="fade-up max-w-xl">
          <PageHeader
            eyebrow="เปรียบเทียบราคา"
            title="เลือกคำขอซื้อก่อน"
            subtitle="เปิดหน้านี้จากปุ่ม 'เปรียบเทียบราคา' ในหน้าคำขอ"
          />
          <Card className="p-6">
            <Link
              href={'/inbox' as never}
              className="inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-300 hover:underline"
            >
              <Icon name="ChevronLeft" className="w-3.5 h-3.5" />
              ไป Inbox พัสดุ
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  const data = await apiFetch<{
    prId: string;
    docNo: string | null;
    title: string;
    status: string;
    items: Array<{
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
    }>;
    quotations: Array<{
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
    }>;
  }>(`/purchase-requests/${params.prId}/comparison`, { cookie });

  const isProcurement =
    user.roles.includes('PROCUREMENT') || user.roles.includes('ADMIN');
  const canSelect =
    isProcurement &&
    (data.status === 'APPROVED_FOR_COMPARISON' || data.status === 'IN_COMPARISON') &&
    data.quotations.some((q) => q.status !== 'SELECTED' && q.status !== 'REJECTED');

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <Link
          href={`/requests/${data.prId}` as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปคำขอ {data.docNo ?? data.title}
        </Link>
        <PageHeader
          eyebrow={`เปรียบเทียบราคา · ${data.docNo ?? 'PR'}`}
          title={data.title}
          subtitle={`${data.items.length} รายการ × ${data.quotations.length} ใบเสนอราคา · ผู้ใช้เป็นผู้ตัดสินใจสุดท้าย`}
          actions={
            isProcurement && (
              <Link
                href={`/requests/${data.prId}/quotations/new` as never}
              >
                <Button icon="Plus">เพิ่มใบเสนอราคา</Button>
              </Link>
            )
          }
        />

        <ComparisonClient data={data} canSelect={canSelect} />
      </div>
    </AppShell>
  );
}
