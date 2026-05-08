import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { ProjectForm } from '../../project-form';

interface ProjectDetail {
  id: string;
  code: string | null;
  name: string;
  fiscalYear: number;
  active: boolean;
}

const ALLOWED = ['PROJECT_OWNER', 'FINANCE', 'ADMIN'];

export default async function EditProjectPage({
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
  let project: ProjectDetail;
  try {
    project = await apiFetch<ProjectDetail>(`/projects/${id}`, {
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
          href={'/admin/projects' as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปรายการโครงการ
        </Link>
        <PageHeader
          eyebrow={`โครงการ · ${project.code ?? '(ไม่มี code)'}`}
          title="แก้ไขโครงการ"
        />
        <ProjectForm
          mode="edit"
          id={project.id}
          initial={{
            code: project.code,
            name: project.name,
            fiscalYear: project.fiscalYear,
            active: project.active,
          }}
        />
      </div>
    </AppShell>
  );
}
