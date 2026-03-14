import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="grid gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">YetAnotherCRM</h1>
        <p className="text-sm text-muted-foreground">
          Minimal CRM UI untuk demo: lead → convert → account/contact/opportunity, tasks & activities, dashboard, plugins.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mulai</CardTitle>
          <CardDescription>Login pakai user seed admin.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/leads">Leads</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/accounts">Accounts</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contacts">Contacts</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/opportunities">Opportunities</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/tasks">Tasks</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/activities">Activities</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/plugins">Plugins</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
