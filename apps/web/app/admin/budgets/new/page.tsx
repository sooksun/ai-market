import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { BudgetForm } from '../budget-form';

const ALLOWED = ['FINANCE', 'ADMIN'];

interface ProjectRow {
  id: string;
  code: string | null;
  name: string;
  fiscalYear: number;
}
interface SourceRow {
  id: string;
  code: string | null;
  name: string;
  type: string;
  fiscalYear: number;
}

export default async function NewBudgetPage() {
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();
  const [projects, sources] = await Promise.all([
    apiFetch<ProjectRow[]>('/projects', { cookie }),
    apiFetch<SourceRow[]>('/budget-sources', { cookie }),
  ]);

  return (
    <AppShell user={user}>
      <div className="fade-up max-w-2xl">
        <Link
          href={'/admin/budgets' as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปจัดสรรงบ
        </Link>
        <PageHeader eyebrow="จัดสรรใหม่" title="จัดสรรงบประมาณ" />
        <BudgetForm mode="create" projects={projects} sources={sources} />
      </div>
    </AppShell>
  );
}
