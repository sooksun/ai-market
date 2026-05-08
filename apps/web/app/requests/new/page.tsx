import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PurchaseRequestForm } from '@/components/purchase-request-form';
import { PageHeader } from '@/components/ui/page-header';
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
      <div className="fade-up">
        <PageHeader
          eyebrow="คำขอซื้อใหม่"
          title="สร้างคำขอซื้อ/จ้าง"
          subtitle="กรอกข้อมูลให้ครบถ้วน · AI ช่วยแยกรายการจากข้อความหรือไฟล์ Excel/CSV ได้"
        />
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
