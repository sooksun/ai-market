import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import {
  DOCUMENT_CATEGORY_LABELS_TH,
  type DocumentCategory,
} from '@ai-market/shared';
import { PageHeader, SectionTitle } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { RenderDocumentButton } from './render-button';

interface PrLite {
  id: string;
  docNo: string | null;
  title: string;
  status: string;
}

interface TemplateRow {
  id: string;
  templateKey: string;
  nameTh: string;
  description: string | null;
  category: DocumentCategory;
  active: boolean;
  version: number;
}

interface DocRow {
  id: string;
  templateKey: string;
  templateVersion: number;
  title: string;
  docNo: string | null;
  generatedAt: string;
  generatedById: string | null;
}

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookie = cookieStore.toString();

  let pr: PrLite;
  try {
    pr = await apiFetch<PrLite>(`/purchase-requests/${id}`, { cookie });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const [templates, history] = await Promise.all([
    apiFetch<TemplateRow[]>('/document-templates', { cookie }),
    apiFetch<DocRow[]>(`/purchase-requests/${id}/documents`, { cookie }),
  ]);

  return (
    <AppShell user={user}>
      <div className="fade-up">
        <Link
          href={`/requests/${id}` as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปคำขอ {pr.docNo ?? pr.title}
        </Link>
        <PageHeader
          eyebrow={`คำขอ ${pr.docNo ?? id}`}
          title="ออกเอกสารราชการ"
          subtitle="เลือก template เพื่อสร้างเอกสารจากข้อมูลคำขอนี้ — ระบบจะบันทึก snapshot HTML + context ทุกครั้ง"
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <SectionTitle
              icon={<Icon name="FilePlus2" className="w-3.5 h-3.5" />}
              title="Template ที่ใช้ได้"
              sub={`${templates.length} รายการ`}
            />
            <ul className="mt-3 space-y-2">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-ink-100 dark:border-white/5 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                        {DOCUMENT_CATEGORY_LABELS_TH[t.category] ?? t.category}
                      </span>
                      <span className="text-sm font-medium text-ink-900 dark:text-white">
                        {t.nameTh}
                      </span>
                    </div>
                    {t.description && (
                      <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">
                        {t.description}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-[10px] text-ink-400 dark:text-ink-300">
                      {t.templateKey} · v{t.version}
                    </p>
                  </div>
                  <RenderDocumentButton prId={pr.id} templateKey={t.templateKey} />
                </li>
              ))}
              {templates.length === 0 && (
                <li className="text-sm text-ink-400 dark:text-ink-300">
                  ยังไม่มี template ในระบบ
                </li>
              )}
            </ul>
          </Card>

          <Card className="p-5">
            <SectionTitle
              icon={<Icon name="History" className="w-3.5 h-3.5" />}
              title="เอกสารที่ออกแล้ว"
              sub={`${history.length} ฉบับ`}
            />
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-ink-400 dark:text-ink-300">
                ยังไม่มีเอกสาร — กดปุ่ม "ออกเอกสาร" ที่ template
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 dark:border-white/5 p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink-900 dark:text-white">
                        {d.title}
                      </div>
                      <div className="text-[11px] text-ink-400 dark:text-ink-300 tabular-nums">
                        {new Date(d.generatedAt).toLocaleString('th-TH')} ·{' '}
                        <span className="font-mono">{d.templateKey} v{d.templateVersion}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/documents/${d.id}` as never}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg border border-ink-200 dark:border-white/10 px-2.5 py-1 text-xs font-medium text-ink-700 dark:text-ink-100 hover:bg-ink-50 dark:hover:bg-ink-800"
                      >
                        <Icon name="Eye" className="w-3.5 h-3.5" />
                        ดู
                      </Link>
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1'}/documents/${d.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 dark:bg-rose-900/40 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60"
                      >
                        <Icon name="FileDown" className="w-3.5 h-3.5" />
                        PDF
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
