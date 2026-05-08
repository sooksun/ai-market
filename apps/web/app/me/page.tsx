import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { KV } from '@/components/ui/kv';
import { PageHeader } from '@/components/ui/page-header';

export default async function MePage() {
  const user = await requireUser();
  const tRole = await getTranslations('role');
  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="บัญชีผู้ใช้"
          title="โปรไฟล์"
          subtitle="ข้อมูลผู้ใช้และบทบาทของคุณในระบบ"
        />

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Avatar name={user.fullName} size={64} />
            <div>
              <div className="text-lg font-semibold text-ink-900 dark:text-white">
                {user.fullName}
              </div>
              <div className="text-sm text-ink-500 dark:text-ink-300">{user.email}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {user.roles.map((r) => (
                  <span
                    key={r}
                    className="rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200 px-2.5 py-0.5 text-[11px] font-medium"
                  >
                    {tRole(r)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <KV k="ชื่อ" v={user.fullName} />
            <KV k="อีเมล" v={user.email} mono />
            <KV k="โรงเรียน (school_id)" v={user.schoolId} mono />
            <KV k="user_id" v={user.id} mono />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
