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

type Activity = {
  id: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'FOLLOW_UP' | 'OTHER' | string;
  subject: string;
  description: string | null;
  occurredAt: string;
  createdAt: string;
};

export default function ActivitiesPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<Activity['type']>('CALL');
  const [subject, setSubject] = useState('');
  const [occurredAt, setOccurredAt] = useState('');

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/activities`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal load activities');
        return;
      }

      const data = (await res.json()) as { items: Activity[] };
      setItems(data.items ?? []);
    } catch {
      setError('Terjadi error saat load activities');
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
      const res = await fetch(`${apiBaseUrl}/activities`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          subject,
          occurredAt: occurredAt || undefined,
        }),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal create activity');
        return;
      }

      setType('CALL');
      setSubject('');
      setOccurredAt('');
      await load();
    } catch {
      setError('Terjadi error saat create activity');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Activities</h1>
          <p className="text-sm text-muted-foreground">Log aktivitas (call/email/meeting/note).</p>
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
            <CardTitle>Create Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="CALL">CALL</option>
                  <option value="EMAIL">EMAIL</option>
                  <option value="MEETING">MEETING</option>
                  <option value="NOTE">NOTE</option>
                  <option value="FOLLOW_UP">FOLLOW_UP</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="occurredAt">Occurred At (optional)</Label>
                <Input
                  id="occurredAt"
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
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
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Occurred</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge variant="outline">{a.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{a.subject}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.occurredAt ? new Date(a.occurredAt).toLocaleString() : ''}
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
