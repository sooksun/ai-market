import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PurchaseRequestForm } from '@/components/purchase-request-form';
import type { BudgetSourceSummary, ProjectSummary } from '@ai-market/shared';

export default async function NewRequestPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  const [projects, budgetSources] = await Promise.all([
    apiFetch<ProjectSummary[]>('/projects', { cookie }),
    apiFetch<BudgetSourceSummary[]>('/budget-sources', { cookie }),
  ]);

  return (
    <AppShell user={user}>
      <h1 className="text-xl font-semibold text-slate-800">สร้างคำขอซื้อ</h1>
      <p className="text-sm text-slate-500">
        กรอกรายละเอียดและรายการพัสดุ — ใช้ AI ช่วยแยกรายการจากข้อความได้
      </p>
      <div className="mt-6">
        <PurchaseRequestForm
          mode="create"
          projects={projects}
          budgetSources={budgetSources}
          redirectTo="/requests"
          submitLabel="บันทึกร่าง"
        />
      </div>
    </AppShell>
  );
}
