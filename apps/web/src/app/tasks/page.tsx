'use client';

import {
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  createdAt: string;
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatLocalTime(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function parseLocalDateTimeInput(value: string) {
  const [datePart, timePart] = value.split('T');
  if (!datePart) return null;
  const [y, m, d] = datePart.split('-').map((v) => Number(v));
  const [hh, mm] = (timePart ?? '00:00').split(':').map((v) => Number(v));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const date = new Date(y, m - 1, d, Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function buildLocalDateTimeInputValue(date: Date, timeHHmm: string) {
  const [hhRaw, mmRaw] = timeHHmm.split(':');
  const hh = Number(hhRaw);
  const mm = Number(mmRaw);
  const hours = Number.isFinite(hh) ? hh : 0;
  const minutes = Number.isFinite(mm) ? mm : 0;
  return `${formatLocalDate(date)}T${pad2(hours)}:${pad2(minutes)}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function TasksPage() {
  const router = useRouter();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELED'>('TODO');
  const [dueDate, setDueDate] = useState('');
  const [duePickerOpen, setDuePickerOpen] = useState(false);
  const [duePickerMonth, setDuePickerMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [duePickerDate, setDuePickerDate] = useState<Date | null>(null);
  const [duePickerTime, setDuePickerTime] = useState('12:00');
  const duePickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!duePickerOpen) return;
    const handler = (e: MouseEvent) => {
      const el = duePickerRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setDuePickerOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [duePickerOpen]);

  const dueDateLabel = useMemo(() => {
    if (!dueDate) return '';
    const parsed = parseLocalDateTimeInput(dueDate);
    if (!parsed) return dueDate;
    return `${formatLocalDate(parsed)} ${formatLocalTime(parsed)}`;
  }, [dueDate]);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal load tasks');
        return;
      }

      const data = (await res.json()) as { items: Task[] };
      setItems(data.items ?? []);
    } catch {
      setError('Terjadi error saat load tasks');
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
      const res = await fetch(`${apiBaseUrl}/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          status,
          dueDate: dueDate || undefined,
        }),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('Gagal create task');
        return;
      }

      setTitle('');
      setStatus('TODO');
      setDueDate('');
      await load();
    } catch {
      setError('Terjadi error saat create task');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">To-do list.</p>
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

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Create Task</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="TODO">TODO</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="DONE">DONE</option>
                  <option value="CANCELED">CANCELED</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date (optional)</Label>
                <div className="relative" ref={duePickerRef}>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => {
                      const parsed = dueDate ? parseLocalDateTimeInput(dueDate) : null;
                      if (parsed) {
                        setDuePickerDate(new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
                        setDuePickerTime(formatLocalTime(parsed));
                        setDuePickerMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
                      } else {
                        const now = new Date();
                        setDuePickerDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
                        setDuePickerTime('12:00');
                        setDuePickerMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                      }
                      setDuePickerOpen((v) => !v);
                    }}
                  >
                    <span className={dueDate ? '' : 'text-muted-foreground'}>
                      {dueDate ? dueDateLabel : 'Pilih tanggal & jam'}
                    </span>
                    <span className="text-muted-foreground">▾</span>
                  </button>

                  {duePickerOpen ? (
                    <div className="absolute z-50 mt-2 w-[340px] rounded-md border bg-background p-3 shadow-md">
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDuePickerMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                          }}
                        >
                          ‹
                        </Button>
                        <div className="font-medium">
                          {duePickerMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDuePickerMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                          }}
                        >
                          ›
                        </Button>
                      </div>

                      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                          <div key={d} className="py-1">
                            {d}
                          </div>
                        ))}
                      </div>

                      <div className="mt-1 grid grid-cols-7 gap-1">
                        {(() => {
                          const year = duePickerMonth.getFullYear();
                          const month = duePickerMonth.getMonth();
                          const first = new Date(year, month, 1);
                          const startOffset = first.getDay();
                          const daysInMonth = new Date(year, month + 1, 0).getDate();
                          const today = new Date();
                          const cells: ReactNode[] = [];

                          for (let i = 0; i < startOffset; i++) {
                            cells.push(<div key={`blank-${i}`} />);
                          }

                          for (let day = 1; day <= daysInMonth; day++) {
                            const cellDate = new Date(year, month, day);
                            const selected = duePickerDate ? sameDay(cellDate, duePickerDate) : false;
                            const isToday = sameDay(cellDate, today);
                            cells.push(
                              <button
                                key={`${year}-${month}-${day}`}
                                type="button"
                                className={[
                                  'h-10 w-10 rounded-md text-sm transition-colors',
                                  selected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                                  isToday && !selected ? 'border border-input' : '',
                                ].join(' ')}
                                onClick={() => {
                                  setDuePickerDate(cellDate);
                                  setDueDate(buildLocalDateTimeInputValue(cellDate, duePickerTime));
                                }}
                              >
                                {day}
                              </button>,
                            );
                          }

                          return cells;
                        })()}
                      </div>

                      <div className="mt-3 grid gap-2">
                        <div className="grid grid-cols-[90px_1fr] items-center gap-2">
                          <div className="text-sm text-muted-foreground">Jam</div>
                          <Input
                            type="time"
                            value={duePickerTime}
                            onChange={(e) => {
                              const next = e.target.value;
                              setDuePickerTime(next);
                              if (duePickerDate) {
                                setDueDate(buildLocalDateTimeInputValue(duePickerDate, next));
                              }
                            }}
                          />
                        </div>

                        <div className="flex justify-between gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setDueDate('');
                              setDuePickerDate(null);
                              setDuePickerOpen(false);
                            }}
                          >
                            Clear
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => setDuePickerOpen(false)}>
                            Done
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              <Button type="submit">Create</Button>
              {error ? <div className="text-sm text-destructive">{error}</div> : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'DONE' ? 'default' : 'secondary'}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.dueDate ? new Date(t.dueDate).toLocaleString() : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
