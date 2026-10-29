# Phase 4 — PostgreSQL and SQL

Practise everything here in the Supabase **SQL Editor** (or `psql` / DBeaver). Use a scratch
project or the dev database — never experiment on `detox-prod`.

## 1. What Supabase is (for us)

Supabase = hosted PostgreSQL + extras (auth, storage, auto-generated REST API). Per ADR 005 we
use **only the Postgres**. Everything below is plain PostgreSQL and works anywhere.

## 2. Tables, rows, columns

A **table** is a grid: each **column** has a name and a type; each **row** is one record.

### `users`

| Column | Type | Constraints | Why |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | Unguessable id; safe to expose in URLs |
| `email` | `text` | NOT NULL, UNIQUE | One account per email (store lowercased) |
| `passwordHash` | `text` | NOT NULL | Never the plain password |
| `timezone` | `text` | NOT NULL DEFAULT 'UTC' | "Today" depends on the user's zone |
| `createdAt` | `timestamptz` | NOT NULL DEFAULT now() | Audit |

### `activity_logs`

| Column | Type | Constraints | Why |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | |
| `userId` | `uuid` | NOT NULL, FOREIGN KEY -> users(id) ON DELETE CASCADE | Owner; deleting a user removes their logs |
| `activity` | enum `Activity` | NOT NULL | SOCIAL_MEDIA, CODING, STUDY, EXERCISE, OTHER |
| `minutes` | `integer` | NOT NULL, CHECK 1..1440 | A day has 1440 minutes |
| `note` | `text` | NULL allowed, CHECK length <= 280 | Optional |
| `loggedAt` | `timestamptz` | NOT NULL DEFAULT now() | When it happened (UTC instant) |
| `createdAt` | `timestamptz` | NOT NULL DEFAULT now() | When we stored it |

Concepts:
- **Primary key**: uniquely identifies a row. **Foreign key**: a column that must match a
  primary key elsewhere (`activity_logs.userId` -> `users.id`), so you cannot log for a
  non-existent user.
- **Constraints** (`NOT NULL`, `UNIQUE`, `CHECK`) make the *database* refuse bad data even if
  application code has a bug. Zod validates first; CHECK is the safety net.
- **`timestamptz`** stores an absolute instant (internally UTC). Always prefer it over
  `timestamp` (see ADR 004).
- **Index**: a sorted lookup structure. `(userId, loggedAt)` makes "this user's logs in a
  date range" fast without scanning the whole table. Costs: slower writes, more disk.

## 3. Create the tables by hand (practice)

The real tables come from Prisma migrations (Phase 5). For practice use a separate schema so
you don't clash with them:

```sql
create schema if not exists practice;

create type practice.activity as enum ('SOCIAL_MEDIA','CODING','STUDY','EXERCISE','OTHER');

create table practice.users (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  password_hash text not null,
  timezone     text not null default 'UTC',
  created_at   timestamptz not null default now()
);

create table practice.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references practice.users(id) on delete cascade,
  activity   practice.activity not null,
  minutes    integer not null check (minutes between 1 and 1440),
  note       text check (note is null or char_length(note) <= 280),
  logged_at  timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index on practice.activity_logs (user_id, logged_at);
```

(The Prisma-created tables use quoted camelCase names like `"userId"`; here we use snake_case
to avoid the quotes. Same ideas.)

## 4. CRUD

```sql
-- INSERT
insert into practice.users (email, password_hash) values ('me@example.com', 'x') returning id;

insert into practice.activity_logs (user_id, activity, minutes, note)
values ('<paste user id>', 'CODING', 90, 'SQL practice');

-- SELECT with WHERE / ORDER BY / LIMIT
select * from practice.activity_logs
where user_id = '<id>' and activity = 'CODING'
order by logged_at desc
limit 10;

-- UPDATE (always with WHERE! without it every row changes)
update practice.activity_logs set minutes = 100 where id = '<log id>';

-- DELETE (same warning)
delete from practice.activity_logs where id = '<log id>';

-- Constraints in action: each of these must FAIL
insert into practice.activity_logs (user_id, activity, minutes) values ('<id>', 'CODING', 0);
insert into practice.activity_logs (user_id, activity, minutes) values ('<id>', 'CODING', 1441);
insert into practice.activity_logs (user_id, activity, minutes) values (gen_random_uuid(), 'CODING', 5); -- FK
```

## 5. Aggregation: the Phase 4 checkpoint

**"Total minutes per category for user X today"**

"Today" is a day in the *user's* timezone, so convert the instant before comparing:

```sql
select activity, sum(minutes) as total_minutes
from practice.activity_logs
where user_id = '<user X id>'
  and logged_at >= (date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')
  and logged_at <  (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '1 day') at time zone 'Asia/Kolkata'
group by activity
order by total_minutes desc;
```

How to read it: `now() at time zone 'Asia/Kolkata'` gives local wall-clock time;
`date_trunc('day', ...)` snaps to local midnight; `at time zone` again converts that local
midnight back to a UTC instant. We compare instants with a half-open range `[start, next start)`
and `GROUP BY activity` collapses the matching rows into one per category with `SUM`.

`GROUP BY` rule: every selected column is either in `GROUP BY` or inside an aggregate
(`sum`, `count`, `avg`, `max`).

More practice:

```sql
-- Count of logs and average length per activity (all time)
select activity, count(*) as entries, round(avg(minutes)) as avg_minutes
from practice.activity_logs where user_id = '<id>' group by activity;

-- HAVING filters groups (WHERE filters rows): activities with > 120 min total
select activity, sum(minutes) from practice.activity_logs
where user_id = '<id>' group by activity having sum(minutes) > 120;

-- Minutes per day (for charts), in the user's zone
select (logged_at at time zone 'Asia/Kolkata')::date as day, sum(minutes)
from practice.activity_logs where user_id = '<id>'
group by day order by day;
```

## 6. JOINs

```sql
-- INNER JOIN: only users that have logs; shows email next to each log
select u.email, l.activity, l.minutes, l.logged_at
from practice.users u
join practice.activity_logs l on l.user_id = u.id
order by l.logged_at desc;

-- LEFT JOIN: ALL users, even with zero logs (log columns become NULL)
select u.email, coalesce(sum(l.minutes), 0) as total_minutes
from practice.users u
left join practice.activity_logs l on l.user_id = u.id
group by u.id, u.email;

-- Total minutes per user per category
select u.email, l.activity, sum(l.minutes)
from practice.users u join practice.activity_logs l on l.user_id = u.id
group by u.email, l.activity order by u.email, 3 desc;
```

Inner join = rows that match on both sides. Left join = every row from the left table, matched
or not. A `WHERE` on the right table's column silently turns a left join back into an inner
join, so put such conditions in the `ON` clause.

## 7. Indexes and EXPLAIN

```sql
explain analyze
select * from practice.activity_logs
where user_id = '<id>' and logged_at >= now() - interval '7 days';
```

Look for `Index Scan` vs `Seq Scan`. With tiny tables Postgres may choose a sequential scan
anyway - that's correct, the index pays off with many rows.

## 8. Row Level Security (RLS)

**What it is:** a Postgres feature where a table carries *policies* deciding which rows each
database role may see or change. When RLS is **enabled**, a role subject to it can access only
what a policy allows; **no policy = no access**.

**Why we enable it even though we never use the Supabase Data API:** Supabase automatically
exposes tables in the `public` schema through a public REST API (PostgREST), reachable with the
public `anon` key that ships in client apps. If RLS is off, anyone with that key could read
every user's data. With RLS on and zero policies, those roles get nothing (defence in depth).

**Why our app still works:** Express connects with the database owner role (`postgres`), which
bypasses RLS. Authorisation for our app is enforced in code (`WHERE userId = req.user.id`).
We do not write policies because nothing should use the Data API at all.

```sql
alter table "users"          enable row level security;
alter table "activity_logs"  enable row level security;
alter table "goals"          enable row level security;
alter table "focus_sessions" enable row level security;

-- Verify: every row should show rowsecurity = true
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```

The first Prisma migration (`backend/prisma/migrations/*_init/migration.sql`) already contains
these statements; every future table migration must enable RLS too. (Prisma's own
`_prisma_migrations` table is internal and Supabase flags it in the dashboard; if you want it
clean you can enable RLS on it manually - harmless because Prisma connects as owner.)

## 9. Direct vs pooled connections

| | Direct | Pooled (Supavisor) |
|---|---|---|
| Port | 5432 | 6543 (transaction mode) or 5432 (session mode) |
| Env var | `DIRECT_URL` | `DATABASE_URL` |
| Used by | `prisma migrate` | the running Express server |

- Postgres allows only a limited number of simultaneous connections (small on a free plan). A
  **pooler** keeps a few real connections and lends them to many clients, so a spike of
  requests doesn't exhaust the database.
- **Transaction mode** hands out a real connection only for the duration of one transaction.
  Prisma uses prepared statements and sessions that don't survive this, so the pooled URL needs
  `?pgbouncer=true` appended (and migrations must not use it - they need a full, stable
  session, hence `directUrl`).
- If the direct host is IPv6-only and your network/CI can't reach it, use the pooler's
  **session mode** string for `DIRECT_URL`.

Examples (placeholders only - real values stay in `.env` / GitHub secrets, never in git):

```
DATABASE_URL="postgresql://postgres.<ref>:<password>@<pooler-host>:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"
```

## Checkpoint

You can write the "total minutes per category for user X today" query (section 5) from memory
and explain what every clause does, what a foreign key and a CHECK constraint protect against,
and why RLS is on although the app bypasses it.
