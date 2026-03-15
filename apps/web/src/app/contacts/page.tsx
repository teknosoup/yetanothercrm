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

type Contact = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  accountId: string | null;
  account?: { id: string; companyName: string } | null;
  status: string;
  createdAt: string;
};

type CustomFieldDefinition = {
  id: string;
  entityType: 'CONTACT';
  key: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT';
  required: boolean;
  options: unknown | null;
};

export default function ContactsPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [accountId, setAccountId] = useState('');
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, string | boolean>
  >({});

  const selectOptionsByKey = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const def of customFieldDefs) {
      const options = Array.isArray(def.options)
        ? def.options.filter((o): o is string => typeof o === 'string')
        : [];
      map.set(def.key, options);
    }
    return map;
  }, [customFieldDefs]);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [res, cfRes] = await Promise.all([
        fetch(`${apiBaseUrl}/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBaseUrl}/custom-fields?entityType=CONTACT`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (res.status === 401 || cfRes.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal load contacts');
        return;
      }
      if (!cfRes.ok) {
        setError('Gagal load custom fields');
        return;
      }

      const data = (await res.json()) as { items: Contact[] };
      setItems(data.items ?? []);

      const cfData = (await cfRes.json()) as { items: CustomFieldDefinition[] };
      setCustomFieldDefs(cfData.items ?? []);
    } catch {
      setError('Terjadi error saat load contacts');
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
      const customFields: Record<string, unknown> = {};
      for (const def of customFieldDefs) {
        const raw = customFieldValues[def.key];
        if (def.type === 'BOOLEAN') {
          if (raw === true || raw === false) customFields[def.key] = raw;
          else if (def.required) customFields[def.key] = false;
          continue;
        }

        const s = typeof raw === 'string' ? raw.trim() : '';
        if (s === '') {
          if (def.required) {
            setError(`Custom field wajib diisi: ${def.label}`);
            return;
          }
          continue;
        }

        if (def.type === 'NUMBER') {
          const n = Number(s);
          if (!Number.isFinite(n)) {
            setError(`Custom field harus angka: ${def.label}`);
            return;
          }
          customFields[def.key] = n;
          continue;
        }

        if (def.type === 'SELECT') {
          const allowed = selectOptionsByKey.get(def.key) ?? [];
          if (allowed.length > 0 && !allowed.includes(s)) {
            setError(`Custom field tidak valid: ${def.label}`);
            return;
          }
          customFields[def.key] = s;
          continue;
        }

        customFields[def.key] = s;
      }

      const res = await fetch(`${apiBaseUrl}/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          email: email || undefined,
          phone: phone || undefined,
          accountId: accountId || undefined,
          customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
        }),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal create contact');
        return;
      }

      setFullName('');
      setEmail('');
      setPhone('');
      setAccountId('');
      setCustomFieldValues({});
      await load();
    } catch {
      setError('Terjadi error saat create contact');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">Daftar contact (person).</p>
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
            <CardTitle>Create Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
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
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accountId">Account ID (optional)</Label>
                <Input
                  id="accountId"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                />
              </div>
              {customFieldDefs.length > 0 ? (
                <div className="grid gap-3">
                  <div className="text-sm font-medium">Custom Fields</div>
                  {customFieldDefs.map((def) => (
                    <div key={def.id} className="grid gap-2">
                      <Label htmlFor={`cf:${def.key}`}>
                        {def.label}
                        {def.required ? ' *' : ''}
                      </Label>
                      {def.type === 'BOOLEAN' ? (
                        <div className="flex items-center gap-2">
                          <input
                            id={`cf:${def.key}`}
                            type="checkbox"
                            className="h-4 w-4"
                            checked={customFieldValues[def.key] === true}
                            onChange={(e) =>
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [def.key]: e.target.checked,
                              }))
                            }
                          />
                          <span className="text-sm text-muted-foreground">Yes</span>
                        </div>
                      ) : def.type === 'SELECT' ? (
                        <select
                          id={`cf:${def.key}`}
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={typeof customFieldValues[def.key] === 'string' ? (customFieldValues[def.key] as string) : ''}
                          onChange={(e) =>
                            setCustomFieldValues((prev) => ({
                              ...prev,
                              [def.key]: e.target.value,
                            }))
                          }
                        >
                          <option value="">(select)</option>
                          {(selectOptionsByKey.get(def.key) ?? []).map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id={`cf:${def.key}`}
                          value={typeof customFieldValues[def.key] === 'string' ? (customFieldValues[def.key] as string) : ''}
                          onChange={(e) =>
                            setCustomFieldValues((prev) => ({
                              ...prev,
                              [def.key]: e.target.value,
                            }))
                          }
                          inputMode={def.type === 'NUMBER' ? 'numeric' : undefined}
                          type={def.type === 'DATE' ? 'date' : def.type === 'NUMBER' ? 'number' : 'text'}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
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
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/contacts/${c.id}`} className="hover:underline">
                        {c.fullName}
                      </Link>
                    </TableCell>
                    <TableCell>{c.email ?? ''}</TableCell>
                    <TableCell>{c.phone ?? ''}</TableCell>
                    <TableCell>
                      {c.accountId ? (
                        <Link href={`/accounts/${c.accountId}`} className="hover:underline">
                          <span
                            className="block max-w-[220px] truncate"
                            title={c.account?.companyName ?? c.accountId}
                          >
                            {c.account?.companyName ?? c.accountId}
                          </span>
                        </Link>
                      ) : (
                        ''
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString()}
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
