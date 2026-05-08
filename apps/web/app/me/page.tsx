import { requireUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { ROLE_LABELS_TH } from '@ai-market/shared';

export default async function MePage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">โปรไฟล์</h1>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">ชื่อ</dt>
            <dd className="font-medium text-slate-800">{user.fullName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">อีเมล</dt>
            <dd className="font-medium text-slate-800">{user.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">โรงเรียน</dt>
            <dd className="font-medium text-slate-800">{user.schoolId}</dd>
          </div>
          <div>
            <dt className="text-slate-500">บทบาท</dt>
            <dd className="font-medium text-slate-800">
              {user.roles.map((r) => ROLE_LABELS_TH[r]).join(', ')}
            </dd>
          </div>
        </dl>
      </div>
    </AppShell>
  );
}
