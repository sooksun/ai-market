import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import {
  PR_STATUS_LABELS_TH,
  type PurchaseRequestStatus,
} from '@ai-market/shared';

interface PrListItem {
  id: string;
  docNo: string | null;
  title: string;
  status: PurchaseRequestStatus;
  createdAt: string;
  submittedAt: string | null;
  requester: { id: string; fullName: string };
  _count: { items: number; riskFlags: number };
}

interface PrListResponse {
  data: PrListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

const TABS: Array<{ key: PurchaseRequestStatus; label: string }> = [
  { key: 'SUBMITTED', label: 'รอตรวจ' },
  { key: 'REVIEWING', label: 'กำลังตรวจ' },
  { key: 'RETURNED', label: 'ส่งกลับแล้ว' },
  { key: 'APPROVED_FOR_COMPARISON', label: 'อนุมัติเข้ารอบเปรียบเทียบ' },
];

const ELEVATED_ROLES: Array<'PROCUREMENT' | 'ADMIN' | 'DIRECTOR'> = [
  'PROCUREMENT',
  'ADMIN',
  'DIRECTOR',
];

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();

  if (!user.roles.some((r) => ELEVATED_ROLES.includes(r as never))) {
    redirect('/requests');
  }

  const activeStatus =
    (TABS.find((t) => t.key === params.status)?.key ?? TABS[0]!.key) as PurchaseRequestStatus;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  // Fetch active tab + counts for all tabs in parallel.
  const [active, ...counts] = await Promise.all([
    apiFetch<PrListResponse>(
      `/purchase-requests?status=${activeStatus}&pageSize=50`,
      { cookie: cookieHeader },
    ),
    ...TABS.map((t) =>
      apiFetch<PrListResponse>(`/purchase-requests?status=${t.key}&pageSize=1`, {
        cookie: cookieHeader,
      }),
    ),
  ]);

  const countMap = new Map<string, number>(
    TABS.map((t, i) => [t.key, counts[i]?.meta.total ?? 0]),
  );

  return (
    <AppShell user={user}>
      <h1 className="text-xl font-semibold text-slate-800">Inbox เจ้าหน้าที่พัสดุ</h1>
      <p className="text-sm text-slate-500">รายการคำขอที่ต้องตรวจตามขั้น</p>

      <nav className="mt-4 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const isActive = t.key === activeStatus;
          const count = countMap.get(t.key) ?? 0;
          return (
            <Link
              key={t.key}
              href={`/inbox?status=${t.key}` as never}
              className={`rounded-t-md border-b-2 px-4 py-2 text-sm font-medium ${
                isActive
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    isActive ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">เลขที่</th>
              <th className="px-4 py-3">เรื่อง</th>
              <th className="px-4 py-3">รายการ</th>
              <th className="px-4 py-3">เสี่ยง</th>
              <th className="px-4 py-3">ผู้ขอ</th>
              <th className="px-4 py-3">เวลา</th>
            </tr>
          </thead>
          <tbody>
            {active.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  ไม่มีคำขอใน "{TABS.find((t) => t.key === activeStatus)?.label}"
                </td>
              </tr>
            )}
            {active.data.map((pr) => (
              <tr key={pr.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{pr.docNo ?? '—'}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/requests/${pr.id}` as never}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {pr.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{pr._count.items}</td>
                <td className="px-4 py-3">
                  {pr._count.riskFlags > 0 ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                      ⚠ {pr._count.riskFlags}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{pr.requester.fullName}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {(pr.submittedAt
                    ? new Date(pr.submittedAt)
                    : new Date(pr.createdAt)
                  ).toLocaleString('th-TH')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {active.meta.total > active.data.length && (
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
            แสดง {active.data.length} จาก {active.meta.total} รายการ
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500 text-th">
        เคล็ดลับ: คลิกที่ชื่อเรื่องเพื่อดูรายละเอียด · บนหน้ารายละเอียดมีปุ่ม "รับเรื่องเข้าตรวจ" /
        "ส่งกลับแก้ไข" / "อนุมัติเข้ารอบเปรียบเทียบ" ตามสิทธิ์
      </p>
    </AppShell>
  );
}
