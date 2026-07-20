-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "contextSummary" TEXT,
ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Chat_parentId_idx" ON "Chat"("parentId");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
