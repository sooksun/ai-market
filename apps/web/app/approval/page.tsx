import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import type { Role } from '@ai-market/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

interface InboxRow {
  workflowId: string;
  purchaseRequest: {
    id: string;
    docNo: string | null;
    title: string;
    status: string;
    requester: { id: string; fullName: string };
    submittedAt: string | null;
  };
  currentStep: {
    id: string;
    ordinal: number;
    title: string;
    approverRole: Role | null;
  };
  totalSteps: number;
  startedAt: string;
  canAct: boolean;
}

const ELIGIBLE_ROLES: Role[] = [
  'PROJECT_OWNER',
  'PROCUREMENT',
  'FINANCE',
  'DIRECTOR',
  'ADMIN',
];

export default async function ApprovalInboxPage() {
  const user = await requireUser();
  if (!user.roles.some((r) => ELIGIBLE_ROLES.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const inbox = await apiFetch<InboxRow[]>('/approvals/inbox', {
    cookie: cookieStore.toString(),
  });
  const tRole = await getTranslations('role');

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="งานรออนุมัติ"
          title="กล่องอนุมัติ"
          subtitle="คำขอที่รอ role ของคุณตัดสินใจ — ดูรายละเอียดในแต่ละ PR แล้วกดอนุมัติ/ไม่อนุมัติ/ส่งกลับ"
        />

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="px-4 py-3 font-medium">เลขที่</th>
                <th className="px-4 py-3 font-medium">เรื่อง</th>
                <th className="w-44 px-4 py-3 font-medium">ขั้นปัจจุบัน</th>
                <th className="w-44 px-4 py-3 font-medium">บทบาทอนุมัติ</th>
                <th className="w-32 px-4 py-3 font-medium">ผู้ขอ</th>
                <th className="w-44 px-4 py-3 font-medium">เริ่มเมื่อ</th>
                <th className="w-32 px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {inbox.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-ink-400 dark:text-ink-300">
                    <Icon name="CheckCircle2" className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                    ไม่มีคำขอที่รอคุณอนุมัติ
                  </td>
                </tr>
              )}
              {inbox.map((row) => (
                <tr key={row.workflowId}>
                  <td className="px-4 py-3 font-mono text-xs text-ink-700 dark:text-ink-100">
                    {row.purchaseRequest.docNo ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/requests/${row.purchaseRequest.id}` as never}
                      className="font-medium text-ink-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-300"
                    >
                      {row.purchaseRequest.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-ink-700 dark:text-ink-100">{row.currentStep.title}</div>
                    <div className="text-[11px] text-ink-400 dark:text-ink-300">
                      ขั้นที่ {row.currentStep.ordinal}/{row.totalSteps}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.currentStep.approverRole && (
                      <span className="rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200 px-2 py-0.5 text-[11px] font-medium">
                        {tRole(row.currentStep.approverRole)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-700 dark:text-ink-100">
                    {row.purchaseRequest.requester.fullName}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-400 dark:text-ink-300 tabular-nums">
                    {new Date(row.startedAt).toLocaleString('th-TH')}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/requests/${row.purchaseRequest.id}` as never}>
                      <Button size="sm" icon="ArrowRight">
                        ดู / อนุมัติ
                      </Button>
                    </Link>
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
