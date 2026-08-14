-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "chunkCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "crawlState" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resultsSeenAt" TIMESTAMP(3);
