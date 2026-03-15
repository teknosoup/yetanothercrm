'use client';
 
 import Link from 'next/link';
 import { useCallback, useEffect, useMemo, useState } from 'react';
 import { useRouter } from 'next/navigation';
 import { clearToken, getApiBaseUrl, getToken } from '@/lib/api';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 
 type PermissionRow = {
   id: string;
   key: string;
   module: string;
   action: string;
   description: string | null;
 };
 
 type RoleRow = {
   id: string;
   name: string;
   description: string | null;
   permissionKeys: string[];
 };
 
 type ListResponse<T> = {
   total: number;
   data: T[];
   skip: number;
   take: number;
 };
 
type CustomFieldDefinitionRow = {
  id: string;
  entityType: 'LEAD' | 'ACCOUNT' | 'CONTACT' | 'OPPORTUNITY';
  key: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT';
  required: boolean;
  options: unknown | null;
};

type CustomFieldsListResponse = {
  items: CustomFieldDefinitionRow[];
};

 const groupByModule = (permissions: PermissionRow[]) => {
   const map = new Map<string, PermissionRow[]>();
   for (const p of permissions) {
     const list = map.get(p.module) ?? [];
     list.push(p);
     map.set(p.module, list);
   }
   const entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
   for (const [, list] of entries) {
     list.sort((a, b) => a.key.localeCompare(b.key));
   }
   return entries;
 };
 
 export default function AdminPage() {
   const router = useRouter();
   const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
 
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
 
   const [roles, setRoles] = useState<RoleRow[]>([]);
   const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
   const selectedRole = useMemo(
     () => roles.find((r) => r.id === selectedRoleId) ?? null,
     [roles, selectedRoleId],
   );
 
   const [permissions, setPermissions] = useState<PermissionRow[]>([]);
 
   const [createName, setCreateName] = useState('');
   const [createDescription, setCreateDescription] = useState('');
 
   const [editName, setEditName] = useState('');
   const [editDescription, setEditDescription] = useState('');
   const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<Set<string>>(
     () => new Set(),
   );
 
   const [filter, setFilter] = useState('');
 
   const grouped = useMemo(() => groupByModule(permissions), [permissions]);
 
  const [customFields, setCustomFields] = useState<CustomFieldDefinitionRow[]>([]);
  const [customFieldsFilter, setCustomFieldsFilter] = useState('');
  const [customFieldsEntityType, setCustomFieldsEntityType] = useState<
    CustomFieldDefinitionRow['entityType']
  >('LEAD');
  const [cfCreateKey, setCfCreateKey] = useState('');
  const [cfCreateLabel, setCfCreateLabel] = useState('');
  const [cfCreateType, setCfCreateType] = useState<CustomFieldDefinitionRow['type']>('TEXT');
  const [cfCreateRequired, setCfCreateRequired] = useState(false);
  const [cfCreateOptions, setCfCreateOptions] = useState('');

  const [selectedCustomFieldId, setSelectedCustomFieldId] = useState<string | null>(null);
  const selectedCustomField = useMemo(
    () => customFields.find((c) => c.id === selectedCustomFieldId) ?? null,
    [customFields, selectedCustomFieldId],
  );
  const [cfEditLabel, setCfEditLabel] = useState('');
  const [cfEditRequired, setCfEditRequired] = useState(false);
  const [cfEditOptions, setCfEditOptions] = useState('');

  const normalizeOptions = (raw: string) => {
    const parts = raw
      .split(/\r?\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(parts));
  };

   const loadAll = useCallback(async () => {
     const token = getToken();
     if (!token) {
       router.push('/login');
       return;
     }
 
     setLoading(true);
     setError(null);
     try {
      const [rolesRes, permsRes, customFieldsRes] = await Promise.all([
         fetch(`${apiBaseUrl}/roles?take=200`, {
           headers: { Authorization: `Bearer ${token}` },
         }),
         fetch(`${apiBaseUrl}/permissions?take=500`, {
           headers: { Authorization: `Bearer ${token}` },
         }),
        fetch(`${apiBaseUrl}/custom-fields`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
       ]);
 
      if (
        rolesRes.status === 401 ||
        permsRes.status === 401 ||
        customFieldsRes.status === 401
      ) {
         clearToken();
         router.push('/login');
         return;
       }
 
       if (!rolesRes.ok) {
         setError('Gagal load roles');
         return;
       }
       if (!permsRes.ok) {
         setError('Gagal load permissions');
         return;
       }
      if (!customFieldsRes.ok) {
        setError('Gagal load custom fields');
        return;
      }
 
       const rolesData = (await rolesRes.json()) as ListResponse<RoleRow>;
       const permsData = (await permsRes.json()) as ListResponse<PermissionRow>;
      const customFieldsData =
        (await customFieldsRes.json()) as CustomFieldsListResponse;
       setRoles(rolesData.data ?? []);
       setPermissions(permsData.data ?? []);
      setCustomFields(customFieldsData.items ?? []);
 
       const nextSelected =
         selectedRoleId &&
         (rolesData.data ?? []).some((r) => r.id === selectedRoleId)
           ? selectedRoleId
           : (rolesData.data ?? [])[0]?.id ?? null;
       setSelectedRoleId(nextSelected);
     } catch {
       setError('Terjadi error saat load admin data');
     } finally {
       setLoading(false);
     }
   }, [apiBaseUrl, router, selectedRoleId]);
 
   useEffect(() => {
     void loadAll();
   }, [loadAll]);
 
   useEffect(() => {
     if (!selectedRole) return;
     setEditName(selectedRole.name);
     setEditDescription(selectedRole.description ?? '');
     setSelectedPermissionKeys(new Set(selectedRole.permissionKeys ?? []));
   }, [selectedRole]);
 
  useEffect(() => {
    if (!selectedCustomField) return;
    setCfEditLabel(selectedCustomField.label);
    setCfEditRequired(selectedCustomField.required);
    const options = Array.isArray(selectedCustomField.options)
      ? selectedCustomField.options.filter((o): o is string => typeof o === 'string')
      : [];
    setCfEditOptions(options.join('\n'));
  }, [selectedCustomField]);

   const togglePermission = useCallback((key: string) => {
     setSelectedPermissionKeys((prev) => {
       const next = new Set(prev);
       if (next.has(key)) next.delete(key);
       else next.add(key);
       return next;
     });
   }, []);
 
   const createRole = useCallback(async () => {
     const token = getToken();
     if (!token) {
       router.push('/login');
       return;
     }
 
     const name = createName.trim();
     if (!name) {
       setError('Role name wajib diisi');
       return;
     }
 
     setLoading(true);
     setError(null);
     try {
       const res = await fetch(`${apiBaseUrl}/roles`, {
         method: 'POST',
         headers: {
           Authorization: `Bearer ${token}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           name,
           description: createDescription.trim() ? createDescription.trim() : undefined,
           permissionKeys: [],
         }),
       });
 
       if (res.status === 401) {
         clearToken();
         router.push('/login');
         return;
       }
       if (!res.ok) {
         setError('Gagal membuat role');
         return;
       }
 
       setCreateName('');
       setCreateDescription('');
       await loadAll();
     } catch {
       setError('Terjadi error saat membuat role');
     } finally {
       setLoading(false);
     }
   }, [apiBaseUrl, createDescription, createName, loadAll, router]);
 
   const saveRole = useCallback(async () => {
     if (!selectedRole) return;
     const token = getToken();
     if (!token) {
       router.push('/login');
       return;
     }
 
     const name = editName.trim();
     if (!name) {
       setError('Role name wajib diisi');
       return;
     }
 
     setLoading(true);
     setError(null);
     try {
       const res = await fetch(`${apiBaseUrl}/roles/${selectedRole.id}`, {
         method: 'PATCH',
         headers: {
           Authorization: `Bearer ${token}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           name,
           description: editDescription.trim() ? editDescription.trim() : null,
           permissionKeys: Array.from(selectedPermissionKeys).sort(),
         }),
       });
 
       if (res.status === 401) {
         clearToken();
         router.push('/login');
         return;
       }
       if (!res.ok) {
         setError('Gagal simpan role');
         return;
       }
 
       await loadAll();
     } catch {
       setError('Terjadi error saat simpan role');
     } finally {
       setLoading(false);
     }
   }, [
     apiBaseUrl,
     editDescription,
     editName,
     loadAll,
     router,
     selectedPermissionKeys,
     selectedRole,
   ]);
 
   const deleteRole = useCallback(async () => {
     if (!selectedRole) return;
     const token = getToken();
     if (!token) {
       router.push('/login');
       return;
     }
 
     setLoading(true);
     setError(null);
     try {
       const res = await fetch(`${apiBaseUrl}/roles/${selectedRole.id}`, {
         method: 'DELETE',
         headers: { Authorization: `Bearer ${token}` },
       });
 
       if (res.status === 401) {
         clearToken();
         router.push('/login');
         return;
       }
       if (!res.ok) {
         const text = await res.text();
         setError(text || 'Gagal hapus role');
         return;
       }
 
       setSelectedRoleId(null);
       await loadAll();
     } catch {
       setError('Terjadi error saat hapus role');
     } finally {
       setLoading(false);
     }
   }, [apiBaseUrl, loadAll, router, selectedRole]);
 
  const createCustomField = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const key = cfCreateKey.trim();
    const label = cfCreateLabel.trim();
    if (!key) {
      setError('Custom field key wajib diisi');
      return;
    }
    if (!label) {
      setError('Custom field label wajib diisi');
      return;
    }

    const options = normalizeOptions(cfCreateOptions);

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/custom-fields`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType: customFieldsEntityType,
          key,
          label,
          type: cfCreateType,
          required: cfCreateRequired,
          ...(cfCreateType === 'SELECT' ? { options } : {}),
        }),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        setError(text || 'Gagal create custom field');
        return;
      }

      setCfCreateKey('');
      setCfCreateLabel('');
      setCfCreateType('TEXT');
      setCfCreateRequired(false);
      setCfCreateOptions('');
      await loadAll();
    } catch {
      setError('Terjadi error saat create custom field');
    } finally {
      setLoading(false);
    }
  }, [
    apiBaseUrl,
    cfCreateKey,
    cfCreateLabel,
    cfCreateOptions,
    cfCreateRequired,
    cfCreateType,
    customFieldsEntityType,
    loadAll,
    router,
  ]);

  const saveCustomField = useCallback(async () => {
    if (!selectedCustomField) return;
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const label = cfEditLabel.trim();
    if (!label) {
      setError('Custom field label wajib diisi');
      return;
    }

    const options = normalizeOptions(cfEditOptions);

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/custom-fields/${selectedCustomField.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label,
          required: cfEditRequired,
          ...(selectedCustomField.type === 'SELECT' ? { options } : {}),
        }),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        setError(text || 'Gagal update custom field');
        return;
      }

      await loadAll();
    } catch {
      setError('Terjadi error saat update custom field');
    } finally {
      setLoading(false);
    }
  }, [
    apiBaseUrl,
    cfEditLabel,
    cfEditOptions,
    cfEditRequired,
    loadAll,
    router,
    selectedCustomField,
  ]);

  const deleteCustomField = useCallback(async () => {
    if (!selectedCustomField) return;
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/custom-fields/${selectedCustomField.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        setError(text || 'Gagal hapus custom field');
        return;
      }

      setSelectedCustomFieldId(null);
      await loadAll();
    } catch {
      setError('Terjadi error saat hapus custom field');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, loadAll, router, selectedCustomField]);

   const visibleGroups = useMemo(() => {
     const q = filter.trim().toLowerCase();
     if (!q) return grouped;
 
     return grouped
       .map(([module, list]) => [
         module,
         list.filter((p) => {
           const hay = `${p.key} ${p.description ?? ''}`.toLowerCase();
           return hay.includes(q);
         }),
       ])
       .filter(([, list]) => list.length > 0) as Array<[string, PermissionRow[]]>;
   }, [filter, grouped]);
 
  const visibleCustomFields = useMemo(() => {
    const q = customFieldsFilter.trim().toLowerCase();
    return customFields
      .filter((c) => c.entityType === customFieldsEntityType)
      .filter((c) => {
        if (!q) return true;
        const hay = `${c.key} ${c.label} ${c.type}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [customFields, customFieldsEntityType, customFieldsFilter]);

   return (
     <div className="space-y-6">
       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
         <div className="space-y-1">
           <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
           <p className="text-sm text-muted-foreground">Roles & Permissions.</p>
         </div>
         <div className="flex gap-2">
           <Button variant="outline" asChild>
             <Link href="/">Home</Link>
           </Button>
           <Button type="button" variant="outline" onClick={() => void loadAll()} disabled={loading}>
             Refresh
           </Button>
         </div>
       </div>
 
       {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
       {error ? <div className="text-sm text-destructive">{error}</div> : null}
 
       <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
         <Card className="lg:col-span-1">
           <CardHeader>
             <CardTitle>Roles</CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             <div className="grid gap-2">
               <div className="text-sm font-medium">Create Role</div>
               <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Role name" />
               <Input
                 value={createDescription}
                 onChange={(e) => setCreateDescription(e.target.value)}
                 placeholder="Description (optional)"
               />
               <Button type="button" onClick={() => void createRole()} disabled={loading}>
                 Create
               </Button>
             </div>
 
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Name</TableHead>
                   <TableHead className="text-right">Perms</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {roles.map((r) => (
                   <TableRow
                     key={r.id}
                     className="cursor-pointer"
                     onClick={() => setSelectedRoleId(r.id)}
                   >
                     <TableCell className="font-medium">
                       <div className="flex items-center gap-2">
                         {selectedRoleId === r.id ? <Badge>Selected</Badge> : null}
                         <span>{r.name}</span>
                       </div>
                     </TableCell>
                     <TableCell className="text-right text-muted-foreground">
                       {(r.permissionKeys?.length ?? 0).toLocaleString()}
                     </TableCell>
                   </TableRow>
                 ))}
                 {roles.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={2} className="text-sm text-muted-foreground">
                       (no roles)
                     </TableCell>
                   </TableRow>
                 ) : null}
               </TableBody>
             </Table>
           </CardContent>
         </Card>
 
         <Card className="lg:col-span-2">
           <CardHeader>
             <CardTitle>Role Detail</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             {selectedRole ? (
               <>
                 <div className="grid gap-3 md:grid-cols-2">
                   <div className="grid gap-2">
                     <div className="text-sm font-medium">Name</div>
                     <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                   </div>
                   <div className="grid gap-2">
                     <div className="text-sm font-medium">Description</div>
                     <Input
                       value={editDescription}
                       onChange={(e) => setEditDescription(e.target.value)}
                       placeholder="(optional)"
                     />
                   </div>
                 </div>
 
                 <div className="flex flex-wrap items-center gap-2">
                   <Button type="button" onClick={() => void saveRole()} disabled={loading}>
                     Save
                   </Button>
                   <Button type="button" variant="secondary" onClick={() => void deleteRole()} disabled={loading}>
                     Delete
                   </Button>
                   <Badge variant="outline">
                     Selected permissions: {selectedPermissionKeys.size.toLocaleString()}
                   </Badge>
                 </div>
 
                 <div className="grid gap-2">
                   <div className="text-sm font-medium">Filter permissions</div>
                   <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="search by key/description" />
                 </div>
 
                 <div className="grid gap-4">
                   {visibleGroups.map(([module, list]) => (
                     <Card key={module}>
                       <CardHeader>
                         <CardTitle className="text-base">{module}</CardTitle>
                       </CardHeader>
                       <CardContent className="flex flex-wrap gap-2">
                         {list.map((p) => {
                           const active = selectedPermissionKeys.has(p.key);
                           return (
                             <Button
                               key={p.key}
                               type="button"
                               size="sm"
                               variant={active ? 'default' : 'outline'}
                               onClick={() => togglePermission(p.key)}
                             >
                               {p.key}
                             </Button>
                           );
                         })}
                       </CardContent>
                     </Card>
                   ))}
                   {visibleGroups.length === 0 ? (
                     <div className="text-sm text-muted-foreground">(no permissions match)</div>
                   ) : null}
                 </div>
               </>
             ) : (
               <div className="text-sm text-muted-foreground">(select a role)</div>
             )}
           </CardContent>
         </Card>
       </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Custom Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Entity</div>
              <div className="flex flex-wrap gap-2">
                {(['LEAD', 'ACCOUNT', 'CONTACT', 'OPPORTUNITY'] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={customFieldsEntityType === t ? 'default' : 'outline'}
                    onClick={() => setCustomFieldsEntityType(t)}
                    disabled={loading}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Create Custom Field</div>
              <Input value={cfCreateKey} onChange={(e) => setCfCreateKey(e.target.value)} placeholder="key (e.g. lead_source_detail)" />
              <Input value={cfCreateLabel} onChange={(e) => setCfCreateLabel(e.target.value)} placeholder="label" />
              <div className="flex flex-wrap gap-2">
                {(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT'] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={cfCreateType === t ? 'default' : 'outline'}
                    onClick={() => setCfCreateType(t)}
                    disabled={loading}
                  >
                    {t}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                variant={cfCreateRequired ? 'default' : 'outline'}
                onClick={() => setCfCreateRequired((v) => !v)}
                disabled={loading}
              >
                Required: {cfCreateRequired ? 'Yes' : 'No'}
              </Button>
              {cfCreateType === 'SELECT' ? (
                <Textarea
                  value={cfCreateOptions}
                  onChange={(e) => setCfCreateOptions(e.target.value)}
                  placeholder="options (newline/comma separated)"
                />
              ) : null}
              <Button type="button" onClick={() => void createCustomField()} disabled={loading}>
                Create
              </Button>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Filter</div>
              <Input value={customFieldsFilter} onChange={(e) => setCustomFieldsFilter(e.target.value)} placeholder="search by key/label/type" />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead className="text-right">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCustomFields.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedCustomFieldId(c.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {selectedCustomFieldId === c.id ? <Badge>Selected</Badge> : null}
                        <span>{c.key}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{c.label}</div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{c.type}</TableCell>
                  </TableRow>
                ))}
                {visibleCustomFields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-sm text-muted-foreground">
                      (no custom fields)
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Custom Field Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCustomField ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Key</div>
                    <Input value={selectedCustomField.key} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Type</div>
                    <Input value={selectedCustomField.type} readOnly />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Label</div>
                  <Input value={cfEditLabel} onChange={(e) => setCfEditLabel(e.target.value)} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={cfEditRequired ? 'default' : 'outline'}
                    onClick={() => setCfEditRequired((v) => !v)}
                    disabled={loading}
                  >
                    Required: {cfEditRequired ? 'Yes' : 'No'}
                  </Button>
                  <Button type="button" size="sm" onClick={() => void saveCustomField()} disabled={loading}>
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => void deleteCustomField()} disabled={loading}>
                    Delete
                  </Button>
                  <Badge variant="outline">
                    Entity: {selectedCustomField.entityType}
                  </Badge>
                </div>

                {selectedCustomField.type === 'SELECT' ? (
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Options</div>
                    <Textarea value={cfEditOptions} onChange={(e) => setCfEditOptions(e.target.value)} />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">(select a custom field)</div>
            )}
          </CardContent>
        </Card>
      </div>
     </div>
   );
 }
