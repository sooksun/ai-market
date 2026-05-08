import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import type { RuleConfig } from '@ai-market/shared';
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
      <div>
        <Link
          href="/admin/rule-configs"
          className="text-xs text-brand-600 hover:underline"
        >
          ← กลับไป Rule Configs
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-800">
          แก้ไข rule: <span className="font-mono">{rule.key}</span>
        </h1>
      </div>
      <div className="mt-6">
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
