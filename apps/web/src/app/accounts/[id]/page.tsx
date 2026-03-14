'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type AccountDetail = {
  id: string;
  companyName: string;
  type: string | null;
  segment: string | null;
  industry: string | null;
  address: string | null;
  taxId: string | null;
  status: string;
  annualValueEstimate: number | null;
  notes: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export default function AccountDetailPage() {
  const params = useParams() as { id?: string | string[] };
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [item, setItem] = useState<AccountDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/accounts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          clearToken();
          router.push('/login');
          return;
        }

        if (!res.ok) {
          setError('Gagal load account');
          return;
        }

        setItem((await res.json()) as AccountDetail);
      } catch {
        setError('Terjadi error saat load account');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBaseUrl, id, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{item?.companyName ?? 'Account'}</h1>
          <p className="text-sm text-muted-foreground">{id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/accounts">Back</Link>
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
          {item ? (
            <div className="grid gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {item.status}
                </Badge>
                {item.industry ? (
                  <div className="text-sm text-muted-foreground">Industry: {item.industry}</div>
                ) : null}
              </div>

              <dl className="grid gap-3">
                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Company Name</dt>
                  <dd className="font-medium">{item.companyName}</dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Owner</dt>
                  <dd className="font-medium">{item.ownerId}</dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Type</dt>
                  <dd className="font-medium">{item.type ?? '-'}</dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Segment</dt>
                  <dd className="font-medium">{item.segment ?? '-'}</dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Tax ID</dt>
                  <dd className="font-medium">{item.taxId ?? '-'}</dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Annual Value Estimate</dt>
                  <dd className="font-medium">
                    {item.annualValueEstimate == null
                      ? '-'
                      : item.annualValueEstimate.toLocaleString()}
                  </dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Address</dt>
                  <dd className="font-medium">{item.address ?? '-'}</dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Notes</dt>
                  <dd className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {item.notes ?? '-'}
                  </dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Created</dt>
                  <dd className="font-medium">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                  </dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Updated</dt>
                  <dd className="font-medium">
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-'}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
