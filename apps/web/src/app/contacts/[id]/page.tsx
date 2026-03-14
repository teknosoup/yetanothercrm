'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [item, setItem] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/contacts/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          clearToken();
          router.push('/login');
          return;
        }

        if (!res.ok) {
          setError('Gagal load contact');
          return;
        }

        setItem((await res.json()) as unknown);
      } catch {
        setError('Terjadi error saat load contact');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBaseUrl, params.id, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Contact</h1>
          <p className="text-sm text-muted-foreground">{params.id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/contacts">Back</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle>Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[520px] overflow-auto rounded-md bg-muted p-4 text-sm">
            {item ? JSON.stringify(item, null, 2) : ''}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
