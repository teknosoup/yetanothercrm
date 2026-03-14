'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';

export default function OpportunityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [item, setItem] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        const res = await fetch(`${apiBaseUrl}/opportunities/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          clearToken();
          router.push('/login');
          return;
        }

        if (!res.ok) {
          setError('Gagal load opportunity');
          return;
        }

        setItem((await res.json()) as unknown);
      } catch {
        setError('Terjadi error saat load opportunity');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBaseUrl, params.id, router]);

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Opportunity</h1>
        <Link href="/leads">Back</Link>
      </div>
      {loading ? <div>Loading…</div> : null}
      {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
      <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>
        {item ? JSON.stringify(item, null, 2) : ''}
      </pre>
    </main>
  );
}
