'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DashboardMetrics = {
  generatedAt: string;
  leads: unknown;
  opportunities: unknown;
  tasks: unknown;
};

export default function DashboardPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/dashboard/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal load dashboard');
        return;
      }

      setData((await res.json()) as DashboardMetrics);
    } catch {
      setError('Terjadi error saat load dashboard');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Ringkasan data CRM.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              clearToken();
              router.push('/login');
            }}
          >
            Logout
          </Button>
        </div>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[520px] overflow-auto rounded-md bg-muted p-4 text-sm">
            {data ? JSON.stringify(data, null, 2) : ''}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
