-- Alert recipients move from the account to a single monitor.
--
-- monitorId is added NOT NULL with no default, which is only safe because
-- the table was verified empty first: monitoring shipped hours ago and
-- nobody had added a contact yet. If it had held rows, this would need a
-- nullable column, a backfill, and a separate ALTER to tighten it.

-- AlterTable
ALTER TABLE "AlertRecipient" DROP COLUMN "phone",
DROP COLUMN "smsEnabled",
ADD COLUMN     "monitorId" TEXT NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE INDEX "AlertRecipient_monitorId_idx" ON "AlertRecipient"("monitorId");

-- CreateIndex
CREATE UNIQUE INDEX "AlertRecipient_monitorId_email_key" ON "AlertRecipient"("monitorId", "email");

-- AddForeignKey
ALTER TABLE "AlertRecipient" ADD CONSTRAINT "AlertRecipient_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
