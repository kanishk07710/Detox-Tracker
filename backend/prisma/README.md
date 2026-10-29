# prisma/ — Prisma Schema and Migrations

## What is here

- `schema.prisma` — models: `User`, `ActivityLog`, `Goal`, `FocusSession` (+ enums `Activity`, `GoalType`)
- `migrations/` — versioned SQL. `*_init` was hand-written (no live DB at the time) to match
  the schema, and adds what Prisma cannot express: CHECK constraints (`minutes` 1..1440, note
  <= 280), a partial unique index (one running focus session per user) and
  `ENABLE ROW LEVEL SECURITY` on every table.

## Rules

- Never edit a migration that has been applied anywhere; add a new one.
- Every new table migration must `ENABLE ROW LEVEL SECURITY` (see `docs/notes/phase-4-sql.md`).
- Production migrations run only through `.github/workflows/migrate.yml` (needs the
  `PROD_DIRECT_URL` GitHub secret), never from a laptop.
- Application code does not belong here — it goes in `src/`.

## Commands (run inside `backend/`)

```bash
npm run prisma:generate        # regenerate the typed client (also runs on npm install)
npm run prisma:migrate:dev -- --name describe-change   # create + apply a migration to a LOCAL/dev DB
npm run prisma:migrate:deploy  # apply committed migrations (what CI does)
npx prisma studio              # browse data
```

After `migrate dev` generates a migration from a schema change, re-add any hand-written parts
(CHECK, RLS) to that new migration file before committing.

Known caveat: Prisma does not model CHECK constraints or partial indexes, so `migrate dev`
may report "drift" for them against a shadow database. Treat the migration files as the truth
and review any generated `DROP INDEX focus_sessions_one_active_per_user` - remove it.

## Two URLs (see ARCHITECTURE.md 3.1)

- `DATABASE_URL` — pooled connection (Supavisor, `?pgbouncer=true`); used by the running app.
  When unset, the app uses the in-memory repositories.
- `DIRECT_URL` — direct connection; used by Prisma migrations only.

## Local development database

Use a local Postgres (e.g. Docker: `docker run -e POSTGRES_PASSWORD=pw -p 5432:5432 postgres:16`)
and put `DATABASE_URL`/`DIRECT_URL` pointing at it in `backend/.env` (git-ignored). Then
`npm run prisma:migrate:deploy`. Integration tests in `tests/integration/prismaLogRepository.test.ts`
run only when `DATABASE_URL` is set and **delete rows** - never point them at production.
