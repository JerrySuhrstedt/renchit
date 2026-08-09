-- CreateTable
CREATE TABLE "LocalListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "siteId" TEXT,
    "websiteUrl" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "reviewCount" INTEGER,
    "reviewRating" DOUBLE PRECISION,
    "claimed" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "errorMessage" TEXT,
    "score" INTEGER,
    "checksJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalListing_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LocalListing" ADD CONSTRAINT "LocalListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalListing" ADD CONSTRAINT "LocalListing_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
