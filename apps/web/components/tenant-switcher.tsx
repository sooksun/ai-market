'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronsUpDown, CheckIcon, Loader2, MapPin } from 'lucide-react';
import type { TenantsResponse } from '@ai-market/shared';
import { classNames } from './ui/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

export function TenantSwitcher({
  initialSchoolId,
}: {
  initialSchoolId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<TenantsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Lazy-load tenant list when first opened.
  useEffect(() => {
    if (!open || data) return;
    setLoading(true);
    fetch(`${API_URL}/auth/tenants`, { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (j && typeof j === 'object' && 'data' in j) {
          setData((j as { data: TenantsResponse }).data);
        }
      })
      .finally(() => setLoading(false));
  }, [open, data]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function switchTo(schoolId: string) {
    if (schoolId === data?.current.schoolId) {
      setOpen(false);
      return;
    }
    setSwitching(schoolId);
    try {
      const res = await fetch(`${API_URL}/auth/switch-tenant`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const msg =
          err && typeof err === 'object' && 'error' in err
            ? (err as { error: { message: string } }).error.message
            : `HTTP ${res.status}`;
        alert(`สลับโรงเรียนไม่สำเร็จ: ${msg}`);
        return;
      }
      setData(null);
      setOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setSwitching(null);
    }
  }

  // Group schools by area for the dropdown.
  const groups = (() => {
    if (!data) return [];
    const map = new Map<
      string,
      { areaId: string | null; areaCode: string | null; areaName: string; schools: TenantsResponse['schools'] }
    >();
    for (const s of data.schools) {
      const key = s.area?.id ?? '__none__';
      const cur =
        map.get(key) ??
        {
          areaId: s.area?.id ?? null,
          areaCode: s.area?.code ?? null,
          areaName: s.area?.name ?? 'ไม่ระบุเขต',
          schools: [] as TenantsResponse['schools'],
        };
      cur.schools.push(s);
      map.set(key, cur);
    }
    return Array.from(map.values());
  })();

  const currentLabel = data?.current.schoolName ?? initialSchoolId;
  const currentSub = data?.current.areaName ?? 'ปีงบประมาณปัจจุบัน';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-xl bg-white dark:bg-ink-800/60 border border-ink-200 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-700 transition-colors text-left"
      >
        <span className="grid place-items-center w-7 h-7 rounded-lg grad-brand text-white shrink-0">
          <Building2 className="w-3.5 h-3.5" strokeWidth={2} />
        </span>
        <div className="min-w-0 max-w-[210px]">
          <div className="text-[12.5px] font-semibold text-ink-900 dark:text-white truncate leading-tight">
            {currentLabel}
          </div>
          <div className="text-[10.5px] text-ink-400 dark:text-ink-300 truncate leading-tight">
            {currentSub}
          </div>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-ink-400 dark:text-ink-300 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 w-[360px] rounded-2xl bg-white dark:bg-ink-800 border border-ink-200 dark:border-white/10 shadow-pop z-40 overflow-hidden fade-up">
          <div className="px-4 py-3 border-b border-ink-100 dark:border-white/5">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-400 dark:text-ink-300">
              เลือกโรงเรียน
            </div>
            {data && !data.canSwitch && (
              <div className="mt-1 text-[11px] text-ink-400 dark:text-ink-300">
                คุณมีสิทธิ์เฉพาะโรงเรียนของตัวเอง
              </div>
            )}
          </div>

          {loading && !data ? (
            <div className="flex items-center gap-2 px-4 py-6 text-xs text-ink-400 dark:text-ink-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              กำลังโหลดรายการโรงเรียน...
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {groups.map((g) => (
                <div key={g.areaId ?? 'none'} className="border-b border-ink-100 dark:border-white/5 last:border-b-0">
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-ink-50/60 dark:bg-ink-900/40">
                    <MapPin className="w-3 h-3 text-ink-400 dark:text-ink-300" />
                    <span className="text-[11px] font-medium text-ink-500 dark:text-ink-300">
                      {g.areaCode ? `${g.areaCode} · ${g.areaName}` : g.areaName}
                    </span>
                  </div>
                  <ul>
                    {g.schools.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          disabled={switching !== null}
                          onClick={() => switchTo(s.id)}
                          className={classNames(
                            'w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-ink-50 dark:hover:bg-ink-900/40 transition-colors',
                            s.isCurrent && 'bg-brand-50/40 dark:bg-brand-900/20',
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-ink-900 dark:text-white truncate">
                              {s.name}
                            </div>
                            {s.shortName && (
                              <div className="text-[11px] text-ink-400 dark:text-ink-300 truncate">
                                {s.shortName}
                              </div>
                            )}
                          </div>
                          {s.isHome && !s.isCurrent && (
                            <span className="rounded-md bg-brand-100 dark:bg-brand-900/40 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:text-brand-200">
                              บ้าน
                            </span>
                          )}
                          {s.isCurrent && (
                            <CheckIcon className="w-4 h-4 text-brand-600 dark:text-brand-300" />
                          )}
                          {switching === s.id && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {groups.length === 0 && data && (
                <div className="px-4 py-6 text-center text-xs text-ink-400 dark:text-ink-300">
                  ไม่พบโรงเรียนในรายการ
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
