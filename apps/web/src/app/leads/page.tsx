'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';

type Lead = {
  id: string;
  fullName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
};

type ConvertResult = {
  leadId: string;
  accountId: string;
  contactId: string;
  opportunityId: string;
};

export default function LeadsPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState<Record<string, boolean>>({});
  const [convertResultByLeadId, setConvertResultByLeadId] = useState<
    Record<string, ConvertResult | undefined>
  >({});
  const [actionErrorByLeadId, setActionErrorByLeadId] = useState<
    Record<string, string | null | undefined>
  >({});

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/leads`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal load leads');
        return;
      }

      const data = (await res.json()) as { items: Lead[] };
      setItems(data.items ?? []);
    } catch {
      setError('Terjadi error saat load leads');
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
      const res = await fetch(`${apiBaseUrl}/leads`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          companyName: companyName || undefined,
          email: email || undefined,
          phone: phone || undefined,
        }),
      });

      if (!res.ok) {
        setError('Gagal create lead');
        return;
      }

      setFullName('');
      setCompanyName('');
      setEmail('');
      setPhone('');

      await load();
    } catch {
      setError('Terjadi error saat create lead');
    }
  }

  async function onConvert(leadId: string) {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setActionErrorByLeadId((prev) => ({ ...prev, [leadId]: null }));
    setConverting((prev) => ({ ...prev, [leadId]: true }));
    try {
      const res = await fetch(`${apiBaseUrl}/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setActionErrorByLeadId((prev) => ({ ...prev, [leadId]: 'Gagal convert lead' }));
        return;
      }

      const data = (await res.json()) as ConvertResult;
      setConvertResultByLeadId((prev) => ({ ...prev, [leadId]: data }));
      await load();
    } catch {
      setActionErrorByLeadId((prev) => ({ ...prev, [leadId]: 'Terjadi error saat convert lead' }));
    } finally {
      setConverting((prev) => ({ ...prev, [leadId]: false }));
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Leads</h1>
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

      <form onSubmit={onCreate} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Nama</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Company</span>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <button type="submit">Create Lead</button>
      </form>

      <div style={{ marginTop: 24 }}>
        {loading ? <div>Loading…</div> : null}
        {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
        <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Nama
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Company
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Status
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Created
              </th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((lead) => (
              <tr key={lead.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{lead.fullName}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {lead.companyName ?? ''}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{lead.status}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {new Date(lead.createdAt).toLocaleString()}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <button
                      type="button"
                      disabled={converting[lead.id] || lead.status === 'CONVERTED'}
                      onClick={() => void onConvert(lead.id)}
                    >
                      {converting[lead.id] ? 'Converting…' : 'Convert'}
                    </button>
                    {actionErrorByLeadId[lead.id] ? (
                      <div style={{ color: 'crimson' }}>{actionErrorByLeadId[lead.id]}</div>
                    ) : null}
                    {convertResultByLeadId[lead.id] ? (
                      <div style={{ display: 'grid', gap: 4 }}>
                        <Link href={`/accounts/${convertResultByLeadId[lead.id]!.accountId}`}>
                          Account: {convertResultByLeadId[lead.id]!.accountId}
                        </Link>
                        <Link href={`/contacts/${convertResultByLeadId[lead.id]!.contactId}`}>
                          Contact: {convertResultByLeadId[lead.id]!.contactId}
                        </Link>
                        <Link
                          href={`/opportunities/${convertResultByLeadId[lead.id]!.opportunityId}`}
                        >
                          Opportunity: {convertResultByLeadId[lead.id]!.opportunityId}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
