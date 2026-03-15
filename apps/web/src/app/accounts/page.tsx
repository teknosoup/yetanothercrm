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

type Account = {
  id: string;
  companyName: string;
  industry: string | null;
  status: string;
  createdAt: string;
};

type CustomFieldDefinition = {
  id: string;
  entityType: 'ACCOUNT';
  key: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT';
  required: boolean;
  options: unknown | null;
};

export default function AccountsPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [items, setItems] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
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
        fetch(`${apiBaseUrl}/accounts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBaseUrl}/custom-fields?entityType=ACCOUNT`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (res.status === 401 || cfRes.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal load accounts');
        return;
      }
      if (!cfRes.ok) {
        setError('Gagal load custom fields');
        return;
      }

      const data = (await res.json()) as { items: Account[] };
      setItems(data.items ?? []);

      const cfData = (await cfRes.json()) as { items: CustomFieldDefinition[] };
      setCustomFieldDefs(cfData.items ?? []);
    } catch {
      setError('Terjadi error saat load accounts');
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
          else if (def.required) {
            setError(`Custom field wajib diisi: ${def.label}`);
            return;
          }
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

      const res = await fetch(`${apiBaseUrl}/accounts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName,
          industry: industry || undefined,
          customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
        }),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal create account');
        return;
      }

      setCompanyName('');
      setIndustry('');
      setCustomFieldValues({});
      await load();
    } catch {
      setError('Terjadi error saat create account');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">Daftar account (company).</p>
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
            <CardTitle>Create Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
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
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <Link href={`/accounts/${a.id}`} className="hover:underline">
                        {a.companyName}
                      </Link>
                    </TableCell>
                    <TableCell>{a.industry ?? ''}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString()}
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
