-- Initial schema. Written by hand to match prisma/schema.prisma (no live DB was
-- available), in the same style `prisma migrate dev` would generate, plus the
-- things Prisma cannot express: CHECK constraints, a partial unique index, RLS.

-- CreateEnum
CREATE TYPE "Activity" AS ENUM ('SOCIAL_MEDIA', 'CODING', 'STUDY', 'EXERCISE', 'OTHER');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('TARGET', 'LIMIT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "activity" "Activity" NOT NULL,
    "minutes" INTEGER NOT NULL,
    "note" TEXT,
    "loggedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "activity" "Activity" NOT NULL,
    "type" "GoalType" NOT NULL,
    "minutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "focus_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "activity" "Activity" NOT NULL,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(6),

    CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "activity_logs_userId_loggedAt_idx" ON "activity_logs"("userId", "loggedAt");

-- CreateIndex
CREATE UNIQUE INDEX "goals_userId_activity_key" ON "goals"("userId", "activity");

-- CreateIndex
CREATE INDEX "focus_sessions_userId_startedAt_idx" ON "focus_sessions"("userId", "startedAt");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-added: rules Prisma's schema language cannot express
-- ---------------------------------------------------------------------------

-- The API validates with Zod, but the database is the last line of defence:
-- even a buggy script or a manual SQL edit cannot store nonsense.
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_minutes_range_check" CHECK ("minutes" BETWEEN 1 AND 1440);
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_note_length_check" CHECK ("note" IS NULL OR char_length("note") <= 280);
ALTER TABLE "goals" ADD CONSTRAINT "goals_minutes_range_check" CHECK ("minutes" BETWEEN 1 AND 1440);

-- At most ONE running (endedAt IS NULL) focus session per user.
CREATE UNIQUE INDEX "focus_sessions_one_active_per_user" ON "focus_sessions"("userId") WHERE "endedAt" IS NULL;

-- Row Level Security (see docs/notes/phase-4-sql.md and ARCHITECTURE.md 3.1).
-- With RLS on and NO policies, Supabase's public Data API (anon/authenticated
-- roles) can read/write nothing. Our Express backend connects as the table
-- owner (postgres role), which bypasses RLS, so the app is unaffected.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "focus_sessions" ENABLE ROW LEVEL SECURITY;
