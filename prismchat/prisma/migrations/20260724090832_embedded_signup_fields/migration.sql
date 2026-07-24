-- AlterTable
ALTER TABLE "whatsapp_business_accounts" ADD COLUMN     "contactsSyncedAt" TIMESTAMP(3),
ADD COLUMN     "historySyncedAt" TIMESTAMP(3),
ADD COLUMN     "isOnBizApp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingMode" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "platformType" TEXT;
