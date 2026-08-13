-- CreateTable
CREATE TABLE "SearchConsoleReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "siteId" TEXT,
    "propertyUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "errorMessage" TEXT,
    "totalClicks" INTEGER,
    "totalImpressions" INTEGER,
    "avgPosition" DOUBLE PRECISION,
    "queriesJson" TEXT,
    "pagesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchConsoleReport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SearchConsoleReport" ADD CONSTRAINT "SearchConsoleReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchConsoleReport" ADD CONSTRAINT "SearchConsoleReport_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
