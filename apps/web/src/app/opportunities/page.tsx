'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';

type Opportunity = {
  id: string;
  opportunityName: string;
  stage: string;
  accountId: string;
  contactId: string | null;
  estimatedValue: number | null;
  probability: number | null;
  weightedValue?: number;
  createdAt: string;
};

export default function OpportunitiesPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [opportunityName, setOpportunityName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [contactId, setContactId] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [probability, setProbability] = useState('');

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/opportunities`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal load opportunities');
        return;
      }

      const data = (await res.json()) as { items: Opportunity[] };
      setItems(data.items ?? []);
    } catch {
      setError('Terjadi error saat load opportunities');
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

    const estimatedValueNumber =
      estimatedValue.trim() === '' ? undefined : Number(estimatedValue);
    const probabilityNumber =
      probability.trim() === '' ? undefined : Number(probability);

    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/opportunities`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunityName,
          accountId,
          contactId: contactId || undefined,
          estimatedValue: Number.isFinite(estimatedValueNumber)
            ? estimatedValueNumber
            : undefined,
          probability: Number.isFinite(probabilityNumber) ? probabilityNumber : undefined,
        }),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal create opportunity');
        return;
      }

      setOpportunityName('');
      setAccountId('');
      setContactId('');
      setEstimatedValue('');
      setProbability('');
      await load();
    } catch {
      setError('Terjadi error saat create opportunity');
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Opportunities</h1>
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
          <span>Opportunity Name</span>
          <input
            value={opportunityName}
            onChange={(e) => setOpportunityName(e.target.value)}
            required
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Account ID</span>
          <input value={accountId} onChange={(e) => setAccountId(e.target.value)} required />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Contact ID (optional)</span>
          <input value={contactId} onChange={(e) => setContactId(e.target.value)} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Estimated Value (optional)</span>
          <input
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Probability % (optional)</span>
          <input
            value={probability}
            onChange={(e) => setProbability(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <button type="submit">Create Opportunity</button>
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
                Stage
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Account
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Value
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Probability
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Weighted
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  <Link href={`/opportunities/${o.id}`}>{o.opportunityName}</Link>
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{o.stage}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  <Link href={`/accounts/${o.accountId}`}>{o.accountId}</Link>
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {o.estimatedValue ?? ''}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {o.probability ?? ''}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {o.weightedValue ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
