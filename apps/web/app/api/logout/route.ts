import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100/api/v1';

export async function POST() {
  const cookieStore = await cookies();
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookieStore.toString() },
  }).catch(() => null);

  const res = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000'));
  res.cookies.delete('aim_session');
  res.cookies.delete('aim_refresh');
  return res;
}
