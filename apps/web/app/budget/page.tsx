import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { BudgetBar } from '@/components/ui/budget-bar';
import { MetricCard } from '@/components/ui/metric-card';
import { fmtNum } from '@/components/ui/format';

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

const ALLOWED = ['FINANCE', 'DIRECTOR', 'ADMIN'];

export default async function BudgetOverviewPage() {
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const budgets = await apiFetch<BudgetRow[]>('/budgets', {
    cookie: cookieStore.toString(),
  });

  const totals = budgets.reduce(
    (acc, b) => {
      acc.allocated += Number(b.balance.allocated);
      acc.held += Number(b.balance.held);
      acc.committed += Number(b.balance.committed);
      acc.spent += Number(b.balance.spent);
      acc.available += Number(b.balance.available);
      return acc;
    },
    { allocated: 0, held: 0, committed: 0, spent: 0, available: 0 },
  );

  const canManage = user.roles.includes('FINANCE') || user.roles.includes('ADMIN');

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="ตรวจงบประมาณ"
          title="ภาพรวมงบประมาณ"
          subtitle="สรุปการจัดสรรและคงเหลือต่อโครงการ — แสดงเฉพาะของโรงเรียนคุณ"
          actions={
            canManage && (
              <Link href={'/admin/budgets/new' as never}>
                <Button icon="Plus">จัดสรรงบใหม่</Button>
              </Link>
            )
          }
        />

        {/* Totals */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon="Wallet"
            label="งบจัดสรรรวม"
            value={fmtNum(totals.allocated)}
            unit="บาท"
            tone="brand"
          />
          <MetricCard
            icon="Clock"
            label="กันไว้"
            value={fmtNum(totals.held)}
            unit="บาท"
            sub="HOLD จาก PR ที่ส่งเรื่อง"
            tone="amber"
          />
          <MetricCard
            icon="CheckCircle2"
            label="ผูกพัน"
            value={fmtNum(totals.committed)}
            unit="บาท"
            sub="COMMIT หลังอนุมัติ"
            tone="blue"
          />
          <MetricCard
            icon="PiggyBank"
            label="คงเหลือใช้ได้"
            value={fmtNum(totals.available)}
            unit="บาท"
            tone="green"
          />
        </div>

        {budgets.length === 0 ? (
          <Card className="mt-6 p-12 text-center">
            <Icon name="Wallet" className="mx-auto mb-3 h-10 w-10 text-ink-300 dark:text-ink-500" />
            <p className="text-sm text-ink-500 dark:text-ink-300">
              ยังไม่มีการจัดสรรงบ
              {canManage && ' — กดปุ่มด้านบนเพื่อเริ่ม'}
            </p>
          </Card>
        ) : (
          <Card className="mt-6 p-5">
            <SectionTitle
              icon={<Icon name="BarChart3" className="w-3.5 h-3.5" />}
              title="การใช้งบรายโครงการ"
              sub={`${budgets.length} allocation`}
              action={
                canManage && (
                  <Link href={'/admin/budgets' as never}>
                    <Button variant="ghost" size="sm" iconRight="ArrowRight">
                      จัดการ allocation
                    </Button>
                  </Link>
                )
              }
            />

            <div className="mt-4 space-y-5">
              {budgets.map((b) => {
                const allocated = Number(b.balance.allocated);
                const used = Number(b.balance.spent) + Number(b.balance.committed);
                const reserved = Number(b.balance.held);
                const available = Number(b.balance.available);
                const usedPct = allocated > 0 ? ((used + reserved) / allocated) * 100 : 0;
                return (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-ink-100 dark:border-white/5 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink-900 dark:text-white">
                          {b.project.code && (
                            <span className="font-mono text-xs text-ink-400 dark:text-ink-300">
                              [{b.project.code}]{' '}
                            </span>
                          )}
                          {b.project.name}
                        </div>
                        <div className="text-xs text-ink-500 dark:text-ink-300">
                          แหล่งงบ:{' '}
                          {b.budgetSource.code && (
                            <span className="font-mono">[{b.budgetSource.code}] </span>
                          )}
                          {b.budgetSource.name} · {b.budgetSource.type} · ปี {b.fiscalYear}
                        </div>
                      </div>
                      <span
                        className={`text-[11px] tabular-nums font-medium px-2 py-0.5 rounded-full ${
                          usedPct >= 90
                            ? 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200'
                            : usedPct >= 70
                              ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200'
                              : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200'
                        }`}
                      >
                        ใช้ {usedPct.toFixed(0)}%
                      </span>
                    </div>

                    <div className="mt-3">
                      <BudgetBar used={used} reserved={reserved} total={allocated} height={10} />
                    </div>

                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[12px] tabular-nums">
                      <div>
                        <div className="text-[11px] text-ink-400 dark:text-ink-300">จัดสรร</div>
                        <div className="font-semibold text-ink-900 dark:text-white">
                          {fmtNum(allocated)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-ink-400 dark:text-ink-300">จ่ายจริง</div>
                        <div className="font-semibold text-ink-900 dark:text-white">
                          {fmtNum(Number(b.balance.spent))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-ink-400 dark:text-ink-300">ผูกพัน</div>
                        <div className="font-semibold text-ink-900 dark:text-white">
                          {fmtNum(Number(b.balance.committed))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-ink-400 dark:text-ink-300">กันไว้</div>
                        <div className="font-semibold text-amber-700 dark:text-amber-200">
                          {fmtNum(reserved)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-ink-400 dark:text-ink-300">คงเหลือ</div>
                        <div className="font-semibold text-emerald-700 dark:text-emerald-200">
                          {fmtNum(available)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
