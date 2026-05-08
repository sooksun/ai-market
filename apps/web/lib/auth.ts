import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { CurrentUser } from '@ai-market/shared';
import { apiFetch, ApiError } from './api';

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    if (!cookieHeader) return null;
    return await apiFetch<CurrentUser>('/auth/me', { cookie: cookieHeader });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
