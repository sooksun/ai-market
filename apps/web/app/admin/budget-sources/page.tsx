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
import { fmtNum } from '@/components/ui/format';
import { DeleteBudgetSourceButton } from './delete-button';

interface BudgetSourceRow {
  id: string;
  code: string | null;
  name: string;
  type: string;
  fiscalYear: number;
  totalAmount: string;
  active: boolean;
}

const ALLOWED = ['FINANCE', 'ADMIN'];

export default async function BudgetSourcesAdminPage() {
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const sources = await apiFetch<BudgetSourceRow[]>('/budget-sources', {
    cookie: cookieStore.toString(),
  });
  const isAdmin = user.roles.includes('ADMIN');

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="ตั้งค่าระบบ · แหล่งงบ"
          title="แหล่งงบประมาณ"
          subtitle="แหล่งเงิน (อุดหนุน/รายได้/โครงการเฉพาะ) ใช้จัดสรรเข้าโครงการ"
          actions={
            <Link href={'/admin/budget-sources/new' as never}>
              <Button icon="Plus">เพิ่มแหล่งงบ</Button>
            </Link>
          }
        />

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="w-28 px-4 py-3 font-medium">code</th>
                <th className="px-4 py-3 font-medium">ชื่อแหล่งงบ</th>
                <th className="w-32 px-4 py-3 font-medium">ประเภท</th>
                <th className="w-24 px-4 py-3 font-medium">ปีงบ</th>
                <th className="w-36 px-4 py-3 font-medium text-right">วงเงิน</th>
                <th className="w-24 px-4 py-3 font-medium">สถานะ</th>
                <th className="w-32 px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {sources.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-ink-400 dark:text-ink-300">
                    <Icon name="Wallet" className="mx-auto mb-2 h-8 w-8" />
                    ยังไม่มีแหล่งงบ
                  </td>
                </tr>
              )}
              {sources.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-mono text-xs text-ink-700 dark:text-ink-100">
                    {s.code ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-900 dark:text-white font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-ink-700 dark:text-ink-100">{s.type}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-700 dark:text-ink-100">
                    {s.fiscalYear}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-right text-ink-900 dark:text-white font-medium">
                    {fmtNum(Number(s.totalAmount))} ฿
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        s.active
                          ? 'inline-flex rounded-full bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-200'
                          : 'inline-flex rounded-full bg-ink-100 dark:bg-ink-700 px-2 py-0.5 text-[11px] font-medium text-ink-500 dark:text-ink-300'
                      }
                    >
                      {s.active ? 'ใช้งาน' : 'ปิด'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/budget-sources/${s.id}/edit` as never}>
                        <Button variant="outline" size="sm" icon="Pencil">
                          แก้ไข
                        </Button>
                      </Link>
                      {isAdmin && <DeleteBudgetSourceButton id={s.id} name={s.name} />}
                    </div>
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
