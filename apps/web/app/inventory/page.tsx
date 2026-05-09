import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { fmtNum, classNames } from '@/components/ui/format';

interface InvRow {
  id: string;
  name: string;
  unit: string;
  category: string | null;
  currentQty: string;
  reorderPoint: string | null;
  active: boolean;
  updatedAt: string;
}

const ALLOWED = ['PROCUREMENT', 'INSPECTOR', 'FINANCE', 'DIRECTOR', 'AUDITOR', 'ADMIN'];

export default async function InventoryListPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const qs = params.search ? `?search=${encodeURIComponent(params.search)}` : '';
  const items = await apiFetch<InvRow[]>(`/inventory${qs}`, {
    cookie: cookieStore.toString(),
  });

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="คลังพัสดุ"
          title="ทะเบียนวัสดุสิ้นเปลือง"
          subtitle="วัสดุที่ใช้แล้วหมดไป (กระดาษ, ปากกา, หมึก, ฯลฯ) — เพิ่มจำนวนอัตโนมัติเมื่อตรวจรับเสร็จ"
        />

        <form className="mb-4 flex items-center gap-2" action="/inventory">
          <div className="relative flex-1 max-w-md">
            <Icon
              name="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 dark:text-ink-300"
            />
            <input
              type="text"
              name="search"
              defaultValue={params.search ?? ''}
              placeholder="ค้นหาตามชื่อวัสดุ..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-ink-900/40 border border-ink-200 dark:border-white/10 text-sm focus:border-brand-400 outline-none"
            />
          </div>
        </form>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="px-4 py-3 font-medium">ชื่อ</th>
                <th className="w-24 px-4 py-3 font-medium">หน่วย</th>
                <th className="w-32 px-4 py-3 font-medium text-right">คงเหลือ</th>
                <th className="w-32 px-4 py-3 font-medium text-right">จุดสั่งซื้อ</th>
                <th className="w-44 px-4 py-3 font-medium">อัปเดตล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-16 text-center text-ink-400 dark:text-ink-300"
                  >
                    <Icon name="Boxes" className="mx-auto mb-2 h-8 w-8" />
                    ยังไม่มีวัสดุในคลัง — รับของผ่านขั้นตอนตรวจรับก่อน
                  </td>
                </tr>
              )}
              {items.map((it) => {
                const qty = Number(it.currentQty);
                const reorder = it.reorderPoint ? Number(it.reorderPoint) : null;
                const low = reorder != null && qty <= reorder;
                return (
                  <tr key={it.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/inventory/${it.id}` as never}
                        className="font-medium text-ink-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-300"
                      >
                        {it.name}
                      </Link>
                      {it.category && (
                        <div className="text-[11px] text-ink-400 dark:text-ink-300">
                          {it.category}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-700 dark:text-ink-100">{it.unit}</td>
                    <td
                      className={classNames(
                        'px-4 py-3 tabular-nums text-right font-semibold',
                        low
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-ink-900 dark:text-white',
                      )}
                    >
                      {fmtNum(qty)}
                      {low && (
                        <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-rose-50 dark:bg-rose-900/40 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-200">
                          <Icon name="AlertTriangle" className="w-3 h-3" /> ต่ำ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-right text-ink-500 dark:text-ink-300">
                      {reorder != null ? fmtNum(reorder) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-400 dark:text-ink-300 tabular-nums">
                      {new Date(it.updatedAt).toLocaleString('th-TH')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </AppShell>
  );
}
