'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Opportunity = {
  id: string;
  opportunityName: string;
  stage: string;
  accountId: string;
  contactId: string | null;
  estimatedValue: number | null;
  probability: number | null;
  weightedValue?: number;
  createdAt: string;
};

export default function OpportunitiesPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [opportunityName, setOpportunityName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [contactId, setContactId] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [probability, setProbability] = useState('');

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/opportunities`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal load opportunities');
        return;
      }

      const data = (await res.json()) as { items: Opportunity[] };
      setItems(data.items ?? []);
    } catch {
      setError('Terjadi error saat load opportunities');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const estimatedValueNumber =
      estimatedValue.trim() === '' ? undefined : Number(estimatedValue);
    const probabilityNumber =
      probability.trim() === '' ? undefined : Number(probability);

    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/opportunities`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunityName,
          accountId,
          contactId: contactId || undefined,
          estimatedValue: Number.isFinite(estimatedValueNumber)
            ? estimatedValueNumber
            : undefined,
          probability: Number.isFinite(probabilityNumber) ? probabilityNumber : undefined,
        }),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal create opportunity');
        return;
      }

      setOpportunityName('');
      setAccountId('');
      setContactId('');
      setEstimatedValue('');
      setProbability('');
      await load();
    } catch {
      setError('Terjadi error saat create opportunity');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Opportunities</h1>
          <p className="text-sm text-muted-foreground">Pipeline opportunities.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
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

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Create Opportunity</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="opportunityName">Opportunity Name</Label>
                <Input
                  id="opportunityName"
                  value={opportunityName}
                  onChange={(e) => setOpportunityName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accountId">Account ID</Label>
                <Input id="accountId" value={accountId} onChange={(e) => setAccountId(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactId">Contact ID (optional)</Label>
                <Input id="contactId" value={contactId} onChange={(e) => setContactId(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="estimatedValue">Estimated Value (optional)</Label>
                <Input
                  id="estimatedValue"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="probability">Probability % (optional)</Label>
                <Input
                  id="probability"
                  value={probability}
                  onChange={(e) => setProbability(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <Button type="submit">Create</Button>
              {error ? <div className="text-sm text-destructive">{error}</div> : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Weighted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      <Link href={`/opportunities/${o.id}`} className="hover:underline">
                        {o.opportunityName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{o.stage}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/accounts/${o.accountId}`} className="hover:underline">
                        {o.accountId}
                      </Link>
                    </TableCell>
                    <TableCell>{o.estimatedValue ?? ''}</TableCell>
                    <TableCell>{o.probability ?? ''}</TableCell>
                    <TableCell className="text-muted-foreground">{o.weightedValue ?? ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
