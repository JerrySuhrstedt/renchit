-- CreateTable
CREATE TABLE "ContentGrade" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "targetKeyword" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "errorMessage" TEXT,
    "score" INTEGER,
    "wordCount" INTEGER,
    "checksJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentGrade_pkey" PRIMARY KEY ("id")
);
