-- Existing notifications retain their status and a NULL deduplication key.
ALTER TYPE "NotificationStatus" ADD VALUE 'SIMULADA';

ALTER TABLE "notifications" ADD COLUMN "deduplication_key" TEXT;

CREATE UNIQUE INDEX "notifications_deduplication_key_key" ON "notifications"("deduplication_key");
