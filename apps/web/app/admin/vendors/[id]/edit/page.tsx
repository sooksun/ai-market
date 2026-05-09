import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { VendorForm } from '../../vendor-form';

interface VendorDetail {
  id: string;
  name: string;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  rating: number | null;
  notes: string | null;
  active: boolean;
}

const ALLOWED = ['PROCUREMENT', 'ADMIN'];

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!user.roles.some((r) => ALLOWED.includes(r))) {
    redirect('/requests');
  }
  const cookieStore = await cookies();
  let vendor: VendorDetail;
  try {
    vendor = await apiFetch<VendorDetail>(`/vendors/${id}`, {
      cookie: cookieStore.toString(),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <AppShell user={user}>
      <div className="fade-up max-w-2xl">
        <Link
          href={'/admin/vendors' as never}
          className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300 hover:underline mb-2"
        >
          <Icon name="ChevronLeft" className="w-3 h-3" />
          กลับไปทะเบียนผู้ขาย
        </Link>
        <PageHeader eyebrow={vendor.name} title="แก้ไขผู้ขาย" />
        <VendorForm
          mode="edit"
          id={vendor.id}
          initial={{
            name: vendor.name,
            taxId: vendor.taxId,
            phone: vendor.phone,
            email: vendor.email,
            address: vendor.address,
            rating: vendor.rating,
            notes: vendor.notes,
            active: vendor.active,
          }}
        />
      </div>
    </AppShell>
  );
}
