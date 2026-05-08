import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { PR_STATUS_LABELS_TH, type PurchaseRequestStatus } from '@ai-market/shared';
import { PrintTrigger } from './print-trigger';

interface PrDetail {
  id: string;
  schoolId: string;
  docNo: string | null;
  title: string;
  reason: string;
  status: PurchaseRequestStatus;
  totalAmount: string | null;
  submittedAt: string | null;
  createdAt: string;
  requester: { id: string; fullName: string; email: string };
  items: Array<{
    id: string;
    ordinal: number;
    name: string;
    quantity: string;
    unit: string;
    unitPriceEst: string | null;
    notes: string | null;
    specifications: Array<{ key: string; value: string; level: string; source: string }>;
  }>;
  riskFlags: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    dismissedAt: string | null;
  }>;
}

export const metadata = {
  title: 'เอกสารคำขอซื้อ — สำหรับพิมพ์',
};

export default async function PrintPrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();
  const cookieStore = await cookies();

  let pr: PrDetail;
  try {
    pr = await apiFetch<PrDetail>(`/purchase-requests/${id}`, {
      cookie: cookieStore.toString(),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const total = pr.items.reduce((sum, it) => {
    const q = Number(it.quantity);
    const p = it.unitPriceEst != null ? Number(it.unitPriceEst) : 0;
    return sum + q * p;
  }, 0);

  const activeFlags = pr.riskFlags.filter((f) => !f.dismissedAt);

  return (
    <div className="bg-white text-black print:bg-white">
      <PrintTrigger />

      <div className="mx-auto max-w-[210mm] p-8 print:p-0 print:max-w-none">
        <div className="flex justify-end gap-2 print:hidden">
          <button
            onClick={null as never}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white"
            id="print-button"
          >
            พิมพ์ / บันทึกเป็น PDF (Ctrl+P)
          </button>
          <a
            href={`/requests/${id}`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            กลับ
          </a>
        </div>

        <header className="mt-6 border-b-2 border-black pb-4 print:mt-0">
          <p className="text-center text-xl font-bold">บันทึกข้อความ</p>
          <div className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
            <div>
              <span className="font-medium">เลขที่:</span>{' '}
              {pr.docNo ?? '— (ยังไม่ได้กำหนดเลขที่)'}
            </div>
            <div className="text-right">
              <span className="font-medium">วันที่:</span>{' '}
              {(pr.submittedAt
                ? new Date(pr.submittedAt)
                : new Date(pr.createdAt)
              ).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div className="col-span-2">
              <span className="font-medium">เรื่อง:</span> {pr.title}
            </div>
            <div className="col-span-2">
              <span className="font-medium">เรียน:</span> ผู้อำนวยการสถานศึกษา
            </div>
          </div>
        </header>

        <section className="mt-4 text-sm leading-relaxed">
          <p className="indent-8">
            ด้วย {pr.requester.fullName} มีความประสงค์ขอซื้อพัสดุ ดังรายละเอียดต่อไปนี้
          </p>
          <p className="mt-2 indent-8">
            <strong>เหตุผลความจำเป็น:</strong> {pr.reason}
          </p>
        </section>

        <section className="mt-4">
          <p className="text-sm font-semibold">รายการพัสดุที่ขอซื้อ</p>
          <table className="mt-2 w-full border-collapse text-xs">
            <thead>
              <tr className="border border-black bg-slate-100">
                <th className="border border-black px-2 py-1 text-center">ลำดับ</th>
                <th className="border border-black px-2 py-1 text-left">รายการ</th>
                <th className="border border-black px-2 py-1 text-right">จำนวน</th>
                <th className="border border-black px-2 py-1 text-center">หน่วย</th>
                <th className="border border-black px-2 py-1 text-right">ราคา/หน่วย</th>
                <th className="border border-black px-2 py-1 text-right">รวม</th>
              </tr>
            </thead>
            <tbody>
              {pr.items.map((it) => {
                const q = Number(it.quantity);
                const p = it.unitPriceEst != null ? Number(it.unitPriceEst) : null;
                return (
                  <tr key={it.id} className="align-top">
                    <td className="border border-black px-2 py-1 text-center">{it.ordinal}</td>
                    <td className="border border-black px-2 py-1">
                      <div>{it.name}</div>
                      {it.specifications.length > 0 && (
                        <ul className="mt-0.5 list-disc pl-4 text-[10px] text-slate-700">
                          {it.specifications.map((s, i) => (
                            <li key={i}>
                              {s.key}: {s.value}
                            </li>
                          ))}
                        </ul>
                      )}
                      {it.notes && (
                        <div className="mt-0.5 text-[10px] italic text-slate-700">
                          {it.notes}
                        </div>
                      )}
                    </td>
                    <td className="border border-black px-2 py-1 text-right">{q}</td>
                    <td className="border border-black px-2 py-1 text-center">{it.unit}</td>
                    <td className="border border-black px-2 py-1 text-right">
                      {p != null ? p.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="border border-black px-2 py-1 text-right">
                      {p != null
                        ? (q * p).toLocaleString('th-TH', { minimumFractionDigits: 2 })
                        : '—'}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={5} className="border border-black px-2 py-1 text-right font-medium">
                  รวมเป็นเงินทั้งสิ้น
                </td>
                <td className="border border-black px-2 py-1 text-right font-medium">
                  {total > 0
                    ? total.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                    : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {activeFlags.length > 0 && (
          <section className="mt-4 break-inside-avoid">
            <p className="text-sm font-semibold">ข้อสังเกตจากระบบ AI ตรวจสอบเบื้องต้น</p>
            <ul className="mt-1 list-disc pl-6 text-xs">
              {activeFlags.map((f) => (
                <li key={f.id}>
                  [{f.severity}] {f.message}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[10px] italic text-slate-600">
              * ข้อสังเกตข้างต้นเป็นการประเมินเบื้องต้นโดย AI โปรดใช้ดุลพินิจของเจ้าหน้าที่ในการตรวจสอบ
            </p>
          </section>
        )}

        <section className="mt-6 break-inside-avoid">
          <p className="indent-8 text-sm">
            จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ
          </p>

          <div className="mt-12 grid grid-cols-2 gap-12 text-center text-sm">
            <div>
              <p>(ลงชื่อ) ............................................</p>
              <p className="mt-1">( {pr.requester.fullName} )</p>
              <p className="text-xs text-slate-700">ผู้ขอซื้อ</p>
            </div>
            <div>
              <p>(ลงชื่อ) ............................................</p>
              <p className="mt-1">( ............................................ )</p>
              <p className="text-xs text-slate-700">ผู้บังคับบัญชา</p>
            </div>
          </div>

          <div className="mt-12 text-center text-sm">
            <p>(ลงชื่อ) ............................................</p>
            <p className="mt-1">( ............................................ )</p>
            <p className="text-xs text-slate-700">ผู้อำนวยการสถานศึกษา</p>
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-300 pt-2 text-[10px] text-slate-500 print:fixed print:bottom-2 print:left-8 print:right-8">
          เลขที่ {pr.docNo ?? '—'} · สถานะ {PR_STATUS_LABELS_TH[pr.status]} · พิมพ์เมื่อ{' '}
          {new Date().toLocaleString('th-TH')} · ระบบ AI Market
        </footer>
      </div>
    </div>
  );
}
