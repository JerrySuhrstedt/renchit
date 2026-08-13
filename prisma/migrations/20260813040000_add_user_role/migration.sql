-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- Seed the first owner so the admin area is reachable without an env var.
-- Idempotent, and a no-op if that account does not exist in this environment.
UPDATE "User" SET "role" = 'owner' WHERE lower("email") = 'jerry@sumolab.co';
