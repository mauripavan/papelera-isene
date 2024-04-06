import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckSession() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/home');
    } else {
      router.replace('/');
    }
  }, []);

  return null;
}
