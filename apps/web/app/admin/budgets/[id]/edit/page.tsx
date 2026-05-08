import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { BudgetForm } from '../../budget-form';

interface BudgetDetail {
  id: string;
  fiscalYear: number;
  allocated: string;
  notes: string | null;
  projectId: string;
  budgetSourceId: string;
  project: { id: string; code: string | null; name: string; fiscalYear: number };
  budgetSource: { id: string; code: string | null; name: string; type: string; fiscalYear: number };
}

const ALLOWED = ['FINANCE', 'ADMIN'];

export default async function EditBudgetPage({
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
  let budget: BudgetDetail;
  try {
    budget = await apiFetch<BudgetDetail>(`/budgets/${id}`, {
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
          href={'/admin/budgets' as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปจัดสรรงบ
        </Link>
        <PageHeader
          eyebrow={`${budget.project.name} × ${budget.budgetSource.name}`}
          title="แก้ไขจำนวนเงินจัดสรร"
          subtitle="แก้ได้เฉพาะจำนวนเงิน — โครงการ/แหล่งงบ/ปีงบ ล็อกหลังสร้าง"
        />
        <BudgetForm
          mode="edit"
          id={budget.id}
          initial={{
            projectId: budget.projectId,
            budgetSourceId: budget.budgetSourceId,
            fiscalYear: budget.fiscalYear,
            amount: budget.allocated,
            notes: budget.notes,
          }}
          projects={[budget.project]}
          sources={[budget.budgetSource]}
        />
      </div>
    </AppShell>
  );
}
