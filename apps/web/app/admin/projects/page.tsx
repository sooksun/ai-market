import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { DeleteProjectButton } from './delete-button';

interface ProjectRow {
  id: string;
  code: string | null;
  name: string;
  fiscalYear: number;
  active: boolean;
}

const ALLOWED = ['PROJECT_OWNER', 'FINANCE', 'ADMIN'];

export default async function ProjectsAdminPage() {
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const projects = await apiFetch<ProjectRow[]>('/projects', {
    cookie: cookieStore.toString(),
  });
  const isAdmin = user.roles.includes('ADMIN');

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="ตั้งค่าระบบ · โครงการ"
          title="โครงการ"
          subtitle="โครงการ/กิจกรรมที่ใช้ผูกกับคำขอซื้อและงบประมาณ"
          actions={
            <Link href={'/admin/projects/new' as never}>
              <Button icon="Plus">เพิ่มโครงการ</Button>
            </Link>
          }
        />

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="w-32 px-4 py-3 font-medium">code</th>
                <th className="px-4 py-3 font-medium">ชื่อโครงการ</th>
                <th className="w-28 px-4 py-3 font-medium">ปีงบ</th>
                <th className="w-24 px-4 py-3 font-medium">สถานะ</th>
                <th className="w-32 px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-ink-400 dark:text-ink-300">
                    <Icon name="Briefcase" className="mx-auto mb-2 h-8 w-8" />
                    ยังไม่มีโครงการ — กด "เพิ่มโครงการ" เพื่อเริ่ม
                  </td>
                </tr>
              )}
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono text-xs text-ink-700 dark:text-ink-100">
                    {p.code ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-900 dark:text-white font-medium">{p.name}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-700 dark:text-ink-100">
                    {p.fiscalYear}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.active
                          ? 'inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-200'
                          : 'inline-flex items-center gap-1 rounded-full bg-ink-100 dark:bg-ink-700 px-2 py-0.5 text-[11px] font-medium text-ink-500 dark:text-ink-300'
                      }
                    >
                      {p.active ? 'ใช้งาน' : 'ปิด'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/projects/${p.id}/edit` as never}>
                        <Button variant="outline" size="sm" icon="Pencil">
                          แก้ไข
                        </Button>
                      </Link>
                      {isAdmin && <DeleteProjectButton id={p.id} name={p.name} />}
                    </div>
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
