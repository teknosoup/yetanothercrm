import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

async function resolveWebBaseUrl() {
  if (process.env.WEB_BASE_URL) return process.env.WEB_BASE_URL;

  const candidates = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ];

  for (const base of candidates) {
    try {
      const res = await fetch(`${base}/login`, { redirect: 'follow' });
      if (res.ok) return base;
    } catch {
      // ignore
    }
  }

  return 'http://localhost:3000';
}

let webBaseUrl = 'http://localhost:3000';

const outDir = path.resolve(process.cwd(), 'docs', 'screenshots');

async function waitForHttpOk(url, { timeoutMs = 60_000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) return;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function ensureOutDir() {
  await fs.mkdir(outDir, { recursive: true });
}

function outFile(name) {
  return path.join(outDir, name);
}

async function capture(page, route, fileName) {
  await page.goto(`${webBaseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: outFile(fileName), fullPage: true });
}

async function login(page) {
  await page.goto(`${webBaseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname === '/leads', null, {
    timeout: 30_000,
  });
  await page.waitForTimeout(800);
}

function resolveApiBaseUrl() {
  return (
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:4000/v1'
  );
}

async function apiPost(pathname, token, body) {
  const apiBaseUrl = resolveApiBaseUrl();
  const res = await fetch(`${apiBaseUrl}${pathname}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${pathname} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  await ensureOutDir();
  webBaseUrl = await resolveWebBaseUrl();
  await waitForHttpOk(`${webBaseUrl}/login`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  await capture(page, '/', '01-home.png');
  await capture(page, '/login', '02-login.png');

  await login(page);
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  if (!token) throw new Error('Login succeeded but token not found');

  const authedRoutes = [
    { route: '/leads', file: '03-leads.png' },
    { route: '/accounts', file: '04-accounts.png' },
    { route: '/contacts', file: '05-contacts.png' },
    { route: '/opportunities', file: '06-opportunities.png' },
    { route: '/tasks', file: '07-tasks.png' },
    { route: '/activities', file: '08-activities.png' },
    { route: '/dashboard', file: '09-dashboard.png' },
    { route: '/plugins', file: '10-plugins.png' },
  ];

  for (const { route, file } of authedRoutes) {
    await capture(page, route, file);
  }

  const suffix = Date.now().toString().slice(-6);
  const account = await apiPost('/accounts', token, {
    companyName: `Screenshot Account ${suffix}`,
  });
  const contact = await apiPost('/contacts', token, {
    fullName: `Screenshot Contact ${suffix}`,
    accountId: account.id,
  });
  const opportunity = await apiPost('/opportunities', token, {
    opportunityName: `Screenshot Opportunity ${suffix}`,
    accountId: account.id,
    contactId: contact.id,
    estimatedValue: 10000,
    probability: 50,
  });

  await capture(page, `/accounts/${account.id}`, '11-account-detail.png');
  await capture(page, `/contacts/${contact.id}`, '12-contact-detail.png');
  await capture(page, `/opportunities/${opportunity.id}`, '13-opportunity-detail.png');
  await capture(page, '/plugins/demo', '14-plugin-detail.png');

  await context.close();
  await browser.close();
}

await main();
