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
import { DeleteVendorButton } from './delete-button';

interface VendorRow {
  id: string;
  name: string;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  rating: number | null;
  active: boolean;
}

const ALLOWED = ['PROCUREMENT', 'ADMIN'];

export default async function VendorsAdminPage() {
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  const vendors = await apiFetch<VendorRow[]>('/vendors?includeInactive=true', {
    cookie: cookieStore.toString(),
  });
  const isAdmin = user.roles.includes('ADMIN');

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <PageHeader
          eyebrow="ตั้งค่าระบบ · ผู้ขาย"
          title="ทะเบียนผู้ขาย"
          subtitle="ผู้ขายที่ใช้สำหรับเปรียบเทียบราคา · เก็บข้อมูลเลขผู้เสียภาษี เบอร์ติดต่อ คะแนนภายใน"
          actions={
            <Link href={'/admin/vendors/new' as never}>
              <Button icon="Plus">เพิ่มผู้ขาย</Button>
            </Link>
          }
        />

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/60 dark:bg-ink-900/40 text-left text-[11px] uppercase tracking-wider text-ink-400 dark:text-ink-300">
              <tr>
                <th className="px-4 py-3 font-medium">ชื่อผู้ขาย</th>
                <th className="w-40 px-4 py-3 font-medium">เลขผู้เสียภาษี</th>
                <th className="w-36 px-4 py-3 font-medium">เบอร์ติดต่อ</th>
                <th className="w-24 px-4 py-3 font-medium">คะแนน</th>
                <th className="w-24 px-4 py-3 font-medium">สถานะ</th>
                <th className="w-32 px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-white/5">
              {vendors.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-ink-400 dark:text-ink-300">
                    <Icon name="Store" className="mx-auto mb-2 h-8 w-8" />
                    ยังไม่มีผู้ขาย
                  </td>
                </tr>
              )}
              {vendors.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900 dark:text-white">{v.name}</div>
                    {v.email && (
                      <div className="text-xs text-ink-400 dark:text-ink-300">{v.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-700 dark:text-ink-100">
                    {v.taxId ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-700 dark:text-ink-100">{v.phone ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-700 dark:text-ink-100">
                    {v.rating != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="Star" className="w-3 h-3 text-amber-500" />
                        {v.rating.toFixed(1)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        v.active
                          ? 'inline-flex rounded-full bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-200'
                          : 'inline-flex rounded-full bg-ink-100 dark:bg-ink-700 px-2 py-0.5 text-[11px] font-medium text-ink-500 dark:text-ink-300'
                      }
                    >
                      {v.active ? 'ใช้งาน' : 'ปิด'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/vendors/${v.id}/edit` as never}>
                        <Button variant="outline" size="sm" icon="Pencil">
                          แก้ไข
                        </Button>
                      </Link>
                      {isAdmin && <DeleteVendorButton id={v.id} name={v.name} />}
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
