'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckIcon, Loader2 } from 'lucide-react';
import { classNames } from './ui/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';
const POLL_INTERVAL_MS = 60_000;

type NotificationType =
  | 'PR_RETURNED'
  | 'PR_APPROVED'
  | 'PR_REJECTED'
  | 'APPROVAL_PENDING'
  | 'RECEIVING_PENDING'
  | 'RISK_FLAG_NEW'
  | 'OTHER';

interface NotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  refType: string | null;
  refId: string | null;
  readAt: string | null;
  createdAt: string;
}

const TYPE_TONE: Record<NotificationType, string> = {
  PR_RETURNED: 'bg-amber-500',
  PR_APPROVED: 'bg-emerald-500',
  PR_REJECTED: 'bg-rose-500',
  APPROVAL_PENDING: 'bg-brand-500',
  RECEIVING_PENDING: 'bg-sky-500',
  RISK_FLAG_NEW: 'bg-rose-500',
  OTHER: 'bg-ink-400',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'เมื่อสักครู่';
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชม. ที่แล้ว`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString('th-TH');
}

function refHref(n: NotificationRow): string | null {
  if (!n.refType || !n.refId) return null;
  if (n.refType === 'PurchaseRequest') return `/requests/${n.refId}`;
  return null;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Lightweight unread-count poll.
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch(`${API_URL}/notifications/count`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = await res.json();
        const count = (json?.data?.unread ?? json?.unread ?? 0) as number;
        if (!cancelled) setUnread(count);
      } catch {
        // ignore — not network-critical
      }
    }
    void tick();
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Lazy-load list when first opened.
  useEffect(() => {
    if (!open || items !== null) return;
    setLoading(true);
    fetch(`${API_URL}/notifications?limit=20`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((j) => {
        const list = (j?.data ?? j) as NotificationRow[];
        if (Array.isArray(list)) setItems(list);
      })
      .finally(() => setLoading(false));
  }, [open, items]);

  // Outside click to close.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function markRead(n: NotificationRow) {
    if (n.readAt) return;
    try {
      await fetch(`${API_URL}/notifications/${n.id}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      setItems((cur) =>
        cur ? cur.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) : cur,
      );
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
      });
      setItems((cur) =>
        cur
          ? cur.map((x) => (x.readAt ? x : { ...x, readAt: new Date().toISOString() }))
          : cur,
      );
      setUnread(0);
    } catch {
      // ignore
    }
  }

  function onClickItem(n: NotificationRow) {
    void markRead(n);
    const href = refHref(n);
    setOpen(false);
    if (href) router.push(href as never);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-ink-100/70 dark:hover:bg-ink-800/40 text-ink-500 dark:text-ink-300"
        aria-label="การแจ้งเตือน"
      >
        <Bell className="w-4 h-4" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 w-[360px] rounded-2xl bg-white dark:bg-ink-800 border border-ink-200 dark:border-white/10 shadow-pop z-40 overflow-hidden fade-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-white/5">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-400 dark:text-ink-300">
              การแจ้งเตือน
              {unread > 0 && (
                <span className="ml-1 normal-case text-rose-600 dark:text-rose-300">
                  · {unread} ใหม่
                </span>
              )}
            </div>
            {items && items.some((x) => !x.readAt) && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] text-brand-600 dark:text-brand-300 hover:underline"
              >
                อ่านทั้งหมด
              </button>
            )}
          </div>

          {loading && !items ? (
            <div className="flex items-center gap-2 px-4 py-6 text-xs text-ink-400 dark:text-ink-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              กำลังโหลด...
            </div>
          ) : !items || items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <CheckIcon className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
              <p className="text-xs text-ink-400 dark:text-ink-300">ไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto divide-y divide-ink-100 dark:divide-white/5">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onClickItem(n)}
                    className={classNames(
                      'w-full text-left px-4 py-3 hover:bg-ink-50 dark:hover:bg-ink-900/40 transition-colors',
                      !n.readAt && 'bg-brand-50/30 dark:bg-brand-900/15',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={classNames(
                          'mt-1.5 w-2 h-2 rounded-full shrink-0',
                          n.readAt ? 'bg-ink-200 dark:bg-ink-600' : TYPE_TONE[n.type],
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-ink-900 dark:text-white truncate">
                          {n.title}
                        </div>
                        {n.body && (
                          <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-300 line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        <div className="mt-1 text-[11px] text-ink-400 dark:text-ink-300 tabular-nums">
                          {timeAgo(n.createdAt)}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
