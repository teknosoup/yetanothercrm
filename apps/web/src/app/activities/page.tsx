'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';

type Activity = {
  id: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'FOLLOW_UP' | 'OTHER' | string;
  subject: string;
  description: string | null;
  occurredAt: string;
  createdAt: string;
};

export default function ActivitiesPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<Activity['type']>('CALL');
  const [subject, setSubject] = useState('');
  const [occurredAt, setOccurredAt] = useState('');

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/activities`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal load activities');
        return;
      }

      const data = (await res.json()) as { items: Activity[] };
      setItems(data.items ?? []);
    } catch {
      setError('Terjadi error saat load activities');
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
      const res = await fetch(`${apiBaseUrl}/activities`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          subject,
          occurredAt: occurredAt || undefined,
        }),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal create activity');
        return;
      }

      setType('CALL');
      setSubject('');
      setOccurredAt('');
      await load();
    } catch {
      setError('Terjadi error saat create activity');
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Activities</h1>
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
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="CALL">CALL</option>
            <option value="EMAIL">EMAIL</option>
            <option value="MEETING">MEETING</option>
            <option value="NOTE">NOTE</option>
            <option value="FOLLOW_UP">FOLLOW_UP</option>
            <option value="OTHER">OTHER</option>
          </select>
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Occurred At (optional)</span>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </label>
        <button type="submit">Create Activity</button>
      </form>

      <div style={{ marginTop: 24 }}>
        {loading ? <div>Loading…</div> : null}
        {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
        <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Type
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Subject
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Occurred
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{a.type}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{a.subject}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {a.occurredAt ? new Date(a.occurredAt).toLocaleString() : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
