'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ContactDetail = {
  id: string;
  fullName: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  preferredChannel: string | null;
  status: string;
  ownerId: string;
  accountId: string | null;
  account?: { id: string; companyName: string } | null;
  createdAt: string;
  updatedAt: string;
};

export default function ContactDetailPage() {
  const params = useParams() as { id?: string | string[] };
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [item, setItem] = useState<ContactDetail | null>(null);
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
        const res = await fetch(`${apiBaseUrl}/contacts/${id}`, {
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

        setItem((await res.json()) as ContactDetail);
      } catch {
        setError('Terjadi error saat load contact');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBaseUrl, id, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{item?.fullName ?? 'Contact'}</h1>
          <p className="text-sm text-muted-foreground">{id}</p>
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
          {item ? (
            <div className="grid gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {item.status}
                </Badge>
                {item.jobTitle ? (
                  <div className="text-sm text-muted-foreground">{item.jobTitle}</div>
                ) : null}
              </div>

              <dl className="grid gap-3">
                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Full Name</dt>
                  <dd className="font-medium">{item.fullName}</dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Email</dt>
                  <dd className="font-medium">{item.email ?? '-'}</dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Phone</dt>
                  <dd className="font-medium">{item.phone ?? '-'}</dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Preferred Channel</dt>
                  <dd className="font-medium">{item.preferredChannel ?? '-'}</dd>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Account</dt>
                  <dd className="font-medium">
                    {item.accountId ? (
                      <Link href={`/accounts/${item.accountId}`} className="hover:underline">
                        {item.account?.companyName ?? item.accountId}
                      </Link>
                    ) : (
                      '-'
                    )}
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
