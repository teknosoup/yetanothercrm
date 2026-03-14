'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
import { getWebPlugin } from '../registry';

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

export default function PluginDetailPage({ params }: { params: { key: string } }) {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [item, setItem] = useState<PluginRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ui = useMemo(() => getWebPlugin(params.key), [params.key]);

  useEffect(() => {
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
        const found = (data.items ?? []).find((p) => p.key === params.key) ?? null;
        setItem(found);
        if (!found) setError('Plugin tidak ditemukan');
      } catch {
        setError('Terjadi error saat load plugin');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBaseUrl, params.key, router]);

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Plugin</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/plugins">Back</Link>
          <Link href="/">Home</Link>
        </div>
      </div>

      {loading ? <div>Loading…</div> : null}
      {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}

      <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>
        {item ? JSON.stringify(item, null, 2) : ''}
      </pre>

      <div style={{ marginTop: 24 }}>
        <h2>Extension Slots</h2>
        <div style={{ marginTop: 8 }}>
          <h3>Menu</h3>
          {ui?.menuItems?.length ? (
            ui.menuItems.map((m) => (
              <div key={`${m.href}:${m.label}`}>
                <Link href={m.href}>{m.label}</Link>
              </div>
            ))
          ) : (
            <div>(none)</div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <h3>Widgets</h3>
          {ui?.widgets?.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {ui.widgets.map((w) => (
                <div key={w.title} style={{ border: '1px solid #eee', padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{w.title}</div>
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{w.body}</div>
                </div>
              ))}
            </div>
          ) : (
            <div>(none)</div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <h3>Tabs</h3>
          {ui?.tabs?.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {ui.tabs.map((t) => (
                <div key={t.label} style={{ border: '1px solid #eee', padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{t.label}</div>
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{t.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <div>(none)</div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <h3>Actions</h3>
          {ui?.actions?.length ? (
            ui.actions.map((a) => (
              <div key={`${a.href}:${a.label}`}>
                <Link href={a.href}>{a.label}</Link>
              </div>
            ))
          ) : (
            <div>(none)</div>
          )}
        </div>
      </div>
    </main>
  );
}

