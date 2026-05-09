'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

export function RenderDocumentButton({
  prId,
  templateKey,
}: {
  prId: string;
  templateKey: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function render() {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/purchase-requests/${prId}/documents/render`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateKey }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        alert(json?.error?.message ?? `Render ไม่สำเร็จ (${res.status})`);
        return;
      }
      // Open the rendered document in a new tab + refresh history list.
      if (json?.data?.id) {
        window.open(`/documents/${json.data.id}`, '_blank');
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      icon="FileText"
      onClick={render}
      disabled={busy}
      className="shrink-0"
    >
      {busy ? 'กำลังออก...' : 'ออกเอกสาร'}
    </Button>
  );
}
