-- CreateTable
CREATE TABLE "PageSpeedCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "siteId" TEXT,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "errorMessage" TEXT,
    "mobileScore" INTEGER,
    "desktopScore" INTEGER,
    "mobileJson" TEXT,
    "desktopJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageSpeedCheck_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PageSpeedCheck" ADD CONSTRAINT "PageSpeedCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageSpeedCheck" ADD CONSTRAINT "PageSpeedCheck_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
