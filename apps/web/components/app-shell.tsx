import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { CurrentUser, Role } from '@ai-market/shared';

interface NavItem {
  href: string;
  labelKey: string;
  rolesAny?: Role[];
}

const NAV: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', rolesAny: ['DIRECTOR', 'ADMIN'] },
  { href: '/requests', labelKey: 'requests' },
  { href: '/requests/new', labelKey: 'newRequest' },
  { href: '/inbox', labelKey: 'inbox', rolesAny: ['PROCUREMENT', 'DIRECTOR', 'ADMIN'] },
  { href: '/audit-logs', labelKey: 'auditLogs', rolesAny: ['AUDITOR', 'DIRECTOR', 'ADMIN'] },
  { href: '/admin/rule-configs', labelKey: 'admin', rolesAny: ['ADMIN'] },
  { href: '/me', labelKey: 'profile' },
];

function visibleFor(user: CurrentUser, item: NavItem): boolean {
  if (!item.rolesAny) return true;
  return user.roles.some((r) => item.rolesAny!.includes(r));
}

export async function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const tNav = await getTranslations('nav');
  const tRole = await getTranslations('role');
  const visibleNav = NAV.filter((n) => visibleFor(user, n));
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 border-r border-slate-200 bg-white md:block">
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-base font-semibold text-brand-500">{tNav('appName')}</p>
          <p className="text-xs text-slate-500">{tNav('appTagline')}</p>
        </div>
        <nav className="px-2 py-4">
          {visibleNav.map((n) => (
            <Link
              key={n.href}
              href={n.href as never}
              className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              {tNav(n.labelKey)}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">{user.fullName}</div>
          <div className="flex items-center gap-3">
            <div className="flex flex-wrap gap-1">
              {user.roles.map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700"
                >
                  {tRole(r)}
                </span>
              ))}
            </div>
            <form action="/api/logout" method="post">
              <button className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100">
                {tNav('logout')}
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
