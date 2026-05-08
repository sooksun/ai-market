'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

export function DeleteBudgetSourceButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`ยืนยันลบแหล่งงบ "${name}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/budget-sources/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.error?.message ?? `ลบไม่สำเร็จ (${res.status})`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      variant="outline"
      size="sm"
      icon="Trash2"
      className="text-rose-700 dark:text-rose-300 ring-rose-300/60 dark:ring-rose-700/40 hover:bg-rose-50 dark:hover:bg-rose-900/30"
    >
      {busy ? 'กำลังลบ...' : 'ลบ'}
    </Button>
  );
}
