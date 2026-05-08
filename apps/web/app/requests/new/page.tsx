import { requireUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { PurchaseRequestForm } from '@/components/purchase-request-form';

export default async function NewRequestPage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <h1 className="text-xl font-semibold text-slate-800">สร้างคำขอซื้อ</h1>
      <p className="text-sm text-slate-500">
        กรอกรายละเอียดและรายการพัสดุ — ใช้ AI ช่วยแยกรายการจากข้อความได้
      </p>
      <div className="mt-6">
        <PurchaseRequestForm mode="create" redirectTo="/requests" submitLabel="บันทึกร่าง" />
      </div>
    </AppShell>
  );
}
