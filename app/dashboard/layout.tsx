'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { auth, isLoading, logout, isExpiringSoon } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !auth) {
      router.replace('/login');
    }
  }, [auth, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!auth) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/heatzy-logo.png`}
            alt="Heatzy"
            className="h-9 w-auto"
          />
          <div className="flex items-center gap-3">
            {isExpiringSoon && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                Session expire bientôt
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={logout}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
