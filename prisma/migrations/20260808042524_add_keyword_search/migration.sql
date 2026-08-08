-- CreateTable
CREATE TABLE "KeywordSearch" (
    "id" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordIdea" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "saved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "KeywordIdea_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "KeywordIdea" ADD CONSTRAINT "KeywordIdea_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "KeywordSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
