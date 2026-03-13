-- CreateTable
CREATE TABLE "OpportunityStageHistory" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "fromStage" "OpportunityStage",
    "toStage" "OpportunityStage" NOT NULL,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpportunityStageHistory_opportunityId_createdAt_idx" ON "OpportunityStageHistory"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "OpportunityStageHistory_actorUserId_createdAt_idx" ON "OpportunityStageHistory"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "OpportunityStageHistory" ADD CONSTRAINT "OpportunityStageHistory_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityStageHistory" ADD CONSTRAINT "OpportunityStageHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

