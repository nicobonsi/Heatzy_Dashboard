'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getValidToken } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const auth = getValidToken();
    if (auth) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return null;
}
