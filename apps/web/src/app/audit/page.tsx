'use client';
 
 import Link from 'next/link';
 import { useCallback, useEffect, useMemo, useState } from 'react';
 import { useRouter } from 'next/navigation';
 import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 
 type AuditActor = {
   id: string;
   email: string;
   fullName: string;
 };
 
 type AuditLogRow = {
   id: string;
   createdAt: string;
   action: string;
   entityType: string;
   entityId: string;
   before: unknown | null;
   after: unknown | null;
   ip: string | null;
   userAgent: string | null;
   actorUserId: string | null;
   actorUser: AuditActor | null;
 };
 
 type AuditListResponse = {
   total: number;
   data: AuditLogRow[];
   skip: number;
   take: number;
 };
 
 const entityHref = (entityType: string, entityId: string) => {
   const map: Record<string, string> = {
     lead: '/leads',
     account: '/accounts',
     contact: '/contacts',
     opportunity: '/opportunities',
     task: '/tasks',
     activity: '/activities',
   };
 
   const base = map[entityType];
   if (!base) return null;
 
   if (base === '/tasks' || base === '/activities' || base === '/leads') return base;
   return `${base}/${entityId}`;
 };
 
 export default function AuditPage() {
   const router = useRouter();
   const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
 
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [data, setData] = useState<AuditListResponse | null>(null);
 
   const [entityType, setEntityType] = useState('');
   const [entityId, setEntityId] = useState('');
   const [actorUserId, setActorUserId] = useState('');
   const [action, setAction] = useState('');
   const [from, setFrom] = useState('');
   const [to, setTo] = useState('');
 
   const buildQuery = useCallback(
     (skip: number) => {
       const params = new URLSearchParams();
       params.set('take', '50');
       params.set('skip', String(skip));
 
       if (entityType.trim()) params.set('entityType', entityType.trim());
       if (entityId.trim()) params.set('entityId', entityId.trim());
       if (actorUserId.trim()) params.set('actorUserId', actorUserId.trim());
       if (action.trim()) params.set('action', action.trim());
       if (from) params.set('from', from);
       if (to) params.set('to', to);
 
       return params.toString();
     },
     [action, actorUserId, entityId, entityType, from, to],
   );
 
   const load = useCallback(
     async (skipValue: number) => {
       const token = getToken();
       if (!token) {
         router.push('/login');
         return;
       }
 
       setLoading(true);
       setError(null);
       try {
         const res = await fetch(`${apiBaseUrl}/audit/logs?${buildQuery(skipValue)}`, {
           headers: { Authorization: `Bearer ${token}` },
         });
 
         if (res.status === 401) {
           clearToken();
           router.push('/login');
           return;
         }
 
         if (!res.ok) {
           setError('Gagal load audit logs');
           return;
         }
 
         setData((await res.json()) as AuditListResponse);
       } catch {
         setError('Terjadi error saat load audit logs');
       } finally {
         setLoading(false);
       }
     },
     [apiBaseUrl, buildQuery, router],
   );
 
   useEffect(() => {
     void load(0);
   }, [load]);
 
   const rows = data?.data ?? [];
   const canPrev = Boolean(data && data.skip > 0);
   const canNext = Boolean(data && data.skip + data.take < data.total);
 
   return (
     <div className="space-y-6">
       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
         <div className="space-y-1">
           <h1 className="text-xl font-semibold tracking-tight">Audit Logs</h1>
           <p className="text-sm text-muted-foreground">Filter dan lihat before/after yang sudah disanitasi.</p>
         </div>
         <div className="flex gap-2">
           <Button variant="outline" asChild>
             <Link href="/">Home</Link>
           </Button>
           <Button type="button" variant="outline" onClick={() => void load(0)} disabled={loading}>
             Refresh
           </Button>
         </div>
       </div>
 
       {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
       {error ? <div className="text-sm text-destructive">{error}</div> : null}
 
       <Card>
         <CardHeader>
           <CardTitle>Filters</CardTitle>
         </CardHeader>
         <CardContent className="grid gap-4">
           <div className="grid gap-3 md:grid-cols-3">
             <div className="grid gap-2">
               <div className="text-sm font-medium">Entity Type</div>
               <Input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="lead / account / …" />
             </div>
             <div className="grid gap-2">
               <div className="text-sm font-medium">Entity ID</div>
               <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="uuid" />
             </div>
             <div className="grid gap-2">
               <div className="text-sm font-medium">Actor User ID</div>
               <Input value={actorUserId} onChange={(e) => setActorUserId(e.target.value)} placeholder="uuid" />
             </div>
           </div>
 
           <div className="grid gap-3 md:grid-cols-3">
             <div className="grid gap-2">
               <div className="text-sm font-medium">Action</div>
               <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="lead.create / plugin.activate / …" />
             </div>
             <div className="grid gap-2">
               <div className="text-sm font-medium">From</div>
               <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
             </div>
             <div className="grid gap-2">
               <div className="text-sm font-medium">To</div>
               <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
             </div>
           </div>
 
           <div className="flex flex-wrap items-center gap-2">
             <Button type="button" onClick={() => void load(0)} disabled={loading}>
               Apply
             </Button>
             <Button
               type="button"
               variant="outline"
               onClick={() => {
                 setEntityType('');
                 setEntityId('');
                 setActorUserId('');
                 setAction('');
                 setFrom('');
                 setTo('');
                 void load(0);
               }}
               disabled={loading}
             >
               Clear
             </Button>
           </div>
         </CardContent>
       </Card>
 
       <Card>
         <CardHeader>
           <CardTitle>Logs</CardTitle>
         </CardHeader>
         <CardContent className="space-y-3">
           <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
             <div className="text-muted-foreground">
               Total: {data?.total?.toLocaleString() ?? '—'}
             </div>
             <div className="flex gap-2">
               <Button type="button" variant="outline" disabled={!canPrev || loading} onClick={() => void load(Math.max(0, (data?.skip ?? 0) - (data?.take ?? 50)))}>
                 Prev
               </Button>
               <Button type="button" variant="outline" disabled={!canNext || loading} onClick={() => void load((data?.skip ?? 0) + (data?.take ?? 50))}>
                 Next
               </Button>
             </div>
           </div>
 
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Time</TableHead>
                 <TableHead>Action</TableHead>
                 <TableHead>Entity</TableHead>
                 <TableHead>Actor</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {rows.map((row) => {
                 const href = entityHref(row.entityType, row.entityId);
                 const actorLabel = row.actorUser
                   ? `${row.actorUser.fullName} (${row.actorUser.email})`
                   : row.actorUserId
                     ? row.actorUserId
                     : 'System';
 
                 return (
                   <TableRow key={row.id}>
                     <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                       {new Date(row.createdAt).toLocaleString()}
                     </TableCell>
                     <TableCell className="font-medium">
                       <Badge variant="outline">{row.action}</Badge>
                     </TableCell>
                     <TableCell className="text-sm">
                       <div className="grid gap-1">
                         <div className="text-muted-foreground">{row.entityType}</div>
                         {href ? (
                           <Link href={href} className="font-mono text-xs hover:underline">
                             {row.entityId}
                           </Link>
                         ) : (
                           <div className="font-mono text-xs">{row.entityId}</div>
                         )}
                         <details className="rounded-md border p-2">
                           <summary className="cursor-pointer text-xs text-muted-foreground">Details</summary>
                           <div className="mt-2 grid gap-2">
                             <div className="grid gap-1">
                               <div className="text-xs font-medium">Before</div>
                               <pre className="max-h-[240px] overflow-auto rounded-md bg-muted p-2 text-xs">
                                 {JSON.stringify(row.before, null, 2)}
                               </pre>
                             </div>
                             <div className="grid gap-1">
                               <div className="text-xs font-medium">After</div>
                               <pre className="max-h-[240px] overflow-auto rounded-md bg-muted p-2 text-xs">
                                 {JSON.stringify(row.after, null, 2)}
                               </pre>
                             </div>
                           </div>
                         </details>
                       </div>
                     </TableCell>
                     <TableCell className="text-sm">{actorLabel}</TableCell>
                   </TableRow>
                 );
               })}
               {rows.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={4} className="text-sm text-muted-foreground">
                     (no results)
                   </TableCell>
                 </TableRow>
               ) : null}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
     </div>
   );
 }
