import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import {
  ASSET_STATUS_LABELS_TH,
  type AssetStatus,
} from '@ai-market/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { fmtNum, classNames } from '@/components/ui/format';

interface AssetRow {
  id: string;
  assetNumber: string;
  name: string;
  category: string | null;
  acquisitionCost: string;
  acquisitionDate: string;
  serialNumber: string | null;
  vendorName: string | null;
  location: string | null;
  status: AssetStatus;
}

const ALLOWED = ['PROCUREMENT', 'INSPECTOR', 'FINANCE', 'DIRECTOR', 'AUDITOR', 'ADMIN'];

const STATUS_TONE: Record<AssetStatus, string> = {
  ACTIVE: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200',
  STORED: 'bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-200',
  REPAIR: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200',
  DISPOSED: 'bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300',
};

export default async function AssetsListPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  const assets = await apiFetch<AssetRow[]>(
    `/assets${qs.toString() ? `?${qs.toString()}` : ''}`,
    { cookie: cookieStore.toString() },
  );

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="ทะเบียนครุภัณฑ์"
          title="ทะเบียนครุภัณฑ์"
          subtitle="ครุภัณฑ์มีเลขประจำต่อชิ้น (auto-generate ตอนตรวจรับเสร็จ) — รับประกัน 1 ครั้งซื้อ → N เลขครุภัณฑ์"
        />

        <form className="mb-4 flex flex-wrap items-center gap-2" action="/assets">
          <div className="relative flex-1 max-w-md">
            <Icon
              name="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 dark:text-ink-300"
            />
            <input
              type="text"
              name="search"
              defaultValue={params.search ?? ''}
              placeholder="ค้นหาตามชื่อ / เลขครุภัณฑ์ / serial..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-ink-900/40 border border-ink-200 dark:border-white/10 text-sm focus:border-brand-400 outline-none"
            />
          </div>
          <select
            name="status"
            defaultValue={params.status ?? ''}
            className="rounded-xl bg-white dark:bg-ink-900/40 border border-ink-200 dark:border-white/10 px-3 py-2 text-sm"
          >
            <option value="">ทุกสถานะ</option>
            {Object.entries(ASSET_STATUS_LABELS_TH).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl grad-brand text-white px-3 py-2 text-sm font-medium"
          >
            กรอง
          </button>
        </form>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="w-36 px-4 py-3 font-medium">เลขครุภัณฑ์</th>
                <th className="px-4 py-3 font-medium">ชื่อ</th>
                <th className="w-32 px-4 py-3 font-medium text-right">มูลค่า</th>
                <th className="w-32 px-4 py-3 font-medium">ได้มาเมื่อ</th>
                <th className="w-32 px-4 py-3 font-medium">สถานะ</th>
                <th className="w-40 px-4 py-3 font-medium">ที่ตั้ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {assets.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center text-ink-400 dark:text-ink-300"
                  >
                    <Icon name="Boxes" className="mx-auto mb-2 h-8 w-8" />
                    ยังไม่มีครุภัณฑ์ในทะเบียน — รับของผ่านขั้นตอนตรวจรับก่อน
                  </td>
                </tr>
              )}
              {assets.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-mono text-xs text-ink-700 dark:text-ink-100">
                    <Link
                      href={`/assets/${a.id}` as never}
                      className="hover:text-brand-600 dark:hover:text-brand-300"
                    >
                      {a.assetNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900 dark:text-white">{a.name}</div>
                    {a.serialNumber && (
                      <div className="text-[10px] font-mono text-ink-400 dark:text-ink-300">
                        SN: {a.serialNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-right text-ink-700 dark:text-ink-100">
                    {fmtNum(Number(a.acquisitionCost))}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-500 dark:text-ink-300 tabular-nums">
                    {new Date(a.acquisitionDate).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={classNames(
                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                        STATUS_TONE[a.status],
                      )}
                    >
                      {ASSET_STATUS_LABELS_TH[a.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-700 dark:text-ink-100">
                    {a.location ?? '—'}
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
