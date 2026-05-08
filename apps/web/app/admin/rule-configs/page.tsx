import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import type { RuleConfig } from '@ai-market/shared';
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">ตั้งค่าระบบ — Rule Configs</h1>
          <p className="text-sm text-slate-500">
            เกณฑ์/ค่า threshold/รายการเอกสาร — แก้ไขได้เพื่อให้สอดคล้องกับระเบียบล่าสุด
            (ทุกการแก้ถูกบันทึก audit log)
          </p>
        </div>
        <Link
          href="/admin/rule-configs/new"
          className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          + เพิ่ม rule ใหม่
        </Link>
      </div>

      <section className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">key</th>
              <th className="w-28 px-4 py-2">type</th>
              <th className="px-4 py-2">value</th>
              <th className="w-48 px-4 py-2">อัปเดตล่าสุด</th>
              <th className="w-32 px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                  ยังไม่มี rule config
                </td>
              </tr>
            )}
            {rules.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3">
                  <div className="font-mono text-xs text-slate-800">{r.key}</div>
                  {r.description && (
                    <div className="mt-0.5 text-xs text-slate-500">{r.description}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                    {r.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <pre className="max-w-md overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700">
                    {JSON.stringify(r.value, null, 2)}
                  </pre>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(r.updatedAt).toLocaleString('th-TH')}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/rule-configs/${r.id}/edit`}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      แก้ไข
                    </Link>
                    <DeleteRuleButton id={r.id} ruleKey={r.key} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
