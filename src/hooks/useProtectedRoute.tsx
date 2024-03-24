import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/auth';

export function useProtectedRoute() {
  const router = useRouter();

  useEffect(() => {
    getSession().then(res => {
      if (res !== null && !res.user.admin) {
        router.push('/');
      }
    });
  }, []);

  return;
}
