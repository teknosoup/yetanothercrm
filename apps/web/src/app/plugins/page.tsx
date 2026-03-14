'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
import { getWebPlugin, listWebPlugins } from './registry';

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
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Plugins</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/">Home</Link>
          <button
            type="button"
            onClick={() => {
              clearToken();
              router.push('/login');
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {loading ? <div>Loading…</div> : null}
      {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}

      <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
              Key
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
              Name
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
              Version
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
              Active
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
              UI
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                <Link href={`/plugins/${p.key}`}>{p.key}</Link>
              </td>
              <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{p.name}</td>
              <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{p.version ?? ''}</td>
              <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                {p.isActive ? 'Yes' : 'No'}
              </td>
              <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                {availableUiKeys.has(p.key) ? 'Available' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 24 }}>
        <h2>UI Registry</h2>
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          {listWebPlugins().length === 0 ? (
            <div>No web plugins registered.</div>
          ) : (
            listWebPlugins().map((p) => (
              <div key={p.key}>
                <Link href={`/plugins/${p.key}`}>{p.displayName}</Link>
                <span style={{ marginLeft: 8, color: '#666' }}>{p.key}</span>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <h3>Menu Slot Preview</h3>
          {items
            .filter((p) => p.isActive)
            .map((p) => getWebPlugin(p.key))
            .filter((p): p is NonNullable<typeof p> => Boolean(p))
            .flatMap((p) => p.menuItems ?? [])
            .map((m) => (
              <div key={`${m.href}:${m.label}`}>
                <Link href={m.href}>{m.label}</Link>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}

