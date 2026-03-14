'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
import { getWebPlugin, listWebPlugins } from './registry';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type PluginRow = {
  id: string;
  key: string;
  name: string;
  version: string | null;
  isActive: boolean;
};

export default function PluginsPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [items, setItems] = useState<PluginRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
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
        setError('Gagal load plugins');
        return;
      }

      const data = (await res.json()) as { items: PluginRow[] };
      setItems(data.items ?? []);
    } catch {
      setError('Terjadi error saat load plugins');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const availableUiKeys = useMemo(() => {
    return new Set(listWebPlugins().map((p) => p.key));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Plugins</h1>
          <p className="text-sm text-muted-foreground">Daftar plugin backend + ketersediaan UI.</p>
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

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Installed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>UI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link href={`/plugins/${p.key}`} className="hover:underline">
                        {p.key}
                      </Link>
                    </TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.version ?? ''}</TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? 'default' : 'secondary'}>
                        {p.isActive ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {availableUiKeys.has(p.key) ? <Badge variant="outline">Available</Badge> : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>UI Registry</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {listWebPlugins().length === 0 ? (
              <div className="text-muted-foreground">No web plugins registered.</div>
            ) : (
              listWebPlugins().map((p) => (
                <div key={p.key} className="flex items-center justify-between gap-2">
                  <Link href={`/plugins/${p.key}`} className="hover:underline">
                    {p.displayName}
                  </Link>
                  <span className="text-muted-foreground">{p.key}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Menu Slot Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          {items
            .filter((p) => p.isActive)
            .map((p) => getWebPlugin(p.key))
            .filter((p): p is NonNullable<typeof p> => Boolean(p))
            .flatMap((p) => p.menuItems ?? []).length ? (
            items
              .filter((p) => p.isActive)
              .map((p) => getWebPlugin(p.key))
              .filter((p): p is NonNullable<typeof p> => Boolean(p))
              .flatMap((p) => p.menuItems ?? [])
              .map((m) => (
                <Button key={`${m.href}:${m.label}`} variant="outline" size="sm" asChild>
                  <Link href={m.href}>{m.label}</Link>
                </Button>
              ))
          ) : (
            <div className="text-muted-foreground">(none)</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
