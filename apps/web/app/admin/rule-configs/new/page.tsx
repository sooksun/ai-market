import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { RuleForm } from '../rule-form';

export default async function NewRuleConfigPage() {
  const user = await requireUser();
  if (!user.roles.includes('ADMIN')) {
    redirect('/requests');
  }
  return (
    <AppShell user={user}>
      <div>
        <Link
          href="/admin/rule-configs"
          className="text-xs text-brand-600 hover:underline"
        >
          ← กลับไป Rule Configs
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-800">เพิ่ม rule ใหม่</h1>
      </div>
      <div className="mt-6">
        <RuleForm mode="create" />
      </div>
    </AppShell>
  );
}
