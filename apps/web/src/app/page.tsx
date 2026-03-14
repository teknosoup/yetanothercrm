import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>YetAnotherCRM</h1>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href="/login">Login</Link>
        <Link href="/leads">Leads</Link>
        <Link href="/accounts">Accounts</Link>
        <Link href="/contacts">Contacts</Link>
        <Link href="/opportunities">Opportunities</Link>
        <Link href="/tasks">Tasks</Link>
        <Link href="/activities">Activities</Link>
        <Link href="/dashboard">Dashboard</Link>
      </div>
    </main>
  );
}
