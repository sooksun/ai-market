import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { ProjectForm } from '../project-form';

const ALLOWED = ['PROJECT_OWNER', 'FINANCE', 'ADMIN'];

export default async function NewProjectPage() {
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
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
        <PageHeader eyebrow="โครงการใหม่" title="เพิ่มโครงการ" />
        <ProjectForm mode="create" />
      </div>
    </AppShell>
  );
}
