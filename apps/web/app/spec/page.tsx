import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { SpecHelperClient } from './spec-helper-client';

interface PrItemMin {
  id: string;
  name: string;
  unit: string;
  quantity: string;
  notes: string | null;
  specifications: Array<{ id: string; key: string; value: string; level: string; source: string }>;
}

interface PrMin {
  id: string;
  docNo: string | null;
  title: string;
  requesterId: string;
  status: string;
  items: PrItemMin[];
}

export default async function SpecHelperPage({
  searchParams,
}: {
  searchParams: Promise<{ prId?: string; itemId?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const cookieStore = await cookies();

  if (!params.prId) {
    return (
      <AppShell user={user}>
        <div className="fade-up max-w-xl">
          <PageHeader
            eyebrow="ตัวช่วย AI"
            title="ช่วยเขียนสเปก"
            subtitle="เลือกคำขอและรายการพัสดุก่อน"
          />
          <Card className="p-6">
            <p className="text-sm text-ink-600 dark:text-ink-200">
              เปิดหน้าคำขอซื้อก่อน แล้วกดปุ่ม
              <span className="mx-1 inline-flex items-center gap-1 rounded-md grad-brand text-white px-2 py-0.5 text-[11px] font-bold">
                <Icon name="Sparkles" className="w-3 h-3" />
                AI
              </span>
              ที่รายการที่ต้องการให้ AI ช่วย
            </p>
            <Link
              href={'/requests' as never}
              className="mt-3 inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-300 hover:underline"
            >
              <Icon name="ChevronLeft" className="w-3.5 h-3.5" />
              ไปที่รายการคำขอซื้อ
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  const pr = await apiFetch<PrMin>(`/purchase-requests/${params.prId}`, {
    cookie: cookieStore.toString(),
  });

  const item = params.itemId
    ? pr.items.find((it) => it.id === params.itemId)
    : pr.items[0];

  if (!item) {
    redirect(`/requests/${pr.id}`);
  }

  const isOwner = pr.requesterId === user.id;
  const isProcurement =
    user.roles.includes('PROCUREMENT') || user.roles.includes('ADMIN');
  const canEdit =
    isProcurement || (isOwner && (pr.status === 'DRAFT' || pr.status === 'RETURNED'));

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <Link
          href={`/requests/${pr.id}` as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปคำขอ {pr.docNo ?? pr.title}
        </Link>
        <PageHeader
          eyebrow={`ตัวช่วย AI · ${pr.docNo ?? 'PR'}`}
          title="ช่วยเขียนสเปก (AI Specification Helper)"
          subtitle="AI เขียนสเปกเป็นกลาง วัดได้ ไม่ระบุยี่ห้อ + ตรวจคำเสี่ยงและเสนอเกณฑ์ตรวจรับ — ผู้ใช้ตัดสินใจสุดท้าย"
        />

        <SpecHelperClient
          prId={pr.id}
          itemId={item.id}
          itemName={item.name}
          itemUnit={item.unit}
          itemQuantity={item.quantity}
          existingSpecs={item.specifications.map((s) => ({
            key: s.key,
            value: s.value,
            level: s.level as 'MUST_HAVE' | 'NICE_TO_HAVE' | 'INFO',
            source: s.source as 'HUMAN' | 'AI',
          }))}
          itemNotes={item.notes ?? ''}
          canEdit={canEdit}
        />
      </div>
    </AppShell>
  );
}
