-- DropIndex
DROP INDEX "Event_sessionId_idx";

-- DropIndex
DROP INDEX "Event_timestamp_idx";

-- DropIndex
DROP INDEX "Event_type_idx";

-- DropIndex
DROP INDEX "Event_utmSource_utmCampaign_idx";

-- DropIndex
DROP INDEX "Payment_createdAt_idx";

-- DropIndex
DROP INDEX "Payment_email_idx";

-- DropIndex
DROP INDEX "Payment_stripeSessionId_key";

-- DropIndex
DROP INDEX "UserSession_createdAt_idx";

-- DropIndex
DROP INDEX "UserSession_lastSeen_idx";

-- AlterTable
ALTER TABLE "MetricsCache" ALTER COLUMN "value" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "stripeSessionId" DROP NOT NULL,
ALTER COLUMN "amount" DROP NOT NULL,
ALTER COLUMN "currency" DROP NOT NULL,
ALTER COLUMN "currency" DROP DEFAULT;
