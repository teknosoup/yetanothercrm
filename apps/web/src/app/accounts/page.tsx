'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';

type Account = {
  id: string;
  companyName: string;
  industry: string | null;
  status: string;
  createdAt: string;
};

export default function AccountsPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [items, setItems] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal load accounts');
        return;
      }

      const data = (await res.json()) as { items: Account[] };
      setItems(data.items ?? []);
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
      const res = await fetch(`${apiBaseUrl}/accounts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName,
          industry: industry || undefined,
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
      await load();
    } catch {
      setError('Terjadi error saat create account');
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Accounts</h1>
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

      <form onSubmit={onCreate} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Company Name</span>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Industry</span>
          <input value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </label>
        <button type="submit">Create Account</button>
      </form>

      <div style={{ marginTop: 24 }}>
        {loading ? <div>Loading…</div> : null}
        {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
        <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Company
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Industry
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Status
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  <Link href={`/accounts/${a.id}`}>{a.companyName}</Link>
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {a.industry ?? ''}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{a.status}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {new Date(a.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
