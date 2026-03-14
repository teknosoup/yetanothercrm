'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getToken } from '@/lib/api';

export default function Home() {
  const token = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') return () => {};
      const handle = () => onStoreChange();
      window.addEventListener('storage', handle);
      window.addEventListener('token-changed', handle);
      return () => {
        window.removeEventListener('storage', handle);
        window.removeEventListener('token-changed', handle);
      };
    },
    () => getToken(),
    () => null,
  );

  return (
    <div className="grid gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">YetAnotherCRM</h1>
        <p className="text-sm text-muted-foreground">
          Minimal CRM UI untuk demo: lead → convert → account/contact/opportunity, tasks & activities, dashboard, plugins.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mulai</CardTitle>
          <CardDescription>
            {token ? 'Kamu sudah login. Mulai dari leads atau dashboard.' : 'Login pakai user seed admin.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {token ? (
            <>
              <Button asChild>
                <Link href="/leads">Buka Leads</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Buka Dashboard</Link>
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
