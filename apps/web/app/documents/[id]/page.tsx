import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { PrintTrigger } from './print-trigger';

interface DocumentDetail {
  id: string;
  templateKey: string;
  templateVersion: number;
  title: string;
  docNo: string | null;
  renderedHtml: string;
  generatedAt: string;
}

export const metadata = {
  title: 'เอกสาร — สำหรับพิมพ์',
};

export default async function DocumentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();
  const cookieStore = await cookies();

  let doc: DocumentDetail;
  try {
    doc = await apiFetch<DocumentDetail>(`/documents/${id}`, {
      cookie: cookieStore.toString(),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="bg-white text-black min-h-screen">
      <PrintTrigger />
      <div className="mx-auto max-w-[210mm] px-6 pt-4 pb-12 print:p-0 print:max-w-none">
        <div className="flex justify-end gap-2 print:hidden mb-2">
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1'}/documents/${doc.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ดาวน์โหลด PDF
          </a>
          <button
            id="print-button"
            type="button"
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            พิมพ์ในเบราว์เซอร์ (Ctrl+P)
          </button>
        </div>
        {/* Rendered template HTML — admin-controlled, escaped at template level by Handlebars */}
        <div dangerouslySetInnerHTML={{ __html: doc.renderedHtml }} />
        <p className="mt-6 border-t pt-2 text-[10px] text-slate-500 print:hidden">
          เอกสาร <code>{doc.templateKey}</code> v{doc.templateVersion} · ออกเมื่อ{' '}
          {new Date(doc.generatedAt).toLocaleString('th-TH')}
        </p>
      </div>
    </div>
  );
}
