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
import { DeleteBudgetButton } from './delete-button';

interface BudgetRow {
  id: string;
  fiscalYear: number;
  allocated: string;
  notes: string | null;
  project: { id: string; code: string | null; name: string };
  budgetSource: { id: string; code: string | null; name: string; type: string };
  balance: {
    allocated: string;
    held: string;
    committed: string;
    spent: string;
    available: string;
  };
}

const ALLOWED = ['FINANCE', 'ADMIN'];

export default async function BudgetsAdminPage() {
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const budgets = await apiFetch<BudgetRow[]>('/budgets', {
    cookie: cookieStore.toString(),
  });
  const isAdmin = user.roles.includes('ADMIN');

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="ตั้งค่าระบบ · จัดสรรงบ"
          title="จัดสรรงบประมาณรายโครงการ"
          subtitle="สร้าง allocation สำหรับ (โครงการ × แหล่งงบ × ปีงบประมาณ) — แต่ละ allocation มีบันทึก movement (ALLOCATE/HOLD/RELEASE/...)"
          actions={
            <Link href={'/admin/budgets/new' as never}>
              <Button icon="Plus">จัดสรรใหม่</Button>
            </Link>
          }
        />

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="px-4 py-3 font-medium">โครงการ</th>
                <th className="px-4 py-3 font-medium">แหล่งงบ</th>
                <th className="w-20 px-4 py-3 font-medium">ปี</th>
                <th className="w-32 px-4 py-3 font-medium text-right">จัดสรร</th>
                <th className="w-32 px-4 py-3 font-medium text-right">กันไว้</th>
                <th className="w-32 px-4 py-3 font-medium text-right">คงเหลือ</th>
                <th className="w-36 px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {budgets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-ink-400 dark:text-ink-300">
                    <Icon name="Wallet" className="mx-auto mb-2 h-8 w-8" />
                    ยังไม่มี allocation
                  </td>
                </tr>
              )}
              {budgets.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900 dark:text-white">
                      {b.project.name}
                    </div>
                    {b.project.code && (
                      <div className="font-mono text-xs text-ink-400 dark:text-ink-300">
                        {b.project.code}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-ink-700 dark:text-ink-100">{b.budgetSource.name}</div>
                    <div className="text-xs text-ink-400 dark:text-ink-300">
                      {b.budgetSource.type}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-700 dark:text-ink-100">
                    {b.fiscalYear}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-right font-medium text-ink-900 dark:text-white">
                    {fmtNum(Number(b.balance.allocated))}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-right text-amber-700 dark:text-amber-200">
                    {fmtNum(Number(b.balance.held))}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-right text-emerald-700 dark:text-emerald-200 font-medium">
                    {fmtNum(Number(b.balance.available))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/budgets/${b.id}/edit` as never}>
                        <Button variant="outline" size="sm" icon="Pencil">
                          แก้ไข
                        </Button>
                      </Link>
                      {isAdmin && <DeleteBudgetButton id={b.id} label={b.project.name} />}
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
