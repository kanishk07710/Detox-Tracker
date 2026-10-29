-- A goal is unique per (user, activity, TYPE): you may have both a TARGET and a LIMIT
-- for the same activity. The init migration only had (userId, activity).
DROP INDEX "goals_userId_activity_key";
CREATE UNIQUE INDEX "goals_userId_activity_type_key" ON "goals"("userId", "activity", "type");
