import { getTranslations } from 'next-intl/server';
import type { CurrentUser, Role } from '@ai-market/shared';
import { AppShellClient, type NavItemResolved } from './app-shell-client';

interface NavDef {
  href: string;
  labelKey: string;
  icon: string;
  group: 'main' | 'ops' | 'audit';
  rolesAny?: Role[];
  ai?: boolean;
  /** Hidden until backend lands — Phase 2+ */
  comingSoon?: boolean;
}

const NAV: NavDef[] = [
  // main
  {
    href: '/dashboard',
    labelKey: 'dashboard',
    icon: 'layout-dashboard',
    group: 'main',
    rolesAny: ['DIRECTOR', 'ADMIN'],
  },
  {
    href: '/inbox',
    labelKey: 'officer',
    icon: 'briefcase',
    group: 'main',
    rolesAny: ['PROCUREMENT', 'DIRECTOR', 'ADMIN'],
  },
  // ops
  { href: '/requests', labelKey: 'requests', icon: 'file-stack', group: 'ops' },
  {
    href: '/budget',
    labelKey: 'budget',
    icon: 'wallet',
    group: 'ops',
    rolesAny: ['FINANCE', 'DIRECTOR', 'ADMIN'],
  },
  {
    href: '/spec',
    labelKey: 'spec',
    icon: 'sparkles',
    group: 'ops',
    ai: true,
    comingSoon: true,
  },
  {
    href: '/compare',
    labelKey: 'compare',
    icon: 'scale',
    group: 'ops',
    comingSoon: true,
  },
  {
    href: '/approval',
    labelKey: 'approval',
    icon: 'user-check',
    group: 'ops',
    comingSoon: true,
  },
  {
    href: '/receiving',
    labelKey: 'receiving',
    icon: 'package-check',
    group: 'ops',
    comingSoon: true,
  },
  {
    href: '/inventory',
    labelKey: 'inventory',
    icon: 'boxes',
    group: 'ops',
    comingSoon: true,
  },
  {
    href: '/finance',
    labelKey: 'finance',
    icon: 'banknote',
    group: 'ops',
    comingSoon: true,
  },
  // audit & system
  {
    href: '/audit-logs',
    labelKey: 'auditLogs',
    icon: 'shield-check',
    group: 'audit',
    rolesAny: ['AUDITOR', 'DIRECTOR', 'ADMIN'],
  },
  {
    href: '/admin/projects',
    labelKey: 'adminProjects',
    icon: 'folder-kanban',
    group: 'audit',
    rolesAny: ['PROJECT_OWNER', 'FINANCE', 'ADMIN'],
  },
  {
    href: '/admin/budget-sources',
    labelKey: 'adminBudgetSources',
    icon: 'landmark',
    group: 'audit',
    rolesAny: ['FINANCE', 'ADMIN'],
  },
  {
    href: '/admin/budgets',
    labelKey: 'adminBudgets',
    icon: 'piggy-bank',
    group: 'audit',
    rolesAny: ['FINANCE', 'ADMIN'],
  },
  {
    href: '/admin/rule-configs',
    labelKey: 'admin',
    icon: 'settings',
    group: 'audit',
    rolesAny: ['ADMIN'],
  },
  { href: '/me', labelKey: 'profile', icon: 'user', group: 'audit' },
];

function visibleFor(user: CurrentUser, item: NavDef): boolean {
  if (item.comingSoon) return false;
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

  const navItems: NavItemResolved[] = NAV.filter((n) => visibleFor(user, n)).map((n) => ({
    href: n.href,
    label: tNav(n.labelKey),
    icon: n.icon,
    group: n.group,
    ai: n.ai,
  }));

  const groupTitles = {
    main: tNav('groupMain'),
    ops: tNav('groupOps'),
    audit: tNav('groupAudit'),
  };

  return (
    <AppShellClient
      navItems={navItems}
      groupTitles={groupTitles}
      brand={{ name: tNav('appName'), tagline: tNav('appTagline') }}
      user={{
        id: user.id,
        fullName: user.fullName,
        schoolId: user.schoolId,
        roleLabels: user.roles.map((r) => tRole(r)),
        primaryRoleLabel: tRole(user.roles[0] ?? 'REQUESTER'),
      }}
      copilotComingSoon={tNav('copilotComingSoon')}
      searchPlaceholder={tNav('searchPlaceholder')}
      logoutLabel={tNav('logout')}
      newRequestLabel={tNav('newRequest')}
      copilotLabel={tNav('copilot')}
    >
      {children}
    </AppShellClient>
  );
}
