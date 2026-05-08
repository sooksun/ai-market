'use client';

import { useState } from 'react';
import Link from 'next/link';

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
      <tr className="border-t border-slate-100 hover:bg-slate-50">
        <td className="px-4 py-3 align-top text-xs text-slate-600">
          {new Date(log.createdAt).toLocaleString('th-TH')}
        </td>
        <td className="px-4 py-3 align-top">
          {log.user ? (
            <>
              <div className="text-sm text-slate-800">{log.user.fullName}</div>
              <div className="text-xs text-slate-500">{log.user.email}</div>
            </>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          <div className="text-sm text-slate-800">{actionLabel}</div>
          <div className="font-mono text-[10px] text-slate-400">{log.action}</div>
        </td>
        <td className="px-4 py-3 align-top">
          <div className="text-sm text-slate-700">{entityLabel}</div>
          {log.entityId && (
            <div className="font-mono text-[10px] text-slate-400">
              {log.entityType === 'PurchaseRequest' ? (
                <Link
                  href={`/requests/${log.entityId}` as never}
                  className="hover:text-brand-600 hover:underline"
                >
                  {log.entityId}
                </Link>
              ) : (
                log.entityId
              )}
            </div>
          )}
          {log.ip && <div className="text-[10px] text-slate-400">IP: {log.ip}</div>}
        </td>
        <td className="px-4 py-3 align-top">
          {(hasBefore || hasAfter) && (
            <button
              onClick={() => setOpen(!open)}
              className="text-xs text-brand-600 hover:underline"
            >
              {open ? '▴' : '▾'}
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-600">ก่อน</p>
                <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-white p-3 text-[11px] font-mono text-slate-700 ring-1 ring-slate-200">
                  {hasBefore ? JSON.stringify(log.before, null, 2) : '—'}
                </pre>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600">หลัง</p>
                <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-white p-3 text-[11px] font-mono text-slate-700 ring-1 ring-slate-200">
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
