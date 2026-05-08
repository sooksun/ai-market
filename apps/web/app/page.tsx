import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.roles.includes('DIRECTOR') || user.roles.includes('ADMIN')) {
    redirect('/dashboard');
  }
  if (user.roles.includes('PROCUREMENT')) {
    redirect('/inbox');
  }
  redirect('/requests');
}
