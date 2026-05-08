import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Audit Logs</h1>
          <p className="text-sm text-slate-500">
            ประวัติการเปลี่ยนแปลงข้อมูลทั้งระบบ — เห็นเฉพาะของโรงเรียนคุณ
          </p>
        </div>
        <div className="text-sm text-slate-500">
          พบ {list.meta.total.toLocaleString('th-TH')} รายการ · หน้า {list.meta.page}/
          {list.meta.totalPages || 1}
        </div>
      </div>

      <div className="mt-4">
        <AuditLogFilters initial={params} />
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="w-44 px-4 py-3">เวลา</th>
              <th className="w-48 px-4 py-3">ผู้ใช้</th>
              <th className="px-4 py-3">การกระทำ</th>
              <th className="px-4 py-3">เป้าหมาย</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {list.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
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
    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
      <a
        href={`/audit-logs?${prev.toString()}`}
        className={`rounded-md border border-slate-300 px-3 py-1 ${
          currentPage <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-white'
        }`}
      >
        ← หน้าก่อน
      </a>
      <span>
        หน้า {currentPage} / {totalPages}
      </span>
      <a
        href={`/audit-logs?${next.toString()}`}
        className={`rounded-md border border-slate-300 px-3 py-1 ${
          currentPage >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-white'
        }`}
      >
        หน้าถัดไป →
      </a>
    </div>
  );
}
