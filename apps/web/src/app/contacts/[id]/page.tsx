'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ContactDetail = {
  id: string;
  fullName: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  preferredChannel: string | null;
  status: string;
  ownerId: string;
  owner?: { id: string; fullName: string; email: string } | null;
  accountId: string | null;
  account?: { id: string; companyName: string } | null;
  createdAt: string;
  updatedAt: string;
  customFields?: Record<string, unknown>;
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

function toDateInputValue(value: unknown) {
  if (typeof value !== 'string') return '';
  const s = value.trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function ContactDetailPage() {
  const params = useParams() as { id?: string | string[] };
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [item, setItem] = useState<ContactDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, string | boolean>
  >({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
        const [res, cfRes] = await Promise.all([
          fetch(`${apiBaseUrl}/contacts/${id}`, {
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
          setError('Gagal load contact');
          return;
        }
        if (!cfRes.ok) {
          setError('Gagal load custom fields');
          return;
        }

        setItem((await res.json()) as ContactDetail);
        const cfData = (await cfRes.json()) as { items: CustomFieldDefinition[] };
        setCustomFieldDefs(cfData.items ?? []);
      } catch {
        setError('Terjadi error saat load contact');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBaseUrl, id, router]);

  useEffect(() => {
    if (!item) return;
    const map: Record<string, string | boolean> = {};
    for (const def of customFieldDefs) {
      const v = item.customFields?.[def.key];
      if (def.type === 'BOOLEAN') {
        map[def.key] = v === true;
      } else if (def.type === 'DATE') {
        map[def.key] = toDateInputValue(v);
      } else if (typeof v === 'number') {
        map[def.key] = String(v);
      } else if (typeof v === 'string') {
        map[def.key] = v;
      } else {
        map[def.key] = '';
      }
    }
    setCustomFieldValues(map);
  }, [customFieldDefs, item]);

  async function onSaveCustomFields() {
    if (!id) return;
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const customFields: Record<string, unknown> = {};
      for (const def of customFieldDefs) {
        const raw = customFieldValues[def.key];
        if (def.type === 'BOOLEAN') {
          if (raw === true || raw === false) customFields[def.key] = raw;
          else if (def.required) {
            setSaveError(`Custom field wajib diisi: ${def.label}`);
            setSaving(false);
            return;
          }
          continue;
        }

        const s = typeof raw === 'string' ? raw.trim() : '';
        if (s === '') {
          if (def.required) {
            setSaveError(`Custom field wajib diisi: ${def.label}`);
            setSaving(false);
            return;
          }
          customFields[def.key] = null;
          continue;
        }

        if (def.type === 'NUMBER') {
          const n = Number(s);
          if (!Number.isFinite(n)) {
            setSaveError(`Custom field harus angka: ${def.label}`);
            setSaving(false);
            return;
          }
          customFields[def.key] = n;
          continue;
        }

        if (def.type === 'SELECT') {
          const allowed = selectOptionsByKey.get(def.key) ?? [];
          if (allowed.length > 0 && !allowed.includes(s)) {
            setSaveError(`Custom field tidak valid: ${def.label}`);
            setSaving(false);
            return;
          }
          customFields[def.key] = s;
          continue;
        }

        customFields[def.key] = s;
      }

      const res = await fetch(`${apiBaseUrl}/contacts/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customFields,
        }),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        setSaveError(text || 'Gagal update custom fields');
        return;
      }

      setItem((await res.json()) as ContactDetail);
    } catch {
      setSaveError('Terjadi error saat update custom fields');
    } finally {
      setSaving(false);
    }
  }

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
                  <dd className="font-medium">{item.owner?.fullName ?? item.ownerId}</dd>
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

      {customFieldDefs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Custom Fields</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
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
                    value={
                      typeof customFieldValues[def.key] === 'string'
                        ? (customFieldValues[def.key] as string)
                        : ''
                    }
                    onChange={(e) =>
                      setCustomFieldValues((prev) => ({
                        ...prev,
                        [def.key]: e.target.value,
                      }))
                    }
                  >
                    <option value="">(none)</option>
                    {(selectOptionsByKey.get(def.key) ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={`cf:${def.key}`}
                    value={
                      typeof customFieldValues[def.key] === 'string'
                        ? (customFieldValues[def.key] as string)
                        : ''
                    }
                    onChange={(e) =>
                      setCustomFieldValues((prev) => ({
                        ...prev,
                        [def.key]: e.target.value,
                      }))
                    }
                    inputMode={def.type === 'NUMBER' ? 'numeric' : undefined}
                    type={
                      def.type === 'DATE'
                        ? 'date'
                        : def.type === 'NUMBER'
                          ? 'number'
                          : 'text'
                    }
                  />
                )}
              </div>
            ))}

            <div className="flex items-center gap-2">
              <Button type="button" onClick={() => void onSaveCustomFields()} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              {saveError ? <div className="text-sm text-destructive">{saveError}</div> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
