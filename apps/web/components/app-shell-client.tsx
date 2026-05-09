'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Building2,
  CheckIcon,
  ChevronRight,
  ChevronsUpDown,
  Moon,
  PanelLeft,
  Plus,
  Search,
  Sparkles,
  Sun,
  X,
  type LucideIcon,
} from 'lucide-react';
import * as Lucide from 'lucide-react';
import { Avatar } from './ui/avatar';
import { classNames } from './ui/format';

export interface NavItemResolved {
  href: string;
  label: string;
  icon: string;
  group: 'main' | 'ops' | 'audit';
  ai?: boolean;
}

export interface AppShellClientProps {
  navItems: NavItemResolved[];
  groupTitles: Record<'main' | 'ops' | 'audit', string>;
  user: {
    id: string;
    fullName: string;
    schoolId: string;
    roleLabels: string[];
    primaryRoleLabel: string;
  };
  brand: { name: string; tagline: string };
  copilotComingSoon: string;
  searchPlaceholder: string;
  logoutLabel: string;
  newRequestLabel: string;
  copilotLabel: string;
  children: React.ReactNode;
}

function resolveIcon(name: string): LucideIcon | null {
  // Convert kebab-case "layout-dashboard" → "LayoutDashboard"
  const pascal = name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  return (Lucide as unknown as Record<string, LucideIcon>)[pascal] ?? null;
}

export function AppShellClient({
  navItems,
  groupTitles,
  user,
  brand,
  copilotComingSoon,
  searchPlaceholder,
  logoutLabel,
  newRequestLabel,
  copilotLabel,
  children,
}: AppShellClientProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }

  const groupOrder: Array<'main' | 'ops' | 'audit'> = ['main', 'ops', 'audit'];

  return (
    <div className="min-h-screen flex relative aurora">
      <aside
        className={classNames(
          'shrink-0 border-r border-ink-100 dark:border-white/5 bg-white/70 dark:bg-ink-900/60 backdrop-blur-sm transition-all duration-300 relative z-10',
          collapsed ? 'w-[72px]' : 'w-[260px]',
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-ink-100 dark:border-white/5">
          {collapsed ? (
            <Image
              src="/finprocure-icon.png"
              alt={brand.name}
              width={226}
              height={220}
              priority
              className="h-9 w-auto drop-shadow-sm"
            />
          ) : (
            <Image
              src="/finprocure-fullmark.png"
              alt={`${brand.name} · ${brand.tagline}`}
              width={814}
              height={220}
              priority
              className="h-10 w-auto drop-shadow-sm"
            />
          )}
        </div>
        <nav
          className="py-3 px-2 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 64px)' }}
        >
          {groupOrder.map((gid) => {
            const items = navItems.filter((n) => n.group === gid);
            if (items.length === 0) return null;
            return (
              <div key={gid} className="mb-3">
                {!collapsed && (
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400 dark:text-ink-300">
                    {groupTitles[gid]}
                  </div>
                )}
                <ul className="space-y-0.5">
                  {items.map((n) => {
                    const isActive =
                      pathname === n.href ||
                      (n.href !== '/' && pathname.startsWith(n.href + '/'));
                    const Cmp = resolveIcon(n.icon);
                    return (
                      <li key={n.href}>
                        <Link
                          href={n.href as never}
                          title={collapsed ? n.label : undefined}
                          className={classNames(
                            'w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all text-left relative',
                            isActive
                              ? 'bg-gradient-to-r from-brand-500/10 to-brand-500/0 text-brand-700 dark:text-brand-200 ring-1 ring-brand-200/60 dark:ring-brand-700/30'
                              : 'text-ink-600 dark:text-ink-200 hover:bg-ink-100/70 dark:hover:bg-ink-800/40',
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r grad-brand" />
                          )}
                          {Cmp && (
                            <Cmp
                              className={classNames(
                                'w-4 h-4 shrink-0',
                                isActive && 'text-brand-600 dark:text-brand-300',
                              )}
                              strokeWidth={1.75}
                            />
                          )}
                          {!collapsed && (
                            <>
                              <span className="text-[14px] font-medium truncate flex-1">
                                {n.label}
                              </span>
                              {n.ai && (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded grad-brand text-white">
                                  AI
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {!collapsed && (
            <div className="m-2 mt-4 p-3 rounded-2xl grad-brand-soft border border-brand-100 dark:border-brand-800/40">
              <div className="flex items-center gap-2">
                <span className="grid place-items-center w-7 h-7 rounded-lg grad-brand text-white">
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                </span>
                <div className="text-[12.5px] font-semibold text-brand-800 dark:text-brand-100">
                  FinProcure Co-pilot
                </div>
              </div>
              <p className="mt-1.5 text-[11.5px] text-ink-600 dark:text-ink-200 leading-relaxed">
                ผู้ช่วยการเงินและพัสดุ — ตรวจสเปก เปรียบเทียบราคา ตรวจงบประมาณ และเตือนความเสี่ยง
              </p>
              <div className="mt-2 text-[10px] text-ink-400 dark:text-ink-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ทำงานปกติ
              </div>
            </div>
          )}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        <header className="h-16 px-4 sm:px-6 flex items-center gap-3 border-b border-ink-100 dark:border-white/5 glass sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-2 rounded-lg hover:bg-ink-100/70 dark:hover:bg-ink-800/40 text-ink-500 dark:text-ink-300"
          >
            <PanelLeft className="w-4 h-4" strokeWidth={1.75} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setTenantOpen((o) => !o)}
              className="flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-xl bg-white dark:bg-ink-800/60 border border-ink-200 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-700 transition-colors text-left"
            >
              <span className="grid place-items-center w-7 h-7 rounded-lg grad-brand text-white shrink-0">
                <Building2 className="w-3.5 h-3.5" strokeWidth={2} />
              </span>
              <div className="min-w-0 max-w-[210px]">
                <div className="text-[12.5px] font-semibold text-ink-900 dark:text-white truncate leading-tight">
                  {user.schoolId}
                </div>
                <div className="text-[10.5px] text-ink-400 dark:text-ink-300 truncate leading-tight">
                  ปีงบประมาณปัจจุบัน
                </div>
              </div>
              <ChevronsUpDown className="w-3.5 h-3.5 text-ink-400 dark:text-ink-300 shrink-0" />
            </button>
            {tenantOpen && (
              <div className="absolute top-full mt-2 left-0 w-[320px] rounded-2xl bg-white dark:bg-ink-800 border border-ink-200 dark:border-white/10 shadow-pop z-40 overflow-hidden fade-up p-4">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-400 dark:text-ink-300 mb-2">
                  Multi-tenant (เร็ว ๆ นี้)
                </div>
                <p className="text-xs text-ink-600 dark:text-ink-200">
                  ปัจจุบันใช้ school_id เดียว: <code className="font-mono">{user.schoolId}</code>
                </p>
                <p className="mt-2 text-[11px] text-ink-400 dark:text-ink-300">
                  Phase 5 จะเปิด switcher เขต/โรงเรียน/ปีงบประมาณ
                </p>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setTenantOpen(false)}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="hidden xl:flex items-center gap-1.5 text-[12px] text-ink-400 dark:text-ink-300 ml-2">
            <ChevronRight className="w-3 h-3" strokeWidth={1.75} />
            <span className="text-ink-700 dark:text-ink-100 font-medium">
              {navItems.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))
                ?.label ?? ''}
            </span>
          </div>

          <div className="flex-1" />

          <div className="hidden md:flex items-center w-72 lg:w-96 relative">
            <Search className="absolute left-3 w-4 h-4 text-ink-300 pointer-events-none" />
            <input
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-16 py-2 rounded-xl bg-white/80 dark:bg-ink-900/40 border border-ink-200 dark:border-white/10 text-sm placeholder:text-ink-300 dark:placeholder:text-ink-400 focus:border-brand-400 outline-none"
            />
            <kbd className="absolute right-2 hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-ink-100 dark:bg-ink-800 text-ink-500 dark:text-ink-300">
              ⌘ K
            </kbd>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-ink-100/70 dark:hover:bg-ink-800/40 text-ink-500 dark:text-ink-300"
            title="สลับโหมด"
          >
            {dark ? (
              <Sun className="w-4 h-4" strokeWidth={1.75} />
            ) : (
              <Moon className="w-4 h-4" strokeWidth={1.75} />
            )}
          </button>
          <button
            type="button"
            className="relative p-2 rounded-lg hover:bg-ink-100/70 dark:hover:bg-ink-800/40 text-ink-500 dark:text-ink-300"
          >
            <Bell className="w-4 h-4" strokeWidth={1.75} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
          </button>
          <button
            type="button"
            onClick={() => setCopilotOpen(true)}
            className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl grad-brand-soft text-brand-700 dark:text-brand-200 ring-1 ring-brand-200/60 dark:ring-brand-700/40 hover:shadow-pop transition-shadow"
          >
            <Sparkles className="w-4 h-4" strokeWidth={1.75} />
            <span className="text-[13px] font-medium">{copilotLabel}</span>
          </button>

          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-ink-100 dark:border-white/5">
            <Avatar name={user.fullName} size={34} />
            <div className="hidden lg:block leading-tight">
              <div className="text-[13px] font-semibold text-ink-900 dark:text-white">
                {user.fullName}
              </div>
              <div className="text-[11px] text-ink-400 dark:text-ink-300">
                {user.primaryRoleLabel}
              </div>
            </div>
            <form action="/api/logout" method="post">
              <button
                type="submit"
                title={logoutLabel}
                className="ml-1 p-1.5 rounded-lg text-ink-400 dark:text-ink-300 hover:bg-ink-100/70 dark:hover:bg-ink-800/40"
              >
                <Lucide.LogOut className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-7 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>

      {/* Co-pilot panel (stub) */}
      <aside
        className={classNames(
          'fixed top-0 right-0 h-screen w-[380px] z-40 transition-transform duration-300 ease-out',
          copilotOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="h-full flex flex-col bg-white dark:bg-ink-900 border-l border-ink-100 dark:border-white/5 shadow-2xl">
          <div className="p-4 border-b border-ink-100 dark:border-white/5 flex items-center gap-3">
            <span className="grid place-items-center w-9 h-9 rounded-xl grad-brand text-white">
              <Sparkles className="w-4 h-4" strokeWidth={2} />
            </span>
            <div>
              <div className="font-semibold text-ink-900 dark:text-white">FinProcure Co-pilot</div>
              <div className="text-[11px] text-ink-400 dark:text-ink-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {copilotComingSoon}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCopilotOpen(false)}
              className="ml-auto p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="rounded-2xl bg-ink-50 dark:bg-ink-800/60 p-4 text-sm leading-relaxed text-ink-700 dark:text-ink-100">
              <div className="flex gap-2 mb-2">
                <span className="grid place-items-center w-7 h-7 rounded-lg grad-brand text-white shrink-0">
                  <Sparkles className="w-3 h-3" strokeWidth={2} />
                </span>
                <div className="font-medium">AI ที่เปิดใช้แล้ว</div>
              </div>
              <ul className="text-[13px] text-ink-600 dark:text-ink-200 space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <CheckIcon className="w-3 h-3 mt-1 shrink-0 text-emerald-500" />
                  <span>
                    <code className="font-mono">parse-items</code> — แยกรายการพัสดุจากข้อความ ·
                    upload .xlsx/.csv ก็ได้
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckIcon className="w-3 h-3 mt-1 shrink-0 text-emerald-500" />
                  <span>
                    <code className="font-mono">check-cloudiness</code> — ตรวจสเปกคลุมเครือ /
                    คำเสี่ยงล็อกยี่ห้อ ตอน submit
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckIcon className="w-3 h-3 mt-1 shrink-0 text-emerald-500" />
                  <span>
                    <code className="font-mono">spec-writer</code> — เขียนสเปกใหม่ให้เป็นกลาง
                    วัดได้ พร้อมเกณฑ์ตรวจรับ (ปุ่มในหน้าคำขอ)
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-dashed border-ink-200 dark:border-white/10 p-4 text-[12px] text-ink-500 dark:text-ink-300 leading-relaxed">
              <div className="flex items-center gap-1.5 font-medium text-ink-700 dark:text-ink-100 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                Chat co-pilot (เร็ว ๆ นี้)
              </div>
              <p>
                Phase 5 (AI Audit) จะเปิด chat-style co-pilot ในปุ่มนี้ —
                ถาม-ตอบบริบทคำขอซื้อ/งบประมาณ/ความเสี่ยง พร้อมแหล่งข้อมูลกำกับทุกคำตอบ
              </p>
            </div>

            <div className="text-center text-[10.5px] text-ink-400 dark:text-ink-300">
              <CheckIcon className="w-3 h-3 mx-auto text-emerald-500 mb-0.5" />
              AI ทุก action ถูกบันทึกใน <code className="font-mono">ai_invocations</code> ·
              ผู้ใช้เป็นผู้ตัดสินใจสุดท้ายเสมอ
            </div>
          </div>
        </div>
      </aside>
      {copilotOpen && (
        <button
          type="button"
          aria-label="close"
          onClick={() => setCopilotOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
        />
      )}

      {/* FAB */}
      <Link
        href={'/requests/new' as never}
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 pl-4 pr-5 py-3 rounded-full grad-brand text-white shadow-pop hover:scale-[1.02] transition-transform"
      >
        <Plus className="w-5 h-5" strokeWidth={2.5} />
        <span className="font-semibold">{newRequestLabel}</span>
      </Link>
    </div>
  );
}
