import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { classNames } from '@/components/ui/format';
import { AuditLogFilters } from './filters';
import { AuditLogRow } from './row';

interface AuditLog {
  id: string;
  schoolId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; fullName: string; email: string } | null;
}

interface AuditListResponse {
  data: AuditLog[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

const ALLOWED_ROLES = ['AUDITOR', 'DIRECTOR', 'ADMIN'];

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED_ROLES.includes(r))) {
    redirect('/requests');
  }

  const cookieStore = await cookies();
  const qs = new URLSearchParams();
  if (params.entityType) qs.set('entityType', params.entityType);
  if (params.entityId) qs.set('entityId', params.entityId);
  if (params.userId) qs.set('userId', params.userId);
  if (params.action) qs.set('action', params.action);
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  if (params.q) qs.set('q', params.q);
  if (params.page) qs.set('page', params.page);
  qs.set('pageSize', '50');

  const list = await apiFetch<AuditListResponse>(`/audit-logs?${qs.toString()}`, {
    cookie: cookieStore.toString(),
  });
  const tAction = await getTranslations('auditAction');
  const tEntity = await getTranslations('entityType');
  const labelAction = (a: string): string => {
    try {
      return tAction(a);
    } catch {
      return a;
    }
  };
  const labelEntity = (e: string): string => {
    try {
      return tEntity(e);
    } catch {
      return e;
    }
  };

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="ตรวจสอบ"
          title="Audit Logs"
          subtitle="ประวัติการเปลี่ยนแปลงข้อมูลทั้งระบบ — เห็นเฉพาะของโรงเรียนคุณ"
          actions={
            <span className="text-sm text-ink-500 dark:text-ink-300">
              พบ {list.meta.total.toLocaleString('th-TH')} รายการ · หน้า {list.meta.page}/
              {list.meta.totalPages || 1}
            </span>
          }
        />

        <div className="mb-4">
          <AuditLogFilters initial={params} />
        </div>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="w-44 px-4 py-3 font-medium">เวลา</th>
                <th className="w-48 px-4 py-3 font-medium">ผู้ใช้</th>
                <th className="px-4 py-3 font-medium">การกระทำ</th>
                <th className="px-4 py-3 font-medium">เป้าหมาย</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {list.data.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-16 text-center text-ink-400 dark:text-ink-300"
                  >
                    <Icon name="Search" className="mx-auto mb-2 h-8 w-8" />
                    ไม่พบ audit log ตามเงื่อนไขที่ค้น
                  </td>
                </tr>
              )}
              {list.data.map((log) => (
                <AuditLogRow
                  key={log.id}
                  log={log}
                  actionLabel={labelAction(log.action)}
                  entityLabel={labelEntity(log.entityType)}
                />
              ))}
            </tbody>
          </table>

          {list.meta.totalPages > 1 && (
            <Pagination currentPage={list.meta.page} totalPages={list.meta.totalPages} qs={qs} />
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function Pagination({
  currentPage,
  totalPages,
  qs,
}: {
  currentPage: number;
  totalPages: number;
  qs: URLSearchParams;
}) {
  const prev = new URLSearchParams(qs);
  prev.set('page', String(Math.max(1, currentPage - 1)));
  const next = new URLSearchParams(qs);
  next.set('page', String(Math.min(totalPages, currentPage + 1)));

  return (
    <div className="flex items-center justify-between border-t border-ink-100 dark:border-white/5 bg-ink-50/40 dark:bg-ink-900/40 px-4 py-2 text-xs text-ink-500 dark:text-ink-300">
      <a
        href={`/audit-logs?${prev.toString()}`}
        className={classNames(
          'inline-flex items-center gap-1 rounded-lg border border-ink-200 dark:border-white/10 px-3 py-1',
          currentPage <= 1
            ? 'pointer-events-none opacity-40'
            : 'hover:bg-white dark:hover:bg-ink-800',
        )}
      >
        <Icon name="ChevronLeft" className="w-3.5 h-3.5" /> หน้าก่อน
      </a>
      <span className="tabular-nums">
        หน้า {currentPage} / {totalPages}
      </span>
      <a
        href={`/audit-logs?${next.toString()}`}
        className={classNames(
          'inline-flex items-center gap-1 rounded-lg border border-ink-200 dark:border-white/10 px-3 py-1',
          currentPage >= totalPages
            ? 'pointer-events-none opacity-40'
            : 'hover:bg-white dark:hover:bg-ink-800',
        )}
      >
        หน้าถัดไป <Icon name="ChevronRight" className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
