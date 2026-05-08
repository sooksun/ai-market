import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { RuleForm } from '../rule-form';

export default async function NewRuleConfigPage() {
  const user = await requireUser();
  if (!user.roles.includes('ADMIN')) {
    redirect('/requests');
  }
  return (
    <AppShell user={user}>
      <div className="fade-up max-w-3xl">
        <Link
          href={'/admin/rule-configs' as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไป Rule Configs
        </Link>
        <PageHeader
          eyebrow="ตั้งค่าระบบ"
          title="เพิ่ม rule ใหม่"
          subtitle="กำหนด key, type, value (JSON) และคำอธิบาย"
        />
        <RuleForm mode="create" />
      </div>
    </AppShell>
  );
}
