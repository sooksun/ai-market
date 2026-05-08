'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

interface Log {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; fullName: string; email: string } | null;
}

export function AuditLogRow({
  log,
  actionLabel,
  entityLabel,
}: {
  log: Log;
  actionLabel: string;
  entityLabel: string;
}) {
  const [open, setOpen] = useState(false);

  const hasBefore = log.before !== null && log.before !== undefined;
  const hasAfter = log.after !== null && log.after !== undefined;

  return (
    <>
      <tr className="hover:bg-ink-50/50 dark:hover:bg-ink-800/40 transition-colors">
        <td className="px-4 py-3 align-top text-xs text-ink-500 dark:text-ink-300 tabular-nums">
          {new Date(log.createdAt).toLocaleString('th-TH')}
        </td>
        <td className="px-4 py-3 align-top">
          {log.user ? (
            <>
              <div className="text-sm text-ink-900 dark:text-white">{log.user.fullName}</div>
              <div className="text-xs text-ink-400 dark:text-ink-300">{log.user.email}</div>
            </>
          ) : (
            <span className="text-xs text-ink-400 dark:text-ink-300">—</span>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          <div className="text-sm text-ink-900 dark:text-white">{actionLabel}</div>
          <div className="font-mono text-[10px] text-ink-400 dark:text-ink-300">{log.action}</div>
        </td>
        <td className="px-4 py-3 align-top">
          <div className="text-sm text-ink-700 dark:text-ink-100">{entityLabel}</div>
          {log.entityId && (
            <div className="font-mono text-[10px] text-ink-400 dark:text-ink-300">
              {log.entityType === 'PurchaseRequest' ? (
                <Link
                  href={`/requests/${log.entityId}` as never}
                  className="hover:text-brand-600 dark:hover:text-brand-300 hover:underline"
                >
                  {log.entityId}
                </Link>
              ) : (
                log.entityId
              )}
            </div>
          )}
          {log.ip && (
            <div className="text-[10px] text-ink-400 dark:text-ink-300">IP: {log.ip}</div>
          )}
        </td>
        <td className="px-4 py-3 align-top text-right">
          {(hasBefore || hasAfter) && (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="text-ink-500 dark:text-ink-300 hover:text-brand-600 dark:hover:text-brand-300 p-1 rounded hover:bg-ink-100 dark:hover:bg-ink-800"
              aria-label={open ? 'ย่อ' : 'ขยาย'}
            >
              <Icon name={open ? 'ChevronUp' : 'ChevronDown'} className="w-4 h-4" />
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr className="bg-ink-50/40 dark:bg-ink-900/40">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-ink-600 dark:text-ink-200 mb-1">ก่อน</p>
                <pre className="max-h-64 overflow-auto rounded-xl bg-white dark:bg-ink-900 p-3 text-[11px] font-mono text-ink-700 dark:text-ink-100 ring-1 ring-ink-200 dark:ring-white/10">
                  {hasBefore ? JSON.stringify(log.before, null, 2) : '—'}
                </pre>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-600 dark:text-ink-200 mb-1">หลัง</p>
                <pre className="max-h-64 overflow-auto rounded-xl bg-white dark:bg-ink-900 p-3 text-[11px] font-mono text-ink-700 dark:text-ink-100 ring-1 ring-ink-200 dark:ring-white/10">
                  {hasAfter ? JSON.stringify(log.after, null, 2) : '—'}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
