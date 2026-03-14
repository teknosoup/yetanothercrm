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

type Lead = {
  id: string;
  fullName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
};

type ConvertResult = {
  leadId: string;
  accountId: string;
  contactId: string;
  opportunityId: string;
};

export default function LeadsPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState<Record<string, boolean>>({});
  const [convertResultByLeadId, setConvertResultByLeadId] = useState<
    Record<string, ConvertResult | undefined>
  >({});
  const [actionErrorByLeadId, setActionErrorByLeadId] = useState<
    Record<string, string | null | undefined>
  >({});

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/leads`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal load leads');
        return;
      }

      const data = (await res.json()) as { items: Lead[] };
      setItems(data.items ?? []);
    } catch {
      setError('Terjadi error saat load leads');
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

    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/leads`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          companyName: companyName || undefined,
          email: email || undefined,
          phone: phone || undefined,
        }),
      });

      if (!res.ok) {
        setError('Gagal create lead');
        return;
      }

      setFullName('');
      setCompanyName('');
      setEmail('');
      setPhone('');

      await load();
    } catch {
      setError('Terjadi error saat create lead');
    }
  }

  async function onConvert(leadId: string) {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setActionErrorByLeadId((prev) => ({ ...prev, [leadId]: null }));
    setConverting((prev) => ({ ...prev, [leadId]: true }));
    try {
      const res = await fetch(`${apiBaseUrl}/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setActionErrorByLeadId((prev) => ({ ...prev, [leadId]: 'Gagal convert lead' }));
        return;
      }

      const data = (await res.json()) as ConvertResult;
      setConvertResultByLeadId((prev) => ({ ...prev, [leadId]: data }));
      await load();
    } catch {
      setActionErrorByLeadId((prev) => ({ ...prev, [leadId]: 'Terjadi error saat convert lead' }));
    } finally {
      setConverting((prev) => ({ ...prev, [leadId]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Buat lead, lalu convert untuk otomatis membuat account/contact/opportunity.
          </p>
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
            <CardTitle>Create Lead</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Nama</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyName">Company</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                  <TableHead>Nama</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[320px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.fullName}</TableCell>
                    <TableCell>{lead.companyName ?? ''}</TableCell>
                    <TableCell>
                      <Badge
                        variant={lead.status === 'CONVERTED' ? 'default' : 'secondary'}
                      >
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={converting[lead.id] || lead.status === 'CONVERTED'}
                            onClick={() => void onConvert(lead.id)}
                          >
                            {converting[lead.id] ? 'Converting…' : 'Convert'}
                          </Button>
                        </div>

                        {actionErrorByLeadId[lead.id] ? (
                          <div className="text-sm text-destructive">
                            {actionErrorByLeadId[lead.id]}
                          </div>
                        ) : null}

                        {convertResultByLeadId[lead.id] ? (
                          <div className="grid gap-1 text-sm text-muted-foreground">
                            <Link
                              href={`/accounts/${convertResultByLeadId[lead.id]!.accountId}`}
                              className="hover:text-foreground"
                            >
                              Account: {convertResultByLeadId[lead.id]!.accountId}
                            </Link>
                            <Link
                              href={`/contacts/${convertResultByLeadId[lead.id]!.contactId}`}
                              className="hover:text-foreground"
                            >
                              Contact: {convertResultByLeadId[lead.id]!.contactId}
                            </Link>
                            <Link
                              href={`/opportunities/${convertResultByLeadId[lead.id]!.opportunityId}`}
                              className="hover:text-foreground"
                            >
                              Opportunity: {convertResultByLeadId[lead.id]!.opportunityId}
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
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
