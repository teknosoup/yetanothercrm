-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "convertedAccountId" TEXT,
ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "convertedContactId" TEXT,
ADD COLUMN     "convertedOpportunityId" TEXT;
