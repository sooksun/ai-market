import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import type { RuleConfig } from '@ai-market/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { RuleForm } from '../../rule-form';

export default async function EditRuleConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!user.roles.includes('ADMIN')) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  let rule: RuleConfig;
  try {
    rule = await apiFetch<RuleConfig>(`/rule-configs/${id}`, {
      cookie: cookieStore.toString(),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
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
          title={
            <>
              แก้ไข rule:{' '}
              <span className="font-mono text-brand-600 dark:text-brand-300">{rule.key}</span>
            </>
          }
          subtitle="ทุกการแก้ถูกบันทึก audit log"
        />
        <RuleForm
          mode="edit"
          id={rule.id}
          initial={{
            key: rule.key,
            type: rule.type,
            value: rule.value,
            description: rule.description,
          }}
        />
      </div>
    </AppShell>
  );
}
