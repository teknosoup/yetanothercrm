'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type OpportunityDetail = {
  id: string;
  opportunityName: string;
  stage: string;
  estimatedValue: number | null;
  probability: number | null;
  weightedValue: number;
  expectedCloseDate: string | null;
  lostReason: string | null;
  wonDate: string | null;
  closedDate: string | null;
  ownerId: string;
  accountId: string;
  account?: { id: string; companyName: string } | null;
  contactId: string | null;
  contact?: { id: string; fullName: string } | null;
  createdAt: string;
  updatedAt: string;
};

export default function OpportunityDetailPage() {
  const params = useParams() as { id?: string | string[] };
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [item, setItem] = useState<OpportunityDetail | null>(null);
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
        const res = await fetch(`${apiBaseUrl}/opportunities/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          clearToken();
          router.push('/login');
          return;
        }

        if (!res.ok) {
          setError('Gagal load opportunity');
          return;
        }

        setItem((await res.json()) as OpportunityDetail);
      } catch {
        setError('Terjadi error saat load opportunity');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBaseUrl, id, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            {item?.opportunityName ?? 'Opportunity'}
          </h1>
          <p className="text-sm text-muted-foreground">{id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/opportunities">Back</Link>
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
                <Badge variant="outline">{item.stage}</Badge>
                {item.lostReason ? (
                  <div className="text-sm text-muted-foreground">Lost reason: {item.lostReason}</div>
                ) : null}
              </div>

              <dl className="grid gap-3">
                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Opportunity Name</dt>
                  <dd className="font-medium">{item.opportunityName}</dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Account</dt>
                  <dd className="font-medium">
                    <Link href={`/accounts/${item.accountId}`} className="hover:underline">
                      {item.account?.companyName ?? item.accountId}
                    </Link>
                  </dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Contact</dt>
                  <dd className="font-medium">
                    {item.contactId ? (
                      <Link href={`/contacts/${item.contactId}`} className="hover:underline">
                        {item.contact?.fullName ?? item.contactId}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Estimated Value</dt>
                  <dd className="font-medium">
                    {item.estimatedValue == null ? '-' : item.estimatedValue.toLocaleString()}
                  </dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Probability</dt>
                  <dd className="font-medium">
                    {item.probability == null ? '-' : `${item.probability}%`}
                  </dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Weighted</dt>
                  <dd className="font-medium">{item.weightedValue.toLocaleString()}</dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Expected Close</dt>
                  <dd className="font-medium">
                    {item.expectedCloseDate ? new Date(item.expectedCloseDate).toLocaleString() : '-'}
                  </dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Won Date</dt>
                  <dd className="font-medium">
                    {item.wonDate ? new Date(item.wonDate).toLocaleString() : '-'}
                  </dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Closed Date</dt>
                  <dd className="font-medium">
                    {item.closedDate ? new Date(item.closedDate).toLocaleString() : '-'}
                  </dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Owner</dt>
                  <dd className="font-medium">{item.ownerId}</dd>
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
