'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
import { getWebPlugin } from '../registry';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type PluginRow = {
  id: string;
  key: string;
  name: string;
  version: string | null;
  isActive: boolean;
  config: unknown;
  createdAt: string;
  updatedAt: string;
};

export default function PluginDetailPage() {
  const params = useParams() as { key?: string | string[] };
  const keyValue = Array.isArray(params.key) ? params.key[0] : params.key;
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [item, setItem] = useState<PluginRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ui = useMemo(() => (keyValue ? getWebPlugin(keyValue) : null), [keyValue]);

  useEffect(() => {
    if (!keyValue) return;
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/plugins?take=200`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          clearToken();
          router.push('/login');
          return;
        }

        if (!res.ok) {
          setError('Gagal load plugin');
          return;
        }

        const data = (await res.json()) as { items: PluginRow[] };
        const found = (data.items ?? []).find((p) => p.key === keyValue) ?? null;
        setItem(found);
        if (!found) setError('Plugin tidak ditemukan');
      } catch {
        setError('Terjadi error saat load plugin');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBaseUrl, keyValue, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Plugin</h1>
          <p className="text-sm text-muted-foreground">{keyValue}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/plugins">Back</Link>
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
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          {item ? (
            <div className="grid gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.isActive ? 'default' : 'secondary'}>
                  {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
                {item.version ? <Badge variant="outline">v{item.version}</Badge> : null}
              </div>

              <dl className="grid gap-3">
                <div className="grid grid-cols-[140px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Name</dt>
                  <dd className="font-medium">{item.name}</dd>
                </div>

                <div className="grid grid-cols-[140px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Key</dt>
                  <dd className="font-medium">{item.key}</dd>
                </div>

                <div className="grid grid-cols-[140px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Created</dt>
                  <dd className="font-medium">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                  </dd>
                </div>

                <div className="grid grid-cols-[140px_1fr] gap-x-4">
                  <dt className="text-sm text-muted-foreground">Updated</dt>
                  <dd className="font-medium">
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-'}
                  </dd>
                </div>
              </dl>

              <details className="rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Lihat config (advanced)
                </summary>
                <pre className="mt-3 max-h-[360px] overflow-auto rounded-md bg-muted p-3 text-sm">
                  {JSON.stringify(item.config, null, 2)}
                </pre>
              </details>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Menu</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {ui?.menuItems?.length ? (
              ui.menuItems.map((m) => (
                <Button key={`${m.href}:${m.label}`} variant="outline" size="sm" asChild>
                  <Link href={m.href}>{m.label}</Link>
                </Button>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">(none)</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {ui?.actions?.length ? (
              ui.actions.map((a) => (
                <Button key={`${a.href}:${a.label}`} variant="outline" size="sm" asChild>
                  <Link href={a.href}>{a.label}</Link>
                </Button>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">(none)</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Widgets</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {ui?.widgets?.length ? (
            ui.widgets.map((w) => (
              <div key={w.title} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{w.title}</div>
                  <Badge variant="outline">Widget</Badge>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {w.body}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">(none)</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {ui?.tabs?.length ? (
            ui.tabs.map((t) => (
              <div key={t.label} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{t.label}</div>
                  <Badge variant="outline">Tab</Badge>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {t.content}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">(none)</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
