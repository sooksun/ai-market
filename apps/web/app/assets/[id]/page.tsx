import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import {
  ASSET_STATUS_LABELS_TH,
  type AssetStatus,
} from '@ai-market/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { KV } from '@/components/ui/kv';
import { fmtNum, classNames } from '@/components/ui/format';
import { AssetEditForm } from './edit-form';

interface AssetDetail {
  id: string;
  assetNumber: string;
  name: string;
  category: string | null;
  acquisitionCost: string;
  acquisitionDate: string;
  serialNumber: string | null;
  vendorName: string | null;
  location: string | null;
  custodianId: string | null;
  status: AssetStatus;
  qrCode: string | null;
  purchaseRequestId: string | null;
  notes: string | null;
}

const ALLOWED = ['PROCUREMENT', 'INSPECTOR', 'FINANCE', 'DIRECTOR', 'AUDITOR', 'ADMIN'];

const STATUS_TONE: Record<AssetStatus, string> = {
  ACTIVE: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200',
  STORED: 'bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-200',
  REPAIR: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200',
  DISPOSED: 'bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300',
};

export default async function AssetDetailPage({
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
  let asset: AssetDetail;
  try {
    asset = await apiFetch<AssetDetail>(`/assets/${id}`, {
      cookie: cookieStore.toString(),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const canEdit = user.roles.includes('PROCUREMENT') || user.roles.includes('ADMIN');

  return (
    <AppShell user={user}>
      <div className="fade-up max-w-3xl">
        <Link
          href={'/assets' as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปทะเบียนครุภัณฑ์
        </Link>
        <PageHeader
          eyebrow={`ครุภัณฑ์ · ${asset.assetNumber}`}
          title={asset.name}
          actions={
            <span
              className={classNames(
                'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                STATUS_TONE[asset.status],
              )}
            >
              {ASSET_STATUS_LABELS_TH[asset.status]}
            </span>
          }
        />

        <Card className="p-6">
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <KV k="เลขครุภัณฑ์" v={asset.assetNumber} mono />
            <KV k="ชื่อ" v={asset.name} />
            <KV k="หมวด" v={asset.category ?? '—'} />
            <KV k="มูลค่า" v={`${fmtNum(Number(asset.acquisitionCost))} ฿`} mono />
            <KV
              k="วันที่ได้มา"
              v={new Date(asset.acquisitionDate).toLocaleDateString('th-TH')}
            />
            <KV k="เลข Serial" v={asset.serialNumber ?? '—'} mono />
            <KV k="ผู้ขาย" v={asset.vendorName ?? '—'} />
            <KV k="ที่ตั้ง" v={asset.location ?? '—'} />
            <KV k="ผู้รับผิดชอบ" v={asset.custodianId ?? '—'} mono />
            <KV
              k="คำขอซื้อต้นทาง"
              v={
                asset.purchaseRequestId ? (
                  <Link
                    href={`/requests/${asset.purchaseRequestId}` as never}
                    className="text-brand-600 dark:text-brand-300 hover:underline"
                  >
                    ดูคำขอ
                  </Link>
                ) : (
                  '—'
                )
              }
            />
          </div>
          {asset.notes && (
            <div className="mt-4 rounded-xl bg-ink-50 dark:bg-ink-900/40 p-3 text-sm">
              <span className="font-medium text-ink-700 dark:text-ink-100">หมายเหตุ: </span>
              <span className="text-ink-600 dark:text-ink-200">{asset.notes}</span>
            </div>
          )}
        </Card>

        {canEdit && (
          <AssetEditForm
            id={asset.id}
            initial={{
              location: asset.location,
              custodianId: asset.custodianId,
              status: asset.status,
              notes: asset.notes,
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
