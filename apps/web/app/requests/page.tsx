import Link from 'next/link';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { type PurchaseRequestStatus } from '@ai-market/shared';

interface PrListItem {
  id: string;
  docNo: string | null;
  title: string;
  status: PurchaseRequestStatus;
  createdAt: string;
  requester: { id: string; fullName: string };
  _count: { items: number; riskFlags: number };
}

interface PrListResponse {
  data: PrListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export default async function RequestsPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const list = await apiFetch<PrListResponse>('/purchase-requests?pageSize=20', {
    cookie: cookieStore.toString(),
  });
  const tStatus = await getTranslations('prStatus');

  return (
    <AppShell user={user}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">รายการคำขอซื้อ</h1>
        <Link
          href="/requests/new"
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          + สร้างคำขอ
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">เลขที่</th>
              <th className="px-4 py-3">เรื่อง</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3">รายการ</th>
              <th className="px-4 py-3">ผู้ขอ</th>
              <th className="px-4 py-3">วันที่สร้าง</th>
            </tr>
          </thead>
          <tbody>
            {list.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  ยังไม่มีคำขอซื้อ
                </td>
              </tr>
            )}
            {list.data.map((pr) => (
              <tr key={pr.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{pr.docNo ?? '—'}</td>
                <td className="px-4 py-3">
                  <Link href={`/requests/${pr.id}` as never} className="text-brand-600 hover:underline">
                    {pr.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {tStatus(pr.status)}
                  </span>
                </td>
                <td className="px-4 py-3">{pr._count.items}</td>
                <td className="px-4 py-3 text-slate-600">{pr.requester.fullName}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(pr.createdAt).toLocaleDateString('th-TH')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
