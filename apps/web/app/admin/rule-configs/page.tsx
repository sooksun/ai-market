import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import type { RuleConfig } from '@ai-market/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { DeleteRuleButton } from './delete-button';

export default async function RuleConfigsListPage() {
  const user = await requireUser();
  if (!user.roles.includes('ADMIN')) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const rules = await apiFetch<RuleConfig[]>('/rule-configs', {
    cookie: cookieStore.toString(),
  });

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="ตั้งค่าระบบ · ผู้ดูแล"
          title="Rule Configs"
          subtitle="เกณฑ์/ค่า threshold/รายการเอกสาร — แก้ไขได้เพื่อให้สอดคล้องกับระเบียบล่าสุด · ทุกการแก้ถูกบันทึก audit log"
          actions={
            <Link href={'/admin/rule-configs/new' as never}>
              <Button icon="Plus">เพิ่ม rule ใหม่</Button>
            </Link>
          }
        />

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="px-4 py-3 font-medium">key</th>
                <th className="w-28 px-4 py-3 font-medium">type</th>
                <th className="px-4 py-3 font-medium">value</th>
                <th className="w-44 px-4 py-3 font-medium">อัปเดตล่าสุด</th>
                <th className="w-32 px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {rules.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-16 text-center text-ink-400 dark:text-ink-300"
                  >
                    <Icon name="Settings2" className="mx-auto mb-2 h-8 w-8" />
                    ยังไม่มี rule config — กด "เพิ่ม rule ใหม่" เพื่อเริ่ม
                  </td>
                </tr>
              )}
              {rules.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-ink-900 dark:text-white">{r.key}</div>
                    {r.description && (
                      <div className="mt-0.5 text-xs text-ink-500 dark:text-ink-300">
                        {r.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-ink-100 dark:bg-ink-800 px-1.5 py-0.5 font-mono text-xs text-ink-700 dark:text-ink-100">
                      {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <pre className="max-w-md overflow-x-auto whitespace-pre-wrap rounded-lg bg-ink-50 dark:bg-ink-900/40 px-2 py-1.5 font-mono text-xs text-ink-700 dark:text-ink-100">
                      {JSON.stringify(r.value, null, 2)}
                    </pre>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-500 dark:text-ink-300 tabular-nums">
                    {new Date(r.updatedAt).toLocaleString('th-TH')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/rule-configs/${r.id}/edit` as never}>
                        <Button variant="outline" size="sm" icon="Pencil">
                          แก้ไข
                        </Button>
                      </Link>
                      <DeleteRuleButton id={r.id} ruleKey={r.key} />
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
