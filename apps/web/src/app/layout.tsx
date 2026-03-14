import type { Metadata } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';

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
          'min-h-screen bg-background font-sans antialiased',
        )}
      >
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/" className="font-semibold">
              YetAnotherCRM
            </Link>
            <nav className="hidden gap-4 text-sm text-muted-foreground md:flex">
              <Link href="/leads" className="hover:text-foreground">
                Leads
              </Link>
              <Link href="/accounts" className="hover:text-foreground">
                Accounts
              </Link>
              <Link href="/contacts" className="hover:text-foreground">
                Contacts
              </Link>
              <Link href="/opportunities" className="hover:text-foreground">
                Opportunities
              </Link>
              <Link href="/tasks" className="hover:text-foreground">
                Tasks
              </Link>
              <Link href="/activities" className="hover:text-foreground">
                Activities
              </Link>
              <Link href="/dashboard" className="hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/plugins" className="hover:text-foreground">
                Plugins
              </Link>
            </nav>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Login
            </Link>
          </div>
        </header>
        <main className="container py-6">{children}</main>
      </body>
    </html>
  );
}
