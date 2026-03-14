CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_recipientUserId_createdAt_idx" ON "Notification"("recipientUserId", "createdAt");

CREATE INDEX "Notification_recipientUserId_readAt_createdAt_idx" ON "Notification"("recipientUserId", "readAt", "createdAt");

CREATE UNIQUE INDEX "Notification_recipientUserId_dedupeKey_key" ON "Notification"("recipientUserId", "dedupeKey");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
