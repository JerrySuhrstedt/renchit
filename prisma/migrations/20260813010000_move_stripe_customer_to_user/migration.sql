-- DropIndex
DROP INDEX "Subscription_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "stripeCustomerId";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
