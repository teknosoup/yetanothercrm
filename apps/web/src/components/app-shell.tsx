 'use client';
 
 import Link from 'next/link';
 import { usePathname, useRouter } from 'next/navigation';
 import { useMemo, useState } from 'react';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 import { clearToken, getToken } from '@/lib/api';
 
 type NavItem = {
   href: string;
   label: string;
 };
 
 const navItems: NavItem[] = [
   { href: '/leads', label: 'Leads' },
   { href: '/accounts', label: 'Accounts' },
   { href: '/contacts', label: 'Contacts' },
   { href: '/opportunities', label: 'Opportunities' },
   { href: '/tasks', label: 'Tasks' },
   { href: '/activities', label: 'Activities' },
   { href: '/dashboard', label: 'Dashboard' },
   { href: '/plugins', label: 'Plugins' },
 ];
 
 export function AppShell({ children }: { children: React.ReactNode }) {
   const pathname = usePathname();
   const router = useRouter();
   const [mobileOpen, setMobileOpen] = useState(false);
 
   const isAuthPage = pathname === '/login';
   const isActive = useMemo(() => {
     return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
   }, [pathname]);
 
   const hasToken = useMemo(() => {
     return Boolean(getToken());
   }, []);
 
   function logout() {
     clearToken();
     router.push('/login');
   }
 
   return (
     <div className={cn('min-h-screen', isAuthPage ? 'bg-background' : 'bg-muted/30')}>
       <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
         <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4">
           {!isAuthPage ? (
             <Button
               type="button"
               variant="outline"
               size="sm"
               className="md:hidden"
               onClick={() => setMobileOpen(true)}
             >
               Menu
             </Button>
           ) : null}
           <Link href="/" className="text-sm font-semibold tracking-tight">
             YetAnotherCRM
           </Link>
           {!isAuthPage ? (
             <nav className="hidden flex-1 items-center gap-1 md:flex">
               {navItems.map((item) => (
                 <Button
                   key={item.href}
                   variant={isActive(item.href) ? 'secondary' : 'ghost'}
                   size="sm"
                   asChild
                 >
                   <Link href={item.href}>{item.label}</Link>
                 </Button>
               ))}
             </nav>
           ) : (
             <div className="flex-1" />
           )}
 
           <div className="ml-auto flex items-center gap-2">
             {hasToken && !isAuthPage ? (
               <Button type="button" variant="outline" size="sm" onClick={logout}>
                 Logout
               </Button>
             ) : (
               <Button variant="outline" size="sm" asChild>
                 <Link href="/login">Login</Link>
               </Button>
             )}
           </div>
         </div>
       </header>
 
       {!isAuthPage ? (
         <>
           <div
             className={cn(
               'fixed inset-0 z-40 bg-background/40 backdrop-blur-sm md:hidden',
               mobileOpen ? 'block' : 'hidden',
             )}
             onClick={() => setMobileOpen(false)}
           />
           <aside
             className={cn(
               'fixed inset-y-0 left-0 z-50 w-72 border-r bg-background p-4 shadow-lg transition-transform md:hidden',
               mobileOpen ? 'translate-x-0' : '-translate-x-full',
             )}
             role="dialog"
             aria-modal="true"
           >
             <div className="flex items-center justify-between">
               <div className="text-sm font-semibold tracking-tight">Navigation</div>
               <Button type="button" variant="ghost" size="sm" onClick={() => setMobileOpen(false)}>
                 Close
               </Button>
             </div>
             <div className="mt-4 grid gap-1">
               {navItems.map((item) => (
                 <Button
                   key={item.href}
                   variant={isActive(item.href) ? 'secondary' : 'ghost'}
                   size="sm"
                   className="justify-start"
                   asChild
                   onClick={() => setMobileOpen(false)}
                 >
                   <Link href={item.href}>{item.label}</Link>
                 </Button>
               ))}
             </div>
           </aside>
         </>
       ) : null}
 
       <main className={cn('mx-auto max-w-screen-2xl px-4', isAuthPage ? 'py-10' : 'py-8')}>
         {children}
       </main>
     </div>
   );
 }
