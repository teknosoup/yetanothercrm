import type { Metadata } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'YetAnotherCRM',
  description: 'YetAnotherCRM',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          'min-h-screen bg-muted/30 font-sans antialiased',
        )}
      >
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between gap-3">
              <Link href="/" className="text-sm font-semibold tracking-tight">
                YetAnotherCRM
              </Link>
              <nav className="hidden items-center gap-1 md:flex">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/leads">Leads</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/accounts">Accounts</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/contacts">Contacts</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/opportunities">Opportunities</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/tasks">Tasks</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/activities">Activities</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/plugins">Plugins</Link>
                </Button>
              </nav>
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </header>
          <main className="container flex-1 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
