'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';

type Contact = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  accountId: string | null;
  status: string;
  createdAt: string;
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

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal load contacts');
        return;
      }

      const data = (await res.json()) as { items: Contact[] };
      setItems(data.items ?? []);
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
      await load();
    } catch {
      setError('Terjadi error saat create contact');
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Contacts</h1>
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
          <span>Full Name</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Account ID (optional)</span>
          <input value={accountId} onChange={(e) => setAccountId(e.target.value)} />
        </label>
        <button type="submit">Create Contact</button>
      </form>

      <div style={{ marginTop: 24 }}>
        {loading ? <div>Loading…</div> : null}
        {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
        <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Name
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Email
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Phone
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Account
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  <Link href={`/contacts/${c.id}`}>{c.fullName}</Link>
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{c.email ?? ''}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{c.phone ?? ''}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {c.accountId ? <Link href={`/accounts/${c.accountId}`}>{c.accountId}</Link> : ''}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {new Date(c.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
