'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DashboardMetrics = {
  generatedAt: string;
  leads: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
    converted: number;
    conversionRate: number;
  };
  opportunities: {
    total: number;
    pipelineByStage: Array<{
      stage: string;
      count: number;
      estimatedValueSum: number;
      weightedEstimatedValueSum: number;
    }>;
  };
  tasks: {
    overdueTotal: number;
    overdueByOwner: Array<{
      ownerId: string;
      ownerFullName: string | null;
      ownerEmail: string | null;
      overdueCount: number;
    }>;
  };
};

export default function DashboardPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [data, setData] = useState<DashboardMetrics | null>(null);
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
      const res = await fetch(`${apiBaseUrl}/dashboard/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal load dashboard');
        return;
      }

      setData((await res.json()) as DashboardMetrics);
    } catch {
      setError('Terjadi error saat load dashboard');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Ringkasan data CRM.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
            Refresh
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

      <Card>
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {data ? (
            <div className="grid gap-6">
              <div className="text-sm text-muted-foreground">
                Updated: {new Date(data.generatedAt).toLocaleString()}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Leads</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-sm text-muted-foreground">Total</div>
                      <div className="text-lg font-semibold">{data.leads.total.toLocaleString()}</div>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-sm text-muted-foreground">Converted</div>
                      <div className="text-lg font-semibold">
                        {data.leads.converted.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-sm text-muted-foreground">Conversion</div>
                      <div className="text-lg font-semibold">
                        {(data.leads.conversionRate * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="grid gap-2 pt-1">
                      <div className="text-sm text-muted-foreground">By Status</div>
                      <div className="flex flex-wrap gap-2">
                        {data.leads.byStatus.map((s) => (
                          <Badge key={s.status} variant="outline">
                            {s.status}: {s.count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Pipeline (Open)</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-sm text-muted-foreground">Total Opportunities</div>
                      <div className="text-lg font-semibold">
                        {data.opportunities.total.toLocaleString()}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      {data.opportunities.pipelineByStage.map((p) => (
                        <div
                          key={p.stage}
                          className="grid grid-cols-[140px_80px_1fr_1fr] gap-x-3 gap-y-1"
                        >
                          <div className="text-sm font-medium">{p.stage}</div>
                          <div className="text-sm text-muted-foreground">{p.count}</div>
                          <div className="text-sm text-muted-foreground">
                            Est: {p.estimatedValueSum.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Wgt: {p.weightedEstimatedValueSum.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Overdue Tasks</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-sm text-muted-foreground">Total Overdue</div>
                    <div className="text-lg font-semibold">
                      {data.tasks.overdueTotal.toLocaleString()}
                    </div>
                  </div>

                  {data.tasks.overdueByOwner.length ? (
                    <div className="grid gap-2">
                      {data.tasks.overdueByOwner.map((r) => (
                        <div
                          key={r.ownerId}
                          className="grid grid-cols-[1fr_100px] items-center gap-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {r.ownerFullName ?? r.ownerEmail ?? r.ownerId}
                            </div>
                            {r.ownerEmail ? (
                              <div className="truncate text-sm text-muted-foreground">
                                {r.ownerEmail}
                              </div>
                            ) : null}
                          </div>
                          <div className="text-right font-semibold">{r.overdueCount}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Tidak ada overdue tasks.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
