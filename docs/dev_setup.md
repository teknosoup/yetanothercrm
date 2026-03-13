## Dev setup

### Opsi A (Recommended): Postgres via Podman (compose)

1. Pastikan Podman siap:

```bash
podman --version
podman compose version
podman machine list
```

Kalau belum ada machine:

```bash
podman machine init --now
```

2. Jalankan Postgres:

```bash
npm run db:up
```

3. Buat env file untuk API:

- Copy `apps/api/.env.example` → `apps/api/.env`
- Set:
  - `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/yetanothercrm?schema=public"`
  - `JWT_SECRET="<string-acak>"`
  - `PORT=4000` (opsional)

4. Migrasi + seed:

```bash
npm run prisma:migrate
npm run seed
```

5. Jalankan dev server:

```bash
npm run dev
```

Shutdown Postgres:

```bash
npm run db:down
```

Kalau `podman compose` tidak tersedia di mesinmu, script `db:up`/`db:down` tetap jalan karena tidak bergantung pada compose.

### Opsi B: Postgres lokal via Homebrew

1. Install Postgres:

```bash
brew install postgresql@16
brew services start postgresql@16
```

2. Buat database:

```bash
createdb yetanothercrm
```

3. Buat env file untuk API:

- Copy `apps/api/.env.example` → `apps/api/.env`
- Set:
  - `DATABASE_URL="postgresql://<user>:<pass>@localhost:5432/yetanothercrm?schema=public"`
  - `JWT_SECRET="<string-acak>"`
  - `PORT=4000` (opsional)

4. Migrasi + seed:

```bash
npm run prisma:migrate
npm run seed
```

5. Jalankan dev server:

```bash
npm run dev
```

Web default jalan di `http://localhost:3000`, API di `http://localhost:4000`.

Seed default:
- email: `admin@example.com`
- password: `Admin123!`

### Opsi C: Hosted Postgres (Neon/Supabase/Railway)

1. Buat project Postgres di provider pilihanmu.
2. Ambil connection string (DATABASE_URL).
3. Set `apps/api/.env` (copy dari `.env.example`), isi `DATABASE_URL` dan `JWT_SECRET`.
4. Jalankan:

```bash
npm run prisma:migrate
npm run seed
npm run dev
```

### Troubleshooting

- Podman error `VM does not exist`:
  - Jalankan `podman machine init --now` sekali, lalu `podman machine start`.
- Podman tidak ada subcommand `compose`:
  - `npm run db:up` tidak butuh compose; atau update Podman / install Podman Desktop / install `podman-compose` kalau memang ingin pakai compose.
- Prisma error `Environment variable not found: DATABASE_URL`:
  - Pastikan file `apps/api/.env` ada dan berisi `DATABASE_URL`.
- Port 5432 bentrok:
  - Cek service lain yang pakai Postgres/DB, atau ubah port di DATABASE_URL.
