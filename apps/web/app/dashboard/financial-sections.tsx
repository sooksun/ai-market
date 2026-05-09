import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { SectionTitle } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { BarChart } from '@/components/ui/charts';
import { Avatar } from '@/components/ui/avatar';
import { fmtNum, classNames } from '@/components/ui/format';

export interface FinancialData {
  generatedAt: string;
  windowStart: string;
  monthlyTrend: Array<{ ym: string; prCount: number; spend: string }>;
  projects: Array<{
    projectId: string;
    code: string | null;
    name: string;
    fiscalYear: number;
    allocated: string;
    held: string;
    committed: string;
    spent: string;
    available: string;
    usedPct: number;
    budgetCount: number;
  }>;
  topVendors: Array<{
    vendorId: string;
    vendorName: string;
    rating: number | null;
    spend: number;
    prCount: number;
    sharePct: number;
  }>;
  savings: {
    windowDays: number;
    prCount: number;
    baselineTotal: string;
    actualTotal: string;
    savedTotal: string;
    savedPct: number;
  };
}

function fmtMonth(ym: string): string {
  const [, m] = ym.split('-');
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return months[Number(m) - 1] ?? ym;
}

export function FinancialSections({ data }: { data: FinancialData }) {
  const trendData = data.monthlyTrend.map((m) => ({
    label: fmtMonth(m.ym),
    value: m.prCount,
  }));
  const spendData = data.monthlyTrend.map((m) => ({
    label: fmtMonth(m.ym),
    value: Number(m.spend),
  }));

  const top5Projects = data.projects.slice(0, 5);

  return (
    <div className="mt-5 space-y-5">
      {/* Savings card */}
      <SavingsCard savings={data.savings} />

      {/* Monthly trend */}
      <Card className="p-5">
        <SectionTitle
          icon={<Icon name="TrendingUp" className="w-3.5 h-3.5" />}
          title="แนวโน้มรายเดือน · 12 เดือน"
          sub="จำนวนคำขอใหม่ · มูลค่าเบิกจ่าย"
        />
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-medium text-ink-500 dark:text-ink-300">
              จำนวนคำขอ (PR)
            </div>
            <BarChart data={trendData} height={140} />
          </div>
          <div>
            <div className="mb-2 text-xs font-medium text-ink-500 dark:text-ink-300">
              เบิกจ่ายจริง (บาท)
            </div>
            <BarChart data={spendData} height={140} />
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Project burn-down */}
        <Card className="p-5">
          <SectionTitle
            icon={<Icon name="PiggyBank" className="w-3.5 h-3.5" />}
            title="Burn-down ตามโครงการ"
            sub={`Top 5 จาก ${data.projects.length} โครงการ`}
            action={
              <Link href={'/admin/budgets' as never}>
                <Button variant="ghost" size="sm" iconRight="ArrowRight">
                  จัดสรรงบ
                </Button>
              </Link>
            }
          />
          {top5Projects.length === 0 ? (
            <p className="mt-4 text-xs text-ink-400 dark:text-ink-300">
              ยังไม่ได้จัดสรรงบโครงการ
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {top5Projects.map((p) => (
                <li key={p.projectId}>
                  <div className="flex items-center justify-between text-sm">
                    <Link
                      href={`/dashboard/projects/${p.projectId}` as never}
                      className="flex-1 truncate font-medium text-ink-800 dark:text-ink-100 hover:text-brand-600 dark:hover:text-brand-300"
                    >
                      {p.code ? `[${p.code}] ` : ''}
                      {p.name}
                    </Link>
                    <span className="ml-3 text-xs text-ink-400 dark:text-ink-300 tabular-nums">
                      ปี {p.fiscalYear} · ใช้ {p.usedPct}%
                    </span>
                  </div>
                  <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                    <BurnSeg
                      label="ใช้แล้ว"
                      value={Number(p.spent)}
                      total={Number(p.allocated)}
                      color="bg-emerald-500"
                    />
                    <BurnSeg
                      label="กันงบ"
                      value={Number(p.committed)}
                      total={Number(p.allocated)}
                      color="bg-brand-400"
                    />
                    <BurnSeg
                      label="กันชั่วคราว"
                      value={Number(p.held)}
                      total={Number(p.allocated)}
                      color="bg-amber-300"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-ink-400 dark:text-ink-300 tabular-nums">
                    <span>ใช้ {fmtNum(Number(p.spent))}</span>
                    <span>กัน {fmtNum(Number(p.committed) + Number(p.held))}</span>
                    <span>เหลือ {fmtNum(Number(p.available))}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Top vendors */}
        <Card className="p-5">
          <SectionTitle
            icon={<Icon name="Store" className="w-3.5 h-3.5" />}
            title="ผู้ขายยอดนิยม · 90 วันล่าสุด"
            sub={`${data.topVendors.length} ราย`}
            action={
              <Link href={'/admin/vendors' as never}>
                <Button variant="ghost" size="sm" iconRight="ArrowRight">
                  จัดการผู้ขาย
                </Button>
              </Link>
            }
          />
          {data.topVendors.length === 0 ? (
            <p className="mt-4 text-xs text-ink-400 dark:text-ink-300">
              ยังไม่มีใบเสนอราคาที่เลือกในช่วงนี้
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.topVendors.map((v, idx) => (
                <li
                  key={v.vendorId}
                  className="flex items-center gap-3 rounded-xl bg-ink-50 dark:bg-ink-800/40 px-3 py-2"
                >
                  <span className="grid place-items-center w-7 h-7 rounded-lg grad-brand text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <Avatar name={v.vendorName} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm text-ink-900 dark:text-white">
                      {v.vendorName}
                    </div>
                    <div className="text-[11px] text-ink-400 dark:text-ink-300 tabular-nums">
                      {v.prCount} PR
                      {v.rating != null && ` · คะแนน ${v.rating.toFixed(1)}`} · {v.sharePct}%
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-200 tabular-nums">
                    {fmtNum(v.spend)} ฿
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function BurnSeg({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  if (total <= 0 || value <= 0) return null;
  const pct = Math.min(100, (value / total) * 100);
  return (
    <div className={classNames('h-full', color)} style={{ width: `${pct}%` }} title={`${label}: ${fmtNum(value)}`} />
  );
}

function SavingsCard({ savings }: { savings: FinancialData['savings'] }) {
  const hasData = savings.prCount > 0;
  return (
    <Card className="p-5 border-l-4 border-emerald-400 bg-gradient-to-r from-emerald-50/60 to-transparent dark:from-emerald-900/20 dark:to-transparent">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200">
            <Icon name="TrendingDown" className="h-4 w-4" />
          </span>
          <div>
            <div className="text-xs text-ink-400 dark:text-ink-300">
              ประหยัดได้จากการเปรียบเทียบราคา · {savings.windowDays} วันล่าสุด
            </div>
            <div className="mt-0.5 text-2xl font-semibold text-emerald-700 dark:text-emerald-200 tabular-nums">
              {hasData ? `${fmtNum(Number(savings.savedTotal))} ฿` : '—'}
            </div>
          </div>
        </div>
        {hasData && (
          <div className="grid grid-cols-3 gap-4 text-xs text-ink-600 dark:text-ink-200">
            <div>
              <div className="text-ink-400 dark:text-ink-300">PR</div>
              <div className="font-mono tabular-nums text-base text-ink-900 dark:text-white">
                {savings.prCount}
              </div>
            </div>
            <div>
              <div className="text-ink-400 dark:text-ink-300">ถ้าซื้อราคาสูงสุด</div>
              <div className="font-mono tabular-nums text-base text-ink-900 dark:text-white">
                {fmtNum(Number(savings.baselineTotal))}
              </div>
            </div>
            <div>
              <div className="text-ink-400 dark:text-ink-300">ประหยัด</div>
              <div className="font-mono tabular-nums text-base text-emerald-700 dark:text-emerald-200">
                {savings.savedPct}%
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
