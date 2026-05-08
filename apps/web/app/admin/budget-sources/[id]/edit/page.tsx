import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { BudgetSourceForm } from '../../source-form';

interface SourceDetail {
  id: string;
  code: string | null;
  name: string;
  type: string;
  fiscalYear: number;
  totalAmount: string;
  active: boolean;
}

const ALLOWED = ['FINANCE', 'ADMIN'];

export default async function EditBudgetSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  let source: SourceDetail;
  try {
    source = await apiFetch<SourceDetail>(`/budget-sources/${id}`, {
      cookie: cookieStore.toString(),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <AppShell user={user}>
      <div className="fade-up max-w-2xl">
        <Link
          href={'/admin/budget-sources' as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปรายการแหล่งงบ
        </Link>
        <PageHeader eyebrow={`${source.code ?? 'แหล่งงบ'}`} title="แก้ไขแหล่งงบประมาณ" />
        <BudgetSourceForm
          mode="edit"
          id={source.id}
          initial={{
            code: source.code,
            name: source.name,
            type: source.type,
            fiscalYear: source.fiscalYear,
            totalAmount: source.totalAmount,
            active: source.active,
          }}
        />
      </div>
    </AppShell>
  );
}
