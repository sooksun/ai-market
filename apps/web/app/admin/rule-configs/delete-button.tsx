'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

export function DeleteRuleButton({ id, ruleKey }: { id: string; ruleKey: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`ยืนยันลบ rule "${ruleKey}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/rule-configs/${id}`, {
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
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? 'กำลังลบ...' : 'ลบ'}
    </button>
  );
}
